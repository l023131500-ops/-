// שרת סטטי מקומי שמגיש את הקובץ מהריפו מול ה-edge והמסד החיים.
// זו מדידה של הקוד ולא של המוצר — הפריסה נמדדת בנפרד.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
const dir = "C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/";
createServer((req, res) => {
  const name = (req.url || "/").split("?")[0].replace(/^\/+/, "") || "index.html";
  try {
    const buf = readFileSync(dir + name);
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(buf);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("no");
  }
}).listen(8137, "127.0.0.1", () => console.log("up on 8137"));
