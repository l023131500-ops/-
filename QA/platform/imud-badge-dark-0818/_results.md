# 04 imud (עימוד תורני) — round-3 a11y recheck: dark-mode contrast

Continues the round-3 dark-mode contrast recheck sweep (torah/tamlul/modaot/briut/bkalot/smel/galil/kiosk
done in prior steps). Next system after modaot(03) with un-probed dark mode.

## Finding

`contrast-probe.mjs` against `https://more30.com/imud` (dark mode, 1440px) — 9 failures:

- Hero badge pill "מנוע עימוד לספרי קודש" — `text-primary` (rgb(209,71,97)) on the hero gradient backdrop
  (rgb(36,24,23)): 3.93:1, needs 4.5.
- "שאלון חכם — המלצה אוטומטית" CTA button — `bg-primary` with `text-primary-foreground`:
  white-ish (248,246,242) on primary (209,71,97): 4.07:1, needs 4.5. Same combo repeats on the wizard link.
- Step-card ghost numbers "1"–"4" — `text-muted-foreground/25`: 1.59:1, needs 3 (24px bold qualifies as
  large text).
- Book-card template-name label (real data: "עיון בשני טורים") — same `text-primary` on `bg-card`
  (rgb(35,30,26)): 3.76:1, needs 4.5.

Re-ran in light mode (never checked before touching anything) and found the ghost-number failure is
**not** dark-only: `rgba(122,106,92,0.25)` on the light card gave 1.39:1, also under the 3:1 floor — a
theme-independent gap, unlike the other three findings here (which only fail in dark).

## Root cause

`apps/04-imud-torani/client/src/pages/Home.tsx`:
- `--primary` in dark (`349 60% 55%`, `rgb(209,71,97)`) is used both as **text color** (`text-primary`,
  needs to be *lighter* to read against dark surfaces) and as a **button background** (`bg-primary` +
  near-white `text-primary-foreground`, needs to be *darker* for the white text to clear 4.5:1). A single
  token can't satisfy both directions at once — confirmed white text already maxed out only reaches 4.39:1
  against this red even at pure `#fff`, so the button side needs the background itself adjusted, not the
  foreground.
- The step-number opacity (`/25`) was tuned too low in both themes; `text-muted-foreground` alone (no
  opacity) already clears 6.5:1 dark / 5:1 light, so this was a case of a decorative "ghosted" opacity value
  never checked against WCAG once applied.

## Fix (this step)

- Badge pill + book-card label: added `dark:text-[#da6c80]` alongside the existing `text-primary` — a
  lighter dark-mode-only rose (`hsl(349 60% 64%)`, computed via the WCAG relative-luminance formula to
  ~5:1 against both backdrops) so the **button's** `--primary` token is untouched (avoids risking every
  other `bg-primary` usage in this app that wasn't audited this session).
- Step numbers: `text-muted-foreground/25` → `/80` (uniform, both themes — computed to ~3.4:1 light /
  4.7:1 dark, both above the 3:1 floor for large text; a themed split wasn't needed once the correct alpha
  was found).

**Not fixed this step:** the `bg-primary`/`text-primary-foreground` button combo stays at 4.07:1 in dark
mode (light mode passes — `--primary` is darker there, `349 55% 34%`). Fixing it requires either a second,
button-specific darker-primary token or enlarging the CTA text to qualify for the 3:1 large-text threshold
(already computed as sufficient — white vs this red is 4.39:1, above 3) — a small but separate change,
deferred so this step stays scoped to the token conflict actually found, same precedent as torah's gold-CTA
gap left open in the prior round-3 step.

## Deploy + verify

`vite build` (apps/04-imud-torani) → `robocopy dist/public → _deploy/imud-more30/public/imud /MIR` →
`vercel deploy --prod` (`imud-more30`, `dpl_7mi73Jv6vhVXyHfue7197PizCJeg` then final
`dpl_...` after the opacity correction), both READY. Verified live with cache-busters:

- dark: 9 failures → 2 (both the known/deferred button gap above).
- light: 4 failures (the two ghost-number checks I hadn't run before + duplicates) → 0.

Protected systems untouched (08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873). Supabase MCP not connected
this session — heartbeat written as a pending file, reconciled next session per the existing queue.
