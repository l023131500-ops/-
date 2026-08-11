/**
 * QA — the launcher API over a real socket (KIOSK_BUILD §2★ז).
 *
 * `server/node_modules` is not installed in this checkout, so `routes/launcher.js`
 * cannot be loaded: it imports express and, through `db.js`, better-sqlite3. What
 * runs below is the express *glue* rewritten on `node:http` — the routing, the
 * status codes and the header. Everything that decides anything is the real
 * module: `accesscode.js`, `approvals.js`, `launcher.js` and `ratelimit.js` are
 * imported from `server/src`, and the database is `node:sqlite` running the DDL
 * text `src/db.js` runs.
 *
 * So this proves the wiring the unit tests cannot: that a wrong code comes back
 * 404 over HTTP, that the tenth one comes back 429 with a Retry-After, and that
 * the bytes on the wire hold no device token.
 *
 * Run: node QA/kiosk/launcher-api-0811/stub-server.mjs
 */
import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { deviceForAccessCode, issueAccessCode, normalizeAccessCode } from '../../../apps/35-kioskfleet/server/src/accesscode.js';
import { approvedClientsForDevice } from '../../../apps/35-kioskfleet/server/src/approvals.js';
import { launcherProfile, launcherTarget } from '../../../apps/35-kioskfleet/server/src/launcher.js';
import { callerKey, createAttemptLimiter, LAUNCHER_MAX_FAILURES } from '../../../apps/35-kioskfleet/server/src/ratelimit.js';

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
db.exec(`INSERT INTO devices (owner_id, serial, name, device_token, allowed_host, home_url, idle_return_seconds)
         VALUES (1, 'SER-1', 'לובי ראשי', 'tok-secret-do-not-leak', 'hall.example.com', 'https://hall.example.com/', 90)`);
db.exec(`INSERT INTO clients (owner_id, code, name, site_url, allowed_host, active) VALUES
  (1, '1234', 'אולם הדר',   'https://hadar.example.com/', 'hadar.example.com', 1),
  (1, 'DS7LZ','מסעדת גליל', 'https://galil.example.com/', 'galil.example.com', 1)`);
db.exec('INSERT INTO device_clients (device_id, client_id) VALUES (1, 1)');
const CODE = issueAccessCode(db, 1);

const limiter = createAttemptLimiter();
const events = [];
const logEvent = (deviceId, userId, type, detail) => events.push({ type, detail });

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(body));
}

/** The two handlers, mirroring server/src/routes/launcher.js. */
function resolveDevice(req, res, body) {
  const key = callerKey(req);
  const gate = limiter.check(key);
  if (!gate.allowed) {
    send(res, 429, { error: 'יותר מדי ניסיונות. נסו שוב מאוחר יותר.', retryAfter: gate.retryAfterSeconds },
      { 'retry-after': String(gate.retryAfterSeconds) });
    return null;
  }
  const code = normalizeAccessCode(body?.code);
  const device = code ? deviceForAccessCode(db, code) : null;
  if (!device) {
    const after = limiter.fail(key);
    if (after.lockedNow) {
      logEvent(null, null, 'launcher_lockout', `${key} — ${after.retryAfterSeconds}s`);
      send(res, 429, { error: 'יותר מדי ניסיונות. נסו שוב מאוחר יותר.', retryAfter: after.retryAfterSeconds },
        { 'retry-after': String(after.retryAfterSeconds) });
      return null;
    }
    send(res, 404, { error: 'קוד לא מוכר' });
    return null;
  }
  limiter.succeed(key);
  return device;
}

const server = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => {
    let body = {};
    try { body = JSON.parse(raw || '{}'); } catch { body = {}; }
    if (req.url === '/api/launcher/resolve') {
      const device = resolveDevice(req, res, body);
      if (!device) return;
      logEvent(device.id, null, 'launcher_opened', normalizeAccessCode(body.code));
      return send(res, 200, launcherProfile(device, approvedClientsForDevice(db, device.id)));
    }
    if (req.url === '/api/launcher/open') {
      const device = resolveDevice(req, res, body);
      if (!device) return;
      const approved = approvedClientsForDevice(db, device.id);
      const target = launcherTarget(body.clientId, approved);
      if (!target) return send(res, 404, { error: 'מזהה לקוח אינו מאושר למכשיר זה' });
      logEvent(device.id, null, 'launcher_client_opened', `${target.id} — ${target.name}`);
      return send(res, 200, {
        url: target.url,
        client: { id: target.id, name: target.name },
        allowedHost: launcherProfile(device, approved).allowedHost,
        idleReturnSeconds: Number(device.idle_return_seconds ?? 0),
      });
    }
    send(res, 404, { error: 'not found' });
  });
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

const post = async (path, payload) => {
  const r = await fetch(origin + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return { status: r.status, retryAfter: r.headers.get('retry-after'), text: await r.text() };
};

const results = [];
const check = (name, ok, detail) => { results.push({ name, ok, detail }); console.log(`${ok ? '✔' : '✖'} ${name}${detail ? ` — ${detail}` : ''}`); };

console.log(`\naccess code issued to device 1: ${CODE}\n`);

// 1. The happy path a person standing at the tablet takes.
let r = await post('/api/launcher/resolve', { code: CODE });
let profile = JSON.parse(r.text);
check('a real code returns the device profile', r.status === 200 && profile.device.name === 'לובי ראשי', `status ${r.status}`);
check('the venue link comes back', profile.kioskUrl === 'https://hall.example.com/', profile.kioskUrl);
check('only the approved business is offered', JSON.stringify(profile.clients.map((c) => c.name)) === JSON.stringify(['אולם הדר']), JSON.stringify(profile.clients));

// 2. What must not be on the wire.
check('no device token in the response bytes', !r.text.includes('tok-secret-do-not-leak'));
check('no serial in the response bytes', !r.text.includes('SER-1'));
check('no client code in the response bytes', !r.text.includes('1234'));

// 3. The written form of the code, as it comes off a card.
r = await post('/api/launcher/resolve', { code: `${CODE.slice(0, 3).toLowerCase()}-${CODE.slice(3)}` });
check('the code survives being written down with a dash', r.status === 200, `status ${r.status}`);

// 4. Choosing a business, and choosing one that was never approved for this device.
r = await post('/api/launcher/open', { code: CODE, clientId: 1 });
check('an approved business opens', r.status === 200 && JSON.parse(r.text).url === 'https://hadar.example.com/', r.text);
check('its host is on the list handed over', JSON.parse(r.text).allowedHost === 'hall.example.com,hadar.example.com', JSON.parse(r.text).allowedHost);
r = await post('/api/launcher/open', { code: CODE, clientId: 2 });
check('a registered but unapproved business is refused', r.status === 404, `status ${r.status}`);

// 5. Guessing.
r = await post('/api/launcher/resolve', { code: 'ZZZZZZ' });
check('a wrong code is 404 and says nothing more', r.status === 404 && JSON.parse(r.text).error === 'קוד לא מוכר', r.text);
r = await post('/api/launcher/resolve', { code: 'AB' });
check('a malformed code gets the same 404, not a 400', r.status === 404, `status ${r.status}`);

let lockedAt = 0;
for (let i = 0; i < LAUNCHER_MAX_FAILURES + 2 && !lockedAt; i += 1) {
  r = await post('/api/launcher/resolve', { code: 'ZZZZZ9' });
  if (r.status === 429) lockedAt = i + 3;   // two failures already spent above
}
check('the guesser is locked out inside the budget', lockedAt === LAUNCHER_MAX_FAILURES, `locked on failure #${lockedAt}`);
check('the lockout carries Retry-After', Number(r.retryAfter) > 0, `Retry-After: ${r.retryAfter}`);
r = await post('/api/launcher/resolve', { code: CODE });
check('the lockout holds even for the right code', r.status === 429, `status ${r.status}`);
check('the lockout is logged', events.some((e) => e.type === 'launcher_lockout'), JSON.stringify(events.filter((e) => e.type === 'launcher_lockout')));

server.close();
const failed = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
