// שרת סטטי זמני ל-QA בלבד. Playwright חוסם file://, ו-fetch מ-origin "null"
// אינו מייצג את מה שהמשתמש יראה — לכן הדף נמדד על HTTP אמיתי.
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = process.argv[2];
const PORT = Number(process.argv[3] || 8791);

http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(ROOT, rel === "/" ? "index.html" : rel);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404).end("not found"); return; }
    const type = file.endsWith(".html") ? "text/html; charset=utf-8" : "application/octet-stream";
    res.writeHead(200, { "content-type": type }).end(buf);
  });
}).listen(PORT, "127.0.0.1", () => console.log("listening on " + PORT));
