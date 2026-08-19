/**
 * QA harness for the maintenance-code screen (§2★ה/§4, console side) — #35.
 *
 * `server/node_modules` is not installed in this checkout, so `src/index.js`
 * (express + better-sqlite3) cannot run. This serves the **real**
 * `server/public/` over node's own http module and answers `PATCH /devices/:id`
 * by calling the same functions `routes/devices.js` calls, in the same order,
 * over the production DDL on `node:sqlite`: `normalizeExitCode` for what is
 * accepted, the two-statement write for `''`-is-a-value, and `configExitCode`
 * for what the device is handed. It stands in for the transport, not for the
 * logic — `1234` really is refused here, and a save really is a column.
 *
 * The `update_config` that a real PATCH issues is recorded rather than sent, so
 * the driver can assert **what the device would receive** and not only what was
 * stored. A code that is saved and never pushed is a code the device does not
 * have, which is the failure this whole step exists to end.
 *
 * Run: node QA/kiosk/exit-code-console-0811/stub-server.mjs [port]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { normalizeExitCode, configExitCode, MIN_LENGTH, MAX_LENGTH } from '../../../apps/35-kioskfleet/server/src/exitcode.js';
import { deviceDisplayUrl } from '../../../apps/35-kioskfleet/server/src/displayurl.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(HERE, '../../../apps/35-kioskfleet/server/public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

// The `devices` columns this path touches, copied from `db.js`.
const db = new DatabaseSync(':memory:');
db.exec(`
CREATE TABLE devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT, serial TEXT, home_url TEXT, display_url TEXT, allowed_host TEXT,
  idle_return_seconds INTEGER DEFAULT 0, access_code TEXT, exit_code TEXT, setup_track TEXT,
  online INTEGER DEFAULT 0, model TEXT, app_version TEXT, battery INTEGER, last_seen TEXT
);`);

// Device 1 has a code — the state where the dialog has to *reveal* it, because
// the scenario the code exists for is an offline tablet and this screen is the
// only remaining route in.
// Device 2 has none, which is every device that exists today.
db.exec(`
INSERT INTO devices (name, serial, home_url, allowed_host, access_code, exit_code, online, model, app_version, battery, last_seen)
VALUES ('כניסה ראשית', 'QA-0001', 'https://hadar.example.com/', 'hadar.example.com', 'A7K2M9', 'keter7291', 1, 'Lenovo TB-X306', '1.4.0', 88, '2026-08-11 00:00:00'),
       ('עמדת לובי', 'QA-0002', 'https://lobby.example.com/', 'lobby.example.com', 'B3XQ47', NULL, 0, NULL, NULL, NULL, NULL);`);

const dev = (id) => db.prepare('SELECT * FROM devices WHERE id = ?').get(Number(id));

/** Every `update_config` this harness would have issued, newest last. */
const PUSHED = [];

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
    return send(200, { devices: db.prepare('SELECT * FROM devices ORDER BY id').all().map(publicDevice) });
  }

  let m;
  if ((m = p.match(/^\/devices\/(\d+)$/)) && req.method === 'PATCH') {
    const device = dev(m[1]); if (!device) { res.writeHead(404); return res.end(); }

    // Presence, not truthiness — `''` is the owner taking the local way out
    // away again, and `COALESCE` cannot express that.
    const sentExit = Object.prototype.hasOwnProperty.call(body || {}, 'exitCode');
    let exit;
    if (sentExit) {
      exit = normalizeExitCode(body.exitCode, device);
      if (!exit.ok) {
        return send(400, {
          error: {
            short: `קוד התחזוקה קצר מדי — לפחות ${MIN_LENGTH} תווים`,
            long: `קוד התחזוקה ארוך מדי — עד ${MAX_LENGTH} תווים`,
            chars: 'קוד התחזוקה מכיל תווים שאי אפשר להקליד על המכשיר',
            obvious: 'קוד התחזוקה קל מדי לניחוש — הימנעו מרצף או מתו חוזר ⁦(1234, 0000)⁩',
            access: 'קוד התחזוקה זהה לקוד הגישה של המכשיר, שמודבק לידו — בחרו קוד אחר',
          }[exit.reason] || 'קוד התחזוקה אינו תקין',
        });
      }
    }
    db.prepare(`UPDATE devices SET name = COALESCE(?, name), home_url = COALESCE(?, home_url) WHERE id = ?`)
      .run(body?.name ?? null, body?.homeUrl ?? null, device.id);
    if (sentExit) db.prepare('UPDATE devices SET exit_code = ? WHERE id = ?').run(exit.value, device.id);
    const fresh = dev(device.id);
    PUSHED.push({ deviceId: fresh.id, homeUrl: fresh.home_url, displayUrl: deviceDisplayUrl(fresh), adminCode: configExitCode(fresh) });
    return send(200, { device: publicDevice(fresh) });
  }

  // Read-back for the assertions: the column, and what the device was handed.
  if (p === '/_qa/state') {
    return send(200, {
      devices: db.prepare('SELECT id, name, access_code, exit_code FROM devices ORDER BY id').all(),
      pushed: PUSHED,
    });
  }

  res.writeHead(404); res.end();
}

/** `publicDevice()`'s shape, including `exitCode` — see `devicepayload.js`. */
function publicDevice(d) {
  return { id: d.id, name: d.name, serial: d.serial, allowedHost: d.allowed_host, homeUrl: d.home_url,
    displayUrl: d.display_url ?? null, idleReturnSeconds: d.idle_return_seconds, accessCode: d.access_code ?? null,
    exitCode: d.exit_code ?? null, setupTrack: d.setup_track ?? null, online: !!d.online, lastSeen: d.last_seen,
    appVersion: d.app_version, battery: d.battery, model: d.model };
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

server.listen(Number(process.argv[2]) || 4183, '127.0.0.1', () => {
  console.log('QA stub on http://127.0.0.1:' + server.address().port + '/console');
});
