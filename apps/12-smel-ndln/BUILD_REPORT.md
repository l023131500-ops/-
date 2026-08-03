# SMEL NDLN — Build Report

## Status: COMPLETE ✅
- `npm install` ✅  `npx tsc --noEmit` ✅ (0 errors)  `npm run build` ✅
- Production server verified: `NODE_ENV=production node dist/index.cjs` on port 5000 → root 200, all APIs 200.

## Routes / pages (wouter hash routing, `#/`)
- `/` — `client/src/pages/Home.tsx` — hero, 3-field address search (city/street/number → single string), how-it-works, free vs premium tiers, trust signals.
- `/report` — `client/src/pages/Report.tsx` — FREE report (ScoreGauge with opportunity_score, avg_price / yield / price-trend stat cards, place background, 3–5 friendly highlights, gov sources footnote) + PREMIUM gate card (blurred teaser + CTA → /premium).
- `/premium` — `client/src/pages/Premium.tsx` — zod+shadcn lead form (name/phone/email) + dynamic 6-section questionnaire (single/number/scale/text) → POST /api/lead → thank-you screen + full DetailedReport (params grouped: demographics, accessibility, environment, value).

## Custom components
Logo.tsx (SVG roof+pin mark), Header.tsx (theme toggle), ScoreGauge.tsx (SVG gauge), DetailedReport.tsx (grouped premium params).
Lib: app-state.tsx (React context — no localStorage), theme.tsx (dark mode via matchMedia + class), research.ts (formatters, friendlyInsights, param groups).

## Backend (server/routes.ts, storage.ts)
- `POST /api/research` — 24h SQLite cache in `research_cache`, else proxy Edge Function (key server-side); stale-cache fallback on upstream failure.
- `POST /api/lead` — inserts local `leads` table; best-effort forward to Supabase `nadlan.research_leads` (Content-Profile/Accept-Profile: nadlan). Verified `supabaseOk:true`.
- `GET /api/questionnaire` — Supabase `questionnaire_templates` (active) with hardcoded 6-section fallback.

## Key API discovery (parent should know)
`nadlan.research_leads` columns differ from the brief: it has NO `address` and NO `questionnaire_answers` columns.
Working mapping used: `full_name, phone, email, query_address, profile_id, questionnaire (jsonb)`.
Anon key can INSERT but cannot SELECT research_leads (RLS) — that is expected and fine.

## QA (Playwright, desktop 1280px + mobile 375px)
- Home, Report, Premium, thank-you + detailed report all render correctly in RTL.
- Real data confirmed: דיזנגוף 100 תל אביב → score 77, avg price ₪3,135,075, 18 params, 6 questionnaire sections from Supabase.
- Dark mode verified. No RTL/overflow/contrast issues found. Screenshots: qa_*.png in project dir.

## Notes for deploy
- Do NOT re-run `npm run build` output cleanup — `dist/index.cjs` + `dist/public` ready.
- Start prod: `NODE_ENV=production node dist/index.cjs` (port 5000). data.db auto-creates tables on boot.
- git initialized, 1 commit, 84 files tracked (screenshots/sample_response/dist/node_modules gitignored).
