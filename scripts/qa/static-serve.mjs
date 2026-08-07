/**
 * Serve a static site directory over HTTP so a browser check can run against a
 * build that has not been deployed.
 *
 * Why this exists: Playwright blocks the file: protocol, and while the Vercel
 * deploy quota (core.issues #83) is exhausted, "measured on the build" is the
 * only honest way to verify a static-site change. vite preview already covers
 * the SPAs; this covers the plain-HTML sites, which have no dev server at all.
 *
 *   node scripts/qa/static-serve.mjs apps/06-kupot-holim/site 8791
 */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.argv[2];
const PORT = Number(process.argv[3] || 8791);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

http
  .createServer(async (req, res) => {
    let url = req.url.split('?')[0];
    if (url === '/') url = '/index.html';
    const file = path.join(ROOT, url);
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'text/plain' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  })
  .listen(PORT, () => console.log(`serving ${ROOT} on http://127.0.0.1:${PORT}`));
