/**
 * §2★ה names two things the selection screen may offer. Both payloads answered
 * with one.
 *
 * `device_links` and the console picker landed earlier today, so an owner could
 * tick "this tablet may also open the evening menu" — and then nothing on the
 * device or in the launcher could read it: `identify()` and `launcherProfile()`
 * both returned `clients` alone. This replays what the three routes do, in their
 * own order, against the production DDL on `node:sqlite`, and asserts the
 * payloads and the widened allow-list rather than the modules' return values in
 * isolation.
 *
 * Run: node QA/kiosk/selection-links-payload-0811/verify.mjs
 *
 * `routes/agent.js` and `routes/launcher.js` import express, which is not
 * installed in this checkout, so the express glue is rewritten here and every
 * decision is taken by the real module. The last section reads both route files
 * off disk and asserts the calls this replay claims are actually in them — the
 * same guard `home-url-0811` used, so the replay cannot drift away from the
 * routes it is standing in for.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { approvedClientsForDevice } from '../../../apps/35-kioskfleet/server/src/approvals.js';
import { approvedLinkTarget, approvedLinksForDevice } from '../../../apps/35-kioskfleet/server/src/linkapprovals.js';
import { identify } from '../../../apps/35-kioskfleet/server/src/identify.js';
import { launcherProfile, launcherTarget } from '../../../apps/35-kioskfleet/server/src/launcher.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, '../../../apps/35-kioskfleet/server/src');

let pass = 0, fail = 0;
const check = (name, fn) => {
  try { fn(); console.log(`  ok   ${name}`); pass++; }
  catch (e) { console.log(`  FAIL ${name}\n       ${e.message.split('\n')[0]}`); fail++; }
};

// ── the production DDL, verbatim from src/db.js ──
const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys = ON');
db.exec(`
CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL);
CREATE TABLE devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  serial TEXT UNIQUE NOT NULL, name TEXT, device_token TEXT UNIQUE NOT NULL,
  access_code TEXT, allowed_host TEXT, home_url TEXT, display_url TEXT,
  exit_code TEXT, idle_return_seconds INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'unknown', online INTEGER NOT NULL DEFAULT 0);
CREATE TABLE clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL, name TEXT NOT NULL, site_url TEXT NOT NULL,
  allowed_host TEXT, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE links (
  id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, url TEXT NOT NULL, allowed_host TEXT);
CREATE TABLE device_clients (
  device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (device_id, client_id));
CREATE TABLE device_links (
  device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  link_id   INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (device_id, link_id));
`);
db.exec(`INSERT INTO users (username) VALUES ('hall'), ('other')`);
db.exec(`INSERT INTO devices (owner_id, serial, name, device_token, access_code, allowed_host, home_url, idle_return_seconds)
  VALUES (1, 'SER-1', 'לובי', 'tok-1', 'K7M2QP', 'hall.example.com', 'https://hall.example.com/', 120),
         (1, 'SER-2', 'קומה 2', 'tok-2', 'B4X9RD', NULL,             'https://hall.example.com/', 0)`);
db.exec(`INSERT INTO clients (owner_id, code, name, site_url, allowed_host, active) VALUES
  (1, '1234', 'אולם הדר',  'https://hadar.example.com/',  'hadar.example.com,pay.example.com', 1),
  (1, '99',   'סגור לעונה', 'https://closed.example.com/', 'closed.example.com', 0)`);
db.exec(`INSERT INTO links (owner_id, name, url, allowed_host) VALUES
  (1, 'תפריט הערב',  'https://menu.example.com/tonight', 'menu.example.com'),
  (1, 'לוח אירועים', 'https://board.example.com/today',  NULL),
  (2, 'של לקוח אחר', 'https://foreign.example.com/x',    'foreign.example.com')`);
// Device 1: one active client, one disabled client, one of the two own links.
// Device 2: the same link, and no lock at all.
db.exec(`INSERT INTO device_clients (device_id, client_id) VALUES (1, 1), (1, 2)`);
db.exec(`INSERT INTO device_links (device_id, link_id) VALUES (1, 1), (2, 1)`);

const device = (id) => db.prepare('SELECT * FROM devices WHERE id = ?').get(id);
const deviceForAccessCode = (code) => db.prepare('SELECT * FROM devices WHERE access_code = ?').get(code);

/** POST /api/agent/identify, in the order routes/agent.js runs it. */
function agentIdentify(token, { clientCode } = {}) {
  const dev = db.prepare('SELECT * FROM devices WHERE device_token = ?').get(token);
  if (!dev) return { status: 401, body: { error: 'device token invalid' } };
  const result = identify(dev, approvedClientsForDevice(db, dev.id), clientCode, approvedLinksForDevice(db, dev.id));
  if (!result.ok) return { status: 404, body: { error: 'מזהה לקוח לא מוכר במכשיר זה' } };
  return { status: 200, body: result.profile };
}

/** POST /api/launcher/resolve. The rate limiter is not what is under test here. */
function launcherResolve(code) {
  const dev = deviceForAccessCode(code);
  if (!dev) return { status: 404, body: { error: 'קוד לא מוכר' } };
  return {
    status: 200,
    body: launcherProfile(dev, approvedClientsForDevice(db, dev.id), approvedLinksForDevice(db, dev.id)),
  };
}

/** POST /api/launcher/open, both branches. */
function launcherOpen(code, body) {
  const dev = deviceForAccessCode(code);
  if (!dev) return { status: 404, body: { error: 'קוד לא מוכר' } };

  const wantsClient = body?.clientId != null && body.clientId !== '';
  const wantsLink = body?.linkId != null && body.linkId !== '';
  if (wantsClient === wantsLink) {
    return { status: 400, body: { error: 'יש לבחור מזהה לקוח או קישור — אחד מהם' } };
  }
  const approved = approvedClientsForDevice(db, dev.id);
  const approvedLinks = approvedLinksForDevice(db, dev.id);
  const target = wantsLink
    ? approvedLinkTarget(body.linkId, approvedLinks)
    : launcherTarget(body.clientId, approved);
  if (!target) {
    return {
      status: 404,
      body: { error: wantsLink ? 'הקישור אינו מאושר למכשיר זה' : 'מזהה לקוח אינו מאושר למכשיר זה' },
    };
  }
  const { allowedHost } = launcherProfile(dev, approved, approvedLinks);
  return {
    status: 200,
    body: {
      url: target.url,
      ...(wantsLink ? { link: { id: target.id, name: target.name } } : { client: { id: target.id, name: target.name } }),
      allowedHost,
      idleReturnSeconds: Number(dev.idle_return_seconds ?? 0),
    },
  };
}

console.log('\nPOST /api/agent/identify — the device screen');

check('the approved link reaches the device, the un-approved one does not', () => {
  const { body } = agentIdentify('tok-1');
  assert.deepEqual(body.links, [{ id: 1, name: 'תפריט הערב', url: 'https://menu.example.com/tonight' }]);
});

check('the clients half is unchanged — disabled stays out', () => {
  const { body } = agentIdentify('tok-1');
  assert.deepEqual(body.clients.map((c) => c.code), ['1234']);
});

check('the allow-list covers the link the screen now offers', () => {
  const hosts = agentIdentify('tok-1').body.context.allowedHost.split(',');
  assert.ok(hosts.includes('menu.example.com'), 'link host missing → the device blocks its own selection');
  assert.ok(hosts.includes('hall.example.com'));
  assert.ok(hosts.includes('hadar.example.com'));
  assert.ok(!hosts.includes('board.example.com'), 'an un-approved link widened the lock');
  assert.ok(!hosts.includes('closed.example.com'), 'a disabled client widened the lock');
});

check('a device with no lock is still handed no lock', () => {
  // hostAllowed() reads an empty list as "nothing configured" and allows
  // everything. Filling it from the approvals would create a lock on a live
  // device and the first thing blocked would be the page it is showing.
  assert.equal(agentIdentify('tok-2').body.context.allowedHost, null);
  assert.deepEqual(agentIdentify('tok-2').body.links.map((l) => l.id), [1]);
});

check('a link is picked, never typed — the keypad still resolves clients only', () => {
  assert.equal(agentIdentify('tok-1', { clientCode: '1' }).status, 404);
  assert.equal(agentIdentify('tok-1', { clientCode: 'תפריט הערב' }).status, 404);
  const ok = agentIdentify('tok-1', { clientCode: '1234' });
  assert.equal(ok.body.context.displayUrl, 'https://hadar.example.com/');
  assert.equal(ok.body.links.length, 1);   // the list survives a selection
});

console.log('\nPOST /api/launcher/resolve — the person in the hall');

check('the launcher lists both approved things', () => {
  const { body } = launcherResolve('K7M2QP');
  assert.deepEqual(body.links, [{ id: 1, name: 'תפריט הערב', url: 'https://menu.example.com/tonight' }]);
  assert.deepEqual(body.clients.map((c) => c.name), ['אולם הדר']);
});

check('the payload still carries nothing a six-character code should not buy', () => {
  const flat = JSON.stringify(launcherResolve('K7M2QP').body);
  assert.ok(!flat.includes('tok-1'), 'the device token reached the launcher payload');
  assert.ok(!flat.includes('SER-1'), 'the serial reached the launcher payload');
  assert.ok(!flat.includes('1234'), 'a client code reached the launcher payload');
});

check('its allow-list covers the links too', () => {
  const hosts = launcherResolve('K7M2QP').body.allowedHost.split(',');
  assert.ok(hosts.includes('menu.example.com'));
  assert.ok(!hosts.includes('board.example.com'));
});

console.log('\nPOST /api/launcher/open — what actually opens');

check('an approved link opens, and answers as a link', () => {
  const { status, body } = launcherOpen('K7M2QP', { linkId: 1 });
  assert.equal(status, 200);
  assert.equal(body.url, 'https://menu.example.com/tonight');
  assert.deepEqual(body.link, { id: 1, name: 'תפריט הערב' });
  assert.equal(body.client, undefined);
  // The full list, not just this link's host: idle-return goes back to the
  // venue's own site, and narrowing here would block the way home.
  assert.ok(body.allowedHost.split(',').includes('hall.example.com'));
});

check('a link of the same owner that this device was not approved for is refused', () => {
  assert.equal(launcherOpen('K7M2QP', { linkId: 2 }).status, 404);
  assert.equal(launcherOpen('K7M2QP', { linkId: 3 }).status, 404);   // another owner's
  assert.equal(launcherOpen('K7M2QP', { linkId: 999 }).status, 404);
});

check('the client branch is untouched', () => {
  const { status, body } = launcherOpen('K7M2QP', { clientId: 1 });
  assert.equal(status, 200);
  assert.equal(body.url, 'https://hadar.example.com/');
  assert.deepEqual(body.client, { id: 1, name: 'אולם הדר' });
  assert.equal(body.link, undefined);
  assert.equal(launcherOpen('K7M2QP', { clientId: 2 }).status, 404);   // approved but disabled
});

check('ids do not cross between the two lists', () => {
  // Client 1 and link 1 both exist. Sending one id as the other must not open
  // the wrong thing — it is the same id, and only the field names differ.
  assert.equal(launcherOpen('K7M2QP', { linkId: 1 }).body.url, 'https://menu.example.com/tonight');
  assert.equal(launcherOpen('K7M2QP', { clientId: 1 }).body.url, 'https://hadar.example.com/');
});

check('naming both, or neither, is refused rather than resolved by precedence', () => {
  assert.equal(launcherOpen('K7M2QP', { clientId: 1, linkId: 1 }).status, 400);
  assert.equal(launcherOpen('K7M2QP', {}).status, 400);
  assert.equal(launcherOpen('K7M2QP', { clientId: '' }).status, 400);
});

console.log('\nthe routes this replay stands in for');

const agentSrc = fs.readFileSync(path.join(SRC, 'routes/agent.js'), 'utf8');
const launcherSrc = fs.readFileSync(path.join(SRC, 'routes/launcher.js'), 'utf8');

check('routes/agent.js hands identify() the approved links', () => {
  assert.match(agentSrc, /import \{ approvedLinksForDevice, deviceConfigHostCsv \} from '\.\.\/linkapprovals\.js'/);
  assert.match(agentSrc, /identify\(\s*device,\s*approvedClientsForDevice\(db, device\.id\),\s*clientCode,\s*approvedLinksForDevice\(db, device\.id\),?\s*\)/);
});

check('routes/launcher.js hands launcherProfile() the approved links, on both routes', () => {
  const calls = launcherSrc.match(/launcherProfile\(/g) || [];
  assert.equal(calls.length, 2, 'resolve and open each build one profile');
  assert.match(launcherSrc, /launcherProfile\(\s*device,\s*approvedClientsForDevice\(db, device\.id\),\s*approvedLinksForDevice\(db, device\.id\),?\s*\)/);
  assert.match(launcherSrc, /launcherProfile\(device, approved, approvedLinks\)/);
});

check('routes/launcher.js resolves a link id against this device only', () => {
  assert.match(launcherSrc, /approvedLinkTarget\(req\.body\.linkId, approvedLinks\)/);
  assert.ok(!/approvedLinkTarget\(req\.body\.linkId, approved\)/.test(launcherSrc), 'resolved against the clients list');
});

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
