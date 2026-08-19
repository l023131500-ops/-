// שרת סטטי מקומי לצילום מסך של אתר סטטי מהמקור, בלי בנייה ובלי פריסה.
//
// למה זה קיים: Playwright חוסם את פרוטוקול file:, ולכן אי אפשר לצלם
// apps/<x>/index.html ישירות מהדיסק; ו-`npx http-server` נכשל כאן כי החבילה
// אינה מותקנת ו-npx נפתר מול node_modules של השורש.
//
// שימוש:  node scripts/qa/serve-static.mjs <dir> [port]
// דוגמה:  node scripts/qa/serve-static.mjs apps/11-bkalut-marketing2 8137
//         ואז navigate ל-http://127.0.0.1:8137/index.html
//
// מגיש רק מתוך <dir> — נתיב שמנסה לצאת ממנו מקבל 404.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve, sep } from 'node:path';

const root = resolve(process.argv[2] || '.');
const port = Number(process.argv[3] || 8137);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

createServer(async (req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
  const file = resolve(root, rel === '' ? 'index.html' : rel);
  // אל תגיש מחוץ לשורש
  if (file !== root && !file.startsWith(root + sep)) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    return res.end('not found');
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, {
      'content-type': types[extname(file).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`serving ${root} on http://127.0.0.1:${port}`);
});
