# מחולל דפי משימה (#40) — the generator had been calling a retired model

`app/api/ai-generate/route.ts` asked for `claude-3-5-sonnet-latest`. That model
is retired, so **every** generation returned `404 not_found_error` —
`{"message":"model: claude-3-5-sonnet-latest"}`. Not intermittent: the feature
had not produced a single page.

It looked like nothing was wrong because of a second bug on the page. The route
returned `{ error }` with a non-2xx status, and `app/generator/page.tsx` did
`setRes(await r.json())` — an error body is still valid JSON, so `res` became
truthy and the result card rendered with `res.title` undefined:

> an empty heading, "קבוצת גיל: " with nothing after it, and no reason given.

## What changed

- **`route.ts`** — model → `claude-opus-5`; `max_tokens` 1500 → 16000 (on that
  model thinking is on by default and `max_tokens` bounds thinking + text
  together, so 1500 would truncate the page mid-sentence). The `catch` now
  passes the upstream status through instead of flattening everything to 500,
  and maps 429 / 401 / 5xx to a sentence a גננת can act on, with the upstream
  detail appended and capped at 160 chars — a filtering proxy's block page is
  otherwise a screenful of JSON.
- **`route.ts`** — `extractJson()` strips a ```` ```json ```` fence (and falls
  back to the outermost `{…}`) before parsing. The old code did a bare
  `JSON.parse` and, on failure, put the whole raw string into `instructions` —
  so a fenced reply printed the JSON to the teacher.
- **`route.ts`** — `asList()` coerces `contentElements` / `designHints`. The
  page calls `.map()` on both; a model returning a string instead of an array
  passed the `?.length > 0` guard and would have crashed the render.
- **`page.tsx`** — checks `r.ok` and `data.error` and shows the message instead
  of an empty card; `setLoading(false)` moved into `finally`, so an early exit
  can't leave the button stuck on "יוצר…".

## Evidence

| file | what it shows |
|---|---|
| `generator-success.png` | "סימני הסתיו" end to end: title, גיל, instructions, 8 תוכן items, 8 הנחיות עיצוב — real generated content, nikud intact |
| `generator-error-401.png` | bogus key → "מפתח ה-AI אינו תקף. יש לפנות לניהול. (401 …)". No result card, button re-enabled |
| `generator-error-visible.png` | an unplanned real failure: NetFree blocked `api.anthropic.com` with 418 mid-test. Before this change that was a blank card; now the block page is on screen. Taken before the 160-char cap, so the raw JSON is untruncated |

Verified against `next dev` on 3040 (real key, from `.env.local`) and 3041
(`ANTHROPIC_API_KEY` overridden in-shell only — the file was not touched).
Direct API check of the parsed shape: `contentIsArray: true, contentN: 8`,
`hintsIsArray: true, hintsN: 8`.

## Left open

**A generation takes ~72 s.** That is Opus 5 at the default effort, and it will
exceed the function limit once this is deployed behind `/gannenet` — the route
is a plain non-streaming handler. The two levers, `output_config.effort` and
streaming, both need `@anthropic-ai/sdk` newer than the vendored **0.27.3**,
which has neither in its types. That is an `npm install` plus a request-shape
change, so it is its own step — recorded in `NEEDS_USER.md`.
