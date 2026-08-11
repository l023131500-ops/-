/**
 * KIOSK_BUILD §2★א, server half — the PATCH path, replayed end to end.
 *
 * The unit tests cover `src/displayurl.js`. This covers the thing the route
 * actually does with it: the two statements that store the field (COALESCE for
 * the rest, an explicit UPDATE for this one, because '' has to be storable as
 * NULL), and the `update_config` payload the device is then handed.
 *
 * `routes/devices.js` imports express, which is not installed in this checkout,
 * so the express glue is what is rewritten here — the storage is the production
 * DDL on node:sqlite and the decisions come from the real modules.
 *
 * Run: node QA/kiosk/display-url-0811/verify.mjs
 */
import { DatabaseSync } from 'node:sqlite';
import { effectiveHostCsv, approvedClientsForDevice } from '../../../apps/35-kioskfleet/server/src/approvals.js';
import { configHostCsv, deviceDisplayUrl, normalizeDisplayUrl } from '../../../apps/35-kioskfleet/server/src/displayurl.js';
import { identify } from '../../../apps/35-kioskfleet/server/src/identify.js';

const DDL = `
CREATE TABLE devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id INTEGER NOT NULL,
  serial TEXT UNIQUE NOT NULL, name TEXT, device_token TEXT UNIQUE NOT NULL,
  access_code TEXT, allowed_host TEXT, home_url TEXT, display_url TEXT,
  idle_return_seconds INTEGER NOT NULL DEFAULT 0);
CREATE TABLE clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id INTEGER NOT NULL, code TEXT NOT NULL,
  name TEXT NOT NULL, site_url TEXT NOT NULL, allowed_host TEXT, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE device_clients (
  device_id INTEGER NOT NULL, client_id INTEGER NOT NULL, PRIMARY KEY (device_id, client_id));
`;

const db = new DatabaseSync(':memory:');
db.exec(DDL);
db.exec(`INSERT INTO devices (owner_id, serial, device_token, allowed_host, home_url, idle_return_seconds)
         VALUES (1, 'SER-1', 'dt-1', 'hall.example.com', 'https://hall.example.com/', 90),
                (1, 'SER-2', 'dt-2', NULL, 'https://hall.example.com/', 0)`);
db.exec(`INSERT INTO clients (owner_id, code, name, site_url, allowed_host)
         VALUES (1, '1234', 'אולם הדר', 'https://hadar.example.com/', 'hadar.example.com')`);
db.exec('INSERT INTO device_clients (device_id, client_id) VALUES (1, 1)');

/** The body of `PATCH /devices/:id`, with express removed. */
function patch(id, body) {
  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(id);
  const { name, homeUrl, allowedHost, idleReturnSeconds } = body;
  const sentDisplay = Object.prototype.hasOwnProperty.call(body, 'displayUrl');

  let display;
  if (sentDisplay) {
    display = normalizeDisplayUrl(body.displayUrl, homeUrl ?? device.home_url);
    if (!display.ok) return { status: 400, reason: display.reason };
  }

  db.prepare(`UPDATE devices SET name = COALESCE(?, name), home_url = COALESCE(?, home_url),
     allowed_host = COALESCE(?, allowed_host), idle_return_seconds = COALESCE(?, idle_return_seconds) WHERE id = ?`)
    .run(name ?? null, homeUrl ?? null, allowedHost ?? null,
         idleReturnSeconds != null ? Math.max(0, Number(idleReturnSeconds)) : null, device.id);
  if (sentDisplay) db.prepare('UPDATE devices SET display_url = ? WHERE id = ?').run(display.value, device.id);

  const fresh = db.prepare('SELECT * FROM devices WHERE id = ?').get(device.id);
  const shown = deviceDisplayUrl(fresh);
  return {
    status: 200,
    row: fresh,
    config: {
      homeUrl: fresh.home_url,
      displayUrl: shown,
      allowedHost: configHostCsv(
        effectiveHostCsv(fresh.allowed_host, approvedClientsForDevice(db, fresh.id)), shown),
      idleReturnSeconds: fresh.idle_return_seconds,
    },
  };
}

let pass = 0, fail = 0;
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`}`);
  ok ? pass++ : fail++;
};

// 1. Nothing sent → the column is untouched and the device shows the main site.
let r = patch(1, { name: 'לובי' });
check('a save that does not mention the field leaves it NULL', r.row.display_url, null);
check('…and the device is told to show the main site', r.config.displayUrl, 'https://hall.example.com/');
check('…with the allow-list it already had, widened only for the approved client',
  r.config.allowedHost, 'hall.example.com,hadar.example.com');

// 2. A second link, stored and pushed.
r = patch(1, { displayUrl: 'https://screens.example.com/lobby' });
check('the second field is stored', r.row.display_url, 'https://screens.example.com/lobby');
check('the lock target does not move', r.row.home_url, 'https://hall.example.com/');
check('the device is told to show it', r.config.displayUrl, 'https://screens.example.com/lobby');
check('and the pushed list covers it', r.config.allowedHost,
  'hall.example.com,hadar.example.com,screens.example.com');

// 3. The selection screen agrees with the config push.
const prof = identify(db.prepare('SELECT * FROM devices WHERE id = 1').get(),
  approvedClientsForDevice(db, 1), '');
check('identify() answers the same display link', prof.profile.context.displayUrl,
  'https://screens.example.com/lobby');
check('identify() still locks to the main site', prof.profile.context.kioskUrl, 'https://hall.example.com/');

// 4. Cleared with '' — the case COALESCE cannot express.
r = patch(1, { displayUrl: '' });
check('an empty string clears the field', r.row.display_url, null);
check('…and the device falls back to the main site', r.config.displayUrl, 'https://hall.example.com/');

// 5. Both fields, one address → stored as NULL so it keeps following.
r = patch(1, { homeUrl: 'https://hall.example.com/v2', displayUrl: 'https://hall.example.com/v2' });
check('a display link identical to the new main site collapses to NULL', r.row.display_url, null);
check('…and the device shows the new main site', r.config.displayUrl, 'https://hall.example.com/v2');

// 6. Junk is refused before anything is written.
const beforeJunk = db.prepare('SELECT * FROM devices WHERE id = 1').get();
check('a non-URL is a 400', patch(1, { displayUrl: 'לובי', name: 'שונה' }).status, 400);
check('a javascript: URL is a 400', patch(1, { displayUrl: 'javascript:alert(1)' }).reason, 'scheme');
check('…and nothing was written by the refused save',
  db.prepare('SELECT * FROM devices WHERE id = 1').get().name, beforeJunk.name);

// 7. A device with no allow-list keeps having none.
r = patch(2, { displayUrl: 'https://screens.example.com/2' });
check('showing a link does not create a lock on an unlocked device', r.config.allowedHost, null);
check('…but it is still shown', r.config.displayUrl, 'https://screens.example.com/2');

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
