/**
 * QA harness for the per-device **link** picker (#35 KioskFleet, §2★ה console side).
 *
 * `server/node_modules` is not installed in this checkout, so `src/index.js`
 * (express + better-sqlite3) cannot run here. This rewrites **only the express
 * glue**: it serves the real `server/public/` over node's own http module, and
 * answers `GET`/`PUT /api/devices/:id/links` with the same calls
 * `routes/devices.js` makes, in the same order, against `node:sqlite` holding
 * the **production DDL read out of `src/db.js`** rather than a copy — so it
 * cannot pass against a schema the server does not run.
 *
 * Run: node QA/kiosk/link-approvals-console-0811/stub-server.mjs [port]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { approvalSelection } from '../../../apps/35-kioskfleet/server/src/approvals.js';
import {
  approvedLinksForDevice, selectableLinks, deviceConfigHostCsv,
} from '../../../apps/35-kioskfleet/server/src/linkapprovals.js';
import { deviceDisplayUrl } from '../../../apps/35-kioskfleet/server/src/displayurl.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(HERE, '../../../apps/35-kioskfleet/server');
const PUBLIC_DIR = path.join(APP, 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

// The schema the server actually creates on boot, taken from its own source.
const dbSrc = fs.readFileSync(path.join(APP, 'src/db.js'), 'utf8');
const DDL = dbSrc.slice(dbSrc.indexOf('db.exec(`') + 'db.exec(`'.length, dbSrc.indexOf('`);', dbSrc.indexOf('db.exec(`')));

const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys = ON');
db.exec(DDL);

db.exec(`
INSERT INTO users (id, username, password_hash, full_name, role, device_limit)
  VALUES (1, 'qa', 'x', 'לקוח בדיקה', 'user', 3);
-- Two devices: one locked to a domain list, one with none. The hint the modal
-- shows differs between them, and only the first is ever widened on approval.
INSERT INTO devices (id, owner_id, serial, name, device_token, access_code, allowed_host, home_url, idle_return_seconds)
  VALUES (1, 1, 'QA-0001', 'כניסה ראשית', 'tok-1', 'A7K2M9', 'hadar.example.com', 'https://hadar.example.com/event/1', 60);
INSERT INTO devices (id, owner_id, serial, name, device_token, access_code, allowed_host, home_url, idle_return_seconds)
  VALUES (2, 1, 'QA-0002', 'עמדת לובי (ללא נעילת דומיין)', 'tok-2', 'B3N8XY', '', 'https://lobby.example.com/', 0);
INSERT INTO links (id, owner_id, name, url, allowed_host) VALUES
  (21, 1, 'אולם הדר — אירוע ערב', 'https://hadar.example.com/event/2', 'hadar.example.com'),
  (22, 1, 'גני שרה — תפריט', 'https://sarah.example.com/menu', 'sarah.example.com,pay.example.com'),
  (23, 1, 'אולמי נוף — הרשמה', 'https://nof.example.com/signup', NULL);
-- One link starts approved on device 1, so "open and save" has something to
-- preserve rather than only something to add.
INSERT INTO device_links (device_id, link_id) VALUES (1, 21);
`);

const commands = [];

function api(req, res, url, body) {
  const send = (status, obj) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
  const p = url.pathname.replace(/^\/api/, '');

  if (p === '/auth/login' && req.method === 'POST') return send(200, { token: 'qa-token' });
  if (p === '/auth/me') return send(200, { user: { username: 'qa', fullName: 'לקוח בדיקה', role: 'user', devicesUsed: 2, deviceLimit: 3 } });
  if (p === '/config') return send(200, { wsHost: null, basePath: '' });
  if (p === '/devices') return send(200, { devices: db.prepare('SELECT * FROM devices ORDER BY id').all() });
  if (p === '/links' && req.method === 'GET') {
    return send(200, { links: db.prepare('SELECT * FROM links ORDER BY name COLLATE NOCASE').all() });
  }
  if (p === '/enrollments') return send(200, { enrollments: [] });
  if (p === '/clients' && req.method === 'GET') return send(200, { clients: [] });

  const m = p.match(/^\/devices\/(\d+)\/links$/);
  if (m) {
    const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(Number(m[1]));
    if (!device) { res.writeHead(404); return res.end(); }

    if (req.method === 'GET') {
      const links = db.prepare(
        'SELECT id, name, url, allowed_host FROM links WHERE owner_id = ? ORDER BY name COLLATE NOCASE',
      ).all(device.owner_id);
      const approved = new Set(
        db.prepare('SELECT link_id FROM device_links WHERE device_id = ?').all(device.id).map((r) => r.link_id),
      );
      return send(200, {
        links: links.map((l) => ({ id: l.id, name: l.name, url: l.url, approved: approved.has(l.id) })),
        approvedIds: [...approved],
      });
    }

    if (req.method === 'PUT') {
      const ownerLinkIds = db.prepare('SELECT id FROM links WHERE owner_id = ?').all(device.owner_id).map((r) => r.id);
      const ids = approvalSelection(ownerLinkIds, body?.linkIds);
      db.exec('BEGIN');
      db.prepare('DELETE FROM device_links WHERE device_id = ?').run(device.id);
      const ins = db.prepare('INSERT INTO device_links (device_id, link_id) VALUES (?, ?)');
      for (const id of ids) ins.run(device.id, id);
      db.exec('COMMIT');
      const approvedRows = approvedLinksForDevice(db, device.id);
      commands.push({ deviceId: device.id, type: 'update_config', payload: {
        homeUrl: device.home_url,
        displayUrl: deviceDisplayUrl(device),
        allowedHost: deviceConfigHostCsv(db, device),
        idleReturnSeconds: device.idle_return_seconds,
      } });
      return send(200, { approvedIds: ids, links: selectableLinks(approvedRows) });
    }
  }

  // An owner whose library is empty is a real state and it is where the modal
  // sends the reader somewhere else entirely, so it is driven rather than read.
  if (p === '/_qa/empty-library' && req.method === 'POST') {
    db.exec('DELETE FROM links');
    return send(200, { ok: true });
  }

  // Read-back for the assertions: what the table holds and what was pushed.
  if (p === '/_qa/state') {
    return send(200, { deviceLinks: db.prepare('SELECT * FROM device_links ORDER BY device_id, link_id').all(), commands });
  }

  res.writeHead(404); res.end();
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    let raw = '';
    req.on('data', (d) => { raw += d; });
    req.on('end', () => { let b = null; try { b = raw ? JSON.parse(raw) : null; } catch {} api(req, res, url, b); });
    return;
  }
  const rel = url.pathname === '/' ? 'index.html' : url.pathname === '/console' ? 'console.html' : url.pathname.slice(1);
  const file = path.resolve(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});

server.listen(Number(process.argv[2]) || 4179, '127.0.0.1', () => {
  console.log('QA stub on http://127.0.0.1:' + server.address().port + '/console');
});
