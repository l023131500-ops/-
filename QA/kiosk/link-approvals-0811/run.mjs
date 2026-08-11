/**
 * QA — per-device link approval (KIOSK_BUILD §2★ה, second half), storage half.
 *
 *   node QA/kiosk/link-approvals-0811/run.mjs
 *
 * The unit tests in `server/test/linkapprovals.test.mjs` drive the module
 * against a *copy* of the DDL. This drives the **real** `src/db.js` text, read
 * off disk, against a database shaped like the live Railway volume — i.e. one
 * created before this change — so the claim "the next boot adds the table and
 * loses nothing" is measured rather than assumed. `better-sqlite3` is not
 * installed in this checkout, so the engine is node's own `node:sqlite`; the
 * DDL is the same text either way.
 */
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(here, '../../../apps/35-kioskfleet/server');
const dbSource = fs.readFileSync(path.join(serverDir, 'src/db.js'), 'utf8');

// The one `db.exec(`…`)` block in db.js — the boot DDL, verbatim.
const DDL = dbSource.match(/db\.exec\(`([\s\S]*?)`\);/)[1];
const NEW_BLOCK = /-- Which of the owner's library links[\s\S]*?\);\n/;
const NEW_INDEX = /-- Same reasoning as the line above[\s\S]*?ON device_links\(link_id\);\n/;

const results = [];
const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push({ ok, name, actual, expected });
  console.log(`${ok ? '✔' : '✖'} ${name}${ok ? '' : `\n    got      ${JSON.stringify(actual)}\n    expected ${JSON.stringify(expected)}`}`);
};

// ── 1. a database as it exists on the live volume today ──────────────────────
const OLD_DDL = DDL.replace(NEW_BLOCK, '').replace(NEW_INDEX, '');
check('the extracted DDL really did contain the new table', OLD_DDL.includes('device_links'), false);

const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys = ON');
db.exec(OLD_DDL);
db.exec(`INSERT INTO users (username, password_hash) VALUES ('admin', 'x'), ('hall', 'y')`);
db.exec(`INSERT INTO devices (owner_id, serial, name, device_token, allowed_host, home_url)
         VALUES (2, 'SER-1', 'לובי', 'tok-1', 'hall.example.com', 'https://hall.example.com/'),
                (2, 'SER-2', 'כניסה', 'tok-2', NULL, 'https://hall.example.com/b')`);
db.exec(`INSERT INTO links (owner_id, name, url, allowed_host) VALUES
  (2, 'חתונה 12/8', 'https://hadar.example.com/wed', 'hadar.example.com,pay.example.com'),
  (2, 'תפריט הערב', 'https://menu.example.com/tonight', NULL)`);
db.exec(`INSERT INTO clients (owner_id, code, name, site_url, allowed_host)
         VALUES (2, '1234', 'אולם הדר', 'https://hadar.example.com/', 'hadar.example.com')`);
db.exec(`INSERT INTO device_clients (device_id, client_id) VALUES (1, 1)`);

const snapshot = () => ({
  devices: db.prepare('SELECT id, serial, name, device_token, allowed_host, home_url FROM devices ORDER BY id').all(),
  links: db.prepare('SELECT id, name, url, allowed_host FROM links ORDER BY id').all(),
  clients: db.prepare('SELECT id, code, name, site_url FROM clients ORDER BY id').all(),
  deviceClients: db.prepare('SELECT device_id, client_id FROM device_clients ORDER BY 1,2').all(),
});
const before = snapshot();
check('the old database has no device_links table',
  db.prepare(`SELECT COUNT(*) c FROM sqlite_master WHERE name = 'device_links'`).get().c, 0);

// ── 2. the boot after this change ────────────────────────────────────────────
db.exec(DDL);
check('the boot creates device_links',
  db.prepare(`SELECT type FROM sqlite_master WHERE name = 'device_links'`).get().type, 'table');
check('…and its reverse index',
  db.prepare(`SELECT type FROM sqlite_master WHERE name = 'idx_device_links_link'`).get().type, 'index');
check('every existing row survives the migration untouched', snapshot(), before);

// ── 3. the table behaves as the module assumes ───────────────────────────────
const approve = db.prepare('INSERT INTO device_links (device_id, link_id) VALUES (?, ?)');
approve.run(1, 1); approve.run(1, 2); approve.run(2, 1);
check('approvals are per device, not per owner',
  db.prepare('SELECT link_id FROM device_links WHERE device_id = 2 ORDER BY 1').all().map((r) => r.link_id), [1]);

let dup = null;
try { approve.run(1, 1); } catch (e) { dup = e.message; }
check('a duplicate approval is refused by the primary key', /UNIQUE|PRIMARY/i.test(dup || ''), true);

db.prepare('DELETE FROM links WHERE id = ?').run(2);
check('deleting a link from the library clears it off every device',
  db.prepare('SELECT COUNT(*) c FROM device_links WHERE link_id = 2').get().c, 0);
db.prepare('DELETE FROM devices WHERE id = ?').run(2);
check('deleting a device clears its approvals',
  db.prepare('SELECT device_id FROM device_links ORDER BY 1').all().map((r) => r.device_id), [1]);

// A link id that is not the owner's is refused only by the route's own filter —
// the foreign key checks existence, not ownership. Prove the gap is real so the
// reliance on approvalSelection() is not a comfortable assumption.
db.exec(`INSERT INTO links (owner_id, name, url) VALUES (1, 'של האדמין', 'https://admin.example.com/')`);
const foreignId = db.prepare(`SELECT id FROM links WHERE owner_id = 1`).get().id;
let fk = 'accepted';
try { approve.run(1, foreignId); } catch (e) { fk = e.message; }
check('the foreign key does NOT enforce ownership — the route filter must', fk, 'accepted');

// ── 4. a second boot is a no-op ──────────────────────────────────────────────
const beforeSecond = db.prepare('SELECT device_id, link_id FROM device_links ORDER BY 1,2').all();
db.exec(DDL);
check('a second boot adds nothing and loses nothing',
  db.prepare('SELECT device_id, link_id FROM device_links ORDER BY 1,2').all(), beforeSecond);

const failed = results.filter((r) => !r.ok);
fs.writeFileSync(path.join(here, '_results.json'),
  JSON.stringify({ total: results.length, passed: results.length - failed.length, results }, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} assertions passed`);
process.exit(failed.length ? 1 : 0);
