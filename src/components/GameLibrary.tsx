import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Star, Play, Clock3, Ghost, RotateCcw, Maximize2, Minimize2 } from "lucide-react";

/**
 * Biblioteca de jogos local.
 *
 * Antes, a lista de jogos (cards, busca, favoritos) vinha de um bundle
 * remoto hospedado num repositório separado (master-games-arcade-system,
 * via CDN). Este componente substitui aquele bundle: ele roda dentro deste
 * projeto, lê os mesmos dados que já existiam localmente
 * (roms-catalog.json, game-titles.json, media-manifest.json) e conversa
 * com o bridge local `public/mame-web.js` só para abrir o jogo, listar
 * favoritos/recentes e alternar favorito — o próprio bridge já expõe tudo
 * isso via `fetch("/api/...")` interceptado (nenhum servidor real por trás).
 */

type MediaEntry = {
  has_snap?: boolean;
  snap_url?: string;
};

type Tab = "all" | "favorites" | "recent";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "favorites", label: "Favoritos" },
  { id: "recent", label: "Recentes" },
];

const BACKGROUND_IMAGES = [
  "/assets/arcade-hero-alternate-2.png",
  "/assets/arcade-hero-alternate.png",
];

const fileBase = (name: string) =>
  name
    .toLowerCase()
    .replace(/\.(zip|7z|chd)$/i, "");

const prettyFallback = (name: string) =>
  fileBase(name)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

async function waitForBridge(): Promise<void> {
  await new Promise<void>((resolve) => {
    const script = document.createElement("script");
    script.src = "/web/mame-web.js";
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

export function GameLibrary({ accountSlot }: { accountSlot?: React.ReactNode }) {
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [roms, setRoms] = useState<string[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [media, setMedia] = useState<Record<string, MediaEntry>>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [launching, setLaunching] = useState<string | null>(null);
  const [launchError, setLaunchError] = useState("");
  const mountedRef = useRef(true);

  const [backgroundIndex, setBackgroundIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setBackgroundIndex((current) => (current + 1) % BACKGROUND_IMAGES.length);
    }, 10_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const syncFullscreenState = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // O navegador pode bloquear fullscreen em contextos sem suporte ou permissão.
    }
  };

  const loadLibrary = async () => {
    setPhase("loading");
    setErrorMessage("");
    try {
      await waitForBridge();
      const [romsRes, namesRes, favRes, recentRes, mediaRes] = await Promise.all([
        fetch("/api/roms"),
        fetch("/api/gamenames"),
        fetch("/api/games/favorites"),
        fetch("/api/games/recent"),
        fetch("/assets/media-manifest.json").catch(() => null),
      ]);

      if (!romsRes.ok) throw new Error("Catálogo de ROMs indisponível");
      const romsData = await romsRes.json();
      const namesData = namesRes.ok ? await namesRes.json() : { names: {} };
      const favData = favRes.ok ? await favRes.json() : { games: [] };
      const recentData = recentRes.ok ? await recentRes.json() : { games: [] };
      const mediaData = mediaRes && mediaRes.ok ? await mediaRes.json() : {};

      if (!mountedRef.current) return;
      setRoms(Array.isArray(romsData.roms) ? romsData.roms : []);
      setNames(namesData.names || {});
      setFavorites(Array.isArray(favData.games) ? favData.games : []);
      setRecent(Array.isArray(recentData.games) ? recentData.games : []);
      setMedia(mediaData || {});
      setPhase("ready");
    } catch (err) {
      if (!mountedRef.current) return;
      setErrorMessage(err instanceof Error ? err.message : "Falha ao carregar a biblioteca.");
      setPhase("error");
    }
  };

  useEffect(() => {
    loadLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const titleFor = (rom: string) => names[fileBase(rom)] || prettyFallback(rom);

  const snapFor = (rom: string) => {
    const entry = media[fileBase(rom)];
    return entry?.has_snap ? entry.snap_url : undefined;
  };

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  const visibleRoms = useMemo(() => {
    let list = roms;
    if (tab === "favorites") list = roms.filter((rom) => favoriteSet.has(rom));
    if (tab === "recent") {
      const order = new Map(recent.map((rom, index) => [rom, index]));
      list = roms.filter((rom) => order.has(rom)).sort((a, b) => order.get(a)! - order.get(b)!);
    }

    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((rom) => titleFor(rom).toLowerCase().includes(q) || fileBase(rom).includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roms, tab, favoriteSet, recent, query, names]);

  const toggleFavorite = async (rom: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch("/api/games/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: rom }),
      });
      const data = await res.json();
      if (Array.isArray(data.games)) setFavorites(data.games);
    } catch {
      // Sem bridge disponível: ignora silenciosamente, o toggle é cosmético.
    }
  };

  const playGame = async (rom: string) => {
    if (launching) return;
    setLaunchError("");
    setLaunching(rom);
    try {
      const res = await fetch("/api/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ romName: rom }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Não foi possível abrir o jogo.");
      setRecent((prev) => [rom, ...prev.filter((item) => item !== rom)].slice(0, 100));
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : "Não foi possível abrir o jogo.");
    } finally {
      if (mountedRef.current) setLaunching(null);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050009] text-[#eafffe]">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[#050009]">
        {BACKGROUND_IMAGES.map((image, index) => (
          <img
            key={image}
            src={image}
            alt=""
            aria-hidden="true"
            className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-1000 ${
              index === backgroundIndex ? "opacity-60" : "opacity-0"
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-[#050009]/45" />
      </div>

      <header className="relative z-10 sticky top-0 border-b border-cyan-500/20 bg-[#050009]/90 px-4 py-3 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-mono text-lg font-bold tracking-wide text-cyan-400 [text-shadow:0_0_10px_rgba(0,229,255,.5)] sm:text-xl">
              MASTER GAMES ARCADE
            </h1>
            <p className="font-mono text-[11px] text-zinc-500">
              {roms.length > 0 ? `${roms.length} jogos disponíveis` : "Fliperama no navegador"}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-500/60" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar jogo..."
                className="w-full min-w-0 rounded-full border border-cyan-500/30 bg-black/60 py-2 pl-9 pr-4 font-mono text-sm text-cyan-100 placeholder:text-zinc-600 outline-none focus:border-cyan-400 sm:w-56"
              />
            </div>

            <div className="flex gap-1.5">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`flex items-center gap-1 rounded-full border px-3 py-1.5 font-mono text-[11px] font-bold tracking-wide transition-colors ${
                    tab === item.id
                      ? "border-cyan-400 bg-cyan-400/15 text-cyan-300"
                      : "border-white/10 text-zinc-400 hover:border-cyan-500/40 hover:text-cyan-200"
                  }`}
                >
                  {item.id === "favorites" && <Star className="h-3 w-3" />}
                  {item.id === "recent" && <Clock3 className="h-3 w-3" />}
                  {item.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Sair da tela cheia" : "Entrar em tela cheia"}
              title={isFullscreen ? "Sair da tela cheia" : "Entrar em tela cheia"}
              className="flex items-center justify-center gap-1.5 rounded-full border border-cyan-500/30 px-3 py-1.5 font-mono text-[11px] font-bold tracking-wide text-cyan-200 transition-colors hover:border-cyan-400 hover:bg-cyan-400/10"
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              <span>{isFullscreen ? "Sair da tela cheia" : "Tela cheia"}</span>
            </button>
            {accountSlot}
          </div>
        </div>
      </header>

      <main className="relative z-10 w-full px-0 py-6">
        {phase === "loading" && <LibrarySkeleton />}

        {phase === "error" && (
          <div className="mx-auto mt-16 flex max-w-md flex-col items-center gap-4 text-center">
            <Ghost className="h-10 w-10 text-pink-400" />
            <p className="font-mono text-sm text-pink-300">{errorMessage}</p>
            <button
              type="button"
              onClick={loadLibrary}
              className="flex items-center gap-2 rounded-full border border-cyan-400 px-4 py-2 font-mono text-xs font-bold text-cyan-300 hover:bg-cyan-400/10"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Tentar novamente
            </button>
          </div>
        )}

        {phase === "ready" && visibleRoms.length === 0 && (
          <div className="mt-16 text-center font-mono text-sm text-zinc-500">
            {tab === "favorites"
              ? "Nenhum favorito ainda. Toque na estrela de um jogo para guardar aqui."
              : tab === "recent"
                ? "Você ainda não jogou nada nesta sessão."
                : "Nenhum jogo encontrado para essa busca."}
          </div>
        )}

        {phase === "ready" && visibleRoms.length > 0 && (
          <div className="ml-auto grid w-full max-w-xs grid-cols-2 gap-3">
            {visibleRoms.map((rom) => (
              <GameCard
                key={rom}
                title={titleFor(rom)}
                snapUrl={snapFor(rom)}
                isFavorite={favoriteSet.has(rom)}
                isLaunching={launching === rom}
                onPlay={() => playGame(rom)}
                onToggleFavorite={(e) => toggleFavorite(rom, e)}
              />
            ))}
          </div>
        )}

        {launchError && (
          <div
            role="alert"
            className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full border border-pink-500 bg-black/90 px-4 py-2 font-mono text-xs text-pink-300 shadow-[0_0_20px_rgba(255,43,109,.35)]"
          >
            {launchError}
          </div>
        )}
      </main>
    </div>
  );
}

function GameCard({
  title,
  snapUrl,
  isFavorite,
  isLaunching,
  onPlay,
  onToggleFavorite,
}: {
  title: string;
  snapUrl?: string;
  isFavorite: boolean;
  isLaunching: boolean;
  onPlay: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const showArt = snapUrl && !imgFailed;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !isLaunching && onPlay()}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !isLaunching) {
          e.preventDefault();
          onPlay();
        }
      }}
      aria-disabled={isLaunching}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border border-white/10 bg-[#0a0014] text-left outline-none transition-[border-color,box-shadow] hover:border-cyan-400/70 hover:shadow-[0_0_18px_rgba(0,229,255,.25)] focus-visible:border-cyan-400 aria-disabled:pointer-events-none aria-disabled:opacity-60"
    >
      <span className="relative block aspect-[4/3] w-full overflow-hidden bg-linear-to-br from-[#160227] to-[#03000a]">
        {showArt ? (
          <img
            src={snapUrl}
            alt=""
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center px-2 text-center font-mono text-[13px] font-bold uppercase tracking-wide text-cyan-500/70">
            {title.slice(0, 18)}
          </span>
        )}

        <span className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
          <Play className="h-8 w-8 fill-cyan-300 text-cyan-300 drop-shadow-[0_0_8px_rgba(0,229,255,.8)]" />
        </span>

        <button
          type="button"
          onClick={onToggleFavorite}
          aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          aria-pressed={isFavorite}
          className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/60 backdrop-blur-sm"
        >
          <Star
            className={`h-3.5 w-3.5 ${isFavorite ? "fill-yellow-400 text-yellow-400" : "text-white/70"}`}
          />
        </button>

        {isLaunching && (
          <span className="absolute inset-0 grid place-items-center bg-black/70 font-mono text-[11px] text-cyan-300">
            Abrindo...
          </span>
        )}
      </span>

      <span className="px-2 py-2 font-mono text-[11px] leading-snug text-zinc-200 line-clamp-2">
        {title}
      </span>
    </div>
  );
}

function LibrarySkeleton() {
  return (
    <div className="ml-auto grid w-full max-w-xs grid-cols-2 gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="animate-pulse overflow-hidden rounded-lg border border-white/10 bg-[#0a0014]">
          <div className="aspect-[4/3] bg-white/5" />
          <div className="m-2 h-3 rounded bg-white/5" />
        </div>
      ))}
    </div>
  );
}
