/**
 * Replay of the boot-time migration for §2★ב's per-device wizard progress,
 * against `node:sqlite`.
 *
 * `src/db.js` cannot be imported here (`better-sqlite3` is not installed in
 * this checkout), so the two statements it adds are executed verbatim against a
 * database built the way an existing Railway volume looks *today* — devices
 * with data, no `setup_track`, no `device_setup_steps`. What is being proven is
 * that a running deployment survives the boot: no existing column moves, and a
 * second boot is a no-op.
 *
 *   node QA/kiosk/setup-progress-0811/migration.mjs
 */
import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
import {
  setStepDone, tickedStepIds, deviceTrack, setDeviceTrack,
} from '../../../apps/35-kioskfleet/server/src/setupprogress.js';

// The devices table as it exists before this change (columns through display_url).
const OLD = `
CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL);
CREATE TABLE devices (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  serial        TEXT UNIQUE NOT NULL,
  name          TEXT,
  device_token  TEXT UNIQUE NOT NULL,
  access_code   TEXT,
  allowed_host  TEXT,
  home_url      TEXT,
  display_url   TEXT,
  idle_return_seconds INTEGER NOT NULL DEFAULT 0,
  status        TEXT DEFAULT 'unknown',
  online        INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

// Verbatim from src/db.js — the CREATE TABLE block plus what ensureColumn runs.
const NEW_TABLE = `
CREATE TABLE IF NOT EXISTS device_setup_steps (
  device_id   INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  step_id     TEXT NOT NULL,
  ticked_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ticked_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (device_id, step_id)
);
`;
const ADD_COLUMN = 'ALTER TABLE devices ADD COLUMN setup_track TEXT';

function ensureColumn(db, table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  return !cols.some((c) => c.name === column);
}

const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys = ON');
db.exec(OLD);
db.exec(`INSERT INTO users (id, username) VALUES (7, 'hall')`);
db.exec(`INSERT INTO devices (id, owner_id, serial, device_token, access_code, allowed_host, home_url, display_url, idle_return_seconds)
  VALUES
  (1, 7, 'SER-1', 'dt-1', 'K7M4XZ', 'ex.com,pay.ex.com', 'https://ex.com/hall', 'https://ex.com/hall/lobby', 90),
  (2, 7, 'SER-2', 'dt-2', 'P3Q8RT', NULL, 'https://ex.com/hall', NULL, 0)`);
const before = db.prepare('SELECT * FROM devices ORDER BY id').all();

const pass = [];
const fail = [];
const check = (name, fn) => {
  try { fn(); pass.push(name); } catch (e) { fail.push(`${name} — ${e.message}`); }
};

// ── first boot ────────────────────────────────────────────────────
db.exec(NEW_TABLE);
const added = ensureColumn(db, 'devices', 'setup_track', 'setup_track TEXT');

check('the first boot adds the column', () => assert.equal(added, true));
check('every existing row keeps every value it had', () => {
  const after = db.prepare('SELECT * FROM devices ORDER BY id').all();
  assert.equal(after.length, before.length);
  for (let i = 0; i < after.length; i++) {
    const { setup_track, ...rest } = after[i];
    // `{...row}` is a plain object and the row is null-prototype, so the
    // expected side is spread too — the comparison here is about values.
    assert.deepEqual(rest, { ...before[i] });
  }
});
check('the migrated value is NULL, which reads as the generic track', () => {
  for (const row of db.prepare('SELECT * FROM devices ORDER BY id').all()) {
    assert.equal(row.setup_track, null);
    assert.equal(deviceTrack(row), 'generic');
  }
});
check('the new table exists and is empty', () => {
  assert.equal(db.prepare('SELECT COUNT(*) c FROM device_setup_steps').get().c, 0);
});

// ── the thing it is for ───────────────────────────────────────────
check('a tick stores, reads back, and is idempotent', () => {
  assert.equal(setStepDone(db, 1, 'apk', true, 7).changed, true);
  assert.equal(setStepDone(db, 1, 'apk', true, 7).changed, false);
  assert.deepEqual(tickedStepIds(db, 1), ['apk']);
});
check('the primary key refuses a duplicate at the database, not only in code', () => {
  assert.throws(
    () => db.prepare('INSERT INTO device_setup_steps (device_id, step_id) VALUES (?, ?)').run(1, 'apk'),
    /UNIQUE|PRIMARY/i,
  );
});
check('an unknown device id cannot hold progress', () => {
  assert.throws(
    () => db.prepare('INSERT INTO device_setup_steps (device_id, step_id) VALUES (?, ?)').run(99, 'apk'),
    /FOREIGN KEY/i,
  );
});
check('a track set on one device does not move the other', () => {
  setDeviceTrack(db, 1, 'gms');
  assert.equal(db.prepare('SELECT setup_track t FROM devices WHERE id = 1').get().t, 'gms');
  assert.equal(db.prepare('SELECT setup_track t FROM devices WHERE id = 2').get().t, null);
});
check('deleting a device cascades its progress away', () => {
  setStepDone(db, 2, 'apk', true, 7);
  db.exec('DELETE FROM devices WHERE id = 2');
  assert.equal(db.prepare('SELECT COUNT(*) c FROM device_setup_steps WHERE device_id = 2').get().c, 0);
  assert.equal(db.prepare('SELECT COUNT(*) c FROM device_setup_steps').get().c, 1);
});
check('a removed user leaves the tick, without an owner', () => {
  // ON DELETE SET NULL: who ticked it is useful, and losing the tick because a
  // staff account was closed would mean an install that goes backwards.
  //
  // The ticker has to be someone *other* than the device's owner for this to
  // be observable at all — `devices.owner_id` cascades, so deleting the owner
  // takes the device and the whole checklist with it. An admin ticking a box on
  // a customer's device is exactly that case, and it is the one the console
  // allows today (`getOwnedDevice` lets an admin through).
  db.exec(`INSERT INTO users (id, username) VALUES (8, 'admin')`);
  setStepDone(db, 1, 'open-app', true, 8);
  db.exec('DELETE FROM users WHERE id = 8');
  const row = db.prepare("SELECT * FROM device_setup_steps WHERE device_id = 1 AND step_id = 'open-app'").get();
  assert.equal(row.step_id, 'open-app');
  assert.equal(row.ticked_by, null);
});

// ── second boot ───────────────────────────────────────────────────
const snapshot = db.prepare('SELECT * FROM device_setup_steps ORDER BY device_id, step_id').all();
db.exec(NEW_TABLE);
const addedAgain = ensureColumn(db, 'devices', 'setup_track', 'setup_track TEXT');
check('a second boot adds nothing', () => assert.equal(addedAgain, false));
check('a second boot loses no progress', () => {
  assert.deepEqual(
    db.prepare('SELECT * FROM device_setup_steps ORDER BY device_id, step_id').all(), snapshot);
});
check('the raw ALTER would fail twice, which is why ensureColumn guards it', () => {
  assert.throws(() => db.exec(ADD_COLUMN), /duplicate column/i);
});

for (const p of pass) console.log('  PASS  ' + p);
for (const f of fail) console.log('  FAIL  ' + f);
console.log(`\n${pass.length}/${pass.length + fail.length} assertions`);
process.exit(fail.length ? 1 : 0);
