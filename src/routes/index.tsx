import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { GameLibrary } from "@/components/GameLibrary";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Master Games Arcade" },
      {
        name: "description",
        content:
          "Fliperama online com clássicos de arcade: escolha o jogo, jogue no navegador e continue de onde parou.",
      },
      { property: "og:title", content: "Master Games Arcade" },
      {
        property: "og:description",
        content: "Jogue clássicos de arcade direto no navegador e salve seu progresso.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type AuthState = "checking" | "guest" | "authed";
type MgaUser = { email: string; name?: string; picture?: string };

function Index() {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [user, setUser] = useState<MgaUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.ok) {
          setUser(data.user as MgaUser);
          setAuthState("authed");
        } else {
          setAuthState("guest");
        }
      })
      .catch(() => {
        if (!cancelled) setAuthState("guest");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (authState === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-sm text-cyan-400">
        Carregando...
      </div>
    );
  }

  if (authState === "guest") {
    return <LoginScreen />;
  }

  return (
    <Launcher
      user={user}
      onLogout={() => {
        setUser(null);
        setAuthState("guest");
      }}
    />
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.17.29-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}

function LoginScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-cyan-500/30 bg-zinc-950 p-6 text-center shadow-[0_0_30px_rgba(0,229,255,0.15)]">
        <div>
          <h1 className="text-xl font-bold text-cyan-400">Master Games Arcade</h1>
          <p className="mt-1 text-xs text-zinc-400">
            Entre com sua conta Google para jogar e salvar suas partidas na nuvem
          </p>
        </div>

        <Button
          type="button"
          onClick={() => {
            window.location.href = "/api/auth/google";
          }}
          className="flex w-full items-center justify-center gap-2 bg-white text-black hover:bg-zinc-200"
        >
          <GoogleIcon />
          Entrar com Google
        </Button>
      </div>
    </div>
  );
}

function Launcher({ user, onLogout }: { user: MgaUser | null; onLogout: () => void }) {
  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // segue o logout local mesmo se a chamada falhar
    }
    onLogout();
  };

  const accountBadge = (
    <div className="flex items-center gap-2 rounded-full border border-cyan-500/30 bg-black/50 py-1 pl-1 pr-2 font-mono text-[11px] text-cyan-300">
      {user?.picture && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.picture}
          alt=""
          referrerPolicy="no-referrer"
          className="h-5 w-5 rounded-full"
        />
      )}
      <span className="max-w-[110px] truncate">{user?.name || user?.email}</span>
      <button
        type="button"
        onClick={logout}
        className="rounded border border-cyan-500/50 px-1.5 py-0.5 text-cyan-300 hover:bg-cyan-400/10"
      >
        Sair
      </button>
    </div>
  );

  // A biblioteca de jogos (cards, busca, favoritos, recentes) roda
  // inteiramente neste projeto agora — veja src/components/GameLibrary.tsx.
  // Ela só usa o bridge local (public/mame-web.js) para abrir o jogo e
  // ler/gravar favoritos e recentes; não depende mais do bundle remoto
  // hospedado no repositório master-games-arcade-system.
  return <GameLibrary accountSlot={accountBadge} />;
}
