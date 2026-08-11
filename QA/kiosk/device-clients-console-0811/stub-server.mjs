/**
 * QA harness for the per-device client picker (#35 KioskFleet, §2★ה console side).
 *
 * `server/node_modules` is not installed in this checkout, so `src/index.js`
 * (express + better-sqlite3) cannot run here. This serves the real
 * `server/public/` over node's own http module and answers the two routes the
 * picker uses with an in-memory store — but the rules come from the *real*
 * `approvals.js`: `approvalSelection` filters what PUT stores and
 * `effectiveHostCsv` widens the device's allow-list, exactly as
 * `routes/devices.js` calls them. It stands in for the transport, not the logic.
 *
 * Run: node QA/kiosk/device-clients-console-0811/stub-server.mjs [port]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { approvalSelection, effectiveHostCsv, selectableClients } from '../../../apps/35-kioskfleet/server/src/approvals.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(HERE, '../../../apps/35-kioskfleet/server/public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

// Two devices: one locked to a domain list, one with none — the hint the modal
// shows differs between them, and only the first is widened on approval.
const devices = [
  { id: 1, name: 'כניסה ראשית', serial: 'QA-0001', home_url: 'https://hadar.example.com/event/1', allowed_host: 'hadar.example.com', idle_return_seconds: 60, online: 1, model: 'Lenovo TB-X306', app_version: '1.4.0', battery: 88, last_seen: '2026-08-11 00:00:00' },
  { id: 2, name: 'עמדת לובי (ללא נעילת דומיין)', serial: 'QA-0002', home_url: 'https://lobby.example.com/', allowed_host: '', idle_return_seconds: 0, online: 0, model: 'Galaxy Tab A7', app_version: '1.4.0', battery: null, last_seen: null },
];
const clients = [
  { id: 11, code: '1234', name: 'אולם הדר', site_url: 'https://hadar.example.com', allowed_host: 'hadar.example.com,pay.example.com', active: 1 },
  { id: 12, code: '5678', name: 'גני שרה', site_url: 'https://sarah.example.com', allowed_host: 'sarah.example.com', active: 1 },
  { id: 13, code: '9012', name: 'אולמי נוף (הופסק)', site_url: 'https://nof.example.com', allowed_host: 'nof.example.com', active: 0 },
];
// The disabled client starts approved on device 1 — the case the picker must
// not silently revoke by merely being opened and saved.
const deviceClients = [{ device_id: 1, client_id: 13 }];
const commands = [];

const approvedRows = (deviceId) => deviceClients.filter((r) => r.device_id === deviceId)
  .map((r) => clients.find((c) => c.id === r.client_id)).filter(Boolean);

function api(req, res, url, body) {
  const send = (status, obj) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
  const p = url.pathname.replace(/^\/api/, '');

  if (p === '/auth/login' && req.method === 'POST') return send(200, { token: 'qa-token' });
  if (p === '/auth/me') return send(200, { user: { username: 'qa', fullName: 'לקוח בדיקה', role: 'user', devicesUsed: devices.length, deviceLimit: 3 } });
  if (p === '/config') return send(200, { wsHost: null, basePath: '' });
  if (p === '/devices') return send(200, { devices });
  if (p === '/links') return send(200, { links: [] });
  if (p === '/enrollments') return send(200, { enrollments: [] });
  if (p === '/clients' && req.method === 'GET') return send(200, { clients: clients.map((c) => ({ id: c.id, code: c.code, name: c.name, siteUrl: c.site_url, allowedHost: c.allowed_host, active: !!c.active })) });

  const m = p.match(/^\/devices\/(\d+)\/clients$/);
  if (m) {
    const device = devices.find((d) => String(d.id) === m[1]);
    if (!device) { res.writeHead(404); return res.end(); }
    if (req.method === 'GET') {
      const approved = new Set(deviceClients.filter((r) => r.device_id === device.id).map((r) => r.client_id));
      return send(200, {
        clients: clients.map((c) => ({ id: c.id, code: c.code, name: c.name, siteUrl: c.site_url, active: !!c.active, approved: approved.has(c.id) })),
        approvedIds: [...approved],
      });
    }
    if (req.method === 'PUT') {
      const ids = approvalSelection(clients.map((c) => c.id), body?.clientIds);
      for (let i = deviceClients.length - 1; i >= 0; i--) if (deviceClients[i].device_id === device.id) deviceClients.splice(i, 1);
      for (const id of ids) deviceClients.push({ device_id: device.id, client_id: id });
      const rows = approvedRows(device.id);
      commands.push({ deviceId: device.id, type: 'update_config', payload: {
        homeUrl: device.home_url,
        allowedHost: effectiveHostCsv(device.allowed_host, rows),
        idleReturnSeconds: device.idle_return_seconds,
      } });
      return send(200, { approvedIds: ids, clients: selectableClients(rows) });
    }
  }

  // Read-back for the assertions: what the store holds and what was pushed.
  if (p === '/_qa/state') return send(200, { deviceClients, commands });

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

server.listen(Number(process.argv[2]) || 4174, '127.0.0.1', () => {
  console.log('QA stub on http://127.0.0.1:' + server.address().port + '/console');
});
