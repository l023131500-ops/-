/**
 * This sandbox's Chromium has no system libs and there is no sudo to install
 * them (`ldd` on both downloaded builds shows libatk/libgbm/libasound/etc.
 * missing), so `run.mjs`'s real-browser pass cannot execute here — same
 * "cannot verify beyond X" gap several other entries in STATUS.md hit for
 * different reasons (no device, no gradle toolchain). This is the fallback:
 * a static, DOM-free check that every event/command *type* the server can
 * actually log is covered by app.js's label maps — parsed from the real
 * source, not hand-copied — so a label silently going blank (or the map
 * drifting out of sync with the server as new types are added later) fails
 * loudly here instead of only in a browser nobody can open in this sandbox.
 *
 * Run: node QA/kiosk/device-log-0824/coverage-check.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const SERVER = path.resolve(import.meta.dirname, '../../../apps/35-kioskfleet/server');
const APP_JS = fs.readFileSync(path.join(SERVER, 'public/js/app.js'), 'utf8');

function pass(msg) { console.log(`  ok — ${msg}`); }
function fail(msg) { console.error(`  FAIL — ${msg}`); process.exitCode = 1; }

// ── device-scoped event types: every logEvent(<not-null-1st-arg>, ..., 'type', ...) ──
const deviceScopedTypes = new Set();
for (const dir of ['src', 'src/routes']) {
  for (const f of fs.readdirSync(path.join(SERVER, dir))) {
    if (!f.endsWith('.js')) continue;
    const text = fs.readFileSync(path.join(SERVER, dir, f), 'utf8');
    for (const m of text.matchAll(/logEvent\(\s*([^,]+),[^,]*,\s*'([^']+)'/g)) {
      const firstArg = m[1].trim();
      if (firstArg !== 'null') deviceScopedTypes.add(m[2]);
    }
  }
}

// ── command types: the COMMAND_TYPES Set in commands.js ──
const commandsSrc = fs.readFileSync(path.join(SERVER, 'src/commands.js'), 'utf8');
const commandTypes = new Set([...commandsSrc.matchAll(/'([a-z_]+)',?\s*(?:\/\/.*)?$/gm)].map((m) => m[1]));

// ── command statuses: the DDL comment in db.js ("pending | delivered | done | failed") ──
const dbSrc = fs.readFileSync(path.join(SERVER, 'src/db.js'), 'utf8');
const commandsTableDdl = dbSrc.slice(dbSrc.indexOf('CREATE TABLE IF NOT EXISTS commands'), dbSrc.indexOf('CREATE TABLE IF NOT EXISTS events'));
const statusComment = commandsTableDdl.match(/status\s+TEXT[^\n]*--\s*([a-z| ]+)/);
const commandStatuses = new Set(statusComment[1].split('|').map((s) => s.trim()));

// ── the label maps as app.js actually defines them ──
function extractObjectLiteral(varName) {
  const m = APP_JS.match(new RegExp(`const ${varName} = \\{([\\s\\S]*?)\\};`));
  if (!m) return null;
  const keys = new Set();
  for (const km of m[1].matchAll(/(\w+):/g)) keys.add(km[1]);
  return keys;
}
const eventLabelKeys = extractObjectLiteral('EVENT_LABELS');
const commandLabelKeys = extractObjectLiteral('COMMAND_LABELS');
const statusLabelKeys = extractObjectLiteral('COMMAND_STATUS_LABELS');

console.log(`device-scoped event types found in server source: ${[...deviceScopedTypes].sort().join(', ')}`);
console.log(`command types found in commands.js:               ${[...commandTypes].sort().join(', ')}`);
console.log(`command statuses found in db.js:                  ${[...commandStatuses].sort().join(', ')}`);
console.log('');

if (!eventLabelKeys) fail('EVENT_LABELS not found in app.js');
else {
  const missing = [...deviceScopedTypes].filter((t) => !eventLabelKeys.has(t));
  if (missing.length) fail(`EVENT_LABELS is missing: ${missing.join(', ')} — these would render as their raw type string`);
  else pass(`EVENT_LABELS covers all ${deviceScopedTypes.size} device-scoped event types the server can log`);
}
if (!commandLabelKeys) fail('COMMAND_LABELS not found in app.js');
else {
  const missing = [...commandTypes].filter((t) => !commandLabelKeys.has(t));
  if (missing.length) fail(`COMMAND_LABELS is missing: ${missing.join(', ')}`);
  else pass(`COMMAND_LABELS covers all ${commandTypes.size} command types in COMMAND_TYPES`);
}
if (!statusLabelKeys) fail('COMMAND_STATUS_LABELS not found in app.js');
else {
  const missing = [...commandStatuses].filter((t) => !statusLabelKeys.has(t));
  if (missing.length) fail(`COMMAND_STATUS_LABELS is missing: ${missing.join(', ')}`);
  else pass(`COMMAND_STATUS_LABELS covers all ${commandStatuses.size} statuses`);
}

// ── every label lookup in the modal-building code falls back to the raw
// value, so an uncovered/future type still renders instead of throwing or
// printing "undefined" ──
const fallbacksOk = /EVENT_LABELS\[ev\.type\] \|\| ev\.type/.test(APP_JS)
  && /COMMAND_LABELS\[c\.type\] \|\| c\.type/.test(APP_JS)
  && /COMMAND_STATUS_LABELS\[c\.status\] \|\| c\.status/.test(APP_JS);
if (fallbacksOk) pass('every label lookup has a raw-value fallback (an unmapped type cannot render blank/"undefined")');
else fail('a label lookup is missing its `|| raw` fallback — an unmapped type would render "undefined"');

// ── every interpolated field in the new markup goes through esc() ──
const newBlock = APP_JS.slice(APP_JS.indexOf('async function viewDeviceLog'), APP_JS.indexOf('async function viewScreenshot'));
const rawInterpolations = [...newBlock.matchAll(/\$\{(?!esc\(|fmtTime\()[^}]*\}/g)]
  .map((m) => m[0]);
// Anything interpolated that is neither esc(...) nor fmtTime(...) (dates are
// server-generated ISO strings, not user text) nor a plain boolean/length
// check is worth a human look; report rather than hard-fail since some are
// legitimately safe (e.g. `${d.id}` in a URL path, `${scheme}` in a filename).
console.log(`\ninterpolations in the new code not wrapped in esc()/fmtTime(): ${rawInterpolations.length ? rawInterpolations.join(', ') : '(none)'}`);

console.log(process.exitCode ? '\nRESULT: FAIL' : '\nRESULT: PASS');
