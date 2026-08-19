/**
 * QA harness for §2★א's two fields on the device screen (#35 KioskFleet).
 *
 * `server/node_modules` is not installed in this checkout, so `src/index.js`
 * (express + better-sqlite3) cannot run here. This serves the real
 * `server/public/` over node's own http module and answers `PATCH /devices/:id`
 * from an in-memory store — but the rules are the *real* ones: the same
 * `normalizeDisplayUrl` / `deviceDisplayUrl` / `configHostCsv` calls that
 * `routes/devices.js` makes, in the same order, including validating the display
 * link against the main site **as it will be after this save**. It stands in for
 * the transport, not the logic.
 *
 * Run: node QA/kiosk/display-url-console-0811/stub-server.mjs [port]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { configHostCsv, deviceDisplayUrl, normalizeDisplayUrl } from '../../../apps/35-kioskfleet/server/src/displayurl.js';
import { effectiveHostCsv } from '../../../apps/35-kioskfleet/server/src/approvals.js';
import { normalizeHostCsv } from '../../../apps/35-kioskfleet/server/src/hosts.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(HERE, '../../../apps/35-kioskfleet/server/public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

// Device 1: a domain list and no link of its own — the common case, and the one
// where saving a display link widens what is pushed.
// Device 2: no list at all, and a display link already set — the card has to
// show it, the dialog has to prefill it, and the hint has to say the opposite
// thing about widening.
const devices = [
  { id: 1, name: 'כניסה ראשית', serial: 'QA-0001', home_url: 'https://hadar.example.com/', display_url: null, allowed_host: 'hadar.example.com', idle_return_seconds: 60, online: 1, model: 'Lenovo TB-X306', app_version: '1.4.0', battery: 88, last_seen: '2026-08-11 00:00:00', access_code: 'A7K2M9' },
  { id: 2, name: 'עמדת לובי (ללא נעילת דומיין)', serial: 'QA-0002', home_url: 'https://lobby.example.com/', display_url: 'https://lobby.example.com/promo/summer', allowed_host: '', idle_return_seconds: 0, online: 0, model: 'Galaxy Tab A7', app_version: '1.4.0', battery: null, last_seen: null, access_code: 'B3XQ47' },
];
const commands = [];

function api(req, res, url, body) {
  const send = (status, obj) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
  const p = url.pathname.replace(/^\/api/, '');

  if (p === '/auth/login' && req.method === 'POST') return send(200, { token: 'qa-token' });
  if (p === '/auth/me') return send(200, { user: { username: 'qa', fullName: 'לקוח בדיקה', role: 'user', devicesUsed: devices.length, deviceLimit: 3 } });
  if (p === '/config') return send(200, { wsHost: null, basePath: '' });
  if (p === '/links') return send(200, { links: [] });
  if (p === '/enrollments') return send(200, { enrollments: [] });
  if (p === '/clients' && req.method === 'GET') return send(200, { clients: [] });
  if (p === '/devices' && req.method === 'GET') return send(200, { devices: devices.map(publicDevice) });

  const m = p.match(/^\/devices\/(\d+)$/);
  if (m && req.method === 'PATCH') {
    const device = devices.find((d) => String(d.id) === m[1]);
    if (!device) { res.writeHead(404); return res.end(); }
    let { name, homeUrl, allowedHost, idleReturnSeconds } = body || {};
    const sentDisplay = Object.prototype.hasOwnProperty.call(body || {}, 'displayUrl');

    if (allowedHost != null) allowedHost = normalizeHostCsv(allowedHost) || null;

    let display;
    if (sentDisplay) {
      display = normalizeDisplayUrl(body.displayUrl, homeUrl ?? device.home_url);
      if (!display.ok) {
        return send(400, {
          error: display.reason === 'scheme'
            ? 'הקישור שיוצג על המכשיר חייב להתחיל ב-http:// או ב-https://'
            : 'הקישור שיוצג על המכשיר אינו כתובת תקינה',
        });
      }
    }

    if (name != null) device.name = name;
    if (homeUrl != null) device.home_url = homeUrl;
    if (allowedHost != null) device.allowed_host = allowedHost;
    if (idleReturnSeconds != null) device.idle_return_seconds = Math.max(0, Number(idleReturnSeconds));
    if (sentDisplay) device.display_url = display.value;

    const shown = deviceDisplayUrl(device);
    commands.push({ deviceId: device.id, type: 'update_config', payload: {
      homeUrl: device.home_url,
      displayUrl: shown,
      allowedHost: configHostCsv(effectiveHostCsv(device.allowed_host, []), shown),
      idleReturnSeconds: device.idle_return_seconds,
    } });
    return send(200, { device: publicDevice(device) });
  }

  // Read-back for the assertions: what the store holds and what was pushed.
  if (p === '/_qa/state') return send(200, { devices, commands });

  res.writeHead(404); res.end();
}

// The same shape routes/devices.js sends: `display_url` is surfaced as a
// separate `displayUrl`, null when the device is following the main site.
function publicDevice(d) {
  return { id: d.id, name: d.name, serial: d.serial, allowedHost: d.allowed_host, homeUrl: d.home_url,
    displayUrl: d.display_url ?? null, idleReturnSeconds: d.idle_return_seconds, accessCode: d.access_code ?? null,
    online: !!d.online, status: d.status, lastSeen: d.last_seen, appVersion: d.app_version, battery: d.battery, model: d.model };
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

server.listen(Number(process.argv[2]) || 4176, '127.0.0.1', () => {
  console.log('QA stub on http://127.0.0.1:' + server.address().port + '/console');
});
