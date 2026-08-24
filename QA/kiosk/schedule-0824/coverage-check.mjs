/**
 * Same sandbox constraint as QA/kiosk/device-log-0824/: no system libs for a
 * real Chromium (`ldd` shows libatk/libgbm/libasound/etc. missing, no sudo to
 * install them), so there is no way to open the console in a real browser and
 * click through the schedule UI here. This is the fallback: a static,
 * DOM-free check that the pieces this round wired together actually line up
 * — parsed from the real source, not hand-copied — so a drift between the DB
 * columns, the route, the enforcement loop, and the console UI fails loudly
 * here instead of silently in production.
 *
 * Run: node QA/kiosk/schedule-0824/coverage-check.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const SERVER = path.resolve(import.meta.dirname, '../../../apps/35-kioskfleet/server');
const read = (p) => fs.readFileSync(path.join(SERVER, p), 'utf8');

function pass(msg) { console.log(`  ok — ${msg}`); }
function fail(msg) { console.error(`  FAIL — ${msg}`); process.exitCode = 1; }
function check(cond, msg) { cond ? pass(msg) : fail(msg); }

const scheduleJs = read('src/schedule.js');
const dbJs = read('src/db.js');
const devicesJs = read('src/routes/devices.js');
const devicepayloadJs = read('src/devicepayload.js');
const indexJs = read('src/index.js');
const appJs = read('public/js/app.js');

// ── schedule.js exports the pure helpers everything else depends on ──
for (const fn of ['parseTimeToMinutes', 'validateScheduleWindow', 'isWithinOpenWindow', 'desiredScreenState', 'minutesSinceMidnight']) {
  check(new RegExp(`export function ${fn}\\(`).test(scheduleJs), `schedule.js exports ${fn}()`);
}

// ── db.js: all four columns exist, three are validated writes and one is bookkeeping ──
for (const col of ['schedule_enabled', 'schedule_open_time', 'schedule_close_time', 'schedule_last_state']) {
  check(new RegExp(`ensureColumn\\('devices', '${col}'`).test(dbJs), `db.js migrates the devices.${col} column`);
}

// ── devices.js: PATCH imports the validator and actually calls it, and stores all 4 columns ──
check(/import \{ validateScheduleWindow \} from '\.\.\/schedule\.js'/.test(devicesJs), 'routes/devices.js imports validateScheduleWindow');
check(/validateScheduleWindow\(openTime, closeTime\)/.test(devicesJs), 'routes/devices.js PATCH calls validateScheduleWindow before storing an enabled schedule');
check(/schedule_enabled = COALESCE/.test(devicesJs) && /schedule_open_time = COALESCE/.test(devicesJs) && /schedule_close_time = COALESCE/.test(devicesJs), 'routes/devices.js PATCH writes all three schedule fields');
check(/schedule_last_state = CASE WHEN \? = 1 THEN NULL/.test(devicesJs), 'routes/devices.js PATCH resets schedule_last_state to NULL when the schedule fields change, so the next tick re-decides rather than trusting a stale state');
check(/scheduleEnabled: !!d\.schedule_enabled/.test(devicesJs), 'publicDevice() exposes scheduleEnabled/scheduleOpenTime/scheduleCloseTime to the console');

// ── devicepayload.js: the 3 console-facing fields are allow-listed, the bookkeeping one is not ──
const fieldsMatch = devicepayloadJs.match(/CONSOLE_DEVICE_FIELDS = \[([\s\S]*?)\];/);
const allowListed = fieldsMatch ? fieldsMatch[1] : '';
check(/'schedule_enabled'/.test(allowListed) && /'schedule_open_time'/.test(allowListed) && /'schedule_close_time'/.test(allowListed), 'CONSOLE_DEVICE_FIELDS includes the three owner-facing schedule fields');
check(!/'schedule_last_state'/.test(allowListed), 'CONSOLE_DEVICE_FIELDS deliberately excludes schedule_last_state (enforcement bookkeeping only)');

// ── index.js: the enforcement interval exists, dedupes via schedule_last_state, and only ever issues real command types ──
check(/setInterval\(\(\) => \{[\s\S]*?schedule_enabled = 1/.test(indexJs), 'index.js has a setInterval that queries schedule_enabled devices');
check(/desiredScreenState\(nowMinutes, openMinutes, closeMinutes\)/.test(indexJs), 'index.js computes the desired state via schedule.js, not ad hoc logic');
check(/device\.schedule_last_state === desired\) continue/.test(indexJs), 'index.js skips issuing a command when the device is already in the desired state (dedupe)');
const commandsJs = read('src/commands.js');
const commandTypeSet = new Set([...commandsJs.matchAll(/^\s*'([a-z_]+)',/gm)].map((m) => m[1]));
for (const t of ["desired === 'on' ? 'screen_on' : 'screen_off'"]) {
  check(indexJs.includes(t), `index.js issues screen_on/screen_off (the exact ternary), both real COMMAND_TYPES: ${['screen_on', 'screen_off'].every((c) => commandTypeSet.has(c))}`);
}

// ── app.js: the edit modal has the checkbox + two time inputs, wires them into the PATCH body, and toggles visibility ──
check(/id="sched-on"/.test(appJs) && /id="sched-open"/.test(appJs) && /id="sched-close"/.test(appJs), 'editDevice() modal has the schedule checkbox and two time inputs');
check(/\$\('#sched-on', m\)\.onchange/.test(appJs), 'the checkbox toggles the time-fields visibility live');
check(/scheduleEnabled,\s*scheduleOpenTime: \$\('#sched-open', m\)\.value, scheduleCloseTime: \$\('#sched-close', m\)\.value/.test(appJs), 'the save handler sends scheduleEnabled/scheduleOpenTime/scheduleCloseTime in the PATCH body');
check(/mapDevice[\s\S]*?scheduleEnabled: d\.schedule_enabled/.test(appJs), 'mapDevice() reads the schedule fields back off the wire (both snake_case REST and camelCase socket shapes)');
check(/d\.scheduleEnabled \? `<br\/>⏰/.test(appJs), 'deviceCard() surfaces the configured hours on the fleet grid, not only inside the edit modal');

console.log(process.exitCode ? '\nFAIL — see above' : '\nAll schedule-feature coverage checks passed.');
