// Same throwaway server, pointed at the bundle that is live on more30.com/galil
// (_deploy/galil-more30/galil). Used only to photograph the BEFORE state: the
// old bundle answers /gabai?auto=admin with the management UI and no password.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve("C:/Users/USER/Downloads/more30/_deploy/galil-more30/galil");
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
    try {
      const buf = await readFile(path.join(ROOT, "index.html"));
      res.writeHead(200, { "content-type": TYPES[".html"] });
      res.end(buf);
    } catch {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
    }
  }
}).listen(5132, () => console.log("qa deployed-bundle static on 5132"));
