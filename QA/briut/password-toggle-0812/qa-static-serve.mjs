// Throwaway static server for QA of apps/06-kupot-holim/site (no build step).
// Serves the admin login gate without Supabase; the gate fails closed anyway.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve("C:/Users/USER/Downloads/more30/apps/06-kupot-holim/site");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json" };

createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "" || p === "/") p = "/index.html";
  try {
    const buf = await readFile(path.join(ROOT, p));
    res.writeHead(200, { "content-type": TYPES[path.extname(p)] || "application/octet-stream" });
    res.end(buf);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  }
}).listen(5128, () => console.log("qa static on 5128"));
