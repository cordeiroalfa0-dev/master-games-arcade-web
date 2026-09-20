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
    };
  }, []);

  return <div id="root" />;
}
