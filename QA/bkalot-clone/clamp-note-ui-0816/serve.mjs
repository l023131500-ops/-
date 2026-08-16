// שרת סטטי מקומי ל-apps/37-bkalot-clone. הקובץ מדבר אל ה-edge וה-DB החיים
// (BASE ב-admin.html הוא כתובת מוחלטת), ולכן מה שנמדד כאן הוא הקוד מול המוצר
// החי — ולא הפריסה עצמה. הפריסה היא פעימה נפרדת.
//
// ⚠️ הקובץ נקרא מהדיסק בכל בקשה ואינו נשמר בזיכרון.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const ROOT = process.argv[2];
const PORT = Number(process.argv[3] ?? 8141);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml" };

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const file = join(ROOT, path === "/" ? "index.html" : path.replace(/^\/+/, ""));
  try {
    const buf = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
    res.end(buf);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("not found");
  }
}).listen(PORT, () => console.log("serving " + ROOT + " on http://127.0.0.1:" + PORT));
