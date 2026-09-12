/* Master Games Arcade Web - bridge da camada nativa para WebAssembly.
 * Mantém o renderer original e substitui somente as rotas do backend local.
 */
(() => {
  const API_PREFIX = "/api/";
  const NATIVE_API = "http://localhost:7777";
  const CATALOG_URL = "/roms-catalog.json";
  const TITLES_URL = "/game-titles.json";
  const originalFetch = window.fetch.bind(window);
  let catalogPromise;
  let titlesPromise;

  const jsonResponse = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });

  const loadCatalog = async () => {
    if (!catalogPromise) {
      catalogPromise = originalFetch(CATALOG_URL).then((r) => {
        if (!r.ok) throw new Error("Catálogo de ROMs indisponível");
        return r.json();
      });
    }
    return catalogPromise;
  };

  const loadTitles = async () => {
    if (!titlesPromise) {
      titlesPromise = originalFetch(TITLES_URL).then((r) => {
        if (!r.ok) return {};
        return r.json();
      }).catch(() => ({}));
    }
    return titlesPromise;
  };

  function cleanRomName(name) {
    return String(name || "").replace(/\.(zip|7z|chd)$/i, "");
  }

  function showWebPlayer(romName) {
    return new Promise((resolve, reject) => {
      document.getElementById("mga-web-player")?.remove();

      const overlay = document.createElement("div");
      overlay.id = "mga-web-player";
      overlay.style.cssText = [
        "position:fixed;inset:0;z-index:2147483647;background:#05000b;",
        "display:flex;flex-direction:column;font-family:Arial,sans-serif;",
      ].join("");

      const bar = document.createElement("div");
      bar.style.cssText = "height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;background:#0a0014;border-bottom:1px solid #00e5ff;box-shadow:0 0 14px #00e5ff55;color:#fff;box-sizing:border-box;";
      bar.innerHTML = '<strong style="font-family:monospace;color:#00e5ff;letter-spacing:1px">MASTER GAMES ARCADE</strong>';

      const close = document.createElement("button");
      close.textContent = "✕ FECHAR";
      close.style.cssText = "background:#16051d;border:1px solid #ff2bd6;color:#fff;padding:8px 12px;cursor:pointer;font-weight:bold;";
      close.onclick = () => {
        try { window.EJS_onGameEnd?.(); } catch {}
        overlay.remove();
        resolve();
      };
      bar.appendChild(close);

      const area = document.createElement("div");
      area.style.cssText = "position:relative;flex:1;min-height:0;background:#000;display:flex;align-items:center;justify-content:center;";
      area.innerHTML = '<div id="mga-rom-message" style="color:#00e5ff;font-family:monospace;text-align:center;padding:24px"></div><div id="game" style="width:100%;height:100%;"></div>';

      overlay.append(bar, area);
      document.body.appendChild(overlay);

      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".zip,.7z,.chd,.rom,.bin";
      input.style.display = "none";
      overlay.appendChild(input);

      const message = area.querySelector("#mga-rom-message");
      message.textContent = `Selecione a ROM de ${romName}`;

      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          message.textContent = `INICIANDO ${file.name}...`;
          window.EJS_player = "#game";
          window.EJS_gameName = cleanRomName(file.name);
          window.EJS_gameUrl = URL.createObjectURL(file);
          window.EJS_core = "mame";
          window.EJS_pathtodata = "https://cdn.emulatorjs.org/stable/data/";
          window.EJS_startOnLoaded = true;

          const oldLoader = document.querySelector('script[data-mga-emulatorjs]');
          oldLoader?.remove();

          const script = document.createElement("script");
          script.src = "https://cdn.emulatorjs.org/stable/data/loader.js";
          script.async = true;
          script.dataset.mgaEmulatorjs = "1";
          script.onerror = () => reject(new Error("Não foi possível carregar o EmulatorJS."));
          document.head.appendChild(script);
          message.remove();
          resolve();
        } catch (error) {
          message.textContent = error?.message || "Falha ao iniciar o jogo.";
          reject(error);
        }
      };

      input.click();
    });
  }

  window.MGA_WEB = Object.freeze({
    launch: showWebPlayer,
    version: "1.1.0",
  });

  window.fetch = async function (input, init) {
    const rawUrl = typeof input === "string" ? input : input?.url || "";
    let parsed;
    try { parsed = new URL(rawUrl, location.href); } catch { return originalFetch(input, init); }

    const isNativeApi = parsed.origin === NATIVE_API;
    const isLocalApi = parsed.origin === location.origin && parsed.pathname.startsWith(API_PREFIX);
    if (!isNativeApi && !isLocalApi) {
      return originalFetch(input, init);
    }

    const path = parsed.pathname;
    const method = (init?.method || "GET").toUpperCase();

    if (path === "/api/health") {
      return jsonResponse({ ok: true, port: 0, version: "web-wasm", installDir: "", romsDir: "WEB" });
    }

    if (path === "/api/config" && method === "GET") {
      return jsonResponse({ mamePath: "WEBASSEMBLY", romsDir: "WEB", emulator: "mame-web" });
    }

    if (path === "/api/config" && method === "POST") {
      return jsonResponse({ ok: true, mamePath: "WEBASSEMBLY", romsDir: "WEB" });
    }

    if (path === "/api/check-mame") {
      return jsonResponse({ exists: true, path: "WEBASSEMBLY", currentRompath: "WEB" });
    }

    if (path === "/api/roms") {
      const catalog = await loadCatalog();
      const roms = (catalog.files || []).map((item) => item.name).filter(Boolean).sort((a, b) => a.localeCompare(b));
      return jsonResponse({ roms, path: "WEB", total: roms.length });
    }

    if (path === "/api/gamenames") {
      const titles = await loadTitles();
      return jsonResponse({ names: titles, details: {}, total: Object.keys(titles).length });
    }

    if (path === "/api/launch" && method === "POST") {
      let body = {};
      try { body = JSON.parse(init.body || "{}"); } catch {}
      const romName = body.romName || "ROM";
      try {
        await showWebPlayer(romName);
        return jsonResponse({ ok: true, web: true, romName });
      } catch (error) {
        return jsonResponse({ ok: false, error: error?.message || "Falha no player WebAssembly" }, 500);
      }
    }

    if (path === "/api/roms/status") {
      return jsonResponse({ running: false, completed: 0, total: 0, files: [] });
    }

    if (path === "/api/roms/manifest") {
      const catalog = await loadCatalog();
      return jsonResponse(catalog);
    }

    if (path === "/api/set-rompath" || path === "/api/reset-controls" || path === "/api/test-mame") {
      return jsonResponse({ ok: true, web: true });
    }

    return originalFetch(input, init);
  };

  console.info("[MGA Web] Bridge WebAssembly ativo — API localhost:7777 substituída no navegador.");
})();
