const http = require("http"), fs = require("fs"), p = require("path");
const root = process.argv[2], port = Number(process.argv[3]);
http.createServer((q, s) => {
  let f = q.url.split("?")[0];
  if (f === "/") f = "/index.html";
  fs.readFile(p.join(root, f), (e, d) => {
    if (e) { s.writeHead(404); s.end("nf"); return; }
    s.writeHead(200, { "content-type": f.endsWith(".html") ? "text/html; charset=utf-8" : "text/plain; charset=utf-8" });
    s.end(d);
  });
}).listen(port, () => console.log("up " + port));
