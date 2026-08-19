/**
 * QA harness for the client-registry console screen (#35 KioskFleet, §2★ד).
 *
 * `server/node_modules` is not installed in this checkout, so `src/index.js`
 * (express + better-sqlite3) cannot be started here. This serves the real
 * `server/public/` over node's own http module and answers /api with an
 * in-memory store whose rules are copied from `src/routes/clients.js` — and it
 * imports the *real* `hosts.js` and `clientcode.js`, so what the screen sends
 * is validated by the same code the server validates it with. It is a stand-in
 * for the transport, not for the logic.
 *
 * Run: node QA/kiosk/clients-console-0811/stub-server.mjs [port]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hostsForUrl, normalizeHostCsv, parseHosts } from '../../../apps/35-kioskfleet/server/src/hosts.js';
import { normalizeClientCode, CLIENT_CODE_ALPHABET } from '../../../apps/35-kioskfleet/server/src/clientcode.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(HERE, '../../../apps/35-kioskfleet/server/public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

let nextId = 1;
const clients = [];

function resolveSite(siteUrl, allowedHost) {
  let host = '';
  try { host = new URL(siteUrl).host; } catch { /* handled below */ }
  if (!host) return { error: 'כתובת אתר לא תקינה' };
  if (allowedHost != null && !normalizeHostCsv(allowedHost) && parseHosts(allowedHost).length > 0) {
    return { error: 'רשימת הדומיינים אינה תקינה — נדרש לפחות דומיין אחד תקף (למשל example.com)' };
  }
  return { url: String(siteUrl).trim(), hosts: hostsForUrl(siteUrl, allowedHost) };
}

function freeCode() {
  for (let i = 0; i < 20; i++) {
    let code = '';
    for (let j = 0; j < 5; j++) code += CLIENT_CODE_ALPHABET[(i * 7 + j * 13 + clients.length * 3) % CLIENT_CODE_ALPHABET.length];
    if (!clients.some((c) => c.code === code)) return code;
  }
  return null;
}

const publicClient = (c) => ({ ...c, active: !!c.active });

function api(req, res, url, body) {
  const send = (status, obj) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
  const p = url.pathname.replace(/^\/api/, '');

  if (p === '/auth/login' && req.method === 'POST') return send(200, { token: 'qa-token' });
  if (p === '/auth/me') return send(200, { user: { username: 'qa', fullName: 'לקוח בדיקה', role: 'user', devicesUsed: 0, deviceLimit: 3 } });
  if (p === '/config') return send(200, { wsHost: null, basePath: '' });
  if (p === '/devices') return send(200, { devices: [] });
  if (p === '/links') return send(200, { links: [] });
  if (p === '/enrollments') return send(200, { enrollments: [] });

  if (p === '/clients' && req.method === 'GET') return send(200, { clients: clients.map(publicClient) });

  if (p === '/clients' && req.method === 'POST') {
    const { name, siteUrl, allowedHost, notes } = body || {};
    let { code } = body || {};
    if (!name || !String(name).trim()) return send(400, { error: 'נדרש שם לקוח' });
    if (!siteUrl) return send(400, { error: 'נדרשת כתובת אתר ללקוח' });
    const site = resolveSite(siteUrl, allowedHost);
    if (site.error) return send(400, { error: site.error });
    if (code != null && String(code).trim() !== '') {
      code = normalizeClientCode(code);
      if (!code) return send(400, { error: 'מזהה הלקוח חייב להכיל ספרות או אותיות באנגלית' });
    } else {
      code = freeCode();
    }
    if (clients.some((c) => c.code === code)) return send(409, { error: `המזהה ${code} כבר בשימוש אצל לקוח אחר שלכם` });
    const row = { id: nextId++, code, name: String(name).trim(), siteUrl: site.url, allowedHost: site.hosts, notes: notes ? String(notes).trim() : null, active: 1 };
    clients.push(row);
    return send(200, { client: publicClient(row) });
  }

  const m = p.match(/^\/clients\/(\d+)$/);
  if (m) {
    const c = clients.find((x) => String(x.id) === m[1]);
    if (!c) { res.writeHead(404); return res.end(); }
    if (req.method === 'DELETE') { clients.splice(clients.indexOf(c), 1); return send(200, { ok: true }); }
    if (req.method === 'PATCH') {
      const { name, siteUrl, allowedHost, notes, active } = body || {};
      let { code } = body || {};
      if (siteUrl != null || allowedHost != null) {
        const site = resolveSite(siteUrl ?? c.siteUrl, allowedHost ?? c.allowedHost);
        if (site.error) return send(400, { error: site.error });
        c.siteUrl = site.url; c.allowedHost = site.hosts;
      }
      if (code != null) {
        code = normalizeClientCode(code);
        if (!code) return send(400, { error: 'מזהה הלקוח חייב להכיל ספרות או אותיות באנגלית' });
        if (code !== c.code && clients.some((x) => x.code === code)) {
          return send(409, { error: `המזהה ${code} כבר בשימוש אצל לקוח אחר שלכם` });
        }
        c.code = code;
      }
      if (name) c.name = String(name).trim();
      if (notes != null) c.notes = String(notes).trim();
      if (active != null) c.active = active ? 1 : 0;
      return send(200, { client: publicClient(c) });
    }
  }

  res.writeHead(404); res.end();
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    let raw = '';
    req.on('data', (d) => { raw += d; });
    req.on('end', () => { let body = null; try { body = raw ? JSON.parse(raw) : null; } catch {} api(req, res, url, body); });
    return;
  }
  const rel = url.pathname === '/' ? 'index.html' : url.pathname === '/console' ? 'console.html' : url.pathname.slice(1);
  const file = path.resolve(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});

server.listen(Number(process.argv[2]) || 4173, '127.0.0.1', () => {
  console.log('QA stub on http://127.0.0.1:' + server.address().port + '/console');
});
