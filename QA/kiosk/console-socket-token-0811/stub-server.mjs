/**
 * QA harness for the console-socket device payload (#35 KioskFleet).
 *
 * The fix under test: `notifyConsolesOfDevice()` used to fan out the raw
 * `devices` row, which carries `device_token` — the agent's long-lived secret.
 * It now goes through the real `consoleDevice()` from `src/devicepayload.js`,
 * which this stub imports rather than reimplements.
 *
 * `server/node_modules` is absent here, so neither express nor `ws` can run.
 * The REST side is node's own http module, and `/ws/console` is a hand-rolled
 * RFC6455 handshake plus a server→client text frame — enough to deliver one
 * `device_update` to the real `public/js/app.js`, which is the only thing the
 * browser side of this needs.
 *
 * The row pushed over the socket is a real `SELECT *` row holding a real token,
 * so "the token is not in the frame" is proved against bytes on a socket rather
 * than against a return value.
 *
 * Run: node QA/kiosk/console-socket-token-0811/stub-server.mjs [port]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { consoleDevice } from '../../../apps/35-kioskfleet/server/src/devicepayload.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(HERE, '../../../apps/35-kioskfleet/server/public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

const SECRET = 'dt-live-6b21f0e4c7a9';

const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE devices (
  id INTEGER PRIMARY KEY, owner_id INTEGER, name TEXT, serial TEXT, device_token TEXT UNIQUE NOT NULL,
  access_code TEXT, allowed_host TEXT, home_url TEXT, idle_return_seconds INTEGER DEFAULT 0,
  status TEXT, online INTEGER DEFAULT 0, last_seen TEXT, app_version TEXT, battery INTEGER,
  model TEXT, android_ver TEXT, ip TEXT, created_at TEXT);`);
db.exec(`INSERT INTO devices VALUES
  (1, 7, 'כניסה ראשית', 'QA-0001', '${SECRET}', 'K7M4XZ', 'hadar.example.com',
   'https://hadar.example.com/event/1', 60, 'idle', 0, '2026-08-11 00:00:00',
   '1.4.0', 41, 'Lenovo TB-X306', '11', '10.0.0.4', '2026-08-01 09:00:00');`);

const row = () => db.prepare('SELECT * FROM devices WHERE id = 1').get();

/** Production's camelCase REST shape — what the console loads first. */
const publicDevice = (d) => ({
  id: d.id, name: d.name, serial: d.serial, homeUrl: d.home_url, allowedHost: d.allowed_host,
  idleReturnSeconds: d.idle_return_seconds, accessCode: d.access_code ?? null, status: d.status,
  online: !!d.online, model: d.model, appVersion: d.app_version, battery: d.battery, lastSeen: d.last_seen,
});

/**
 * The frame `notifyConsolesOfDevice()` now sends: the raw row plus the payload
 * an agent connect passes, through the real allow-list. Built once so the page
 * and the assertions are looking at the same bytes.
 */
const UPDATE_FRAME = JSON.stringify({
  type: 'device_update',
  device: consoleDevice(row(), { online: 1, status: 'kiosk', battery: 93, last_seen: '2026-08-11 09:30:00' }),
});

function api(req, res, url) {
  const send = (status, obj) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
  const p = url.pathname.replace(/^\/api/, '');
  if (p === '/auth/login' && req.method === 'POST') return send(200, { token: 'qa-token' });
  if (p === '/auth/me') return send(200, { user: { username: 'qa', fullName: 'לקוח בדיקה', role: 'user', devicesUsed: 1, deviceLimit: 5 } });
  if (p === '/config') return send(200, { wsHost: null, basePath: '' });
  if (p === '/devices') return send(200, { devices: [publicDevice(row())] });
  if (p === '/links') return send(200, { links: [] });
  if (p === '/enrollments') return send(200, { enrollments: [] });
  if (p === '/clients' && req.method === 'GET') return send(200, { clients: [] });
  // The exact frame, for assertions that want it without a socket.
  if (p === '/_qa/frame') return send(200, { frame: UPDATE_FRAME, secret: SECRET, raw: row() });
  res.writeHead(404); res.end();
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    req.on('data', () => {});
    req.on('end', () => api(req, res, url));
    return;
  }
  const rel = url.pathname === '/' ? 'index.html' : url.pathname === '/console' ? 'console.html' : url.pathname.slice(1);
  const file = path.resolve(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});

/** Minimal server→client text frame. Payloads here are far under 64KiB. */
function textFrame(str) {
  const body = Buffer.from(str, 'utf8');
  const head = body.length < 126
    ? Buffer.from([0x81, body.length])
    : Buffer.concat([Buffer.from([0x81, 126]), (() => { const b = Buffer.alloc(2); b.writeUInt16BE(body.length); return b; })()]);
  return Buffer.concat([head, body]);
}

server.on('upgrade', (req, socket) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname !== '/ws/console') return socket.destroy();
  const key = req.headers['sec-websocket-key'];
  const accept = crypto.createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n'
    + `Sec-WebSocket-Accept: ${accept}\r\n\r\n`);
  socket.write(textFrame(JSON.stringify({ type: 'hello', role: 'user' })));
  // Same delivery order as the hub: hello on connect, then the device update.
  setTimeout(() => { if (!socket.destroyed) socket.write(textFrame(UPDATE_FRAME)); }, 250);
  socket.on('data', () => {});
  socket.on('error', () => {});
});

server.listen(Number(process.argv[2]) || 4177, '127.0.0.1', () => {
  console.log('QA stub on http://127.0.0.1:' + server.address().port + '/console');
});
