/**
 * QA harness for the installation wizard's screen (§2★ב) — #35 KioskFleet.
 *
 * `server/node_modules` is not installed in this checkout, so `src/index.js`
 * (express + better-sqlite3) cannot run. This serves the **real**
 * `server/public/` over node's own http module and answers the four
 * `/api/devices/:id/setup` routes by calling the same functions
 * `routes/devices.js` calls, in the same order, over the production DDL on
 * `node:sqlite`: `setupChecklist` + `checklistProgress` from `setupsteps.js`,
 * and `tickedStepIds` / `setStepDone` / `clearStepProgress` / `deviceTrack` /
 * `setDeviceTrack` from `setupprogress.js`. It stands in for the transport, not
 * for the logic — an unknown step id really is rejected here, and a tick really
 * is a row.
 *
 * Run: node QA/kiosk/setup-wizard-console-0811/stub-server.mjs [port]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { setupChecklist, checklistProgress, TRACKS } from '../../../apps/35-kioskfleet/server/src/setupsteps.js';
import {
  tickedStepIds, setStepDone, clearStepProgress, deviceTrack, setDeviceTrack,
} from '../../../apps/35-kioskfleet/server/src/setupprogress.js';
import { serverAddress, installLink } from '../../../apps/35-kioskfleet/server/src/installlink.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(HERE, '../../../apps/35-kioskfleet/server/public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

// The production values, so the wizard shows the address a device really has to
// be given rather than the harness's own 127.0.0.1 — the same mismatch
// install-link-0811 was built around.
const PUBLIC_URL = 'https://kiosk.more30.com';
const BASE_PATH = '/kiosk';

// The tables the two modules touch, copied from `db.js`.
const db = new DatabaseSync(':memory:');
db.exec(`
CREATE TABLE devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT, serial TEXT, home_url TEXT, display_url TEXT, allowed_host TEXT,
  idle_return_seconds INTEGER DEFAULT 0, access_code TEXT, setup_track TEXT,
  online INTEGER DEFAULT 0, model TEXT, app_version TEXT, battery INTEGER, last_seen TEXT
);
CREATE TABLE enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT, device_id INTEGER, used INTEGER DEFAULT 0
);
CREATE TABLE device_setup_steps (
  device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  ticked_by INTEGER,
  ticked_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (device_id, step_id)
);`);

// Device 1: enrolled, has a code — the ordinary case, twelve steps.
// Device 2: no enrollment row at all, so the checklist opens with `create-code`
// and is thirteen steps. That difference is the reason the wizard must not
// number its boxes from a list it wrote itself.
db.exec(`
INSERT INTO devices (name, serial, home_url, allowed_host, access_code, setup_track, online, model, app_version, battery, last_seen)
VALUES ('כניסה ראשית', 'QA-0001', 'https://hadar.example.com/', 'hadar.example.com', 'A7K2M9', NULL, 1, 'Lenovo TB-X306', '1.4.0', 88, '2026-08-11 00:00:00'),
       ('עמדת לובי (טרם הותקנה)', 'QA-0002', 'https://lobby.example.com/', '', 'B3XQ47', 'gms', 0, NULL, NULL, NULL, NULL);
INSERT INTO enrollments (code, device_id, used) VALUES ('K7M2QX', 1, 1);`);

const dev = (id) => db.prepare('SELECT * FROM devices WHERE id = ?').get(Number(id));

/** The same function `routes/devices.js` calls, with the same inputs. */
function setupFor(device) {
  const enr = db.prepare('SELECT code FROM enrollments WHERE device_id = ? ORDER BY id DESC LIMIT 1').get(device.id);
  const code = enr?.code || '';
  const track = deviceTrack(device);
  const steps = setupChecklist({
    serverAddress: serverAddress(PUBLIC_URL, BASE_PATH),
    code,
    installUrl: installLink(PUBLIC_URL, BASE_PATH, code) || '',
    track,
  });
  return { track, steps, progress: checklistProgress(steps, tickedStepIds(db, device.id)) };
}

function api(req, res, url, body) {
  const send = (status, obj) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
  const p = url.pathname.replace(/^\/api/, '');

  if (p === '/auth/login' && req.method === 'POST') return send(200, { token: 'qa-token' });
  if (p === '/auth/me') return send(200, { user: { username: 'qa', fullName: 'לקוח בדיקה', role: 'user', devicesUsed: 2, deviceLimit: 3 } });
  if (p === '/config') return send(200, { wsHost: null, basePath: '' });
  if (p === '/links') return send(200, { links: [] });
  if (p === '/enrollments') return send(200, { enrollments: [] });
  if (p === '/clients' && req.method === 'GET') return send(200, { clients: [] });
  if (p === '/devices' && req.method === 'GET') {
    return send(200, { devices: db.prepare('SELECT * FROM devices').all().map(publicDevice) });
  }

  let m;
  if ((m = p.match(/^\/devices\/(\d+)\/setup$/)) && req.method === 'GET') {
    const d = dev(m[1]); if (!d) { res.writeHead(404); return res.end(); }
    return send(200, { deviceId: d.id, tracks: TRACKS, ...setupFor(d) });
  }
  if ((m = p.match(/^\/devices\/(\d+)\/setup\/step$/)) && req.method === 'POST') {
    const d = dev(m[1]); if (!d) { res.writeHead(404); return res.end(); }
    const done = body?.done !== false;
    const r = setStepDone(db, d.id, body?.stepId, done, 1);
    if (!r.ok) return send(400, { error: 'unknown step' });
    return send(200, { deviceId: d.id, tracks: TRACKS, ...setupFor(d) });
  }
  if ((m = p.match(/^\/devices\/(\d+)\/setup\/track$/)) && req.method === 'POST') {
    const d = dev(m[1]); if (!d) { res.writeHead(404); return res.end(); }
    setDeviceTrack(db, d.id, body?.track);
    return send(200, { deviceId: d.id, tracks: TRACKS, ...setupFor(dev(m[1])) });
  }
  if ((m = p.match(/^\/devices\/(\d+)\/setup$/)) && req.method === 'DELETE') {
    const d = dev(m[1]); if (!d) { res.writeHead(404); return res.end(); }
    clearStepProgress(db, d.id);
    return send(200, { deviceId: d.id, tracks: TRACKS, ...setupFor(d) });
  }

  // Read-back for the assertions: the rows, not the answers.
  if (p === '/_qa/state') {
    return send(200, {
      ticks: db.prepare('SELECT device_id, step_id FROM device_setup_steps ORDER BY device_id, rowid').all(),
      tracks: db.prepare('SELECT id, setup_track FROM devices').all(),
    });
  }
  // A tick recorded behind the console's back — the second person in §2★ב's
  // flow, standing at the tablet.
  if (p === '/_qa/tick' && req.method === 'POST') {
    const r = setStepDone(db, Number(body.deviceId), body.stepId, body.done !== false, null);
    return send(200, r);
  }

  res.writeHead(404); res.end();
}

function publicDevice(d) {
  return { id: d.id, name: d.name, serial: d.serial, allowedHost: d.allowed_host, homeUrl: d.home_url,
    displayUrl: d.display_url ?? null, idleReturnSeconds: d.idle_return_seconds, accessCode: d.access_code ?? null,
    setupTrack: d.setup_track ?? null, online: !!d.online, lastSeen: d.last_seen, appVersion: d.app_version,
    battery: d.battery, model: d.model };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_qa/')) {
    let raw = '';
    req.on('data', (c) => { raw += c; });
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
