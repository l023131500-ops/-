#!/usr/bin/env node
// QA sweep: is more30.com actually serving again after the 402 window (#204),
// and did the work that shipped blind during it land where it was supposed to?
//
// Read-only. Two questions per URL:
//   1. status  — 402 means the softBlock is still on; that answer outranks everything else.
//   2. body    — a route can be 200 and still be the portal's 404 shell, so the HTML
//                is checked for the mount's own bundle instead of trusting the code.
//
// Usage: node scripts/qa/recovery-402-sweep.mjs [outDir]
// Writes <outDir>/_results.json and prints one line per URL.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2] || 'QA/platform/recovery-402-0813';

// The 25 deployed mounts, from core.projects (is_deployed = true, path not null).
const MOUNTS = [
  'torah', 'tamlul', 'modaot', 'imud', 'briut', 'bkalot', 'smel', 'smachot',
  'egod', 'chatzor', 'chizukim', 'orech', 'mthbram', 'zchuyot', 'galil',
  'studio', 'mechiron', 'kupot', 'crm', 'gesher', 'nadlan', 'kesef',
  'kiosk', 'tivuch', 'gannenet',
];

// The password-reset screens built during the 402 window (#200, #201) — every one
// of them was committed and deployed without a single production check, because
// every URL answered 402 at the time.
const RESET_ROUTES = [
  { label: 'portal (#200)', url: '/auth/reset' },
  { label: '16 chatzor (#201)', url: '/chatzor/auth/reset' },
  { label: '30 crm (#201)', url: '/crm/reset-password' },
  { label: '01 torah (#201)', url: '/torah/auth/reset' },
  { label: '31 gesher (#201)', url: '/gesher/reset-password' },
  { label: '22 zchuyot (#201)', url: '/zchuyot/auth/reset' },
  { label: '21 mthbram (#201)', url: '/mthbram/auth/reset' },
];

const BASE = 'https://more30.com';

async function probe(path) {
  const url = `${BASE}${path}${path.includes('?') ? '&' : '?'}cb=${Date.now()}${Math.random().toString(36).slice(2)}`;
  const started = Date.now();
  try {
    const res = await fetch(url, { redirect: 'manual' });
    const body = await res.text();
    return {
      path,
      status: res.status,
      location: res.headers.get('location') || null,
      bytes: body.length,
      title: (body.match(/<title>([^<]*)<\/title>/i) || [, ''])[1].trim(),
      // A mounted app's HTML references its own /<mount>/assets/ bundle; the portal
      // shell does not. This is what tells "the app is there" from "something is there".
      scripts: [...body.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]),
      ms: Date.now() - started,
    };
  } catch (err) {
    return { path, status: null, error: String(err.message || err), ms: Date.now() - started };
  }
}

function servesMount(r, mount) {
  if (r.status !== 200) return false;
  return r.scripts.some((s) => s.includes(`/${mount}/`));
}

const results = { at: new Date().toISOString(), base: BASE, root: null, mounts: [], resets: [] };

results.root = await probe('/');

for (const mount of MOUNTS) {
  const r = await probe(`/${mount}/`);
  results.mounts.push({ mount, ...r, servesOwnBundle: servesMount(r, mount) });
}

for (const route of RESET_ROUTES) {
  const r = await probe(route.url);
  results.resets.push({ ...route, ...r });
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, '_results.json'), JSON.stringify(results, null, 2));

const line = (label, r, extra = '') =>
  console.log(
    `${String(r.status ?? 'ERR').padEnd(4)} ${String(r.bytes ?? '').padStart(7)}b  ${label.padEnd(24)} ${extra}${r.error ? ' ' + r.error : ''}`,
  );

console.log('--- root ---');
line('/', results.root);
console.log('--- mounts ---');
for (const m of results.mounts) line(`/${m.mount}/`, m, m.servesOwnBundle ? 'own bundle' : 'NOT own bundle');
console.log('--- reset routes built during the 402 window ---');
for (const r of results.resets) line(r.url, r, r.label);

const stillBlocked = [results.root, ...results.mounts, ...results.resets].filter((r) => r.status === 402);
console.log(`\n402 responses: ${stillBlocked.length}`);
console.log(`written: ${join(OUT, '_results.json')}`);
