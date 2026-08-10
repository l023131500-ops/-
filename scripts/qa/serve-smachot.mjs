// שרת סטטי זמני לאימות סמל הלשונית של smachot על רינדור אמיתי.
// הוא מגיש את _deploy/smachot-more30 בדיוק כפי ש-Vercel מגיש אותו: המונט
// /smachot/ הוא תיקייה אמיתית בתוך שורש הפריסה, ולכן base href="/smachot/"
// נפתר כאן בדיוק כמו בייצור. השורש עצמו ריק בכוונה — כך /favicon.ico על
// ה-origin מחזיר 404, שזו בדיוק הנפילה שהבדיקה צריכה לשלול.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve('_deploy/smachot-more30');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
};

const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  try {
    const buf = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'content-length': buf.length });
    res.end(buf);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('404');
  }
});

server.listen(4354, '127.0.0.1', () => console.log('serving', ROOT, 'on http://127.0.0.1:4354'));
