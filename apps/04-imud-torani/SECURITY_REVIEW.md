# Pre-Publish Security Review — אות ודף (imud-torani)

**Reviewed:** 2026-07-08
**Stack:** Express + Vite + React, Supabase Postgres (`otvedaf.books`), per-user isolation via `X-Visitor-Id` header, no login/auth (public general-audience app), browser-direct AI proofreading using the user's own pasted API key.

---

## Security Review Results

### BLOCK (must fix before publishing)
None found.

### WARN (inform user, let them decide)
- **`.env.example` is stale/misleading** — it states "פרויקט זה אינו משתמש ב-AI כלל ואינו דורש מפתחות" ("this project doesn't use AI at all and needs no keys"), but the app has a full AI-proofread feature (`client/src/lib/aiProofread.ts`) and a live Supabase backend requiring `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SCHEMA` — [.env.example](./.env.example). Not a security hole (no real secrets in the file), but should be updated so future maintainers don't assume no credentials are needed. *Cosmetic/documentation fix, does not block publishing.*
- **`visitorId()` defaults header-less requests to a shared `"anon"` bucket** — `server/routes.ts:10-13`. If a request arrives without an `X-Visitor-Id` header (e.g., a raw `curl`/API client, or a bug in the hosting proxy), it is silently treated as user `"anon"`, and `storage.ts` uses the same `ANON` fallback (`server/storage.ts:17`, and every `.eq("user_id", userId || ANON)` call at lines 80, 91, 100, 134, 146). On the actual `*.pplx.app` publish target this is a non-issue because the site proxy injects `X-Visitor-Id` on every request (documented in the platform's own webapp-building guidance), so real browser visitors are always correctly scoped. The residual risk is scoped to anyone who calls the API directly without going through the proxy (e.g., scripted `curl` against the public URL) — they would all collide into the same `"anon"` row-set and could read/modify each other's "anon" books. Given the app has no authentication by design and stores non-sensitive Torah-typesetting content, this is low severity, but worth flagging.
  - *Suggested improvement (optional):* return 400 instead of falling back to `"anon"` if the header is absent, or generate a random per-connection fallback ID server-side to avoid a shared bucket.

### PASS
- **No hardcoded secrets/API keys committed anywhere in the repo.** Regex sweep for AWS/GitHub/Slack/private-key/OpenAI-style patterns across `*.ts/tsx/js/jsx/py/json/yaml/toml` returned nothing.
- **`.env` is properly gitignored and not tracked by git.** `.gitignore` explicitly excludes `.env` and `.env.*` (allowing only `.env.example`) — see [.gitignore](./.gitignore). `git ls-files | grep env` returns only `.env.example`; `git log --all -- .env` and `git log --all --diff-filter=A --name-only` confirm `.env` was never committed on any branch.
- **`server/supabase.ts` only uses env vars, no fallback literal keys.** [server/supabase.ts:9-17](./server/supabase.ts#L9-L17) reads `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SCHEMA` strictly from `process.env` and throws a startup error if the URL/key are missing — no hardcoded fallback string anywhere in the file.
- **No `service_role` key anywhere.** Repo-wide case-insensitive search for `service_role`/`service-role`/`serviceRole` returned zero matches. The `.env` key is a JWT with `"role":"anon"` (decoded payload confirms `iss:supabase, role:anon`), consistent with the intended anon-only design.
- **No secrets embedded in the client bundle.** `dist/public/assets/*.js` contains no JWT-shaped strings, no `sk-`/`AKIA`/etc. patterns, and no `service_role`/`anon_key` literal values — only the string `apiKey:` which is a generic object-key name in vendor library code, not a leaked credential. `dist/index.cjs` (server bundle) references only the *names* `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SCHEMA` (read via `process.env` at runtime), not baked-in values. The `.env` file itself is not included in `dist/`.
- **`X-Visitor-Id` isolation is applied consistently across all book operations.** Every route in [server/routes.ts](./server/routes.ts) (`GET /api/books`, `GET /api/books/:id`, `POST /api/books`, `PATCH /api/books/:id`, `DELETE /api/books/:id`, `GET /api/books/:id/docx`) resolves `visitorId(req)` and passes it through to `storage`. Every method in [server/storage.ts](./server/storage.ts) filters by `user_id` at the database layer: `listBooks` ([L76-84](./server/storage.ts#L76-L84)), `getBook` ([L86-95](./server/storage.ts#L86-L95)), `createBook` sets `user_id` on insert ([L97-116](./server/storage.ts#L97-L116)), `updateBook` re-verifies ownership via `getBook` before mutating and also filters the update itself by `user_id` ([L118-139](./server/storage.ts#L118-L139)), `deleteBook` filters by `user_id` on the delete ([L141-150](./server/storage.ts#L141-L150)). No query bypasses this filter.
- **User-provided AI API keys are handled safely.** [client/src/lib/aiProofread.ts](./client/src/lib/aiProofread.ts) sends the user's own pasted key directly from the browser to Anthropic/OpenAI/Gemini over HTTPS; the key is kept in React state only (not `localStorage`, not sent to the app's own backend, not logged). No bundled/shared API key is used for this feature.
- **Dependency audit clean.** `npm audit --json` reports 0 critical, 0 high, 0 moderate, 0 low vulnerabilities across 600 dependencies.
- **No exploitable dangerous-pattern usage.** `eval(`, `new Function(`, raw `innerHTML =` were not found. The one `dangerouslySetInnerHTML` hit ([client/src/components/ui/chart.tsx:81](./client/src/components/ui/chart.tsx#L81)) is stock shadcn/ui code injecting a CSS variable block from a typed color-config object, not user text. The two `document.write(html)` calls ([client/src/pages/Editor.tsx:150](./client/src/pages/Editor.tsx#L150), also in the PDF-export path) render the *current user's own* book preview into a same-origin popup/iframe they just opened for printing — not attacker-controlled or cross-user, and book text is HTML-escaped before interpolation via the escape helper in [client/src/lib/pagedRender.ts:56](./client/src/lib/pagedRender.ts#L56).
- **No open/unsafe CORS configuration.** No `cors()` middleware or `Access-Control-Allow-Origin: *` found anywhere in the server code; Express serves same-origin by default, and all mutation endpoints (`POST`/`PATCH`/`DELETE`) are scoped by the visitor-id mechanism described above.

---

## Final Verdict: **SAFE TO PUBLISH**

No BLOCK-level findings. The two WARN items are low-severity and largely mitigated by the platform's own proxy-injected `X-Visitor-Id` header for real browser traffic; they are informational for the user's awareness, not publish blockers. No fixes were required or applied.
