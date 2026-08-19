// QA harness for the dark-mode input contrast fix (2026-08-11).
//
// The change under test is CSS only, so the thing that has to be real is
// `server/public/` itself — this serves that directory verbatim, including the
// real `css/style.css`, the real `console.html` (mounted at `/console`, where
// the express app mounts it: `app.js` derives BASE by stripping `/console` off
// the path, so serving it at `/console.html` would send every API call to
// `/console.html/api/...`) and the real `js/app.js`.
//
// Only the API is canned. express and better-sqlite3 are not installed in this
// checkout, so the routes are replaced with fixtures shaped like
// `publicDevice()` output. Nothing here touches the CSS under test.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC = fileURLToPath(new URL('../../../apps/35-kioskfleet/server/public/', import.meta.url));
const PORT = Number(process.argv[2] || 8791);

const USER = { username: 'qa', fullName: 'בדיקת QA', role: 'owner', devicesUsed: 2, deviceLimit: 5 };

const DEVICES = [
  {
    id: 1, name: 'כניסה ראשית', serial: 'SN-QA-0001', online: true,
    homeUrl: 'https://hadar.example.com/', displayUrl: null,
    allowedHost: 'hadar.example.com', idleReturnSeconds: 60,
    battery: 84, model: 'Lenovo TB-X306F', appVersion: '1.4.0',
    lastSeen: '2026-08-11 01:40:00', accessCode: 'A7K2M9',
  },
  {
    id: 2, name: 'עמדת לובי', serial: 'SN-QA-0002', online: false,
    homeUrl: 'https://lobby.example.com/', displayUrl: 'https://lobby.example.com/promo/summer',
    allowedHost: '', idleReturnSeconds: 0,
    battery: null, model: 'Generic RK3566', appVersion: '1.4.0',
    lastSeen: null, accessCode: null,
  },
];

const LINKS = [{ id: 11, name: 'אולם הדר — חתונה 12/8', url: 'https://hadar.example.com/event/12', allowedHost: 'hadar.example.com' }];
const CLIENTS = [
  { id: 21, name: 'אולם הדר', code: '1234', siteUrl: 'https://hadar.example.com', allowedHost: 'hadar.example.com', notes: '', active: 1 },
  { id: 22, name: 'גן ורדים', code: '5678', siteUrl: 'https://vradim.example.com', allowedHost: 'vradim.example.com', notes: '', active: 1 },
];

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

const json = (res, body, code = 200) => {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
};

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;

  if (p.startsWith('/api/')) {
    if (p === '/api/auth/me') return json(res, { user: USER });
    if (p === '/api/config') return json(res, { wsHost: null });
    if (p === '/api/devices') return json(res, { devices: DEVICES });
    if (p === '/api/links') return json(res, { links: LINKS });
    if (p === '/api/clients') return json(res, { clients: CLIENTS });
    if (p === '/api/devices/1/clients' || p === '/api/devices/2/clients') {
      return json(res, { clients: CLIENTS.map((c) => ({ ...c, approved: c.id === 21 })) });
    }
    return json(res, { error: 'not stubbed: ' + p }, 404);
  }

  const file = p === '/console' || p === '/console/' ? 'console.html' : p === '/' ? 'index.html' : p.replace(/^\//, '');
  const abs = normalize(join(PUBLIC, file));
  if (!abs.startsWith(normalize(PUBLIC))) { res.writeHead(403); return res.end('no'); }
  try {
    const buf = await readFile(abs);
    res.writeHead(200, { 'content-type': TYPES[extname(abs)] || 'application/octet-stream' });
    res.end(buf);
  } catch {
    res.writeHead(404); res.end('404 ' + file);
  }
}).listen(PORT, () => console.log('stub on http://127.0.0.1:' + PORT + '/console'));
