/**
 * QA harness for the device access-code screen (#35 KioskFleet, §2★ז console side).
 *
 * `server/node_modules` is absent in this checkout, so `src/index.js` (express +
 * better-sqlite3) cannot run here. This serves the real `server/public/` over
 * node's own http module and answers the routes the device card uses — but the
 * code itself comes from the *real* `accesscode.js` running against a real
 * `node:sqlite` database with the same DDL and the same UNIQUE index as
 * `db.js`. So a re-issue here is the production path minus express: it can
 * collide, and it must return a different code than the one it replaced.
 *
 * Run: node QA/kiosk/access-code-console-0811/stub-server.mjs [port]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { issueAccessCode, backfillAccessCodes, normalizeAccessCode } from '../../../apps/35-kioskfleet/server/src/accesscode.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(HERE, '../../../apps/35-kioskfleet/server/public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE devices (
  id INTEGER PRIMARY KEY, name TEXT, serial TEXT, home_url TEXT, allowed_host TEXT,
  idle_return_seconds INTEGER DEFAULT 0, access_code TEXT, online INTEGER DEFAULT 0,
  model TEXT, app_version TEXT, battery INTEGER, last_seen TEXT);
CREATE UNIQUE INDEX idx_devices_access_code ON devices(access_code);`);
db.exec(`INSERT INTO devices (id, name, serial, home_url, allowed_host, idle_return_seconds, online, model, app_version, battery, last_seen) VALUES
  (1, 'כניסה ראשית', 'QA-0001', 'https://hadar.example.com/event/1', 'hadar.example.com', 60, 1, 'Lenovo TB-X306', '1.4.0', 88, '2026-08-11 00:00:00'),
  (2, 'עמדת לובי', 'QA-0002', 'https://lobby.example.com/', NULL, 0, 0, 'Galaxy Tab A7', '1.4.0', NULL, NULL);`);
// Boot-time backfill, exactly as index.js runs it: both rows get a code, which
// is what makes the card able to show one at all.
backfillAccessCodes(db);
// Device 3 is left without a code on purpose — an owner who has never restarted
// the server since the column landed still has to see something honest.
db.exec(`INSERT INTO devices (id, name, serial, home_url, online, model, app_version) VALUES
  (3, 'עמדה ישנה (טרם הונפק)', 'QA-0003', 'https://old.example.com/', 0, 'Galaxy Tab A7', '1.3.2');`);

const row = (id) => db.prepare('SELECT * FROM devices WHERE id = ?').get(id);
const publicDevice = (d) => ({
  id: d.id, name: d.name, serial: d.serial, homeUrl: d.home_url, allowedHost: d.allowed_host,
  idleReturnSeconds: d.idle_return_seconds, accessCode: d.access_code ?? null,
  online: !!d.online, model: d.model, appVersion: d.app_version, battery: d.battery, lastSeen: d.last_seen,
});
const reissues = [];

function api(req, res, url) {
  const send = (status, obj) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
  const p = url.pathname.replace(/^\/api/, '');

  if (p === '/auth/login' && req.method === 'POST') return send(200, { token: 'qa-token' });
  if (p === '/auth/me') return send(200, { user: { username: 'qa', fullName: 'לקוח בדיקה', role: 'user', devicesUsed: 3, deviceLimit: 5 } });
  if (p === '/config') return send(200, { wsHost: null, basePath: '' });
  if (p === '/devices') return send(200, { devices: db.prepare('SELECT * FROM devices ORDER BY id').all().map(publicDevice) });
  if (p === '/links') return send(200, { links: [] });
  if (p === '/enrollments') return send(200, { enrollments: [] });
  if (p === '/clients' && req.method === 'GET') return send(200, { clients: [] });

  const m = p.match(/^\/devices\/(\d+)\/access-code$/);
  if (m && req.method === 'POST') {
    const before = row(Number(m[1]));
    if (!before) { res.writeHead(404); return res.end(); }
    const code = issueAccessCode(db, before.id);
    reissues.push({ deviceId: before.id, from: before.access_code ?? null, to: code });
    return send(200, { accessCode: code, device: publicDevice(row(before.id)) });
  }

  // Read-back for the assertions: what is stored, and every replacement made.
  if (p === '/_qa/state') {
    return send(200, {
      devices: db.prepare('SELECT id, access_code FROM devices ORDER BY id').all(),
      reissues,
      // Proof the stored codes are codes and not free text — the launcher will
      // normalize whatever is typed and match on exactly this form.
      canonical: db.prepare('SELECT id, access_code c FROM devices WHERE access_code IS NOT NULL').all()
        .map((r) => ({ id: r.id, ok: normalizeAccessCode(r.c) === r.c })),
    });
  }

  res.writeHead(404); res.end();
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    let raw = '';
    req.on('data', (d) => { raw += d; });
    req.on('end', () => api(req, res, url));
    return;
  }
  const rel = url.pathname === '/' ? 'index.html' : url.pathname === '/console' ? 'console.html' : url.pathname.slice(1);
  const file = path.resolve(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});

server.listen(Number(process.argv[2]) || 4176, '127.0.0.1', () => {
  console.log('QA stub on http://127.0.0.1:' + server.address().port + '/console');
});
