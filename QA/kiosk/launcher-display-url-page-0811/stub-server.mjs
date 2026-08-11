/**
 * QA — the launcher page drawing §2★א's **second field** (`displayUrl`).
 *
 * `launcher-display-url-0811` put `displayUrl` into `/resolve`'s answer; the page
 * still labelled and opened its one button from `kioskUrl`, so on a device given
 * its own link the only way "back" moved the tablet off the page it was showing.
 * This stub exists to drive the page that now draws both.
 *
 * Same construction as `launcher-page-links-0811/stub-server.mjs`, which it
 * extends: `server/node_modules` is absent here, so express and better-sqlite3
 * cannot be loaded and the express glue is rewritten — the two mounts, the status
 * codes, the `sendFile`. Everything that *decides* anything is the real module:
 * `accesscode.js`, `approvals.js`, `linkapprovals.js`, `launcher.js`,
 * `displayurl.js` and `ratelimit.js` are imported from `server/src`, the database
 * is `node:sqlite` with the DDL text `src/db.js` runs, and the HTML served is
 * `server/public/kiosk-launcher.html` byte for byte, read per request.
 *
 * Run:  node QA/kiosk/launcher-display-url-page-0811/stub-server.mjs
 * Prints the origin, the three codes and the fixture addresses, then stays up for
 * the browser driver. Ctrl-C to stop.
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
// Device 1 — **its own display link**, on a sub-path of the venue's host, plus an
// approved business and an approved link. This is the device the step exists for:
// two address rows have to appear and they must open different pages.
// Device 2 — no `display_url`, i.e. following the main site. `deviceDisplayUrl()`
// falls back, so the payload carries `displayUrl === kioskUrl` and the page must
// draw the single venue button it always drew. Without this row the change could
// have doubled every launcher's first row and nothing here would say so.
// Device 3 — `display_url` holding a **copy** of `home_url`. `normalizeDisplayUrl`
// collapses an equal value to NULL on save, so no new row can be written this way
// — but a row stored before that rule existed can, and the page must not print
// the same address twice under two names.
db.exec(`INSERT INTO devices (owner_id, serial, name, device_token, allowed_host, home_url, display_url, idle_return_seconds) VALUES
  (1, 'SER-1', 'לובי ראשי',   'tok-secret-do-not-leak', 'hall.example.com', 'https://hall.example.com/', 'https://hall.example.com/erev', 90),
  (1, 'SER-2', 'כניסה צפונית','tok-second-secret',      'hall.example.com', 'https://hall.example.com/', NULL, 0),
  (1, 'SER-3', 'אולם קטן',    'tok-third-secret',       'hall.example.com', 'https://hall.example.com/', 'https://hall.example.com/', 0)`);
db.exec(`INSERT INTO clients (owner_id, code, name, site_url, allowed_host, active) VALUES
  (1, '1234',  'אולם הדר',    'https://hadar.example.com/',  'hadar.example.com', 1)`);
db.exec('INSERT INTO device_clients (device_id, client_id) VALUES (1, 1)');
db.exec(`INSERT INTO links (owner_id, name, url, allowed_host) VALUES
  (1, 'תפריט הערב',        'https://menu.example.com/',    'menu.example.com')`);
db.exec('INSERT INTO device_links (device_id, link_id) VALUES (1, 1)');
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

    if (p === '/qa/events') return json(res, 200, events);

    if (p === '/kiosk-launcher' || p.startsWith('/kiosk-launcher/')) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(page());
    }

    // Stand-ins for the pages the launcher navigates to. `/site/hall` and
    // `/site/hall/erev` are the two addresses this step is about, and they are
    // deliberately on **one host under two paths** — the shape a display link
    // really takes, and the one where a host-only line would print the same text
    // under both buttons.
    if (p.startsWith('/site/')) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(`<!doctype html><meta charset="utf-8"><title>${p}</title><h1>${p}</h1>`);
    }

    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found');
  });
});

await new Promise((r) => server.listen(4189, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

// Point the fixtures at this server so a click is a navigation we can observe.
db.exec(`UPDATE devices SET home_url = '${origin}/site/hall' WHERE id IN (1, 2, 3)`);
db.exec(`UPDATE devices SET display_url = '${origin}/site/hall/erev' WHERE id = 1`);
db.exec(`UPDATE devices SET display_url = '${origin}/site/hall' WHERE id = 3`);
db.exec(`UPDATE clients SET site_url = '${origin}/site/hadar' WHERE id = 1`);
db.exec(`UPDATE links SET url = '${origin}/site/menu' WHERE id = 1`);

console.log(JSON.stringify({
  origin,
  page: `${origin}${BASE}/kiosk-launcher`,
  deviceWithOwnLink: {
    code: CODE_1,
    url: `${origin}${BASE}/kiosk-launcher/${CODE_1}`,
    homeUrl: `${origin}/site/hall`,
    displayUrl: `${origin}/site/hall/erev`,
  },
  deviceFollowingMainSite: { code: CODE_2, url: `${origin}${BASE}/kiosk-launcher/${CODE_2}` },
  deviceWithEqualCopy: { code: CODE_3, url: `${origin}${BASE}/kiosk-launcher/${CODE_3}` },
}, null, 2));

process.on('SIGINT', () => { server.close(); process.exit(0); });
