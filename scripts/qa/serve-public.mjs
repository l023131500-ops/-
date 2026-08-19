// שרת סטטי זעיר לצילום מסך מקומי של דפי הניהול.
// port: argv[2] (ברירת מחדל 8791) · root: argv[3] (ברירת מחדל portal/public)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.argv[3]
  ? resolve(process.argv[3])
  : resolve(fileURLToPath(import.meta.url), '../../../portal/public');
const port = Number(process.argv[2] || 8791);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
                '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
                '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };

createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  if (!extname(p)) p += '.html';
  try {
    const body = await readFile(join(root, p));
    res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('404 ' + p);
  }
}).listen(port, () => console.log('serving ' + root + ' on http://127.0.0.1:' + port));
