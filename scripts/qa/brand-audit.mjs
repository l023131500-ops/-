/**
 * §7 of more30-priority.md: the brand is "עולם הסטארטאפים". "מור מערכות תוכנה"
 * and any variation of it must be gone, and every site should carry a footer
 * link reading "פותח ע״י עולם הסטארטאפים".
 *
 * This asks production, not the repo. Several of these systems serve HTML that
 * does not match anything on disk, so a source grep would both miss live
 * occurrences and flag dead ones.
 *
 * Two things are reported per mount, and they need two different probes:
 *
 *   · **the old brand** — read from the raw HTML. That is deliberate and not a
 *     shortcut: <title> and og:* are what search results and link previews
 *     show, and they are in the document before any JavaScript runs.
 *
 *   · **the credit** — read from the rendered DOM. The first version of this
 *     script tested the raw HTML for it too, and reported it missing on
 *     **25 of 25 mounts** while it was in fact present on all of them: the
 *     credit is mounted by `portal/public/auth-button.js`, on purpose, so that
 *     one line does not become 25 diverging copies. A check that answers "no"
 *     everywhere teaches you to ignore the column, which is worse than having
 *     no column.
 *
 * Run: node scripts/qa/brand-audit.mjs
 */
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CHROME =
  "C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe";

const here = path.dirname(fileURLToPath(import.meta.url));
const table = JSON.parse(
  fs.readFileSync(path.resolve(here, "../../portal/vercel.dist.json"), "utf8"),
);

const mounts = [
  ...new Set(
    table.rewrites.map((r) => /^\/([a-z0-9-]+)\/:path\*$/.exec(r.source)?.[1]).filter(Boolean),
  ),
].sort();

// The old brand, plus the spacing/quoting variants that turn up in practice.
const OLD_BRAND = /מור\s+מערכות\s+תוכנה/;
const NEW_BRAND = /עולם\s+הסטארטאפים/;
const CREDIT = /פותח\s+ע[״"']?י\s+עולם\s+הסטארטאפים/;

async function fetchHtml(url) {
  try {
    const res = await fetch(url, { redirect: "follow", headers: { "cache-control": "no-cache" } });
    return { status: res.status, html: await res.text() };
  } catch (e) {
    return { status: 0, html: "", error: e.message };
  }
}

/** Where in the document the old brand appears, so the fix can be aimed. */
function locate(html) {
  const spots = [];
  const title = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] ?? "";
  if (OLD_BRAND.test(title)) spots.push("title");
  for (const m of html.matchAll(/<meta[^>]+content="([^"]*)"[^>]*>/gi)) {
    if (OLD_BRAND.test(m[1])) {
      spots.push("meta");
      break;
    }
  }
  const body = /<body[\s\S]*<\/body>/i.exec(html)?.[0] ?? "";
  if (OLD_BRAND.test(body)) spots.push("body");
  return spots.length ? spots : ["(html)"];
}

/**
 * The credit is injected after load, so it is read from the live DOM. The old
 * brand is read here too — from `innerText`, not the source — because a brand
 * that only appears once the app has rendered is invisible to the raw pass.
 */
async function probeRendered(browser, url) {
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: "load", timeout: 45000 });
    // The credit mounts on DOMContentLoaded; give it a bounded chance to appear
    // rather than sampling once and calling a race a failure.
    await page.waitForSelector(".more30-credit", { timeout: 8000 }).catch(() => {});
    return await page.evaluate(() => {
      const c = document.querySelector(".more30-credit");
      return {
        credit: c ? c.textContent.trim() : null,
        creditHref: c ? c.href : null,
        oldInText: /מור\s+מערכות\s+תוכנה/.test(document.body.innerText),
      };
    });
  } catch (e) {
    return { error: e.message };
  } finally {
    await page.close();
  }
}

console.log(`${mounts.length} mounts\n`);
console.log(
  `${"mount".padEnd(12)} ${"old brand (html)".padEnd(22)} ${"old (rendered)".padEnd(15)} ${"new brand".padEnd(10)} credit`,
);

const browser = await chromium.launch({ executablePath: CHROME });
const offenders = [];
const creditMissing = [];

for (const m of mounts) {
  const { status, html, error } = await fetchHtml(`https://more30.com/${m}/`);
  if (!html) {
    console.log(`${m.padEnd(12)} ${`(unreachable: ${error ?? status})`.padEnd(22)}`);
    continue;
  }
  const old = OLD_BRAND.test(html);
  const r = await probeRendered(browser, `https://more30.com/${m}/`);

  if (old || r.oldInText) {
    offenders.push({
      m,
      where: old ? locate(html) : ["rendered text only"],
      title: (/<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] ?? "").trim(),
    });
  }
  const hasCredit = !!r.credit && CREDIT.test(r.credit);
  if (!hasCredit) creditMissing.push({ m, saw: r.credit ?? r.error ?? "(none)" });

  console.log(
    `${m.padEnd(12)} ${(old ? `YES — ${locate(html).join("+")}` : "no").padEnd(22)} ` +
      `${String(r.oldInText ?? "?").padEnd(15)} ${String(NEW_BRAND.test(html)).padEnd(10)} ${hasCredit}`,
  );
}
await browser.close();

console.log(`\n${offenders.length} mount(s) still serving "מור מערכות תוכנה":`);
for (const o of offenders) {
  console.log(`  ${o.m.padEnd(12)} in ${o.where.join(", ")}`);
  console.log(`     title: ${o.title}`);
}

console.log(`\n${creditMissing.length} mount(s) without the footer credit:`);
for (const c of creditMissing) console.log(`  ${c.m.padEnd(12)} saw: ${c.saw}`);

process.exit(offenders.length || creditMissing.length ? 1 : 0);
