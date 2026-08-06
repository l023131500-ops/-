// admin-issues-drift.mjs — is the on-disk source of /admin/issues what
// production actually serves?
//
// Standing rule in this repo: several static pages serve HTML that matches no
// file in the tree, so copying source over a live page can take it down. Before
// editing admin-issues.html on 06/08 this compared the two, line by line, and
// found them identical apart from the NetFree injection this network adds to
// every response. Kept as the pre-deploy check for that one page.
//
//   node scripts/qa/admin-issues-drift.mjs [path-to-source]
//
// Exit 1 if production and the source disagree on anything but the injection.
import fs from 'node:fs';

const SRC = process.argv[2] || 'portal/public/admin-issues.html';
const URL_ = 'https://more30.com/admin/issues';

// NetFree (the filtering proxy on this machine) appends its own script tags to
// the end of every document it passes. They belong to the network, not the site.
const strip = (s) =>
  s.replace(/<!--[^>]*NetFree[\s\S]*?-->/gi, '')
    .replace(/<script[^>]*netfree[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/^﻿/, '')
    .replace(/\r\n/g, '\n')
    .trimEnd();

// `connection: close` on purpose: with keep-alive the socket outlives the
// script and node aborts on shutdown with a libuv assertion, which replaces the
// exit code this check is supposed to report.
const res = await fetch(URL_, { headers: { connection: 'close' } });
const live = strip(await res.text());
const src = strip(fs.readFileSync(SRC, 'utf8'));

console.log(`HTTP ${res.status}  ·  live ${live.length} chars  ·  source ${src.length} chars`);

if (live === src) {
  console.log('identical — the source is what production serves');
} else {
  const a = live.split('\n');
  const b = src.split('\n');
  let diff = 0;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? '') === (b[i] ?? '')) continue;
    diff++;
    if (diff <= 10) {
      console.log(`  line ${i + 1}`);
      console.log(`    live:   ${JSON.stringify((a[i] ?? '').slice(0, 140))}`);
      console.log(`    source: ${JSON.stringify((b[i] ?? '').slice(0, 140))}`);
    }
  }
  console.log(`\n${diff} differing lines`);
  process.exitCode = 1;
}
