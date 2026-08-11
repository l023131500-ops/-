/**
 * §2★א field 1 — "אתר ראשי" — was the one address on the device that nothing
 * checked.
 *
 * `PATCH /devices/:id` stored `home_url` raw (no parse at all), and
 * `POST /enrollments` asked only that `new URL()` not throw — which
 * `javascript:alert(1)` does not. Meanwhile `display_url`, the *weaker* of the
 * two fields (it only changes what is on screen now, it does not lock), has been
 * refusing non-http(s) since it landed. This replays the routes' own sequence
 * against the production DDL on `node:sqlite` and asserts the stored column, not
 * just the return value of the validator.
 *
 * Run: node QA/kiosk/home-url-0811/verify.mjs
 *
 * `routes/devices.js` and `routes/links.js` import express, which is not
 * installed in this checkout, so the express glue is rewritten here and every
 * rule is called from the real module. The last section reads both route files
 * off disk and asserts the calls this replay claims are actually in them — the
 * same guard `ota-window-0811` used against `KioskPolicy.kt`.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { normalizeHomeUrl, configHostCsv, deviceDisplayUrl } from '../../../apps/35-kioskfleet/server/src/displayurl.js';
import { effectiveHostCsv } from '../../../apps/35-kioskfleet/server/src/approvals.js';
import { hostsForUrl, normalizeHostCsv, hostAllowed } from '../../../apps/35-kioskfleet/server/src/hosts.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, '../../../apps/35-kioskfleet/server/src');

let pass = 0, fail = 0;
const check = (name, fn) => {
  try { fn(); console.log(`  ok   ${name}`); pass++; }
  catch (e) { console.log(`  FAIL ${name}\n       ${e.message.split('\n')[0]}`); fail++; }
};

// ── the production DDL, verbatim from src/db.js ──
const db = new DatabaseSync(':memory:');
db.exec(`
CREATE TABLE devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id INTEGER NOT NULL,
  serial TEXT UNIQUE NOT NULL, name TEXT, device_token TEXT UNIQUE NOT NULL,
  access_code TEXT, allowed_host TEXT, home_url TEXT, display_url TEXT,
  exit_code TEXT, idle_return_seconds INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'unknown', online INTEGER NOT NULL DEFAULT 0);
CREATE TABLE links (
  id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id INTEGER NOT NULL,
  name TEXT NOT NULL, url TEXT NOT NULL, allowed_host TEXT);
CREATE TABLE enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id INTEGER NOT NULL,
  code TEXT UNIQUE NOT NULL, name TEXT, home_url TEXT, allowed_host TEXT,
  idle_return_seconds INTEGER NOT NULL DEFAULT 0, used INTEGER NOT NULL DEFAULT 0);
`);
db.exec(`INSERT INTO devices (owner_id, serial, device_token, allowed_host, home_url)
  VALUES (1, 'S1', 't1', 'hall.example.com', 'https://hall.example.com/')`);
// A library row that predates this validation — which is the point: "picked from
// the library" is not the same as "already known good".
db.exec(`INSERT INTO links (owner_id, name, url, allowed_host)
  VALUES (1, 'אולם הדר', 'https://hadar.example.com/e/12', 'hadar.example.com'),
         (1, 'ישן ופגום', 'javascript:alert(1)', NULL)`);

const HOME_URL_ERROR = {
  scheme: 'האתר הראשי חייב להתחיל ב-http:// או ב-https://',
  invalid: 'האתר הראשי אינו כתובת תקינה',
};
const LIBRARY_URL_ERROR = {
  scheme: 'הקישור שנבחר מהספרייה אינו מתחיל ב-http:// או ב-https:// — תקנו אותו ב"ספריית קישורים"',
  invalid: 'הקישור שנבחר מהספרייה אינו כתובת תקינה — תקנו אותו ב"ספריית קישורים"',
};

/** PATCH /devices/:id, in the order routes/devices.js runs it. */
function patchDevice(id, body) {
  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(id);
  let { homeUrl, allowedHost, linkId } = body;
  const fromLibrary = Boolean(linkId);
  if (linkId) {
    const link = db.prepare('SELECT * FROM links WHERE id = ? AND owner_id = ?').get(linkId, device.owner_id);
    if (!link) return { status: 400, body: { error: 'הקישור לא נמצא בספרייה' } };
    homeUrl = link.url;
    allowedHost = link.allowed_host;
  }
  const home = normalizeHomeUrl(homeUrl);
  if (!home.ok) {
    return { status: 400, body: { error: (fromLibrary ? LIBRARY_URL_ERROR : HOME_URL_ERROR)[home.reason] } };
  }
  homeUrl = home.value;
  if (!fromLibrary && homeUrl && !allowedHost) allowedHost = hostsForUrl(homeUrl, device.allowed_host);
  if (allowedHost != null) allowedHost = normalizeHostCsv(allowedHost) || null;
  db.prepare('UPDATE devices SET home_url = COALESCE(?, home_url), allowed_host = COALESCE(?, allowed_host) WHERE id = ?')
    .run(homeUrl ?? null, allowedHost ?? null, device.id);
  const fresh = db.prepare('SELECT * FROM devices WHERE id = ?').get(device.id);
  const shown = deviceDisplayUrl(fresh);
  return {
    status: 200,
    fresh,
    config: { homeUrl: fresh.home_url, displayUrl: shown, allowedHost: configHostCsv(effectiveHostCsv(fresh.allowed_host, []), shown) },
  };
}

/** POST /enrollments, same treatment. */
function createEnrollment(ownerId, body) {
  let { homeUrl, allowedHost, linkId, name } = body;
  if (linkId) {
    const link = db.prepare('SELECT * FROM links WHERE id = ? AND owner_id = ?').get(linkId, ownerId);
    if (!link) return { status: 400, body: { error: 'הקישור לא נמצא בספרייה' } };
    homeUrl = link.url; allowedHost = link.allowed_host; name = name || link.name;
  }
  const home = normalizeHomeUrl(homeUrl);
  if (!home.ok) {
    return { status: 400, body: { error: (linkId ? LIBRARY_URL_ERROR : HOME_URL_ERROR)[home.reason] } };
  }
  homeUrl = home.value;
  if (!homeUrl) return { status: 400, body: { error: 'בחרו קישור מהספרייה או הזינו כתובת אתר' } };
  const host = hostsForUrl(homeUrl, allowedHost);
  const info = db.prepare('INSERT INTO enrollments (owner_id, code, name, home_url, allowed_host) VALUES (?, ?, ?, ?, ?)')
    .run(ownerId, 'C' + Math.floor(performance.now() * 1000), name ?? null, homeUrl, host);
  return { status: 200, row: db.prepare('SELECT * FROM enrollments WHERE id = ?').get(info.lastInsertRowid) };
}

/** POST /devices/:id/command, the set_url branch. */
function setUrl(id, url) {
  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(id);
  const payload = { url };
  const target = normalizeHomeUrl(payload.url);
  if (!target.ok || !target.value) {
    return { status: 400, body: { error: target.reason === 'scheme' ? 'הכתובת חייבת להתחיל ב-http:// או ב-https://' : 'כתובת לא תקינה' } };
  }
  const host = new URL(target.value).host;
  if (!hostAllowed(host, configHostCsv(effectiveHostCsv(device.allowed_host, []), deviceDisplayUrl(device))))
    return { status: 400, body: { error: 'הכתובת מחוץ לדומיינים המורשים של המכשיר' } };
  payload.url = target.value;
  return { status: 200, payload };
}

console.log('\nPATCH /devices/:id — the field the device locks onto');

check('a javascript: main site is refused, and the column is untouched', () => {
  const before = db.prepare('SELECT home_url FROM devices WHERE id = 1').get().home_url;
  const r = patchDevice(1, { homeUrl: 'javascript:alert(document.cookie)' });
  assert.equal(r.status, 400);
  assert.equal(r.body.error, HOME_URL_ERROR.scheme);
  assert.equal(db.prepare('SELECT home_url FROM devices WHERE id = 1').get().home_url, before);
});

check('a data: main site is refused', () => {
  assert.equal(patchDevice(1, { homeUrl: 'data:text/html,<script>fetch("/x")</script>' }).status, 400);
});

check('a bare domain is refused rather than stored as a dead address', () => {
  const r = patchDevice(1, { homeUrl: 'hall.example.com' });
  assert.equal(r.status, 400);
  assert.equal(r.body.error, HOME_URL_ERROR.invalid);
});

check('a library link holding a bad address is refused, and says where to fix it', () => {
  // The owner did not type this one, so pointing them at "the main site" would
  // send them to correct a field that is not the problem.
  const r = patchDevice(1, { linkId: 2 });
  assert.equal(r.status, 400);
  assert.equal(r.body.error, LIBRARY_URL_ERROR.scheme);
  assert.equal(db.prepare('SELECT home_url FROM devices WHERE id = 1').get().home_url, 'https://hall.example.com/');
});

check('a good library link still lands, with the row\'s own host set', () => {
  const r = patchDevice(1, { linkId: 1 });
  assert.equal(r.status, 200);
  assert.equal(r.fresh.home_url, 'https://hadar.example.com/e/12');
  assert.equal(r.fresh.allowed_host, 'hadar.example.com');
});

check('a pasted address is stored trimmed, and the pushed config carries it', () => {
  const r = patchDevice(1, { homeUrl: '  https://hall.example.com/lobby \n' });
  assert.equal(r.status, 200);
  assert.equal(r.fresh.home_url, 'https://hall.example.com/lobby');
  assert.equal(r.config.homeUrl, 'https://hall.example.com/lobby');
  // No display link of its own → the device shows the main site.
  assert.equal(r.config.displayUrl, 'https://hall.example.com/lobby');
});

check('not sending the field leaves the main site exactly alone', () => {
  const before = db.prepare('SELECT * FROM devices WHERE id = 1').get();
  const r = patchDevice(1, { allowedHost: 'hall.example.com,pay.example.com' });
  assert.equal(r.status, 200);
  assert.equal(r.fresh.home_url, before.home_url);
  assert.equal(r.fresh.allowed_host, 'hall.example.com,pay.example.com');
});

check('an empty string is "not submitted" here, not "clear the lock"', () => {
  const before = db.prepare('SELECT home_url FROM devices WHERE id = 1').get().home_url;
  const r = patchDevice(1, { homeUrl: '   ' });
  assert.equal(r.status, 200);
  assert.equal(r.fresh.home_url, before);
});

console.log('\nPOST /enrollments — the first config a device ever sees');

check('a javascript: address is refused, and no enrollment row is written', () => {
  const before = db.prepare('SELECT COUNT(*) c FROM enrollments').get().c;
  const r = createEnrollment(1, { homeUrl: 'javascript:alert(1)' });
  assert.equal(r.status, 400);
  assert.equal(r.body.error, HOME_URL_ERROR.scheme);
  assert.equal(db.prepare('SELECT COUNT(*) c FROM enrollments').get().c, before);
});

check('the old check passed exactly this, which is why it is here', () => {
  // `new URL('javascript:alert(1)')` does not throw. The route's only guard was
  // that it did not.
  assert.doesNotThrow(() => new URL('javascript:alert(1)'));
});

check('a whitespace-only address is still the "choose a link" error', () => {
  const r = createEnrollment(1, { homeUrl: '  ' });
  assert.equal(r.status, 400);
  assert.equal(r.body.error, 'בחרו קישור מהספרייה או הזינו כתובת אתר');
});

check('a real address enrolls, trimmed, with hosts derived', () => {
  const r = createEnrollment(1, { homeUrl: ' https://hadar.example.com/e/12 ' });
  assert.equal(r.status, 200);
  assert.equal(r.row.home_url, 'https://hadar.example.com/e/12');
  assert.equal(r.row.allowed_host, 'hadar.example.com');
});

console.log('\nPOST /devices/:id/command — set_url');

check('ftp:// on an allowed host is refused (a host check alone passed it)', () => {
  const r = setUrl(1, 'ftp://hall.example.com/x');
  assert.equal(r.status, 400);
  assert.equal(r.body.error, 'הכתובת חייבת להתחיל ב-http:// או ב-https://');
});

check('the device is sent the checked value, not the raw one', () => {
  const r = setUrl(1, '  https://hall.example.com/lobby\n');
  assert.equal(r.status, 200);
  assert.equal(r.payload.url, 'https://hall.example.com/lobby');
});

check('the allow-list still decides where a device may be sent', () => {
  assert.equal(setUrl(1, 'https://elsewhere.example.com/').status, 400);
});

console.log('\nthe "before" — the same requests against the code as it was');

check('the old PATCH stored whatever it was handed', () => {
  // Verbatim from the route before this change: one UPDATE, no parse. Replayed
  // on its own device row so the assertion above is not the thing proving it.
  db.exec(`INSERT INTO devices (owner_id, serial, device_token, allowed_host, home_url)
    VALUES (1, 'S-BEFORE', 't-before', 'hall.example.com', 'https://hall.example.com/')`);
  const id = db.prepare("SELECT id FROM devices WHERE serial = 'S-BEFORE'").get().id;
  const oldHomeUrl = 'javascript:alert(document.cookie)';
  db.prepare('UPDATE devices SET home_url = COALESCE(?, home_url) WHERE id = ?').run(oldHomeUrl, id);
  // This is what the device would have been handed at its next config push, and
  // what it would return to every time it was left idle.
  assert.equal(db.prepare('SELECT home_url FROM devices WHERE id = ?').get(id).home_url, oldHomeUrl);
  // …and the new route refuses the same request.
  assert.equal(patchDevice(id, { homeUrl: oldHomeUrl }).status, 400);
});

console.log('\nthe replay matches the source it claims to replay');

const devicesSrc = fs.readFileSync(path.join(SRC, 'routes/devices.js'), 'utf8');
const linksSrc = fs.readFileSync(path.join(SRC, 'routes/links.js'), 'utf8');

check('routes/devices.js runs normalizeHomeUrl on all three doors', () => {
  assert.ok(devicesSrc.includes("normalizeHomeUrl } from '../displayurl.js'"));
  assert.equal((devicesSrc.match(/normalizeHomeUrl\(/g) || []).length, 3);
  assert.ok(devicesSrc.includes('payload.url = target.value;'));
});

check('the bare `new URL()` guards it replaced are gone', () => {
  assert.ok(!devicesSrc.includes("try { new URL(homeUrl); }"));
  assert.ok(!devicesSrc.includes('host = new URL(payload?.url).host'));
});

check('routes/links.js checks the address on the way in and on edit', () => {
  // The library is the source both device routes copy from, so a row stored
  // here reaches the webview.
  assert.equal((linksSrc.match(/normalizeHomeUrl\(/g) || []).length, 2);
  assert.ok(!linksSrc.includes("host = new URL(url).host"));
});

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
