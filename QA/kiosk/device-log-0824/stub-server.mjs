/**
 * QA harness for the per-device activity log (#35 KioskFleet, KIOSK_BUILD.md
 * §9 "יומן אירועים לכל מכשיר").
 *
 * `server/node_modules` is not installed in this checkout, so `src/index.js`
 * (express + better-sqlite3) cannot run here. This serves the real
 * `server/public/` over node's own http module and answers with fixed,
 * hand-built rows — `GET /devices/:id` returns the exact shape
 * `routes/devices.js` already computes (events + commands, newest first), so
 * this stands in for the transport, not the logic; the logic under test is
 * app.js's rendering of that shape.
 *
 * Run: node QA/kiosk/device-log-0824/stub-server.mjs [port]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(HERE, '../../../apps/35-kioskfleet/server/public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

const devices = [
  { id: 1, name: 'כניסה ראשית', serial: 'QA-0001', home_url: 'https://hadar.example.com/event/1', allowed_host: 'hadar.example.com', idle_return_seconds: 60, online: 1, model: 'Lenovo TB-X306', app_version: '1.4.0', battery: 88, last_seen: '2026-08-24 10:00:00' },
  { id: 2, name: 'עמדה חדשה (ללא יומן)', serial: 'QA-0002', home_url: 'https://lobby.example.com/', allowed_host: '', idle_return_seconds: 0, online: 0, model: 'Galaxy Tab A7', app_version: '1.4.0', battery: null, last_seen: null },
];

// One of every device-scoped event `type` logEvent() is actually called with
// (grepped from src/), so the label map in app.js is exercised for real, not
// just for the one or two types easiest to hit — including a raw, unmapped
// type (`weird_future_type`) to prove an unknown type still renders (falls
// back to the raw string) instead of throwing or showing "undefined".
const events = [
  { type: 'client_revoked', detail: '11', created_at: '2026-08-24 09:50:00' },
  { type: 'client_approved', detail: '1234', created_at: '2026-08-24 09:40:00' },
  { type: 'config_update', detail: null, created_at: '2026-08-24 09:30:00' },
  { type: 'command_ack', detail: '#7 done', created_at: '2026-08-24 09:20:00' },
  { type: 'screenshot', detail: null, created_at: '2026-08-24 09:10:00' },
  { type: 'client_identified', detail: '1234', created_at: '2026-08-24 09:00:00' },
  { type: 'connected', detail: 'agent websocket', created_at: '2026-08-24 08:50:00' },
  { type: 'enrolled', detail: 'serial=QA-0001', created_at: '2026-08-24 08:00:00' },
  { type: 'command', detail: 'reboot (pushed)', created_at: '2026-08-24 07:50:00' },
  { type: 'weird_future_type', detail: 'unmapped on purpose', created_at: '2026-08-24 07:00:00' },
];
const commands = [
  { id: 9, type: 'update_config', payload: null, status: 'delivered', result: null, created_at: '2026-08-24 09:41:00' },
  { id: 8, type: 'screenshot', payload: null, status: 'done', result: null, created_at: '2026-08-24 09:11:00' },
  { id: 7, type: 'reboot', payload: null, status: 'failed', result: 'timeout', created_at: '2026-08-24 07:51:00' },
];

function api(req, res, url) {
  const send = (status, obj) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
  const p = url.pathname.replace(/^\/api/, '');

  if (p === '/auth/login' && req.method === 'POST') return send(200, { token: 'qa-token' });
  if (p === '/auth/me') return send(200, { user: { username: 'qa', fullName: 'לקוח בדיקה', role: 'user', devicesUsed: devices.length, deviceLimit: 3 } });
  if (p === '/config') return send(200, { wsHost: null, basePath: '' });
  if (p === '/devices') return send(200, { devices });
  if (p === '/links') return send(200, { links: [] });

  const m = p.match(/^\/devices\/(\d+)$/);
  if (m && req.method === 'GET') {
    const device = devices.find((d) => String(d.id) === m[1]);
    if (!device) { res.writeHead(404); return res.end(); }
    // Device 2 proves the empty state (no events/commands yet), not just the
    // populated one that every other device in this harness exercises.
    const isEmpty = device.id === 2;
    return send(200, { device, events: isEmpty ? [] : events, commands: isEmpty ? [] : commands });
  }

  res.writeHead(404); res.end();
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) return api(req, res, url);
  const rel = url.pathname === '/' ? 'index.html' : url.pathname === '/console' ? 'console.html' : url.pathname.slice(1);
  const file = path.resolve(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});

server.listen(Number(process.argv[2]) || 4175, '127.0.0.1', () => {
  console.log('QA stub on http://127.0.0.1:' + server.address().port + '/console');
});
