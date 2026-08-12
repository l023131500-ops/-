// Throwaway static server for QA of the built client (base /mechiron/).
// Not part of the app build; used to render the login pages without the API.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), "dist/public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json" };

createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.startsWith("/mechiron")) p = p.slice("/mechiron".length);
  if (p === "" || p === "/") p = "/index.html";
  const file = path.join(ROOT, p);
  try {
    const buf = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
    res.end(buf);
  } catch {
    const buf = await readFile(path.join(ROOT, "index.html"));
    res.writeHead(200, { "content-type": "text/html" });
    res.end(buf);
  }
}).listen(5127, () => console.log("qa static on 5127"));
