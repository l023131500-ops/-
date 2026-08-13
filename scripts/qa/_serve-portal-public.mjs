// שרת סטטי זמני לבדיקת portal/public בדפדפן לפני פריסה.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? 'portal/public');
const port = Number(process.argv[3] ?? 8791);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json' };

http
  .createServer((req, res) => {
    let url = decodeURIComponent(req.url.split('?')[0]);
    if (url.endsWith('/')) url += 'index.html';
    let file = path.join(root, url);
    if (!path.extname(file) && !fs.existsSync(file)) file += '.html';
    fs.readFile(file, (err, buf) => {
      if (err) {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('not found');
        return;
      }
      res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
      res.end(buf);
    });
  })
  .listen(port, () => console.log('serving ' + root + ' on http://localhost:' + port));
