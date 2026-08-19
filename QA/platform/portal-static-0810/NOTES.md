# portal passthrough: 26 files compared with production, no build — 2026-08-10

`node scripts/qa/deployed-vs-committed.mjs portal-static` — exit 0.

## Why this target exists

The previous round (6b85620) settled `admin/` the only way it can be settled —
build from the committed tree, compare bytes with the wire — and closed on the
cost of doing that: every further target needs its own build command and mount,
so 25 of 26 sites stayed unchecked.

`portal/public/**` does not need a build. vite copies it into the deploy root
untouched, so every tracked file under it should arrive on the wire as the exact
blob git holds, with no bundling step in between to explain a difference away.
26 files, one fetch each, no toolchain. That includes the thirteen `admin-*.html`
super-admin screens and `auth-button.js`, the shared login control.

## What it compares

The bytes come from `git cat-file blob HEAD:<path>`, not from disk. This is the
one place the build-mode refusal (dirty subtree → REFUSED) is not needed and not
used: a local edit changes what an editor shows and changes nothing here.

HTML is cut at the NetFree marker as before. Binary is compared raw — that is
what makes a match on `favicon.ico` mean something. Text is compared twice, raw
and with line endings normalised, because the gap between those two answers
turned out to be information.

## The CRLF finding

21 of the 26 files differ from the committed blob byte for byte and are
identical after normalising line endings. `core.autocrlf` is true on this
machine, so a checkout writes CRLF while the blob keeps LF, and production is
serving the CRLF form:

    auth-button.js   blob 32559 LF   served 33156 with 597 CRLF   normalised 32559
    robots.txt       blob  1020 LF   served  1041 with  21 CRLF   normalised  1020
    sitemap.xml      blob  2638      served  2638 with   0 CRLF   identical raw

A Linux build of this commit could not produce that. These files reached the
deploy as an upload of a Windows working copy — which means for passthrough
files, *what is live is disk state at deploy time, not the commit*. Content is
identical today, so this is not a defect and no issue was opened. It is a
property of the pipeline worth having written down: the next time a passthrough
file differs, "but it is committed" will not be an answer.

`sitemap.xml` is the control — no CRLF on disk, so it matches raw, which is why
the CRLF result cannot be an artefact of the comparison itself.

## Negative control

A green run only means something if red is reachable. A copy of the script with
one byte flipped in two committed blobs (`login.html`, `robots.txt`) reported
`DIFFERS` on exactly those two, left the other 24 identical, and exited 1. The
copy was deleted.

## Coverage, stated plainly

26 passthrough files and one built SPA. Still unchecked: `portal/index.html` and
`portal/src/**`, which are bundled and would need the build treatment `admin`
got; the 25 sites under `apps/`; and `_deploy/**/api/**`, which are serverless
functions and never appear as an asset in HTML.

## Evidence

- `_results.json` — full run, `--json`
- `me-live.png` — /login on production, which redirects to /me under an existing
  session; both files are in the compared set
