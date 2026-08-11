/**
 * QA harness for the install link (#35 KioskFleet, KIOSK_BUILD §2★א last line).
 *
 * `server/node_modules` is absent in this checkout, so `src/index.js` (express +
 * better-sqlite3) cannot run here. This rewrites only the express glue: the
 * links themselves come from the **real** `src/installlink.js`, and the page and
 * the console JS are the real files out of `server/public/`.
 *
 * Two things it reproduces deliberately:
 *  - **both mounts.** The service runs at `/` on Railway's own hostname and at
 *    `/kiosk` behind the portal, and `install.html` is served at two *depths*
 *    within each. Four URLs, one page.
 *  - **PUBLIC_URL ≠ the console's origin.** The console is served through the
 *    portal rewrite, so `location.origin` there is not an address a device can
 *    enroll against. The stub answers on 127.0.0.1 while `PUBLIC_URL` says
 *    `https://kiosk.more30.com`, which is exactly the production mismatch — and
 *    the link the console renders must carry the second, not the first.
 *
 * Run: node QA/kiosk/install-link-0811/stub-server.mjs [port]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installLink } from '../../../apps/35-kioskfleet/server/src/installlink.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(HERE, '../../../apps/35-kioskfleet/server/public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

// Production's shape: served under /kiosk, public address on its own hostname.
const BASE = '/kiosk';
const PUBLIC_URL = 'https://kiosk.more30.com';

let nextId = 3;
const enrollments = [
  { id: 1, code: 'A7K2M9', name: 'כניסה ראשית', home_url: 'https://hadar.example.com/event/1', allowed_host: 'hadar.example.com', idle_return_seconds: 60, used: 0, expires_at: '2026-08-25T00:00:00.000Z' },
  { id: 2, code: 'QZ4T8B', name: '', home_url: 'https://lobby.example.com/', allowed_host: 'lobby.example.com', idle_return_seconds: 0, used: 0, expires_at: '2026-08-25T00:00:00.000Z' },
];
// The exact expression `routes/devices.js` applies to every enrollment it emits.
const withInstallUrl = (e) => ({ ...e, installUrl: installLink(PUBLIC_URL, BASE, e.code) });

function api(req, res, p, body) {
  const send = (status, obj) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };

  if (p === '/auth/login' && req.method === 'POST') return send(200, { token: 'qa-token' });
  if (p === '/auth/me') return send(200, { user: { username: 'qa', fullName: 'לקוח בדיקה', role: 'user', devicesUsed: 1, deviceLimit: 5 } });
  if (p === '/config') return send(200, { wsHost: null, basePath: BASE });
  if (p === '/devices') return send(200, { devices: [] });
  if (p === '/links') return send(200, { links: [] });
  if (p === '/clients' && req.method === 'GET') return send(200, { clients: [] });

  if (p === '/enrollments' && req.method === 'GET') {
    return send(200, { enrollments: enrollments.map(withInstallUrl) });
  }
  if (p === '/enrollments' && req.method === 'POST') {
    const b = JSON.parse(body || '{}');
    const code = 'QA' + String(nextId).padStart(4, '0');
    const row = {
      id: nextId++, code, name: b.name || '', home_url: b.homeUrl,
      allowed_host: new URL(b.homeUrl).host, idle_return_seconds: b.idleReturnSeconds ?? 0,
      used: 0, expires_at: '2026-08-25T00:00:00.000Z',
    };
    enrollments.unshift(row);
    return send(200, { enrollment: withInstallUrl(row) });
  }
  const del = p.match(/^\/enrollments\/(\d+)$/);
  if (del && req.method === 'DELETE') {
    const i = enrollments.findIndex((e) => e.id === Number(del[1]));
    if (i >= 0) enrollments.splice(i, 1);
    return send(200, { ok: true });
  }

  if (p === '/_qa/state') return send(200, { enrollments: enrollments.map(withInstallUrl) });

  res.writeHead(404); res.end();
}

/** The routes `index.js` declares, minus express. */
function serveSite(req, res, pathname) {
  const rel =
    pathname === '/' || pathname === '' ? 'index.html'
      : pathname === '/console' ? 'console.html'
        // site.get('/install/:code?') — the code is never read here, exactly as
        // in production. Both depths land on the same file.
        : /^\/install(\/[^/]*)?\/?$/.test(pathname) ? 'install.html'
          : /^\/kiosk-launcher(\/[^/]*)?\/?$/.test(pathname) ? 'kiosk-launcher.html'
            : pathname.slice(1);
  const file = path.resolve(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  // app.use(base, site): everything under /kiosk, and the same router at / so
  // the direct-Railway mount is driven in the same run.
  const inner = url.pathname.startsWith(BASE + '/') || url.pathname === BASE
    ? url.pathname.slice(BASE.length) || '/'
    : url.pathname;

  if (inner.startsWith('/api/')) {
    let raw = '';
    req.on('data', (d) => { raw += d; });
    req.on('end', () => api(req, res, inner.replace(/^\/api/, ''), raw));
    return;
  }
  serveSite(req, res, inner);
});

server.listen(Number(process.argv[2]) || 4181, '127.0.0.1', () => {
  console.log('QA stub on http://127.0.0.1:' + server.address().port + BASE + '/console');
});
