/**
 * core.issues #129 — /projects, the screen that reads saved work back.
 *
 * What #129 turned out to be, after QA/platform/studio-client-calls-0810 measured
 * the whole bundle instead of the entry chunk: the studio's five project routes
 * were written to and never read. POST /api/projects was called from the editor's
 * save button; GET, PATCH and DELETE had no caller anywhere in the client. Work
 * left the browser and there was no way back to it.
 *
 * client/src/pages/Projects.tsx is the way back. This drives it for real — the
 * chunk Vite emitted from that file, in Chromium, with Konva drawing the preview.
 * Nothing is stubbed except the API responses, and those are served from files so
 * the run needs no keys and no network (#88).
 *
 * Two runs, because the two states fail differently:
 *
 *   • empty — public.studio_projects holds zero rows, so this is the true state of
 *     the screen today. A list screen that renders nothing for an empty list is a
 *     blank page, and a blank page is indistinguishable from a crash.
 *   • one saved work — the populated path: card, live CanvasStage preview, style
 *     and category badges, the date, the delete control. The row comes from
 *     QA/platform/studio-projects-0810/fixture-project.json, whose layers are the
 *     builtin template the product itself ships (studio_templates id=1). It is a
 *     render fixture and says so; it is not counted as usage anywhere.
 *
 * Console errors are collected and asserted empty. The first version of this page
 * read category.name, which does not exist on KBCategory — tsc caught that one,
 * but a screen can typecheck and still throw at render, and a screenshot alone
 * would not have said so.
 *
 * Serves apps/26-modaot-studio/dist/public, which `npx vite build` writes. The
 * page is routed by useHashLocation, so the address is /#/projects.
 *
 *   npx vite build   (in apps/26-modaot-studio)
 *   node scripts/qa/studio-projects-screen.mjs
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize } from 'node:path';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = join(ROOT, 'apps', '26-modaot-studio', 'dist', 'public');
const OUT = join(ROOT, 'QA', 'platform', 'studio-projects-0810');
const SRC = join(ROOT, 'apps', '26-modaot-studio', 'client', 'src');
const PORT = 5199;

const checks = [];
const check = (ok, what) => checks.push({ ok: !!ok, what });

if (!existsSync(DIST)) {
  console.error(`no build at ${DIST} — run \`npx vite build\` in apps/26-modaot-studio first`);
  process.exit(1);
}

const fixture = JSON.parse(readFileSync(join(OUT, 'fixture-project.json'), 'utf8'));

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
};

/** Static server over the built client. Everything unknown falls back to index.html. */
let projectsResponse = [];
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/api/projects') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(projectsResponse));
    return;
  }
  // vite.config sets base "/modaot/", so every built asset is requested under it.
  const rel = normalize(decodeURIComponent(url.pathname))
    .replace(/^([/\\])+/, '')
    .replace(/^modaot[/\\]?/, '');
  const file = rel && existsSync(join(DIST, rel)) && extname(rel) ? join(DIST, rel) : join(DIST, 'index.html');
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const shots = [];

async function run(label, rows, file) {
  projectsResponse = rows;
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  // index.html pulls more30.com/auth-button.js, and the stylesheet asks Google for
  // the Hebrew fonts. Nothing here is about either, and a QA run that reaches the
  // internet is a QA run that fails when the internet does — so anything off
  // 127.0.0.1 is refused. Chromium logs each refusal as a console error; those are
  // this harness talking to itself and are filtered by URL, not by message text,
  // so a genuine load failure from the app's own origin still fails the run.
  const blocked = new Set();
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (new URL(url).hostname === '127.0.0.1') return route.continue();
    blocked.add(url);
    return route.abort();
  });

  const errors = [];
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (blocked.has(m.location()?.url)) return;
    errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(`http://127.0.0.1:${PORT}/modaot/#/projects`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="link-home"]', { timeout: 15000 });
  // Konva paints on a canvas after fonts resolve; the preview is worth waiting for.
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(OUT, file), fullPage: true });

  const seen = {
    heading: (await page.locator('h1').first().innerText()).replace(/\s+/g, ' ').trim(),
    empty: await page.locator('[data-testid="card-empty"]').count(),
    cards: await page.locator('[data-testid^="card-project-"]').count(),
    canvases: await page.locator('canvas').count(),
    deleteButtons: await page.locator('[data-testid^="button-delete-project-"]').count(),
    errorBox: await page.locator('[data-testid="text-error"]').count(),
  };
  await page.close();
  shots.push({ label, file, rows: rows.length, seen, console_errors: errors, blocked_off_host: [...blocked].sort() });
  return { seen, errors };
}

const empty = await run('empty', [], 'projects-empty.png');
const filled = await run('one-saved-work', [fixture.row], 'projects-one.png');

await browser.close();
server.close();

check(empty.seen.heading.includes('העבודות'), `the screen draws, headed "${empty.seen.heading}"`);
check(empty.seen.empty === 1 && empty.seen.cards === 0,
  'with zero rows — the live state — it says so instead of drawing a blank page');
check(empty.seen.errorBox === 0, 'and an empty list is not reported as an error');
check(empty.errors.length === 0,
  empty.errors.length ? `console errors: ${empty.errors.join(' | ')}` : 'no console errors on the empty state');

check(filled.seen.cards === 1 && filled.seen.empty === 0, 'one row draws one card and no empty state');
check(filled.seen.canvases >= 1,
  'the card carries a live CanvasStage preview — the saved layers are drawn, not a stored thumbnail (thumbnail is null)');
check(filled.seen.deleteButtons === 1, 'and a delete control, which is the DELETE /api/projects/:id caller');
check(filled.errors.length === 0,
  filled.errors.length ? `console errors: ${filled.errors.join(' | ')}` : 'no console errors on the populated state');

/*
  Two source facts that a screenshot cannot show:

  the editor must not post a copy over an opened project — the round trip is only
  closed if saving an opened work updates it; and Home must actually link here,
  because a route nothing points at is the same bug /subscribe had (#120).
*/
const editor = readFileSync(join(SRC, 'pages', 'Editor.tsx'), 'utf8');
check(/selected!\.projectId/.test(editor) && /PATCH", `\/api\/projects\/\$\{selected!\.projectId\}`/.test(editor),
  'Editor saves an opened project with PATCH instead of posting a second copy of it');

const home = readFileSync(join(SRC, 'pages', 'Home.tsx'), 'utf8');
check(/navigate\("\/projects"\)/.test(home), 'Home links to /projects — the screen has a door');

const app = readFileSync(join(SRC, 'App.tsx'), 'utf8');
check(/path="\/projects" component=\{Projects\}/.test(app) && /lazy\(\(\) => import\("@\/pages\/Projects"\)\)/.test(app),
  'and it is routed lazily, so the entry chunk does not grow for a screen most visits never open');

writeFileSync(join(OUT, '_results.json'), JSON.stringify({
  measured_at_utc_day: '2026-08-10',
  live_row_count_in_studio_projects: 0,
  runs: shots,
  checks,
}, null, 2) + '\n', 'utf8');

const failures = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? 'ok  ' : 'FAIL'}  ${c.what}`);
console.log(`\n${checks.length - failures.length}/${checks.length} pass`);
console.log('evidence: QA/platform/studio-projects-0810/ (_results.json, projects-empty.png, projects-one.png)');
process.exit(failures.length ? 1 : 0);
