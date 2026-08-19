/**
 * QA — the launcher page drawing the **links** half of the selection
 * (KIOSK_BUILD §2★ה/§2★ז).
 *
 * `selection-links-payload-0811` put `links` into `/resolve`'s answer and taught
 * `/open` to accept a `linkId`; the page still drew clients only, so the field
 * arrived and was never rendered. This stub exists to drive the page that now
 * draws it.
 *
 * Same construction as `launcher-page-0811/stub-server.mjs`, which it extends:
 * `server/node_modules` is absent here, so express and better-sqlite3 cannot be
 * loaded and the express glue is rewritten — the two mounts, the status codes,
 * the `sendFile`. Everything that *decides* anything is the real module:
 * `accesscode.js`, `approvals.js`, `linkapprovals.js`, `launcher.js` and
 * `ratelimit.js` are imported from `server/src`, the database is `node:sqlite`,
 * and the HTML served is `server/public/kiosk-launcher.html` byte for byte.
 *
 * The DDL for `links` / `device_links` is the text `src/db.js` runs, minus the
 * `IF NOT EXISTS`, so a column renamed there fails here rather than being
 * quietly re-invented.
 *
 * Run:  node QA/kiosk/launcher-page-links-0811/stub-server.mjs
 * Prints the origin, the two codes and the fixture ids, then stays up for the
 * browser driver. Ctrl-C to stop.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { deviceForAccessCode, issueAccessCode, normalizeAccessCode } from '../../../apps/35-kioskfleet/server/src/accesscode.js';
import { approvedClientsForDevice } from '../../../apps/35-kioskfleet/server/src/approvals.js';
import { approvedLinkTarget, approvedLinksForDevice } from '../../../apps/35-kioskfleet/server/src/linkapprovals.js';
import { launcherProfile, launcherTarget } from '../../../apps/35-kioskfleet/server/src/launcher.js';
import { callerKey, createAttemptLimiter } from '../../../apps/35-kioskfleet/server/src/ratelimit.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(HERE, '../../../apps/35-kioskfleet/server/public');
const PAGE_FILE = path.join(PUBLIC_DIR, 'kiosk-launcher.html');
// Read **per request**, not once at boot. `launcher-page-0811`'s stub read the
// file into a constant, and a stub that outlives an edit to the page then serves
// the bytes it started with — a QA run that reports on the previous version of
// the thing under test, with nothing on screen to say so. This one caught it:
// the first driven pass showed the old rows after the page had already changed.
const page = () => fs.readFileSync(PAGE_FILE);

const DDL = `
CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL);
CREATE TABLE devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  serial TEXT UNIQUE NOT NULL, name TEXT, device_token TEXT UNIQUE NOT NULL,
  access_code TEXT, allowed_host TEXT, home_url TEXT, display_url TEXT,
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
CREATE TABLE links (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  url           TEXT NOT NULL,
  allowed_host  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE device_links (
  device_id   INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  link_id     INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (device_id, link_id)
);
`;

const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys = ON');
db.exec(DDL);
db.exec(`INSERT INTO users (username) VALUES ('hall')`);
// Device 1 — two approved businesses and two approved links, plus one of each
// that exists in the owner's registry/library and is *not* approved for it: the
// page must draw four rows and the un-approved pair must be absent.
// Device 2 — nothing approved at all, the state the page has to explain rather
// than render as an empty card. It is the row that proves the empty sentence
// still fires now that it counts two lists instead of one.
// Device 3 — **links and no clients**, which is the case the sentence changed
// for. It was previously drawn as a list of links with "no client ids are
// approved for this device" printed under it, i.e. a configured device reported
// as unconfigured. Without this fixture the change is untested in the one state
// that distinguishes it.
db.exec(`INSERT INTO devices (owner_id, serial, name, device_token, allowed_host, home_url, idle_return_seconds) VALUES
  (1, 'SER-1', 'לובי ראשי',  'tok-secret-do-not-leak', 'hall.example.com', 'https://hall.example.com/', 90),
  (1, 'SER-2', 'כניסה צפונית','tok-second-secret',      'hall.example.com', 'https://hall.example.com/', 0),
  (1, 'SER-3', 'אולם קטן',    'tok-third-secret',       'hall.example.com', 'https://hall.example.com/', 0)`);
db.exec(`INSERT INTO clients (owner_id, code, name, site_url, allowed_host, active) VALUES
  (1, '1234',  'אולם הדר',    'https://hadar.example.com/',  'hadar.example.com', 1),
  (1, 'DS7LZ', 'מסעדת גליל',  'https://galil.example.com/',  'galil.example.com', 1),
  (1, 'K9WTY', 'גני שרה',     'https://sarah.example.com/',  'sarah.example.com', 1)`);
db.exec('INSERT INTO device_clients (device_id, client_id) VALUES (1, 1), (1, 2)');
// Link id 1 is deliberately approved: client id 1 is approved too, so the page
// is driven in exactly the state where a single `data-id` attribute would send
// the wrong one and the server would resolve it against the wrong table.
db.exec(`INSERT INTO links (owner_id, name, url, allowed_host) VALUES
  (1, 'תפריט הערב',        'https://menu.example.com/',    'menu.example.com'),
  (1, 'לוח אירועים',       'https://board.example.com/',   'board.example.com'),
  (1, 'קישור שלא אושר',    'https://nope.example.com/',    'nope.example.com')`);
db.exec('INSERT INTO device_links (device_id, link_id) VALUES (1, 1), (1, 2), (3, 2)');
const CODE_1 = issueAccessCode(db, 1);
const CODE_2 = issueAccessCode(db, 2);
const CODE_3 = issueAccessCode(db, 3);

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
  // Strip the prefix the way `app.use(base, site)` does — on a path boundary. A
  // bare `startsWith(BASE)` would eat the prefix off `/kiosk-launcher` itself.
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
      return json(res, 200, launcherProfile(
        device,
        approvedClientsForDevice(db, device.id),
        approvedLinksForDevice(db, device.id),
      ));
    }
    if (p === '/api/launcher/open') {
      const device = resolveDevice(req, res, body);
      if (!device) return;
      // The both-and-neither refusal, in the same shape routes/launcher.js has
      // it: this is the branch the page's "send exactly one id" rule exists for,
      // so cutting it here would test the page against a server that forgives.
      const wantsClient = body?.clientId != null && body.clientId !== '';
      const wantsLink = body?.linkId != null && body.linkId !== '';
      if (wantsClient === wantsLink) {
        return json(res, 400, { error: 'יש לבחור מזהה לקוח או קישור — אחד מהם' });
      }
      const approved = approvedClientsForDevice(db, device.id);
      const approvedLinks = approvedLinksForDevice(db, device.id);
      const target = wantsLink
        ? approvedLinkTarget(body.linkId, approvedLinks)
        : launcherTarget(body.clientId, approved);
      if (!target) {
        return json(res, 404, {
          error: wantsLink ? 'הקישור אינו מאושר למכשיר זה' : 'מזהה לקוח אינו מאושר למכשיר זה',
        });
      }
      logEvent(device.id, null, wantsLink ? 'launcher_link_opened' : 'launcher_client_opened',
        `${target.id} — ${target.name}`);
      return json(res, 200, {
        url: target.url,
        ...(wantsLink
          ? { link: { id: target.id, name: target.name } }
          : { client: { id: target.id, name: target.name } }),
        allowedHost: launcherProfile(device, approved, approvedLinks).allowedHost,
        idleReturnSeconds: Number(device.idle_return_seconds ?? 0),
      });
    }

    // A read-only window onto what the routes logged, so the driver can assert
    // that clicking a link row produced `launcher_link_opened` and not the
    // client event with the same id.
    if (p === '/qa/events') return json(res, 200, events);

    // Both forms of the page, exactly as index.js mounts them.
    if (p === '/kiosk-launcher' || p.startsWith('/kiosk-launcher/')) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(page());
    }

    // Stand-ins for the sites the launcher navigates to, so the driver can
    // assert where the browser actually landed rather than that a click fired.
    if (p.startsWith('/site/')) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(`<!doctype html><meta charset="utf-8"><title>${p}</title><h1>${p}</h1>`);
    }

    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found');
  });
});

await new Promise((r) => server.listen(4188, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

// Point the fixtures at this server so a click is a navigation we can observe.
db.exec(`UPDATE devices SET home_url = '${origin}/site/hall' WHERE id = 1`);
db.exec(`UPDATE clients SET site_url = '${origin}/site/hadar' WHERE id = 1`);
db.exec(`UPDATE clients SET site_url = '${origin}/site/galil' WHERE id = 2`);
db.exec(`UPDATE links SET url = '${origin}/site/menu' WHERE id = 1`);
db.exec(`UPDATE links SET url = '${origin}/site/board' WHERE id = 2`);

console.log(JSON.stringify({
  origin,
  page: `${origin}${BASE}/kiosk-launcher`,
  deviceWithApprovals: { code: CODE_1, url: `${origin}${BASE}/kiosk-launcher/${CODE_1}` },
  deviceWithNoApprovals: { code: CODE_2, url: `${origin}${BASE}/kiosk-launcher/${CODE_2}` },
  deviceWithLinksOnly: { code: CODE_3, url: `${origin}${BASE}/kiosk-launcher/${CODE_3}` },
  approvedClientIds: [1, 2],
  approvedLinkIds: [1, 2],
  notApproved: { clientId: 3, linkId: 3 },
}, null, 2));

process.on('SIGINT', () => { server.close(); process.exit(0); });
