export const config = {
  runtime: "nodejs",
  maxDuration: 300,
};

export default async function handler(req, res) {
  const id = String(req.query?.id || "").trim();
  const name = String(req.query?.name || "rom.zip").trim() || "rom.zip";

  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    res.status(400).json({ ok: false, error: "ID da ROM inválido." });
    return;
  }

  try {
    const source = `https://drive.usercontent.google.com/download?export=download&id=${encodeURIComponent(id)}&confirm=t`;
    const upstream = await fetch(source, {
      redirect: "follow",
      headers: { "User-Agent": "MasterGamesArcade-Web/1.0" },
    });

    if (!upstream.ok || !upstream.body) {
      res.status(upstream.status || 502).json({ ok: false, error: `Google Drive respondeu ${upstream.status}.` });
      return;
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const contentLength = upstream.headers.get("content-length");

    res.status(200);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${name.replace(/["\\\r\n]/g, "_")}"`);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type");
    res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Content-Type, Content-Disposition");
    if (contentLength) res.setHeader("Content-Length", contentLength);

    const { Readable } = await import("node:stream");
    Readable.fromWeb(upstream.body).pipe(res);
  } catch (error) {
    res.status(502).json({ ok: false, error: error?.message || "Falha ao baixar a ROM." });
  }
}
