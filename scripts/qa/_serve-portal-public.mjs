// שרת סטטי זמני לבדיקת portal/public בדפדפן לפני פריסה.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? 'portal/public');
const port = Number(process.argv[3] ?? 8791);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json' };

// אופציונלי: QA_API_CONFIG מגיש JSON קבוע ב-/api/config, לאפליקציות שמושכות
// משם את פרטי Supabase לפני שהן מציירות מסך (19 שיעורים). זה מאפשר לבדוק את
// המסך עצמו בלי להריץ את שרת האפליקציה ובלי מפתחות אמת.
const apiConfig = process.env.QA_API_CONFIG || '';

http
  .createServer((req, res) => {
    let url = decodeURIComponent(req.url.split('?')[0]);
    if (apiConfig && url === '/api/config') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      res.end(apiConfig);
      return;
    }
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
