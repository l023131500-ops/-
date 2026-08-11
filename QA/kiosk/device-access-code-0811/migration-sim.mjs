/**
 * Does an existing kiosk database survive the access-code migration?
 *
 * `src/db.js` cannot be imported here — it opens better-sqlite3, which is not
 * installed in this checkout. So this rebuilds a *pre-migration* devices table
 * on `node:sqlite` and then replays the three statements db.js runs, in the
 * order db.js runs them:
 *
 *   1. ensureColumn('devices', 'access_code', 'access_code TEXT')
 *   2. CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_access_code ...
 *   3. backfillAccessCodes(db)
 *
 * The order is the point. SQLite refuses `ADD COLUMN ... UNIQUE`, so the index
 * has to be separate — and if it were left in the CREATE TABLE block at the top
 * of db.js it would name a column an older file does not have and take the
 * whole boot down before step 1 ever ran.
 *
 * Run: node QA/kiosk/device-access-code-0811/migration-sim.mjs
 */
import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
import {
  backfillAccessCodes, deviceForAccessCode, normalizeAccessCode,
} from '../../../apps/35-kioskfleet/server/src/accesscode.js';

const say = (s) => console.log(s);

// ── A database as it exists on the volume today: no access_code column ──
const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys = ON');
db.exec(`
CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL);
CREATE TABLE devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  serial TEXT UNIQUE NOT NULL, name TEXT, device_token TEXT UNIQUE NOT NULL,
  allowed_host TEXT, home_url TEXT, idle_return_seconds INTEGER NOT NULL DEFAULT 0
);
`);
db.exec(`INSERT INTO users (username) VALUES ('hall'), ('other')`);
db.exec(`INSERT INTO devices (owner_id, serial, name, device_token, home_url, allowed_host) VALUES
  (1, 'SER-1', 'לובי',   'tok-1', 'https://hall.example.com/',    'hall.example.com'),
  (1, 'SER-2', 'כניסה',  'tok-2', 'https://hall.example.com/b',   NULL),
  (2, 'SER-9', 'של אחר', 'tok-9', 'https://foreign.example.com/', 'foreign.example.com')`);

const before = db.prepare('SELECT id, serial, home_url, allowed_host FROM devices ORDER BY id').all();
say(`pre-migration: ${before.length} devices, no access_code column`);
assert.ok(!db.prepare('PRAGMA table_info(devices)').all().some((c) => c.name === 'access_code'));

// ── Step 1: ensureColumn ──
const cols = db.prepare('PRAGMA table_info(devices)').all();
if (!cols.some((c) => c.name === 'access_code')) db.exec('ALTER TABLE devices ADD COLUMN access_code TEXT');
say('1. ALTER TABLE devices ADD COLUMN access_code TEXT — ok');

// ── Step 2: the unique index ──
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_access_code ON devices(access_code)');
say('2. CREATE UNIQUE INDEX idx_devices_access_code — ok (three NULL rows present, NULLs stay distinct)');

// ── Step 3: the backfill ──
const n = backfillAccessCodes(db);
say(`3. backfillAccessCodes — issued ${n} codes`);
assert.equal(n, 3);

const after = db.prepare('SELECT id, serial, home_url, allowed_host, access_code FROM devices ORDER BY id').all();
for (const row of after) say(`   #${row.id} ${row.serial} → ${row.access_code}`);

// Every code is usable through the path a person types it on.
for (const row of after) {
  assert.equal(normalizeAccessCode(row.access_code), row.access_code);
  assert.equal(deviceForAccessCode(db, row.access_code.toLowerCase()).id, row.id);
}
assert.equal(new Set(after.map((r) => r.access_code)).size, 3);
say('   every issued code resolves back to its own device — ok');

// Nothing else about the existing devices moved. A migration that quietly
// dropped a home_url or an allow-list would take live kiosks off their site.
for (const row of before) {
  const now = after.find((r) => r.id === row.id);
  assert.equal(now.serial, row.serial);
  assert.equal(now.home_url, row.home_url);
  assert.equal(now.allowed_host, row.allowed_host);
}
say('   home_url / allowed_host / serial unchanged on all 3 — ok');

// ── Second boot: idempotent ──
const codes = after.map((r) => r.access_code);
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_access_code ON devices(access_code)');
assert.equal(backfillAccessCodes(db), 0);
assert.deepEqual(db.prepare('SELECT access_code FROM devices ORDER BY id').all().map((r) => r.access_code), codes);
say('second boot: 0 codes issued, none of the existing codes re-rolled — ok');

// ── The constraint is real, not decorative ──
let refused = false;
try {
  db.prepare('UPDATE devices SET access_code = ? WHERE id = 2').run(codes[0]);
} catch (err) {
  refused = /UNIQUE|constraint/i.test(String(err.message));
}
assert.equal(refused, true);
say('duplicate access_code refused by the engine — ok');

say('\nALL CHECKS PASSED');
