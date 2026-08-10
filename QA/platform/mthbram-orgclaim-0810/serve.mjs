import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
createServer(async (req, res) => {
  const name = (req.url || "/").split("?")[0].replace(/^\/+/, "") || "canvas-and-share.html";
  try {
    const body = await readFile(join(root, name));
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
}).listen(8799, "127.0.0.1", () => console.log("up on 8799"));
