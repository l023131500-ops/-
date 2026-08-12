// Throwaway static server for QA of apps/24-galilee-connect-hub/dist.
// The app builds with base "/galil/", so it is served under that prefix and
// unknown paths fall back to index.html the way the production rewrite does.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve("C:/Users/USER/Downloads/more30/apps/24-galilee-connect-hub/dist");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".json": "application/json", ".webmanifest": "application/manifest+json", ".woff2": "font/woff2", ".ico": "image/x-icon" };

createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.startsWith("/galil")) p = p.slice("/galil".length);
  if (p === "" || p === "/") p = "/index.html";
  try {
    const buf = await readFile(path.join(ROOT, p));
    res.writeHead(200, { "content-type": TYPES[path.extname(p)] || "application/octet-stream" });
    res.end(buf);
  } catch {
    // SPA fallback — /gabai has no file of its own.
    try {
      const buf = await readFile(path.join(ROOT, "index.html"));
      res.writeHead(200, { "content-type": TYPES[".html"] });
      res.end(buf);
    } catch {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
    }
  }
}).listen(5131, () => console.log("qa static on 5131"));
