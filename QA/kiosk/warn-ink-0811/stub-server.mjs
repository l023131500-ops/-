// QA harness for the `--warn-ink` step (2026-08-11).
//
// The change is CSS + five inline `color:` references, so what has to be real is
// `server/public/` itself: this serves that directory verbatim — the real
// `css/style.css`, the real `js/app.js`, and `console.html` mounted at
// `/console` (the express app mounts it there, and `app.js` derives BASE by
// stripping `/console` off the path, so serving it at `/console.html` would send
// every API call to `/console.html/api/...`).
//
// Only the glue is canned. express and better-sqlite3 are not installed in this
// checkout — but `setupsteps.js` is dependency-free, so the wizard route below
// answers through the **real** module in the shape `routes/devices.js` builds
// (`{ deviceId, tracks, track, steps, progress }`). The wizard is one of the
// three confirmation paragraphs under test, and a hand-written checklist would
// measure a colour on a DOM the console does not actually produce.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setupChecklist, checklistProgress, TRACKS } from '../../../apps/35-kioskfleet/server/src/setupsteps.js';

const PUBLIC = fileURLToPath(new URL('../../../apps/35-kioskfleet/server/public/', import.meta.url));
const PORT = Number(process.argv[2] || 8797);

const USER = { username: 'qa', fullName: 'בדיקת QA', role: 'owner', devicesUsed: 2, deviceLimit: 5 };

// Device 1 has an access code and an exit code — it opens the 🔑 re-issue
// confirmation and the 🚪 clear confirmation, two of the five sites.
// Device 2 has neither, so its card carries `טרם הונפק`, the third.
const DEVICES = [
  {
    id: 1, name: 'כניסה ראשית', serial: 'SN-QA-0001', online: true,
    homeUrl: 'https://hadar.example.com/', displayUrl: null,
    allowedHost: 'hadar.example.com', idleReturnSeconds: 60,
    battery: 84, model: 'Lenovo TB-X306F', appVersion: '1.4.0',
    lastSeen: '2026-08-11 01:40:00', accessCode: 'A7K2M9', exitCode: 'shalom7',
    setupTrack: 'gms',
  },
  {
    id: 2, name: 'עמדת לובי', serial: 'SN-QA-0002', online: false,
    homeUrl: 'https://lobby.example.com/', displayUrl: null,
    allowedHost: '', idleReturnSeconds: 0,
    battery: null, model: 'Generic RK3566', appVersion: '1.4.0',
    lastSeen: null, accessCode: null, exitCode: null, setupTrack: null,
  },
];

// One disabled client — the fourth site is the `⛔ הלקוח מושבת` line in the
// per-device approvals picker, which only renders for `active: 0`.
const CLIENTS = [
  { id: 21, name: 'אולם הדר', code: '1234', siteUrl: 'https://hadar.example.com', allowedHost: 'hadar.example.com', notes: '', active: 1 },
  { id: 22, name: 'גן ורדים', code: '5678', siteUrl: 'https://vradim.example.com', allowedHost: 'vradim.example.com', notes: '', active: 0 },
];
const LINKS = [{ id: 11, name: 'אולם הדר — חתונה 12/8', url: 'https://hadar.example.com/event/12', allowedHost: 'hadar.example.com' }];

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

const json = (res, body, code = 200) => {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
};

const TICKED = new Map([[1, ['no-accounts']]]);

const setupPayload = (id) => {
  const d = DEVICES.find((x) => x.id === id);
  const steps = setupChecklist({
    serverAddress: 'https://kiosk.more30.com/kiosk',
    code: 'QA1234',
    installUrl: 'https://kiosk.more30.com/kiosk/install/QA1234',
    track: d.setupTrack,
  });
  return {
    deviceId: id, tracks: TRACKS, track: d.setupTrack || 'generic', steps,
    progress: checklistProgress(steps, TICKED.get(id) || []),
  };
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
    // Added by `chip-ink-0811`, additively: `.alert-ok` exists in exactly one
    // place in the console — the answer `createEnrollment()` paints after a
    // successful POST — so it is unreachable without these two. The GET was
    // 404ing before, which left `#e-list` on `טוען…`; the earlier runs that
    // drove this screen measured labels and are unaffected either way.
    if (p === '/api/enrollments' && req.method === 'POST') {
      return json(res, { enrollment: { id: 91, code: 'QA7X2K', installUrl: 'https://kiosk.more30.com/kiosk/install/QA7X2K' } });
    }
    if (p === '/api/enrollments') {
      return json(res, { enrollments: [{ id: 90, code: 'QA1234', home_url: 'https://hadar.example.com/event/12', name: 'כניסה ראשית', used: 0, installUrl: 'https://kiosk.more30.com/kiosk/install/QA1234' }] });
    }
    const setup = p.match(/^\/api\/devices\/(\d+)\/setup$/);
    if (setup) return json(res, setupPayload(Number(setup[1])));
    const approvals = p.match(/^\/api\/devices\/(\d+)\/clients$/);
    if (approvals) return json(res, { clients: CLIENTS.map((c) => ({ ...c, approved: c.id === 21 })) });
    // Added by `screens-approvals-code-0811`, additively and for the same reason
    // the two routes above exist: `linkApprovals()` returns on the first `api()`
    // rejection, so without this the 📚 dialog never opens and its rows cannot be
    // graded. Mirrors the clients shape (`{ links: [...approved] }`). `LINKS` is
    // left alone rather than grown a second row — four other harnesses grade the
    // links *screen* off it by `nth-child`.
    const linkApprovals = p.match(/^\/api\/devices\/(\d+)\/links$/);
    if (linkApprovals) return json(res, { links: LINKS.map((l) => ({ ...l, approved: l.id === 11 })) });
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
