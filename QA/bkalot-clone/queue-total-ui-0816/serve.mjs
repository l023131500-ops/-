// שרת סטטי לבדיקה בלבד: קובץ אחד, שני עותקים, שתי יציאות.
// node serve.mjs <dir> <port>
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const dir = process.argv[2];
const port = Number(process.argv[3]);

createServer(async (req, res) => {
  const name = (req.url || "/").split("?")[0];
  const file = name === "/" || name === "" ? "admin.html" : name.replace(/^\//, "");
  try {
    const buf = await readFile(join(dir, file));
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    res.end(buf);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("not found");
  }
}).listen(port, () => console.log(`up ${port} ${dir}`));
