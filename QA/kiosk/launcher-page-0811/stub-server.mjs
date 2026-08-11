/**
 * QA — the launcher *page* in a real browser (KIOSK_BUILD §2★ז).
 *
 * `server/node_modules` is absent in this checkout, so `src/index.js` and
 * `routes/launcher.js` cannot be loaded (express, better-sqlite3). What is
 * rewritten below is only the express glue: the two mounts, the status codes and
 * the `sendFile` for the page. Everything that decides anything is the real
 * thing — `accesscode.js`, `approvals.js`, `launcher.js` and `ratelimit.js` are
 * imported from `server/src`, the database is `node:sqlite` running the DDL text
 * `src/db.js` runs, and the HTML served is `server/public/kiosk-launcher.html`
 * byte for byte.
 *
 * It also serves the page under a `/kiosk` prefix, because that is the shape the
 * page's own path arithmetic has to survive in production and the shape that
 * would silently break if it were tested at the root only.
 *
 * Run:  node QA/kiosk/launcher-page-0811/stub-server.mjs
 * It prints the origin, the codes and the client ids, then stays up for the
 * browser driver. Ctrl-C to stop.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { deviceForAccessCode, issueAccessCode, normalizeAccessCode } from '../../../apps/35-kioskfleet/server/src/accesscode.js';
import { approvedClientsForDevice } from '../../../apps/35-kioskfleet/server/src/approvals.js';
import { launcherProfile, launcherTarget } from '../../../apps/35-kioskfleet/server/src/launcher.js';
import { callerKey, createAttemptLimiter } from '../../../apps/35-kioskfleet/server/src/ratelimit.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(HERE, '../../../apps/35-kioskfleet/server/public');
const PAGE = fs.readFileSync(path.join(PUBLIC_DIR, 'kiosk-launcher.html'));

const DDL = `
CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL);
CREATE TABLE devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  serial TEXT UNIQUE NOT NULL, name TEXT, device_token TEXT UNIQUE NOT NULL,
  access_code TEXT, allowed_host TEXT, home_url TEXT,
  idle_return_seconds INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX idx_devices_access_code ON devices(access_code);
CREATE TABLE clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL, name TEXT NOT NULL, site_url TEXT NOT NULL,
  allowed_host TEXT, active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE device_clients (
  device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  PRIMARY KEY (device_id, client_id)
);
`;

const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys = ON');
db.exec(DDL);
db.exec(`INSERT INTO users (username) VALUES ('hall')`);
// Device 1 — a venue with two approved businesses and one that is registered
// but not approved for it. Device 2 — nothing approved at all, the state the
// page has to explain rather than render as an empty card.
db.exec(`INSERT INTO devices (owner_id, serial, name, device_token, allowed_host, home_url, idle_return_seconds) VALUES
  (1, 'SER-1', 'לובי ראשי',  'tok-secret-do-not-leak', 'hall.example.com', 'https://hall.example.com/', 90),
  (1, 'SER-2', 'כניסה צפונית','tok-second-secret',      'hall.example.com', 'https://hall.example.com/', 0)`);
db.exec(`INSERT INTO clients (owner_id, code, name, site_url, allowed_host, active) VALUES
  (1, '1234',  'אולם הדר',    'https://hadar.example.com/',  'hadar.example.com', 1),
  (1, 'DS7LZ', 'מסעדת גליל',  'https://galil.example.com/',  'galil.example.com', 1),
  (1, 'K9WTY', 'גני שרה',     'https://sarah.example.com/',  'sarah.example.com', 1)`);
db.exec('INSERT INTO device_clients (device_id, client_id) VALUES (1, 1), (1, 2)');
const CODE_1 = issueAccessCode(db, 1);
const CODE_2 = issueAccessCode(db, 2);

const limiter = createAttemptLimiter();
const events = [];
const logEvent = (deviceId, userId, type, detail) => events.push({ type, detail });

const BASE = '/kiosk';   // production's prefix, so the page's path arithmetic is exercised

function json(res, status, body, headers = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(body));
}

/** Mirrors the shared preamble of both handlers in routes/launcher.js. */
function resolveDevice(req, res, body) {
  const key = callerKey(req);
  const gate = limiter.check(key);
  if (!gate.allowed) {
    json(res, 429, { error: 'יותר מדי ניסיונות. נסו שוב מאוחר יותר.', retryAfter: gate.retryAfterSeconds },
      { 'retry-after': String(gate.retryAfterSeconds) });
    return null;
  }
  const code = normalizeAccessCode(body?.code);
  const device = code ? deviceForAccessCode(db, code) : null;
  if (!device) {
    const after = limiter.fail(key);
    if (after.lockedNow) {
      logEvent(null, null, 'launcher_lockout', `${key} — ${after.retryAfterSeconds}s`);
      json(res, 429, { error: 'יותר מדי ניסיונות. נסו שוב מאוחר יותר.', retryAfter: after.retryAfterSeconds },
        { 'retry-after': String(after.retryAfterSeconds) });
      return null;
    }
    json(res, 404, { error: 'קוד לא מוכר' });
    return null;
  }
  limiter.succeed(key);
  return device;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  // Strip the prefix the way `app.use(base, site)` does — on a path boundary.
  // A bare `startsWith(BASE)` would eat the prefix off `/kiosk-launcher` itself
  // and leave `-launcher`, which is exactly the difference between the two
  // mounts this page has to work under. The service is left serving both, so
  // the QA run can drive the page at `/kiosk/...` (production) and at `/...`
  // (the Railway hostname and dev) without restarting.
  const inBase = url.pathname === BASE || url.pathname.startsWith(BASE + '/');
  const p = inBase ? url.pathname.slice(BASE.length) || '/' : url.pathname;

  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => {
    let body = {};
    try { body = JSON.parse(raw || '{}'); } catch { body = {}; }

    if (p === '/api/launcher/resolve') {
      const device = resolveDevice(req, res, body);
      if (!device) return;
      logEvent(device.id, null, 'launcher_opened', normalizeAccessCode(body.code));
      return json(res, 200, launcherProfile(device, approvedClientsForDevice(db, device.id)));
    }
    if (p === '/api/launcher/open') {
      const device = resolveDevice(req, res, body);
      if (!device) return;
      const approved = approvedClientsForDevice(db, device.id);
      const target = launcherTarget(body.clientId, approved);
      if (!target) return json(res, 404, { error: 'מזהה לקוח אינו מאושר למכשיר זה' });
      logEvent(device.id, null, 'launcher_client_opened', `${target.id} — ${target.name}`);
      return json(res, 200, {
        url: target.url,
        client: { id: target.id, name: target.name },
        allowedHost: launcherProfile(device, approved).allowedHost,
        idleReturnSeconds: Number(device.idle_return_seconds ?? 0),
      });
    }

    // Both forms of the page, exactly as index.js mounts them: express.static
    // with extensions:['html'] answers the bare path, and the explicit
    // `/kiosk-launcher/:code?` route answers the one with a code in it.
    if (p === '/kiosk-launcher' || p.startsWith('/kiosk-launcher/')) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(PAGE);
    }

    // Stand-ins for the sites the launcher navigates to, so the QA driver can
    // assert where the browser actually landed rather than that a click fired.
    if (p === '/site/hall' || p === '/site/hadar' || p === '/site/galil') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(`<!doctype html><meta charset="utf-8"><title>${p}</title><h1>${p}</h1>`);
    }

    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found');
  });
});

await new Promise((r) => server.listen(4187, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

// Point the fixtures at this server so a click is a navigation we can observe.
db.exec(`UPDATE devices SET home_url = '${origin}/site/hall' WHERE id = 1`);
db.exec(`UPDATE clients SET site_url = '${origin}/site/hadar' WHERE id = 1`);
db.exec(`UPDATE clients SET site_url = '${origin}/site/galil' WHERE id = 2`);

console.log(JSON.stringify({
  origin,
  page: `${origin}${BASE}/kiosk-launcher`,
  deviceWithClients: { code: CODE_1, url: `${origin}${BASE}/kiosk-launcher/${CODE_1}` },
  deviceWithNoApprovals: { code: CODE_2, url: `${origin}${BASE}/kiosk-launcher/${CODE_2}` },
  approvedClientIds: [1, 2],
  registeredButNotApproved: 3,
}, null, 2));

process.on('SIGINT', () => { server.close(); process.exit(0); });
