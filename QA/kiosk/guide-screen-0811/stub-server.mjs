/**
 * QA harness for the sidebar's "הוראות הפעלה" screen — #35 KioskFleet.
 *
 * The screen used to hold four paragraphs of install instructions of its own,
 * which since `setupWizard()` landed were the *second* description of the same
 * install — and the two disagreed. It is now a route into the per-device wizard,
 * so what has to be driven here is: what it says, which devices it offers, that
 * the button really opens the wizard for the device on that row, and the empty
 * case (no devices — the wizard is device-scoped and cannot open at all).
 *
 * `server/node_modules` is not installed in this checkout, so `src/index.js`
 * (express + better-sqlite3) cannot run. This serves the **real**
 * `server/public/` over node's own http module and answers the setup routes by
 * calling the same functions `routes/devices.js` calls, over the production DDL
 * on `node:sqlite` — i.e. it stands in for the transport, not for the logic.
 * It is `setup-wizard-console-0811/stub-server.mjs` plus two things that screen
 * did not need: an empty-fleet mode, and `/docs`, because the one link the guide
 * still carries points there and a 404 behind it is the whole failure.
 *
 * Run: node QA/kiosk/guide-screen-0811/stub-server.mjs [port]
 *      KF_QA_EMPTY=1 node QA/kiosk/guide-screen-0811/stub-server.mjs 4181
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
// The real docs directory, mounted exactly where `index.js` mounts it:
// `path.resolve(config.root, '../docs')` served at `<base>/docs`.
const DOCS_DIR = path.resolve(HERE, '../../../apps/35-kioskfleet/docs');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
};

// The production values, so the wizard opened from this screen shows the address
// a device really has to be given rather than the harness's own 127.0.0.1.
const PUBLIC_URL = 'https://kiosk.more30.com';
const BASE_PATH = '/kiosk';

const EMPTY = process.env.KF_QA_EMPTY === '1';

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

// Device 1: enrolled, has a code — twelve steps. Device 2: no enrollment row, so
// its checklist opens with `create-code` and is thirteen. The guide lists both,
// and the two lengths are how a wrong device opened from a row would show.
if (!EMPTY) {
  db.exec(`
INSERT INTO devices (name, serial, home_url, allowed_host, access_code, setup_track, online, model, app_version, battery, last_seen)
VALUES ('כניסה ראשית', 'QA-0001', 'https://hadar.example.com/', 'hadar.example.com', 'A7K2M9', NULL, 1, 'Lenovo TB-X306', '1.4.0', 88, '2026-08-11 00:00:00'),
       ('עמדת לובי (טרם הותקנה)', 'QA-0002', 'https://lobby.example.com/', '', 'B3XQ47', 'gms', 0, NULL, NULL, NULL, NULL);
INSERT INTO enrollments (code, device_id, used) VALUES ('K7M2QX', 1, 1);`);
}

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
  if (p === '/auth/me') return send(200, { user: { username: 'qa', fullName: 'לקוח בדיקה', role: 'user', devicesUsed: EMPTY ? 0 : 2, deviceLimit: 3 } });
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
  // `/docs/...` — the guide's one remaining link. Served from the real docs
  // directory so a missing file 404s here exactly as it would in production.
  if (url.pathname.startsWith('/docs/')) {
    const f = path.resolve(DOCS_DIR, url.pathname.slice('/docs/'.length));
    if (!f.startsWith(DOCS_DIR) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
    return res.end(fs.readFileSync(f));
  }
  const rel = url.pathname === '/' ? 'index.html' : url.pathname === '/console' ? 'console.html' : url.pathname.slice(1);
  const file = path.resolve(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});

server.listen(Number(process.argv[2]) || 4181, '127.0.0.1', () => {
  console.log('QA stub on http://127.0.0.1:' + server.address().port + '/console'
    + (EMPTY ? '  (empty fleet)' : ''));
});
