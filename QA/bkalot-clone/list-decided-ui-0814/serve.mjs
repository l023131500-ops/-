// שרת סטטי מקומי ל-apps/37-bkalot-clone. BASE ב-admin.html הוא כתובת מוחלטת,
// ולכן המסך שנפתח כאן מדבר עם ה-edge וה-DB החיים — נמדד המסלול המלא של הנתונים,
// אך לא מסלול הפריסה (rewrite, dist, NetFree). זו בדיוק ההבחנה שנרשמה ב-1abad72.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../../apps/37-bkalot-clone/", import.meta.url));
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };

createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/" ) p = "/index.html";
  if (p === "/admin") p = "/admin.html";
  try {
    const buf = await readFile(ROOT + p.replace(/^\//, ""));
    const ext = p.slice(p.lastIndexOf("."));
    res.writeHead(200, { "content-type": TYPES[ext] ?? "application/octet-stream" });
    res.end(buf);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("404");
  }
}).listen(8137, () => console.log("http://127.0.0.1:8137/admin"));
