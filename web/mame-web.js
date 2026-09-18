/* Master Games Arcade Web - bridge da camada nativa para WebAssembly.
 * Mantém o renderer original e substitui somente as rotas do backend local.
 */
(() => {
  const API_PREFIX = "/api/";
  const NATIVE_API = "http://localhost:7777";
  const CATALOG_URLS = [
    "/roms-catalog.json",
    "https://raw.githubusercontent.com/cordeiroalfa0-dev/master-games-arcade-system/main/roms-manifest.json"
  ];
  const TITLES_URLS = [
    "/game-titles.json",
    "https://raw.githubusercontent.com/cordeiroalfa0-dev/master-games-arcade-system/main/dist/client/game-titles.json"
  ];
  const originalFetch = window.fetch.bind(window);
  let catalogPromise;
  let titlesPromise;
  const STORAGE = {
    recent: 'mga-recent-games-v1',
    favorites: 'mga-favorite-games-v1'
  };

  const readList = (key) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value.filter(Boolean) : [];
    } catch { return []; }
  };
  const writeList = (key, list) => {
    try { localStorage.setItem(key, JSON.stringify([...new Set(list)].slice(0, 100))); } catch {}
  };
  const rememberRecent = (name) => {
    const value = String(name || '').trim();
    if (value) writeList(STORAGE.recent, [value, ...readList(STORAGE.recent)]);
  };
  const toggleFavorite = (name) => {
    const value = String(name || '').trim();
    const current = readList(STORAGE.favorites);
    const next = current.includes(value) ? current.filter((item) => item !== value) : [value, ...current];
    writeList(STORAGE.favorites, next);
    return next;
  };

  const jsonResponse = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });

  const fetchFirstJson = async (urls, errorMessage) => {
    let lastError;
    for (const url of urls) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        const response = await originalFetch(url, { cache: 'no-store', signal: controller.signal });
        clearTimeout(timer);
        if (!response.ok) throw new Error(`${response.status}`);
        return await response.json();
      } catch (error) {
        lastError = error;
      }
    }
    throw new Error(errorMessage + (lastError ? ` (${lastError.message})` : ""));
  };

  const loadCatalog = async () => {
    if (!catalogPromise) {
      catalogPromise = fetchFirstJson(CATALOG_URLS, "Catálogo de ROMs indisponível");
    }
    return catalogPromise;
  };

  const loadTitles = async () => {
    if (!titlesPromise) {
      titlesPromise = fetchFirstJson(TITLES_URLS, "Nomes dos jogos indisponíveis")
        .catch(() => ({}));
    }
    return titlesPromise;
  };

  const cleanRomName = (name) =>
    String(name || "").replace(/\.(zip|7z|chd)$/i, "");

  const fileBase = (name) =>
    String(name || "")
      .toLowerCase()
      .replace(/\.(zip|7z|chd)$/i, "");

  // O core arcade do EmulatorJS utiliza FBNeo nesta configuração.
  // Cada ROM precisa pertencer ao romset compatível com a versão do core.
  const BIOS_RULES = [
    {
      bios: "neogeo.zip",
      games: new Set([
        "aof3", "bjourney", "breakers", "breakrev", "eightman",
        "fatfursp", "fatfury3", "garou", "kizuna", "kof94", "kof95",
        "kof96", "kof97", "kof98", "kof99", "kof2000", "kof2001",
        "kof2002", "kof2003", "lastbld2", "lbowling", "magdrop3",
        "matrim", "mslug", "mslug2", "mslug3", "mslug4", "mslug5",
        "mslugx", "samsho", "samsho2", "samsho3", "samsho4", "sengoku3",
        "sonicwi2", "sonicwi3", "svc", "svcsplus", "twinspri", "wakuwak7",
        "whp", "neobombe", "rbffspec", "rotd", "samsh5sp", "ninjamas",
        "kf2k2mp2", "kf2k5uni", "kf10thep", "kof2k4se", "strhoop",
        "ssideki3", "ssideki4", "tetrisp", "spinmast", "zedblade",
        "shocktr2", "sengoku3", "matrim", "puzzled", "kizuna", "pbobblen",
        "doubledr", "sailormn"
      ])
    },
    {
      bios: "pgm.zip",
      games: new Set([
        "dbz2", "martmast", "pcktgal", "sailormn", "savagere"
      ])
    },
    {
      bios: "qsound.zip",
      games: new Set([
        "avsp", "avspu", "ddsom", "ddtod", "dstlk", "hsf2", "msh",
        "mshvsf", "mvsc", "nwarru", "sfa", "sfa2u", "sfa3", "sfz2ald",
        "sgemf", "spf2t", "ssf2", "ssf2t", "vhunt2", "vsavj", "xmcota",
        "xmvsfur1"
      ])
    },
    {
      bios: "isgsm.zip",
      games: new Set(["isgsm"])
    }
  ];

  const biosForGame = (name) => {
    const base = fileBase(name);
    const rule = BIOS_RULES.find((entry) => entry.games.has(base));
    return rule?.bios || "";
  };

  const SYSTEM_FILES = new Set([
    "ar_bios.zip", "awbios.zip", "naomi.zip", "neogeo.zip", "nss.zip",
    "pgm.zip", "qsound.zip", "isgsm.zip", "dir.txt"
  ]);

  const isPlayableRom = (name) =>
    /\.(zip|7z|chd)$/i.test(String(name || "")) &&
    !SYSTEM_FILES.has(String(name || "").toLowerCase());

  const compatibilityFor = (name, files) => {
    const biosName = biosForGame(name);
    const bios = biosName && files.find((entry) => fileBase(entry?.name) === fileBase(biosName));
    return {
      rom: name,
      bios: biosName || null,
      biosAvailable: !!bios && !bios.skipDownload,
      biosUrl: bios && !bios.skipDownload ? `/${bios.name}` : null,
      core: /^(avsp|ddsom|ddtod|dstlk|hsf2|msh|mshvsf|mvsc|sfa|sfa2|sfa3|sfz2al|sgemf|spf2t|ssf2|ssf2t|vhunt2|vsav|xmcota|xmvsf|progear)\.zip$/i.test(name) ? 'fbalpha2012_cps2' : 'arcade'
    };
  };

  async function resolveRom(romName, message) {
    const catalog = await loadCatalog();
    const files = Array.isArray(catalog.files) ? catalog.files : [];

    let item = files.find((entry) => entry?.name === romName);
    if (item?.duplicateOf) {
      const original = files.find((entry) => entry?.name === item.duplicateOf && !entry.skipDownload);
      if (original) item = original;
    }

    if (!item?.id || item.skipDownload) {
      throw new Error(`ROM não disponível para download: ${romName}`);
    }

    // IMPORTANTE: a URL da ROM precisa TERMINAR com o nome real do arquivo
    // (ex.: .../mslug.zip). O EmulatorJS usa o último segmento da URL como
    // nome do arquivo gravado no sistema de arquivos do core, e o FBNeo
    // identifica o romset por esse nome. Com `/api/rom?id=...&name=...`
    // o arquivo era gravado como "rom", sem extensão, e o core não
    // reconhecia o jogo nem casava com a BIOS.
    const romUrl =
      `/api/rom/${encodeURIComponent(item.id)}/${encodeURIComponent(item.name)}`;

    const biosName =
      item.bios ||
      item.biosName ||
      biosForGame(item.name);

    const bios = biosName && files.find(
      (entry) => fileBase(entry?.name) === fileBase(biosName)
    );

    // A BIOS precisa ser servida na RAIZ do site com o nome exato
    // (ex.: /neogeo.zip). Com EJS_dontExtractBIOS=true o EmulatorJS 4.2.3
    // grava a BIOS usando a própria URL como caminho no sistema de
    // arquivos: uma URL com query string ("/api/bios?id=...") gerava um
    // caminho inválido e a BIOS nunca chegava ao core. O rewrite da Vercel
    // encaminha /neogeo.zip, /pgm.zip e /isgsm.zip para /api/bios.
    const biosUrl =
      bios && !bios.skipDownload ? `/${bios.name}` : "";

    if (biosName && !biosUrl) {
      console.warn(
        `[MGA Web] BIOS ${biosName} não foi encontrada no catálogo para ${item.name}.`
      );
    }

    message.textContent = `CARREGANDO ${item.name}...`;
    rememberRecent(item.name);

    return {
      item,
      url: romUrl,
      biosUrl,
      biosName
    };
  }

  function createWebPlayer(
    romName,
    romUrl,
    message,
    overlay,
    biosUrl = "",
    biosName = ""
  ) {
    const iframe = document.createElement("iframe");
    iframe.title = `Master Games Arcade - ${cleanRomName(romName)}`;
    iframe.allow = "autoplay; fullscreen; gamepad";
    iframe.setAttribute("allowfullscreen", "true");
    iframe.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;border:0;background:#000;display:block;";

    const playerUrl = new URL("/web/player.html", location.origin);
    playerUrl.searchParams.set("rom", romUrl);
    playerUrl.searchParams.set("name", cleanRomName(romName));
    // O player é alterado junto com o bridge; versionar a URL evita que o
    // navegador reutilize uma versão antiga que ainda exibia o menu RetroArch.
    playerUrl.searchParams.set("v", "20260918-portrait-fill-v2");
    if (biosUrl) playerUrl.searchParams.set("bios", biosUrl);
    if (biosName) playerUrl.searchParams.set("biosName", biosName);

    let closed = false;

    const closePlayer = () => {
      if (closed) return;
      closed = true;
      window.removeEventListener("message", onMessage);
      iframe.src = "about:blank";
      iframe.remove();
      overlay.remove();
    };

    const onMessage = (event) => {
      if (
        event.origin !== location.origin ||
        event.source !== iframe.contentWindow
      ) return;

      if (event.data?.type === "mga-emulator-started") {
        message.remove();
      }

      if (event.data?.type === "mga-emulator-exit") {
        closePlayer();
      }

      if (event.data?.type === "mga-emulator-error") {
        message.textContent =
          event.data.message || "Erro ao iniciar o jogo.";
      }
    };

    window.addEventListener("message", onMessage);

    iframe.onload = () => {
      // O player.html já exibe o estado de carregamento e o próprio botão
      // Start Game. Não mantenha a mensagem do launcher sobre o iframe,
      // pois ela pode esconder o botão que o usuário precisa clicar.
      message.style.display = "none";
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
      overlay.style.cssText =
        "position:fixed;inset:0;z-index:2147483647;background:#000;overflow:hidden;font-family:Arial,sans-serif;";

      const area = document.createElement("div");
      area.id = "mga-web-player-area";
      area.style.cssText = "position:absolute;inset:0;background:#000;";

      const bar = document.createElement("div");
      bar.style.cssText =
        "position:absolute;top:0;left:0;right:0;height:44px;z-index:20;display:flex;align-items:center;justify-content:space-between;padding:0 12px 0 14px;box-sizing:border-box;background:linear-gradient(180deg,#08000f 0%,rgba(8,0,15,.78) 72%,transparent 100%);color:#fff;pointer-events:none;";

      const brand = document.createElement("strong");
      brand.textContent = "MASTER GAMES ARCADE";
      brand.style.cssText =
        "font-family:monospace;color:#00e5ff;letter-spacing:1px;font-size:12px;text-shadow:0 0 8px #00e5ff;";
      bar.appendChild(brand);

      const close = document.createElement("button");
      close.type = "button";
      close.textContent = "✕";
      close.title = "Fechar";
      close.setAttribute("aria-label", "Fechar");
      close.style.cssText =
        "pointer-events:auto;width:36px;height:36px;padding:0;display:grid;place-items:center;background:#16051d;border:1px solid #ff2bd6;box-shadow:0 0 10px #ff2bd655;color:#fff;cursor:pointer;font-size:20px;font-weight:bold;line-height:1;font-family:Arial,sans-serif;";
      bar.appendChild(close);

      const message = document.createElement("div");
      message.id = "mga-rom-message";
      message.textContent = `PREPARANDO ${romName}...`;
      message.style.cssText =
        "position:absolute;inset:0;z-index:10;display:grid;place-items:center;background:#000;color:#00e5ff;font-family:monospace;font-size:16px;font-weight:bold;text-align:center;padding:24px;box-sizing:border-box;text-shadow:0 0 8px #00e5ff;pointer-events:none;";

      overlay.append(area, message, bar);
      document.body.appendChild(overlay);

      let player;
      close.onclick = () => player?.closePlayer();

      (async () => {
        try {
          const { item, url, biosUrl, biosName } =
            await resolveRom(romName, message);
          player = createWebPlayer(
            item.name,
            url,
            message,
            overlay,
            biosUrl,
            biosName
          );
          resolve();
        } catch (error) {
          message.textContent =
            error?.message || "Falha ao iniciar a ROM.";
          reject(error);
        }
      })();
    });
  }

  window.MGA_WEB = Object.freeze({
    launch: showWebPlayer,
    version: "1.5.3"
  });

  window.fetch = async function(input, init) {
    const rawUrl =
      typeof input === "string" ? input : input?.url || "";

    let parsed;
    try {
      parsed = new URL(rawUrl, location.href);
    } catch {
      return originalFetch(input, init);
    }

    const isNativeApi = parsed.origin === NATIVE_API;
    const isLocalApi =
      parsed.origin === location.origin &&
      parsed.pathname.startsWith(API_PREFIX);

    if (!isNativeApi && !isLocalApi) {
      return originalFetch(input, init);
    }

    const path = parsed.pathname;
    const method = (init?.method || "GET").toUpperCase();

    if (path === "/api/health") {
      return jsonResponse({
        ok: true,
        port: 0,
        version: "web-wasm",
        installDir: "",
        romsDir: "WEB"
      });
    }

    if (path === "/api/config" && method === "GET") {
      return jsonResponse({
        mamePath: "WEBASSEMBLY",
        romsDir: "WEB",
        emulator: "arcade-fbneo"
      });
    }

    if (path === "/api/config" && method === "POST") {
      return jsonResponse({
        ok: true,
        mamePath: "WEBASSEMBLY",
        romsDir: "WEB",
        emulator: "arcade-fbneo"
      });
    }

    if (path === "/api/check-mame") {
      return jsonResponse({
        exists: true,
        path: "WEBASSEMBLY",
        currentRompath: "WEB",
        emulator: "arcade-fbneo"
      });
    }

    if (path === "/api/art") {
      return jsonResponse(
        { ok: false, available: false, url: null },
        404
      );
    }

    if (path === "/api/roms") {
      const catalog = await loadCatalog();

      const roms = (catalog.files || [])
        .filter((item) => !item?.skipDownload && !item?.duplicateOf)
        .map((item) => item.name)
        .filter(Boolean)
        .filter(isPlayableRom)
        .sort((a, b) => a.localeCompare(b));

      return jsonResponse({
        roms,
        path: "WEB",
        total: roms.length
      });
    }

    if (path === "/api/gamenames") {
      const [titles, catalog] = await Promise.all([
        loadTitles(),
        loadCatalog()
      ]);

      const names = { ...titles };

      for (const item of catalog.files || []) {
        const name = String(item?.name || "");
        if (!/\.(zip|7z|chd)$/i.test(name)) continue;

        const key = fileBase(name);
        if (key && !names[key]) {
          names[key] = key
            .replace(/[-_]+/g, " ")
            .replace(/\b\w/g, (letter) => letter.toUpperCase());
        }
      }

      return jsonResponse({
        names,
        details: {},
        total: Object.keys(names).length
      });
    }

    if (path === "/api/roms/check" && method === "GET") {
      const catalog = await loadCatalog();
      const requested = parsed.searchParams.get("name") || "";
      const files = Array.isArray(catalog.files) ? catalog.files : [];
      const item = files.find((entry) => entry?.name === requested);
      if (!item) return jsonResponse({ ok: false, error: "ROM não encontrada no catálogo." }, 404);
      const resolved = item.duplicateOf || item.name;
      return jsonResponse({ ok: true, available: !item.skipDownload, duplicateOf: item.duplicateOf || null, resolved, ...compatibilityFor(resolved, files) });
    }

    if (path === "/api/bios/status" && method === "GET") {
      const catalog = await loadCatalog();
      const files = Array.isArray(catalog.files) ? catalog.files : [];
      const bios = [...new Set(BIOS_RULES.map((rule) => rule.bios))].map((name) => {
        const entry = files.find((file) => file?.name === name);
        return { name, available: !!entry && !entry.skipDownload, id: entry?.id || null };
      });
      return jsonResponse({ ok: true, bios });
    }

    if (path === "/api/games/recent" && method === "GET") {
      return jsonResponse({ ok: true, games: readList(STORAGE.recent) });
    }

    if (path === "/api/games/favorites" && method === "GET") {
      return jsonResponse({ ok: true, games: readList(STORAGE.favorites) });
    }

    if (path === "/api/games/favorites" && method === "POST") {
      let body = {};
      try { body = JSON.parse(init.body || "{}"); } catch {}
      const games = toggleFavorite(body.name || body.romName);
      return jsonResponse({ ok: true, games });
    }

    if (path === "/api/gamepads" && method === "GET") {
      return jsonResponse({ ok: true, ...(window.MGA_Gamepads?.get?.() || { connected: 0, players: [] }) });
    }

    if (path === "/api/launch" && method === "POST") {
      let body = {};
      try {
        body = JSON.parse(init.body || "{}");
      } catch {}

      const romName = body.romName || "ROM";

      try {
        await showWebPlayer(romName);
        return jsonResponse({ ok: true, web: true, romName });
      } catch (error) {
        return jsonResponse(
          {
            ok: false,
            error: error?.message || "Falha no player WebAssembly"
          },
          500
        );
      }
    }

    if (path === "/api/roms/status") {
      return jsonResponse({
        running: false,
        completed: 0,
        total: 0,
        files: []
      });
    }

    if (path === "/api/roms/manifest") {
      const catalog = await loadCatalog();
      return jsonResponse(catalog);
    }

    if (
      path === "/api/set-rompath" ||
      path === "/api/reset-controls" ||
      path === "/api/test-mame"
    ) {
      return jsonResponse({ ok: true, web: true });
    }

    return originalFetch(input, init);
  };

  console.info(
    "[MGA Web] Bridge WebAssembly ativo — EmulatorJS FBNeo, ROM e BIOS por URL."
  );
})();
