// Endpoint dedicado para servir arquivos de BIOS (neogeo.zip, pgm.zip, ...).
//
// Como o core arcade/FBNeo do EmulatorJS exige EJS_dontExtractBIOS=true e a
// versão 4.2.3 grava a BIOS usando a PRÓPRIA URL como caminho no sistema de
// arquivos do core, a página NÃO pode apontar para "/api/bios?...". O site
// expõe a BIOS na raiz (ex.: https://site/neogeo.zip) e a vercel.json
// reescreve esse caminho para cá.
//
// O ID do Google Drive é resolvido pelo próprio catálogo (roms-manifest.json),
// então não é preciso manter IDs fixos em vários lugares.
export const config = {
  runtime: "nodejs",
  maxDuration: 300,
};

const CATALOG_URL =
  "https://raw.githubusercontent.com/cordeiroalfa0-dev/master-games-arcade-system/main/roms-manifest.json";

let catalogCache = null;
let catalogCachedAt = 0;

async function loadCatalog() {
  const now = Date.now();
  if (catalogCache && now - catalogCachedAt < 5 * 60 * 1000) return catalogCache;

  const response = await fetch(CATALOG_URL, {
    headers: { "User-Agent": "MasterGamesArcade-Web/1.1", Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Catálogo respondeu ${response.status}.`);

  const data = await response.json();
  catalogCache = Array.isArray(data?.files) ? data.files : [];
  catalogCachedAt = now;
  return catalogCache;
}

async function resolveBiosId(name) {
  const wanted = String(name || "").toLowerCase();
  const files = await loadCatalog();
  const match = files.find(
    (file) => String(file?.name || "").toLowerCase() === wanted && !file?.skipDownload
  );
  return match?.id ? String(match.id).trim() : "";
}

export default async function handler(req, res) {
  const name = String(req.query?.name || "bios.zip").trim() || "bios.zip";
  let id = String(req.query?.id || "").trim();

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.status(405).json({ ok: false, error: "Método não permitido." });
    return;
  }

  if (!id) {
    try {
      id = await resolveBiosId(name);
    } catch (error) {
      res.status(502).json({
        ok: false,
        error: error?.message || "Falha ao consultar o catálogo de ROMs.",
      });
      return;
    }
  }

  if (!id) {
    res.status(404).json({
      ok: false,
      error: `BIOS ${name} não encontrada no catálogo.`,
    });
    return;
  }

  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    res.status(400).json({ ok: false, error: "ID da BIOS inválido." });
    return;
  }

  try {
    const source = `https://drive.usercontent.google.com/download?export=download&id=${encodeURIComponent(id)}&confirm=t`;
    const range = req.headers.range;

    const upstreamHeaders = {
      "User-Agent": "MasterGamesArcade-Web/1.1",
      Accept: "*/*",
    };

    // O EmulatorJS pode solicitar apenas partes do arquivo. Encaminhar o
    // Range evita obrigar a Vercel/Google Drive a transferir o ZIP inteiro
    // de uma vez.
    if (range) upstreamHeaders.Range = range;

    const upstream = await fetch(source, {
      method: req.method,
      redirect: "follow",
      headers: upstreamHeaders,
    });

    if (!upstream.ok || (!upstream.body && req.method !== "HEAD")) {
      res.status(upstream.status || 502).json({
        ok: false,
        error: `Google Drive respondeu ${upstream.status}.`,
      });
      return;
    }

    const contentType = upstream.headers.get("content-type") || "application/zip";
    const contentLength = upstream.headers.get("content-length");
    const contentRange = upstream.headers.get("content-range");
    const acceptRanges = upstream.headers.get("accept-ranges") || "bytes";
    const contentDisposition = `inline; filename="${name.replace(/["\\\r\n]/g, "_")}"`;

    // Se o Drive devolver HTML, normalmente significa página de confirmação,
    // bloqueio ou erro — não uma BIOS. Deixamos o navegador receber a
    // resposta original para o player exibir o diagnóstico em vez de ficar
    // aguardando.
    res.status(upstream.status);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", contentDisposition);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type");
    res.setHeader(
      "Access-Control-Expose-Headers",
      "Accept-Ranges, Content-Length, Content-Range, Content-Type, Content-Disposition"
    );
    res.setHeader("Accept-Ranges", acceptRanges);

    if (contentLength) res.setHeader("Content-Length", contentLength);
    if (contentRange) res.setHeader("Content-Range", contentRange);

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    const { Readable } = await import("node:stream");
    Readable.fromWeb(upstream.body).pipe(res);
  } catch (error) {
    if (res.headersSent) {
      res.destroy(error);
      return;
    }

    res.status(502).json({
      ok: false,
      error: error?.message || "Falha ao baixar a BIOS.",
    });
  }
}
