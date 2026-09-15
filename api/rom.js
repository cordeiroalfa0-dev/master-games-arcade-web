export const config = {
  runtime: "nodejs",
  maxDuration: 300,
};

export default async function handler(req, res) {
  const id = String(req.query?.id || "").trim();
  const name = String(req.query?.name || "rom.zip").trim() || "rom.zip";

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type");
    res.status(204).end();
    return;
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.status(405).json({ ok: false, error: "Método não permitido." });
    return;
  }
  if (!/\.(zip|7z|chd)$/i.test(name) || /[\r\n]/.test(name)) {
    res.status(400).json({ ok: false, error: "Nome de ROM inválido." });
    return;
  }

  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    res.status(400).json({ ok: false, error: "ID da ROM inválido." });
    return;
  }

  try {
    const source = `https://drive.usercontent.google.com/download?export=download&id=${encodeURIComponent(id)}&confirm=t`;
    const upstreamHeaders = { "User-Agent": "MasterGamesArcade-Web/1.1", Accept: "*/*" };
    if (req.headers.range) upstreamHeaders.Range = req.headers.range;
    const upstream = await fetch(source, {
      method: req.method,
      redirect: "follow",
      headers: upstreamHeaders,
    });

    if (!upstream.ok || (!upstream.body && req.method !== "HEAD")) {
      res.status(upstream.status || 502).json({ ok: false, error: `Google Drive respondeu ${upstream.status}.` });
      return;
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const contentLength = upstream.headers.get("content-length");
    const contentRange = upstream.headers.get("content-range");

    res.status(upstream.status || 200);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${name.replace(/["\\\r\n]/g, "_")}"`);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type");
    res.setHeader("Access-Control-Expose-Headers", "Accept-Ranges, Content-Length, Content-Range, Content-Type, Content-Disposition");
    res.setHeader("Accept-Ranges", "bytes");
    if (contentLength) res.setHeader("Content-Length", contentLength);
    if (contentRange) res.setHeader("Content-Range", contentRange);

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    const { Readable } = await import("node:stream");
    Readable.fromWeb(upstream.body).pipe(res);
  } catch (error) {
    res.status(502).json({ ok: false, error: error?.message || "Falha ao baixar a ROM." });
  }
}
