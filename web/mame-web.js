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
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });

  const loadCatalog = async () => {
    if (!catalogPromise) {
      catalogPromise = originalFetch(CATALOG_URL).then((response) => {
        if (!response.ok) throw new Error("Catálogo de ROMs indisponível");
        return response.json();
      });
    }
    return catalogPromise;
  };

  const loadTitles = async () => {
    if (!titlesPromise) {
      titlesPromise = originalFetch(TITLES_URL)
        .then((response) => response.ok ? response.json() : {})
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
  //
  // MESMO AJUSTE DA BIOS DA NEO GEO PARA TODAS AS OUTRAS BIOS:
  // a BIOS é sempre servida na RAIZ do site com o nome exato do arquivo
  // (ex.: /neogeo.zip, /pgm.zip, /qsound.zip), o player usa EJS_biosUrl com
  // esse caminho simples e EJS_dontExtractBIOS=true mantém o ZIP intacto
  // para o FBNeo fazer o merge com o romset. Sem o rewrite da raiz em
  // vercel.json a BIOS nunca chega ao core.
  const BIOS_RULES = [
    {
      bios: "neogeo.zip",
      games: new Set([
        "androdun", "aof3", "bjourney", "breakers", "breakrev", "eightman",
        "fatfursp", "fatfury3", "garou", "kf10thep", "kf2k2mp2", "kf2k5uni",
        "kizuna", "kof2k4se", "kof94", "kof95", "kof96", "kof97", "kof98",
        "kof99", "kof2000", "kof2001", "kof2002", "kof2003", "lastbld2",
        "lbowling", "magdrop3", "matrim", "mslug", "mslug2", "mslug3",
        "mslug3b6", "mslug4", "mslug5", "mslugx", "neobombe", "ninjamas",
        "pbobblen", "preisle2", "rbffspec", "rotd", "samsh5sp", "samsho",
        "samsho2", "samsho3", "samsho4", "savagere", "sengoku3", "shocktr2",
        "sonicwi2", "sonicwi3", "spinmast", "ssideki3", "ssideki4",
        "strhoop", "svc", "svcsplus", "tetrisp", "twinspri", "wakuwak7",
        "whp", "zedblade"
      ])
    },
    {
      // CPS1 com QSound e TODOS os jogos de CPU CPS2 dependem da ROM do DSP
      // QSound, que nos romsets atuais fica no device set qsound.zip.
      bios: "qsound.zip",
      games: new Set([
        "avsp", "avspu", "csclub", "ddsom", "ddtod", "dino", "dstlk", "hsf2",
        "msh", "mshu", "mshvsf", "mvsc", "nwarru", "punisher", "sfa", "sfa2",
        "sfa2u", "sfa3", "sfz2ald", "sgemf", "slammast", "spf2t", "ssf2",
        "ssf2t", "vhunt2", "vsav", "vsavj", "wof", "xmcota", "xmvsf",
        "xmvsfur1"
      ])
    },
    {
      // Placa PGM (IGS): a BIOS pgm.zip é obrigatória em todos os sets.
      bios: "pgm.zip",
      games: new Set([
        "ddp2", "dmnfrnt", "drgw2", "dw2001", "dw3", "killbld", "kov",
        "kov2", "kovplus", "kovsh", "martmast", "olds", "oldsplus",
        "orlegend", "photoy2k", "purpland", "puzzli2", "py2k2", "theglad"
      ])
    },
    {
      bios: "isgsm.zip",
      games: new Set(["isgsm"])
    }
  ];

  // CPS3 (Street Fighter III, JoJo, Warzard): no romset MAME/FBNeo a BIOS da
  // placa já vem DENTRO do ZIP de cada jogo (ex.: sfiii3 traz o próprio
  // bios .29f400.u2). Não existe cps3.zip para ser servido na raiz, então
  // esses jogos não recebem EJS_biosUrl e também não devem gerar aviso de
  // "BIOS não encontrada". Se o jogo não iniciar, o que falta é o set
  // "nocd" completo (ou o CHD do CD correspondente), não uma BIOS externa.
  const SELF_CONTAINED_BIOS = new Set([
    "sfiii", "sfiii2", "sfiii2n", "sfiii3", "sfiii3n", "sfiii3nr1",
    "jojo", "jojoba", "jojoban", "jojobane", "jojon", "redearth", "warzard"
  ]);

  const biosForGame = (name) => {
    const base = fileBase(name);
    if (SELF_CONTAINED_BIOS.has(base)) return "";
    const rule = BIOS_RULES.find((entry) => entry.games.has(base));
    return rule?.bios || "";
  };

  async function resolveRom(romName, message) {
    const catalog = await loadCatalog();
    const files = Array.isArray(catalog.files) ? catalog.files : [];

    const item = files.find((entry) => entry?.name === romName);

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

    // O player recebe a BIOS pela rota dinâmica anterior, que mantém a
    // resolução do catálogo no backend e funciona com o fluxo padrão do
    // EmulatorJS para ZIPs de BIOS.
    const biosUrl =
      bios && !bios.skipDownload
        ? `/api/bios?name=${encodeURIComponent(bios.name)}`
        : "";

    if (!biosName && SELF_CONTAINED_BIOS.has(fileBase(item.name))) {
      console.info(
        `[MGA Web] ${item.name} (CPS3) usa a BIOS embutida no próprio romset.`
      );
    }

    if (biosName && !biosUrl) {
      console.warn(
        `[MGA Web] BIOS ${biosName} não foi encontrada no catálogo para ${item.name}.`
      );
    }

    message.textContent = `CARREGANDO ${item.name}...`;

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
      close.textContent = "✕ FECHAR";
      close.style.cssText =
        "pointer-events:auto;background:#16051d;border:1px solid #ff2bd6;box-shadow:0 0 10px #ff2bd655;color:#fff;padding:7px 12px;cursor:pointer;font-weight:bold;font-family:Arial,sans-serif;";
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
    version: "1.6.0"
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
      const biosFiles = new Set(["neogeo.zip", "pgm.zip", "isgsm.zip"]);

      const roms = (catalog.files || [])
        .map((item) => item.name)
        .filter(Boolean)
        .filter((name) => !biosFiles.has(fileBase(name)))
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
