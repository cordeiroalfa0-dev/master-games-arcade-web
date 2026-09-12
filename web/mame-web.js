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
  let activeRomUrl = null;

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

  async function downloadRom(romName, message) {
    const catalog = await loadCatalog();
    const item = (catalog.files || []).find((entry) => entry?.name === romName);

    if (!item?.id || item.skipDownload) {
      throw new Error(`ROM não disponível para download: ${romName}`);
    }

    const url = `/api/rom?id=${encodeURIComponent(item.id)}&name=${encodeURIComponent(item.name)}`;
    message.textContent = `BAIXANDO ${item.name}...`;

    const response = await originalFetch(url);
    if (!response.ok || !response.body) {
      let detail = `HTTP ${response.status}`;
      try {
        const data = await response.json();
        detail = data?.error || detail;
      } catch {}
      throw new Error(`Não foi possível baixar ${item.name}: ${detail}`);
    }

    const total = Number(response.headers.get("content-length")) || 0;
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      if (total > 0) {
        const percent = Math.min(100, Math.round((received / total) * 100));
        message.textContent = `BAIXANDO ${item.name}... ${percent}%`;
      } else {
        message.textContent = `BAIXANDO ${item.name}... ${(received / 1048576).toFixed(1)} MB`;
      }
    }

    if (!received) {
      throw new Error(`A ROM ${item.name} foi recebida vazia.`);
    }

    const blob = new Blob(chunks, {
      type: response.headers.get("content-type") || "application/zip",
    });

    if (activeRomUrl) URL.revokeObjectURL(activeRomUrl);
    activeRomUrl = URL.createObjectURL(blob);

    return { item, url: activeRomUrl };
  }

  function createWebPlayer(romName, romUrl, message, overlay) {
    const iframe = document.createElement("iframe");
    iframe.title = `Master Games Arcade - ${cleanRomName(romName)}`;
    iframe.allow = "autoplay; fullscreen; gamepad";
    iframe.setAttribute("allowfullscreen", "true");
    iframe.style.cssText = [
      "position:absolute;inset:0;width:100%;height:100%;",
      "border:0;background:#000;display:block;",
    ].join("");

    const playerUrl = new URL("/web/player.html", location.origin);
    playerUrl.searchParams.set("rom", romUrl);
    playerUrl.searchParams.set("name", cleanRomName(romName));

    let settled = false;

    const finishLoading = () => {
      if (settled) return;
      settled = true;
      message.remove();
    };

    const onMessage = (event) => {
      if (event.origin !== location.origin || event.source !== iframe.contentWindow) return;
      if (event.data?.type === "mga-emulator-started") finishLoading();
      if (event.data?.type === "mga-emulator-exit") closePlayer();
    };

    const closePlayer = () => {
      window.removeEventListener("message", onMessage);
      iframe.src = "about:blank";
      iframe.remove();
      if (activeRomUrl) {
        URL.revokeObjectURL(activeRomUrl);
        activeRomUrl = null;
      }
      overlay.remove();
    };

    window.addEventListener("message", onMessage);
    iframe.onload = () => {
      message.textContent = `INICIANDO ${cleanRomName(romName)}...`;
    };
    iframe.src = playerUrl.href;
    overlay.querySelector("#mga-web-player-area").appendChild(iframe);

    return { closePlayer };
  }

  function showWebPlayer(romName) {
    return new Promise((resolve, reject) => {
      document.getElementById("mga-web-player")?.remove();

      const overlay = document.createElement("div");
      overlay.id = "mga-web-player";
      overlay.style.cssText = [
        "position:fixed;inset:0;z-index:2147483647;background:#000;",
        "overflow:hidden;font-family:Arial,sans-serif;",
      ].join("");

      const area = document.createElement("div");
      area.id = "mga-web-player-area";
      area.style.cssText = "position:absolute;inset:0;background:#000;";

      const bar = document.createElement("div");
      bar.style.cssText = [
        "position:absolute;top:0;left:0;right:0;height:44px;z-index:20;",
        "display:flex;align-items:center;justify-content:space-between;",
        "padding:0 12px 0 14px;box-sizing:border-box;",
        "background:linear-gradient(180deg,#08000f 0%,rgba(8,0,15,.78) 72%,transparent 100%);",
        "color:#fff;pointer-events:none;",
      ].join("");

      const brand = document.createElement("strong");
      brand.textContent = "MASTER GAMES ARCADE";
      brand.style.cssText = "font-family:monospace;color:#00e5ff;letter-spacing:1px;font-size:12px;text-shadow:0 0 8px #00e5ff;";
      bar.appendChild(brand);

      const close = document.createElement("button");
      close.type = "button";
      close.textContent = "✕ FECHAR";
      close.style.cssText = [
        "pointer-events:auto;background:#16051d;border:1px solid #ff2bd6;",
        "box-shadow:0 0 10px #ff2bd655;color:#fff;padding:7px 12px;",
        "cursor:pointer;font-weight:bold;font-family:Arial,sans-serif;",
      ].join("");
      bar.appendChild(close);

      const message = document.createElement("div");
      message.id = "mga-rom-message";
      message.textContent = `PREPARANDO ${romName}...`;
      message.style.cssText = [
        "position:absolute;inset:0;z-index:10;display:grid;place-items:center;",
        "background:#000;color:#00e5ff;font-family:monospace;font-size:16px;",
        "font-weight:bold;text-align:center;padding:24px;box-sizing:border-box;",
        "text-shadow:0 0 8px #00e5ff;pointer-events:none;",
      ].join("");

      overlay.append(area, message, bar);
      document.body.appendChild(overlay);

      let player;
      close.onclick = () => player?.closePlayer();

      (async () => {
        try {
          const { item, url } = await downloadRom(romName, message);
          player = createWebPlayer(item.name, url, message, overlay);
          resolve();
        } catch (error) {
          message.textContent = error?.message || "Falha ao baixar/iniciar a ROM.";
          reject(error);
        }
      })();
    });
  }

  window.MGA_WEB = Object.freeze({
    launch: showWebPlayer,
    version: "1.3.0",
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

  console.info("[MGA Web] Bridge WebAssembly 1.3.0 ativo — player isolado, ROM automática e inicialização direta.");
})();
