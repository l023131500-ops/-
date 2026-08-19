/**
 * §2★א on the launcher's side — the "before" measured rather than asserted.
 *
 * `test/launcher.test.mjs` proves the fixed `launcherProfile()`. This proves the
 * defect it fixes was real, which a test written after the change cannot: it
 * rebuilds the **pre-change expression verbatim** out of the same modules the
 * function composes, over the same rows, and shows what that answer was missing.
 *
 * The source of #35 is gitignored in this tree, so there is no `git show` of the
 * previous version to diff against — hence the expression is quoted here, and
 * the run asserts the real module and the quoted one still agree everywhere the
 * change did not touch.
 *
 *   node QA/kiosk/launcher-display-url-0811/check.mjs
 */
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { approvedClientsForDevice, effectiveHostCsv } from '../../../apps/35-kioskfleet/server/src/approvals.js';
import { approvedLinksForDevice, withLinkHosts } from '../../../apps/35-kioskfleet/server/src/linkapprovals.js';
import { launcherProfile } from '../../../apps/35-kioskfleet/server/src/launcher.js';
import { identify } from '../../../apps/35-kioskfleet/server/src/identify.js';

// The devices columns as `src/db.js` declares them, display_url included.
const DDL = `
CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL);
CREATE TABLE devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  serial TEXT UNIQUE NOT NULL, name TEXT, device_token TEXT UNIQUE NOT NULL,
  access_code TEXT, allowed_host TEXT, home_url TEXT, display_url TEXT,
  idle_return_seconds INTEGER NOT NULL DEFAULT 0
);
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
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, url TEXT NOT NULL, allowed_host TEXT
);
CREATE TABLE device_links (
  device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  link_id   INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  PRIMARY KEY (device_id, link_id)
);
`;

function seeded(displayUrl) {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(DDL);
  db.exec(`INSERT INTO users (username) VALUES ('hall')`);
  db.prepare(
    `INSERT INTO devices (owner_id, serial, name, device_token, allowed_host, home_url, display_url, idle_return_seconds)
     VALUES (1, 'SER-1', 'לובי', 'tok-secret-1', 'hall.example.com', 'https://hall.example.com/', ?, 120)`,
  ).run(displayUrl);
  db.exec(`INSERT INTO clients (owner_id, code, name, site_url, allowed_host, active)
           VALUES (1, '1234', 'אולם הדר', 'https://hadar.example.com/', 'hadar.example.com', 1)`);
  db.exec(`INSERT INTO device_clients (device_id, client_id) VALUES (1, 1)`);
  db.exec(`INSERT INTO links (owner_id, name, url, allowed_host)
           VALUES (1, 'תפריט הערב', 'https://menu.example.com/tonight', 'menu.example.com')`);
  db.exec(`INSERT INTO device_links (device_id, link_id) VALUES (1, 1)`);
  return db;
}

const load = (db) => ({
  device: db.prepare('SELECT * FROM devices WHERE id = 1').get(),
  approved: approvedClientsForDevice(db, 1),
  approvedLinks: approvedLinksForDevice(db, 1),
});

/** `launcherProfile()` exactly as it read before this step, the two fields aside. */
function beforeProfile(device, approvedRows, approvedLinkRows) {
  return {
    device: { name: device?.name ?? null },
    kioskUrl: device?.home_url ?? null,
    allowedHost: withLinkHosts(
      effectiveHostCsv(device?.allowed_host ?? null, approvedRows),
      approvedLinkRows,
    ),
    idleReturnSeconds: Number(device?.idle_return_seconds ?? 0),
  };
}

const results = [];
const check = (name, fn) => {
  try { fn(); results.push(['PASS', name]); }
  catch (e) { results.push(['FAIL', `${name} — ${e.message.split('\n')[0]}`]); }
};

const OWN = 'https://screen.example.com/lobby';

check('before: the launcher had no second field at all', () => {
  const db = seeded(OWN);
  const { device, approved, approvedLinks } = load(db);
  assert.equal(beforeProfile(device, approved, approvedLinks).displayUrl, undefined);
});

check('before: the allow-list did not cover the device\'s own link', () => {
  const db = seeded(OWN);
  const { device, approved, approvedLinks } = load(db);
  const hosts = beforeProfile(device, approved, approvedLinks).allowedHost.split(',');
  assert.ok(!hosts.includes('screen.example.com'), 'the before-list already covered it');
  // …while the two widenings it did compose were there, so this is the third
  // one missing and not a broken fixture.
  assert.ok(hosts.includes('hadar.example.com') && hosts.includes('menu.example.com'));
});

check('before: the venue button opened what the tablet was not showing', () => {
  const db = seeded(OWN);
  const { device, approved, approvedLinks } = load(db);
  const agent = identify(device, approved, '', approvedLinks).profile.context;
  // The device's own screen was on OWN; the only address the launcher offered
  // was the venue's. Tapping "back to the venue" moved the tablet.
  assert.equal(agent.displayUrl, OWN);
  assert.equal(beforeProfile(device, approved, approvedLinks).kioskUrl, 'https://hall.example.com/');
});

check('after: the field is answered and the list covers it', () => {
  const db = seeded(OWN);
  const { device, approved, approvedLinks } = load(db);
  const out = launcherProfile(device, approved, approvedLinks);
  assert.equal(out.displayUrl, OWN);
  assert.equal(out.kioskUrl, 'https://hall.example.com/');
  assert.ok(out.allowedHost.split(',').includes('screen.example.com'));
});

check('after: NULL still means "follow the main site"', () => {
  const db = seeded(null);
  const { device, approved, approvedLinks } = load(db);
  const out = launcherProfile(device, approved, approvedLinks);
  assert.equal(out.displayUrl, 'https://hall.example.com/');
  assert.equal(out.allowedHost, 'hall.example.com,hadar.example.com,menu.example.com');
});

check('after: an unset lock is still unset', () => {
  const db = seeded(OWN);
  db.exec(`UPDATE devices SET allowed_host = '' WHERE id = 1`);
  const { device, approved, approvedLinks } = load(db);
  assert.equal(launcherProfile(device, approved, approvedLinks).allowedHost, '');
});

check('after: everything this step did not touch is byte-identical', () => {
  for (const display of [null, OWN]) {
    const db = seeded(display);
    const { device, approved, approvedLinks } = load(db);
    const now = launcherProfile(device, approved, approvedLinks);
    const was = beforeProfile(device, approved, approvedLinks);
    assert.deepEqual(now.device, was.device);
    assert.equal(now.kioskUrl, was.kioskUrl);
    assert.equal(now.idleReturnSeconds, was.idleReturnSeconds);
    // The only host that moved is the device's own link, and only when it has
    // one: a device following the main site is handed the list it always was.
    if (display === null) assert.equal(now.allowedHost, was.allowedHost);
  }
});

check('after: the launcher and the agent describe one tablet', () => {
  const db = seeded(OWN);
  const { device, approved, approvedLinks } = load(db);
  const l = launcherProfile(device, approved, approvedLinks);
  const a = identify(device, approved, '', approvedLinks).profile.context;
  assert.equal(l.kioskUrl, a.kioskUrl);
  assert.equal(l.displayUrl, a.displayUrl);
  assert.equal(l.allowedHost, a.allowedHost);
});

for (const [state, name] of results) console.log(`${state}  ${name}`);
const failed = results.filter(([s]) => s === 'FAIL').length;
console.log(`\n${results.length - failed}/${results.length} pass`);
process.exit(failed ? 1 : 0);
