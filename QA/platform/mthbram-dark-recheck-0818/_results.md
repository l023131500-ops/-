# 21 mthbram — round-3 dark-mode contrast recheck (0818)

## Context
Queued by the previous heartbeat (orech-dark-recheck-0818) as the next system in ROUTES order.

## Finding
`contrast-probe.mjs` against `https://more30.com/mthbram` (both color schemes, both widths 1440/390) found
**4 identical failures in every combination** — same elements, same colors, regardless of light/dark scheme.
Identical-across-schemes means this is not a dark-mode regression (mthbram has no toggle; it's dark-by-design
via a hardcoded `color-scheme: dark`, confirmed in `src/index.css`). Two of the four are the known gradient
bg-clip-text/text-transparent tool-limitation already documented for torah/modaot/smachot/egod (`getComputedStyle`
reports `rgba(0,0,0,0)` for text painted via a background gradient — a real reader sees a legible gradient, the
tool can't evaluate it). Those remain, unfixed, as a tool limitation, not a real bug.

The 4th failure was real: `apps/21-mthbram/src/components/Footer.tsx` footer copyright line used
`text-primary-foreground/40`. `--primary-foreground` in this app's palette (`195 60% 10%`) is the same dark
navy as `--navy`/`--background` (button text-on-gold color, not a light/muted text token) — applied at 40%
opacity over the navy footer, the copyright line composited to almost the same color as its own background
(measured ratio ~1:1, needs 4.5:1). Effectively invisible text, present on every load regardless of theme.

## Fix
`text-primary-foreground/40` → `text-gold-cream/70` (matches the sibling elements in the same footer — the CTA
description already uses `text-gold-cream/70`, the phone link uses `text-gold-cream`).

## Deploy note (important — a real deploy-target trap found this session)
`apps/21-mthbram` has **no vercel.json** and its Vercel project (`mthbram-more30`) is configured with
Framework Preset "Other", Build Command `echo no-build`, Output Directory `.` — i.e. it expects a **pre-built,
pre-nested** upload (a physical `mthbram/` folder containing the `vite build` output, because `vite.config.ts`
sets `base: "/mthbram/"` and the portal rewrite (`portal/vercel.dist.json`) proxies to
`https://mthbram-more30.vercel.app/mthbram/:path*`).

Running `vercel --prod` directly from `apps/21-mthbram` does **not** rebuild via Vite — it uploads the raw
source folder as-is under the existing "Other/no-build" settings, which briefly took `more30.com/mthbram/`
down to a 404 (assets and index.html were no longer at the expected `/mthbram/` path). Recovered by building
locally (`npm run build`), staging `dist/*` inside a `mthbram/` subfolder plus a minimal `vercel.json`
(`{"rewrites":[{"source":"/mthbram/:path*","destination":"/mthbram/index.html"}]}` for SPA routing), and
deploying that staged folder instead. Verified live: index 200, JS/CSS assets 200, and the SPA fallback route
`/mthbram/auth/reset` still 200s with real app content (not a 404 shell).

Also: a stray Vercel project named `21-mthbram` was created by the first (wrong) deploy attempt — it holds no
domain/alias and doesn't affect production, left for cleanup since `vercel project rm` requires an interactive
confirm this environment can't answer non-interactively.

## Verification
`contrast-probe.mjs` against `https://more30.com/mthbram/` post-fix, both schemes, both widths: the footer
item is gone in all four; only the 2 known gradient-text false positives remain, identical across schemes
(theme-independent, not a dark-mode issue). Also confirmed live: asset 200s, SPA route 200 with real content.

## Next
Round-3 ROUTES queue continues: zchuyot, then studio, mechiron, kupot, crm, gesher, nadlan, kesef.
