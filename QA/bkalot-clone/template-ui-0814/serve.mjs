// שרת סטטי מקומי שמגיש את apps/37-bkalot-clone מול ה-edge והמסד החיים.
// זו מדידה של הקוד ולא של המוצר — ה-rewrite, ההעתקה ל-dist ו-236 הבייטים
// ש-NetFree מזריק אינם נבדקים כאן. הפריסה היא הצעד הבא, כמו בכל לבנה כאן.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const ROOT = "C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/";
createServer((req, res) => {
  const name = req.url.split("?")[0].replace(/^\/+/, "") || "index.html";
  try {
    const buf = readFileSync(ROOT + name);
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(buf);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("not found");
  }
}).listen(8138, () => console.log("serving on http://127.0.0.1:8138"));
