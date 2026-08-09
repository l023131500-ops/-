/**
 * core.issues #86 — the imud reader, checked before a screen is drawn on it.
 *
 * 0053 added public.more30_admin_imud_report(). The screen that will read it has
 * not been written yet, and this script is the contract between the two: it takes
 * the payload the function actually returned (QA/platform/imud-report-0810/_results.json,
 * captured against the live hub on 10/08 with the super-admin identity) and asserts
 * what a screen is entitled to assume about it.
 *
 * Why these checks and not others:
 *
 *   • Every total has to be re-derivable from the `books` array. The function
 *     computes the totals in one aggregate pass and the rows in a separate
 *     subquery; if the two ever disagree, a screen printing "2 books · 5 blocks"
 *     would be describing a set it did not list. Both halves are asserted
 *     against each other rather than against a number typed here.
 *
 *   • anon_books is asserted to equal the count of is_anon rows, and the fact
 *     that it currently equals `books` is asserted as its own line. That is the
 *     finding: storage.ts filters every read by a user_id taken from the
 *     X-Visitor-Id header and falls back to 'anon' when the header is absent —
 *     and both rows fell on the fallback. A screen that prints "1 user" without
 *     saying that the user is 'anon' hides exactly this.
 *
 *   • templates counts usage, never coverage. The catalogue is 32 template keys
 *     in apps/04-imud-torani/shared/templates.ts — code, not data — so the
 *     function must not carry a denominator that only a file edit would move.
 *     This asserts no coverage-shaped key crept in.
 *
 *   • layers is derived from the content blocks themselves, so the per-layer
 *     blocks must sum to totals.blocks. LayerKind has fourteen members in
 *     shared/schema.ts and three of them appear in the data; a histogram padded
 *     to the full list would report eleven zeroes that no book ever chose.
 *
 *   • the guard, measured live on both sides: an admin caller gets jsonb, a
 *     non-admin is refused with 42501. The table is RLS-protected with no
 *     policies (anon fully blocked — apps/04-imud-torani/server/supabase.ts:10),
 *     so this function is the only way a browser screen reads it, and its gate
 *     is the whole of the access control.
 *
 * What this does NOT do: reach the network or the database. It has no keys and
 * wants none (#88) — the payload was captured through the MCP connection and is
 * committed as evidence. Rerun the capture, replace the file, run this.
 *
 *   node scripts/qa/imud-report-shape.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const file = resolve(here, '../../QA/platform/imud-report-0810/_results.json');
const ev = JSON.parse(readFileSync(file, 'utf8'));
const r = ev.report;

const checks = [];
const check = (ok, what) => checks.push({ ok: !!ok, what });

const books = r.books ?? [];
const sum = (xs, f) => xs.reduce((a, x) => a + f(x), 0);

/* ── the totals, re-derived from the rows the same payload lists ───────────── */
check(books.length === r.totals.books,
  `totals.books (${r.totals.books}) is the number of rows in books (${books.length})`);
check(sum(books, (b) => b.blocks) === r.totals.blocks,
  `totals.blocks (${r.totals.blocks}) is the sum of the blocks on the listed books`);
check(new Set(books.map((b) => b.user_id)).size === r.totals.users,
  `totals.users (${r.totals.users}) is the number of distinct user_id values`);
check(new Set(books.map((b) => b.template_key)).size === r.totals.templates_used,
  `totals.templates_used (${r.totals.templates_used}) is the number of distinct template keys`);
check(books.filter((b) => b.blocks === 0).length === r.totals.empty_books,
  `totals.empty_books (${r.totals.empty_books}) is the books with no content block`);
check(books.filter((b) => !b.author).length === r.totals.books_no_author,
  `totals.books_no_author (${r.totals.books_no_author}) is the books with an empty author`);

/* ── the anon finding, asserted as a finding and not as a footnote ─────────── */
check(books.filter((b) => b.is_anon).length === r.totals.anon_books,
  `totals.anon_books (${r.totals.anon_books}) is the rows whose owner fell to the 'anon' default`);
check(books.every((b) => b.is_anon === (b.user_id === 'anon' || b.user_id === '')),
  "is_anon is exactly (user_id is 'anon' or empty) on every row");
check(r.totals.anon_books === r.totals.books,
  'every book is owned by anon — the per-visitor isolation in storage.ts is not separating anyone today');

/* ── templates: usage, never coverage ─────────────────────────────────────── */
check(sum(r.templates, (t) => t.books) === r.totals.books,
  `the templates rows account for every book (${r.totals.books})`);
check(sum(r.templates, (t) => t.blocks) === r.totals.blocks,
  `the templates rows account for every block (${r.totals.blocks})`);
check(r.templates.every((t) => books.some((b) => b.template_key === t.template_key)),
  'every template listed is a template some book actually uses');
check(!('templates_total' in r.totals) && !r.templates.some((t) => 'of' in t),
  'no coverage denominator is carried — the 32-template catalogue lives in code, not here');

/* ── layers: derived from the blocks, not padded to LayerKind ──────────────── */
check(sum(r.layers, (l) => l.blocks) === r.totals.blocks,
  `the layer histogram sums to totals.blocks (${r.totals.blocks})`);
check(r.layers.every((l) => l.blocks > 0),
  'no layer is listed with zero blocks — the histogram comes from the content, not from LayerKind');

/* ── activity ─────────────────────────────────────────────────────────────── */
const maxUpdated = Math.max(...books.map((b) => b.updated_at_ms));
check(r.activity.last_updated_ms === maxUpdated,
  'activity.last_updated_ms is the newest updated_at among the listed books');
check(r.activity.first_created_ms <= r.activity.last_updated_ms,
  'the first creation is not newer than the last update');
check(r.activity.days_since_last > 0,
  `nothing has been written for ${r.activity.days_since_last} days — the number is stated, not implied`);

/* ── the finding this report exists to make visible ────────────────────────── */
check(r.totals.books > 0 && r.totals.users === 1 && r.totals.anon_books === r.totals.books,
  'the finding: the system holds real books, and every one of them belongs to the same anonymous default');

/* ── the guard, measured on both sides against the live function ───────────── */
check(ev.guard.non_admin_caller.raised.includes('42501'),
  'a non-admin caller is refused with 42501, measured against the live function');
check(ev.guard.admin_caller.is_admin === true,
  'the admin caller is recognised, so the refusal above is the guard and not a broken session');

const failures = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? 'ok  ' : 'FAIL'}  ${c.what}`);
console.log(`\n${checks.length - failures.length}/${checks.length} pass`);
process.exit(failures.length ? 1 : 0);
