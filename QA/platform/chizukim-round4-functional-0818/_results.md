# 17 chizukim (מערכת תמלול — חיזוקים קצרים) — round-4 functional pass (2026-08-18)

Continuing round-4 (login + core action + real data + deployed 200) in `ROUTES` order after
chatzor (16, id 889). System: `apps/17-chizukim-transcribe`, mounted at
`https://more30.com/chizukim` — a transcription/editing tool for short chizukim (encouragement)
audio recordings.

## Login
Verified live via Playwright against `https://more30.com/chizukim/`: home loads 200, 0 console
errors. The shared auth pill (bottom-left) already reads **"לקוח"** (customer logged in) — same
shared-session pattern as torah/tamlul/modaot/imud/briut/bkalot/smel/smachot/egod/chatzor.

## Core action
Home lists real recordings, not placeholders: stats tiles show **1,140** total recordings,
**1,114** ready, **$2.2175** total transcription cost (all populate after a brief loading state,
not stubs). Clicked into recording #25 ("דאגה בלב איש — לדבר עם עצמך ולהתחזק באמונה") →
`#/recording/5abc97a7-59e7-43e0-817d-fe5d726e9a73`: detail page rendered a real, full edited
transcript (multi-paragraph Hebrew drash with headings) alongside the real raw transcript text,
a working Google Drive audio link, and Word/PDF download buttons.

## Network trace
Confirms the round-trip is real, not a stub — all against this app's own `recordings` table in
its own Supabase project:
- `GET https://csjekrvukbdznetsrodj.supabase.co/rest/v1/recordings?select=id,seq,topic,...&order=seq.asc&limit=25&offset=0` → 206 Partial Content (list page)
- `GET .../rest/v1/recordings?select=transcription_cost_usd&limit=1000&offset=0/1000` → 200 OK (cost stat)
- `GET .../rest/v1/recordings?id=eq.5abc97a7-...&select=*` → 200 OK (detail page)
- `POST https://uhnrgujbdxhhmoxcjria.supabase.co/rest/v1/rpc/more30_join_app` → 200 OK (shared customer-session join call)

## Verdict
Clears the round-4 bar (login + core action + real data + deployed 200). No bug found, no code
change, no deploy needed.

Evidence: `chizukim-recording-detail.png` (recording detail page with full real transcript).

Protected systems untouched (08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873) — `csjekrvukbdznetsrodj`
(bkalut-production-user-owned) hosts this app's own `recordings` table, reached only via its own
public list/detail API calls; no protected schema was read or written.

Next in round-4 ROUTES order: orech (18).
