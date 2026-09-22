import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

const CDN = "https://cdn.jsdelivr.net/gh/cordeiroalfa0-dev/master-games-arcade-system@main/dist";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Master Games Arcade" },
      {
        name: "description",
        content:
          "Fliperama online com clássicos de arcade: escolha o jogo, jogue no navegador e salve sua partida em 15 slots.",
      },
      { property: "og:title", content: "Master Games Arcade" },
      {
        property: "og:description",
        content: "Jogue clássicos de arcade direto no navegador e salve seu progresso.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: `${CDN}/assets/index-CJVcYSDx.css`, crossOrigin: "anonymous" },
    ],
  }),
  component: Index,
});

function Index() {
  useEffect(() => {
    const responsiveStyle = document.createElement("style");
    responsiveStyle.id = "mga-landscape-library-fix";
    responsiveStyle.textContent = `
      /* A interface remota ativa o breakpoint sm pela largura do celular
         horizontal, mas mantém a biblioteca com 240px e texto de 8px. */
      @media (orientation: landscape) and (max-height: 600px),
             (orientation: landscape) and (max-width: 900px) {
        main > aside {
          top: 48px !important;
          right: 8px !important;
          bottom: 8px !important;
          width: min(48vw, 380px) !important;
          max-width: calc(100vw - 16px) !important;
        }

        main > aside > div.flex-1.overflow-y-auto {
          display: block !important;
          flex: 1 1 0% !important;
          height: auto !important;
          max-height: none !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          min-height: 0 !important;
          visibility: visible !important;
          opacity: 1 !important;
          position: relative !important;
          z-index: 2 !important;
          overscroll-behavior-y: contain;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-y !important;
          pointer-events: auto !important;
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 229, 255, 0.7) rgba(0, 0, 0, 0.35);
        }

        main > aside > div.flex-1.overflow-y-auto::-webkit-scrollbar {
          width: 8px;
        }

        main > aside > div.flex-1.overflow-y-auto::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.35);
        }

        main > aside > div.flex-1.overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(0, 229, 255, 0.7);
          border-radius: 999px;
          border: 1px solid rgba(0, 0, 0, 0.45);
        }

        main > aside > div.flex-1.overflow-y-auto > button {
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
          width: 100% !important;
          min-height: 30px !important;
          padding: 7px 10px !important;
          font-size: clamp(11px, 2.15vw, 14px) !important;
          line-height: 1.2 !important;
          touch-action: pan-y !important;
        }

        main > aside input[placeholder="Buscar (fuzzy)..."] {
          padding: 6px 8px !important;
          font-size: 12px !important;
        }
      }
    `;
    document.head.appendChild(responsiveStyle);

    // O bundle do launcher remoto sintetiza bipes para navegação, seleção,
    // erros e configuração. O player de cada jogo é um iframe separado, por
    // isso o áudio dele — inclusive a intro do game — não é afetado.
    const audioWindow = window as Window & {
      webkitAudioContext?: typeof AudioContext;
    };
    const nativeAudioContexts = [
      ["AudioContext", window.AudioContext],
      ["webkitAudioContext", audioWindow.webkitAudioContext],
    ] as const;
    const silentContexts: Array<["AudioContext" | "webkitAudioContext", typeof AudioContext]> = [];

    for (const [key, NativeAudioContext] of nativeAudioContexts) {
      if (!NativeAudioContext) continue;
      const SilentAudioContext = function (...args: ConstructorParameters<typeof AudioContext>) {
        const context = new NativeAudioContext(...args);
        context.suspend().catch(() => {});
        context.resume = () => Promise.resolve();
        return context;
      } as unknown as typeof AudioContext;
      SilentAudioContext.prototype = NativeAudioContext.prototype;
      audioWindow[key] = SilentAudioContext;
      silentContexts.push([key, NativeAudioContext]);
    }

    const NativeAudio = window.Audio;
    window.Audio = function (...args: ConstructorParameters<typeof Audio>) {
      const audio = new NativeAudio(...args);
      audio.muted = true;
      audio.volume = 0;
      return audio;
    } as typeof Audio;

    const loader = document.createElement("script");
    loader.src = "/web/mame-web.js";
    document.head.appendChild(loader);

    const app = document.createElement("script");
    app.type = "module";
    app.crossOrigin = "anonymous";
    app.src = `${CDN}/assets/index-CQxxgdzD.js`;
    loader.onload = () => document.head.appendChild(app);
    loader.onerror = () => document.head.appendChild(app);

    const requestFullscreen = () => {
      if (document.fullscreenElement) return;
      try {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } catch {
        /* o navegador pode recusar fora de um toque do usuário */
      }
    };
    document.addEventListener("pointerdown", requestFullscreen, { once: true, capture: true });
    document.addEventListener("keydown", requestFullscreen, { once: true, capture: true });

    return () => {
      loader.remove();
      app.remove();
      responsiveStyle.remove();
      for (const [key, NativeAudioContext] of silentContexts) {
        audioWindow[key] = NativeAudioContext;
      }
      window.Audio = NativeAudio;
    };
  }, []);

  return <div id="root" />;
}
