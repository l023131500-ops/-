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
// `src/index.js` mounts the docs directory at `/docs` beside `public/`
// (`if (fs.existsSync(docsDir)) site.use('/docs', express.static(docsDir))`), and
// the console's one guide link points into it. This stub was 404ing that path,
// which is invisible to a run that only reads the link's colour and fatal to one
// that has to follow it — Chromium does not record an error page in history, so
// the link could never enter `:visited`. Added by `visited-link-0811`,
// additively; nothing else in this file changes.
const DOCS = fileURLToPath(new URL('../../../apps/35-kioskfleet/docs/', import.meta.url));
const PORT = Number(process.argv[2] || 8797);

// Added by `dialogs-rtl-admin-0811`, additively and **off by default**: every
// harness that reuses this file gets the `owner` it has always got, because
// `#menu-admin` is `hidden` for an owner and a sidebar that grew an eighth item
// would move the tab stops `nav-keyboard-0811` recorded by index.
//
// It is an argv flag rather than a second stub file because `role` is the only
// difference — `viewAdmin()` returns to the devices screen on `ME.role !==
// 'admin'`, so the three אשף → משתמשים dialogs are unreachable without it, and a
// copy of this file would drift from the real `public/` it serves.
const ADMIN = process.argv[3] === 'admin';

const USER = { username: 'qa', fullName: 'בדיקת QA', role: ADMIN ? 'admin' : 'owner', devicesUsed: 2, deviceLimit: 5 };

// The two rows `loadUsers()` renders. One is the admin themself — `delUser` is
// deliberately not offered on an admin row (`u.role === 'admin' ? '' : …`), so a
// second, non-admin row is what makes 🗑️ reachable at all.
const USERS = [
  { id: 1, username: 'qa', full_name: 'בדיקת QA', role: 'admin', devices_used: 2, device_limit: 5, active: 1 },
  { id: 2, username: 'hadar-halls', full_name: 'אולמי הדר', role: 'owner', devices_used: 3, device_limit: 10, active: 1 },
];

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

// `.md` is `text/plain` and not the default `application/octet-stream` for a
// reason `visited-link-0811` had to find out: an octet-stream response is a
// download, a download is not a navigation, and a link that triggers one never
// enters history. `express.static` serves `.md` as `text/markdown`, which
// Chromium also renders inline.
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

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
    // Added by `dialogs-rtl-admin-0811`, additively. `viewAdmin()` awaits
    // `/admin/stats` **before** it calls `loadUsers()`, so a 404 there leaves the
    // users table on `טוען…` and none of its three dialogs can be opened — the
    // same shape that left `#e-list` hanging before `chip-ink-0811` added
    // `/enrollments`. Served regardless of the flag: they are only reachable from
    // a screen an owner cannot route to.
    if (p === '/api/admin/stats') return json(res, { stats: { users: USERS.length, devices: 5, online: 1, offline: 4 } });
    if (p === '/api/admin/users') return json(res, { users: USERS });
    return json(res, { error: 'not stubbed: ' + p }, 404);
  }

  const docs = p.startsWith('/docs/');
  const root = docs ? DOCS : PUBLIC;
  const file = docs ? p.slice('/docs/'.length)
    : p === '/console' || p === '/console/' ? 'console.html'
      : p === '/' ? 'index.html' : p.replace(/^\//, '');
  const abs = normalize(join(root, file));
  if (!abs.startsWith(normalize(root))) { res.writeHead(403); return res.end('no'); }
  try {
    const buf = await readFile(abs);
    res.writeHead(200, { 'content-type': TYPES[extname(abs)] || 'application/octet-stream' });
    res.end(buf);
  } catch {
    res.writeHead(404); res.end('404 ' + file);
  }
}).listen(PORT, () => console.log('stub on http://127.0.0.1:' + PORT + '/console'));
