# מחולל דפי משימה (#40) — the generation that would have been killed on deploy

`generator-dead-model-0811` left one line open: **a generation takes ~72 s**, the
route is a plain non-streaming handler, and that exceeds the serverless function
limit the moment `/gannenet` is deployed. It also recorded that the two levers,
`output_config.effort` and streaming, "both need `@anthropic-ai/sdk` newer than
the vendored 0.27.3, which has neither in its types". **That is true of the
types only.** The SDK serialises the params object as-is, so an untyped field
still goes out on the wire — there is no `npm install` here, only a cast.

`_probe-effort.mjs` proves it without paying for a generation:

| call | result |
|---|---|
| `output_config: {effort: "definitely-not-an-effort-level"}` | **400** — `output_config.effort: Input should be 'low', 'medium', 'high', 'xhigh' or 'max'` |
| `output_config: {effort: "low"}` | 200 |
| no `output_config` | 200 |

A field the API validates is a field the API received. Raw output in
`probe-effort.json`.

## What changed

`app/api/ai-generate/route.ts`:

- **`output_config: {effort: "low"}`** — writing one worksheet from a brief that
  already names the topic, the age group and the output schema is not an
  intelligence-sensitive task; the default is `high`.
- **`export const maxDuration = 60`** — there is nothing to stream to the browser
  until the JSON parses, so this ceiling is the only thing between the route and
  a platform default that is shorter.
- The request object is built as a plain object and cast to
  `Anthropic.MessageCreateParamsNonStreaming` at the call. The cast is the whole
  cost of using a GA field on a September-2024 SDK.

## Measured — five runs through the route, not through the API

| topic | response chars | wall clock |
|---|---:|---:|
| סימני הסתיו | — | 37.1 s |
| פרשת נח — תיבת נח (browser) | — | 59.1 s |
| האות א׳ — אתרוג | 1349 | 32.7 s |
| סימני הסתיו | 1405 | 33.1 s |
| מידת הכנסת אורחים | 2209 | 57.3 s |

Down from ~72 s, and every run now returns — but the spread is the finding, not
the mean. **Time tracks the size of the answer almost linearly** (1349 ch →
32.7 s, 1405 → 33.1 s, 2209 → 57.3 s). What this route pays for is writing ~1.5–2
KB of menuqad Hebrew, which tokenises expensively; the thinking pass is a minor
term.

That was tested directly rather than assumed. With `thinking: {type:"disabled"}`
added on top of `effort: "low"`, the same three topics ran **41.2 / 37.3 /
32.8 s** — inside the noise of leaving it on. So thinking stays on: it would have
bought a few seconds and cost the documented risk of internal XML tags leaking
into the answer (no leak was observed in those three runs — `angle_brackets=False`
on all of them — but three runs is not a guarantee, and the mitigation is a
system-prompt rule that has to be maintained forever for no measured gain).

## Left open

**A long answer still lands at ~57 s against a 60 s ceiling.** The remaining
lever is not model configuration — it is the size of the page: the system prompt
puts no bound on `contentElements` / `designHints` / `instructions`, and the
model chose 6–7 items and 376–572 characters of instructions on its own. Capping
those is a product decision about what a דף משימה should contain, not a
performance fix to make quietly, so it is in `NEEDS_USER.md`.

## Evidence

| file | what it shows |
|---|---|
| `generator-low-effort-success.png` | פרשת נח end to end at low effort — title, גיל, instructions, 6 תוכן items, 6 הנחיות עיצוב, nikud intact |
| `probe-effort.json` | the untyped field reaches the API and is validated there. Produced by `_probe-effort.mjs`, which stays on disk but is not committed — `.gitignore:66` excludes `_probe-*.mjs` |
| `timings.txt` | the five runs above, as printed |

Verified against `next dev` on 3042 with the real key from `.env.local`
(APP_BASE_PATH=/gannenet, so the route is at `/gannenet/api/ai-generate`).
