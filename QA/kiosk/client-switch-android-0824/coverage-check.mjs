/**
 * KIOSK_BUILD.md §2★ה's on-device selection screen switches the WebView to a
 * client's own site, which very often sits on a different domain than the
 * device's `home_url`. This round found that `approvedClientsForDevice()`
 * (db.js) and `/api/agent/identify` (routes/agent.js) only ever sent
 * {code,name,url} down to the device — never the client's own `allowed_host`
 * — so the device had no way to know the correct scope to check in-page
 * navigation against once it switched. The device-side fix (Kotlin, not
 * mirrored into this tree — see STATUS.md) is a no-op without this half.
 *
 * better-sqlite3 is not installed in this checkout (same gap every prior
 * entry in STATUS.md hits), so `approvedClientsForDevice`/db.js cannot be
 * imported and run against a real table. This is the fallback: a static,
 * DB-free check that the actual SQL text — parsed from the real source, not
 * hand-copied — selects and aliases the column the device now depends on,
 * and that every client is guaranteed a non-empty `allowed_host` at the one
 * place clients are created.
 *
 * Run: node QA/kiosk/client-switch-android-0824/coverage-check.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const SERVER = path.resolve(import.meta.dirname, '../../../apps/35-kioskfleet/server');

function pass(msg) { console.log(`  ok — ${msg}`); }
function fail(msg) { console.error(`  FAIL — ${msg}`); process.exitCode = 1; }

const dbSrc = fs.readFileSync(path.join(SERVER, 'src/db.js'), 'utf8');
const agentSrc = fs.readFileSync(path.join(SERVER, 'src/routes/agent.js'), 'utf8');
const devicesSrc = fs.readFileSync(path.join(SERVER, 'src/routes/devices.js'), 'utf8');
const clientsRouteSrc = fs.readFileSync(path.join(SERVER, 'src/routes/clients.js'), 'utf8');

console.log('approvedClientsForDevice() (db.js) selects and aliases allowed_host:');
{
  const fn = dbSrc.slice(dbSrc.indexOf('export function approvedClientsForDevice'));
  const sql = fn.slice(0, fn.indexOf('WHERE'));
  if (/c\.allowed_host\s+AS\s+allowedHost/i.test(sql)) pass('SELECT includes c.allowed_host AS allowedHost');
  else fail('approvedClientsForDevice() SQL is missing the allowedHost alias — the device cannot scope a client switch');
}

console.log('POST /api/agent/identify (routes/agent.js) selects and aliases allowed_host:');
{
  const idx = agentSrc.indexOf("router.post('/identify'");
  const fn = agentSrc.slice(idx, agentSrc.indexOf('res.json', idx));
  if (/c\.allowed_host\s+AS\s+allowedHost/i.test(fn)) pass('SELECT includes c.allowed_host AS allowedHost');
  else fail('/identify SQL is missing the allowedHost alias — inconsistent with approvedClientsForDevice()');
}

console.log('pushConfigUpdate() (routes/devices.js) still calls approvedClientsForDevice() (no drift):');
{
  const fn = devicesSrc.slice(devicesSrc.indexOf('function pushConfigUpdate'), devicesSrc.indexOf('function pushConfigUpdate') + 400);
  if (/approvedClients:\s*approvedClientsForDevice\(device\.id\)/.test(fn)) pass('update_config payload still carries approvedClients via approvedClientsForDevice()');
  else fail('pushConfigUpdate() no longer builds approvedClients the same way — device-pushed client list may now differ from enroll/heartbeat');
}

console.log("clients.js's POST /clients always computes allowed_host via hostsForUrl (never a raw/empty value):");
{
  const insertIdx = clientsRouteSrc.indexOf("db.prepare('INSERT INTO clients");
  const around = clientsRouteSrc.slice(Math.max(0, insertIdx - 400), insertIdx + 200);
  const hostsAssigned = /const hosts = hostsForUrl\(url, allowedHost\)/.test(around);
  const hostsInserted = /\.run\(req\.user\.id, cleanCode, String\(name\)\.trim\(\), String\(url\)\.trim\(\), hosts\)/.test(around);
  if (hostsAssigned && hostsInserted) pass('INSERT stores hostsForUrl(url, allowedHost) into allowed_host, not a raw/possibly-empty field');
  else fail('client creation no longer guarantees a non-empty allowed_host — switchToClient()\'s Kotlin-side "empty scope = blocked" fallback would now trip on every normal client');
}

if (process.exitCode) {
  console.error('\nOne or more checks failed.');
} else {
  console.log('\nAll static checks passed.');
}
