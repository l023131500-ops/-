# Is any live mount serving double-encoded Hebrew? — 13/08

**Answer: no. 26 of 26 live mounts clean, and the check that says so was proven to fire first.**

The interesting part of this step is not the all-clear. It is that the first two
runs also printed an all-clear, and both were worthless.

## Why this was the next step

The two known corruptions (22 zchuyot, 01 torah) were both found by eye, days
apart, while reading something else. `scripts/qa/mojibake-scan.mjs` was written
after the first one so the next would not be found by accident, and the commit
that closed #211 widened it to `_deploy/**/*.html` — the place both infections
actually landed.

That scanner reads the repo. It cannot answer the customer's question. A clean
`_deploy` means the copy on this disk is clean; it does not mean that copy was
ever deployed, and several mounts are built by Vercel from source and never pass
through `_deploy` at all. Both corruptions were found in a live response, not in
a file. So this sweep fetches what more30.com actually returns.

## What the sweep does

`scripts/qa/live-mojibake-sweep.ps1` — read-only, no key, no browser.

1. **Flag** — a run of U+05F3 geresh separated by single characters. A lone
   geresh is good Hebrew, so the character alone proves nothing; the mangling
   emits one per letter, so a run is the fingerprint.
2. **Confirm** — the round trip. Write the served text back out as cp1255 (this
   machine's ANSI codepage, and what `Set-Content` uses when `-Encoding` is
   omitted — the actual cause both times), read those bytes back as UTF-8. If
   clean Hebrew returns, the corruption is exactly one reversible misread and
   the recovered text *is* the original. A flag that does not round-trip is
   reported as unconfirmed, not as a finding.

Protected systems (08, 09) have no `live_url` and are not in the target list.

## Two false all-clears, and what caught them

**First run — seven mounts silently unmeasured.** `HttpWebRequest` on .NET
Framework (what PS 5.1 runs on) auto-follows 301/302/303/307 but *throws* on 308.
Seven mounts answer 308: tamlul, modaot, orech, nadlan, kesef, tivuch, gannenet.
They were counted as "unreachable" — which in a summary line reads as "not
corrupt" for precisely the pages nobody had looked at. Fixed by following
`Location` by hand.

**Second run — the detector itself was blind.** Every one of the 26 mounts
scored `geresh=0`, which is exactly what a working detector on clean pages looks
like, and also exactly what a broken one looks like. It was broken. The `.ps1`
had no BOM, so PowerShell 5.1 parsed it using the machine's ANSI codepage —
cp1255 — and the literal `׳` in the pattern was mangled into three characters at
parse time. The regex could not match anything. **The check written to find the
cp1255 misread was itself destroyed by the cp1255 misread**, and it reported 26
clean pages twice before the controls were added.

Fixed properly rather than papered over: every Hebrew character in live code is
now built from its code point (`[char]0x05F3`), so the script's own encoding
cannot change its meaning. A BOM was added as well, but the code no longer
depends on it.

## The controls (now run on every sweep; the sweep aborts if either fails)

| control | fixture | result |
|---|---|---|
| **positive** — must fire on real corruption | `QA/torah/encoding-0813/before-live-index.html`, the HTML 01 was serving on 13/08 | geresh 2001 → 0 after round trip, flagged **and** confirmed; recovers to `איגוד השיעורים · מערכת תורנית מאוחדת` |
| **negative** — must not condemn correct Hebrew | `צ׳יפ ג׳ינס ר׳` | not flagged |

After the fix the counts stopped being uniformly zero, which is the real proof
the detector reads Hebrew at all: **tivuch = 3, zchuyot = 2**. Both inspected by
hand and both correct Hebrew, correctly left alone —

```
tivuch    <h3>צ׳קליסט סגירה...</h3>   ·   צינור עסקאות וצ׳קליסט סגירה
zchuyot   ליווי מקצועי מ-א׳ עד ת׳
```

— a negative control on real production copy, not a synthetic string.

## Result

```
control + : before-live-index.html geresh=2001 -> recovered=0 flagged+confirmed=True
control - : healthy Hebrew with lone gershayim flagged=False

swept 26 live mounts: 0 double-encoded, 0 flagged-unconfirmed, 0 unreachable
```

Per-mount status codes and byte counts: `_results.json`.

All 26 answered 200 and served their own bundle. `scripts/qa/mojibake-scan.mjs`
was also re-run over the repo in the same step: 3,356 source files and 21
`_deploy` HTML files, no findings.

## What this does not cover

The first paint only — the HTML each mount returns at its root. Text that
arrives later from Supabase, and inner routes, are not fetched. zchuyot's
original corruption was in `src/data/rightsData.ts`, which the source scanner
covers; a row corrupted inside the database would be caught by neither.
