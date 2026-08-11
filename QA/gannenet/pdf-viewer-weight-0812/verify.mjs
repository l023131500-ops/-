// Verifies, in the real browser against the production build, that
//   1. a non-PDF item page never fetches pdf-lib at all,
//   2. a PDF item page still previews, still counts pages, and still builds a
//      selected-pages download -- with pdf-lib arriving as its own chunk.
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";

const BASE = "http://localhost:3045/gannenet";
const IMAGE_ID = "16QLfhd7JsxdUZtVXgs33DhIXUZGT916_";
const PDF_ID = "1lfiQT79XaO-05RO7Qj8sVeXaoEbnLI6f";
const PDF_URL_RE = /\/api\/shelf\/1lfiQT79XaO-05RO7Qj8sVeXaoEbnLI6f\.pdf/;
const sample = readFileSync(new URL("./sample.pdf", import.meta.url));

const out = { sampleBytes: sample.length };
const browser = await chromium.launch();

async function newPage() {
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  const js = [];
  const errors = [];
  page.on("request", (r) => {
    if (r.resourceType() === "script") js.push(r.url());
  });
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  // NetFree answers 418 to PDF bodies from supabase.co, so the bytes -- and
  // only the bytes -- are supplied here. The URL, route and headers are the
  // app's own.
  await page.route(PDF_URL_RE, (route) =>
    route.fulfill({ status: 200, contentType: "application/pdf", body: sample })
  );
  return { ctx, page, js, errors };
}

// pdf-lib's chunk is the one large async chunk; identify it by size rather than
// by a hashed filename that changes every build.
async function pdfLibChunks(js, page) {
  const hits = [];
  for (const url of new Set(js)) {
    const r = await page.request.get(url);
    const len = (await r.body()).length;
    if (len > 100_000) hits.push({ url: url.replace(BASE, ""), bytes: len });
  }
  return hits;
}

// --- 1. image item: pdf-lib must never be requested -------------------------
{
  const { ctx, page, js, errors } = await newPage();
  await page.goto(`${BASE}/shelf/${IMAGE_ID}`, { waitUntil: "networkidle" });
  out.image = {
    scripts: new Set(js).size,
    bigChunks: await pdfLibChunks(js, page),
    hasImg: await page.locator("img[src*='/api/shelf/']").count(),
    hasPdfViewer: await page.locator("object[type='application/pdf']").count(),
    consoleErrors: errors,
  };
  await page.screenshot({ path: new URL("./image-item.png", import.meta.url).pathname.slice(1), fullPage: false });
  await ctx.close();
}

// --- 2. pdf item: preview, page grid, selected download ---------------------
{
  const { ctx, page, js, errors } = await newPage();
  await page.goto(`${BASE}/shelf/${PDF_ID}`, { waitUntil: "networkidle" });

  const obj = page.locator("object[type='application/pdf']");
  await obj.waitFor({ timeout: 15000 });
  const previewSrc = await obj.getAttribute("data");

  // The grid only exists once pdf-lib has loaded and read the page count.
  const grid = page.locator("button[title^='עמוד ']");
  await grid.first().waitFor({ timeout: 15000 });

  const counter = await page.locator("text=/נבחרו/").first().innerText();

  // Narrow the selection through the real range box, then download.
  await page.fill("input.input", "2-4");
  await page.click("text=החל טווח");
  const after = await page.locator("text=/נבחרו/").first().innerText();

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 20000 }),
    page.click("text=/הורדת .* עמודים/"),
  ]);
  const path = await download.path();
  const bytes = readFileSync(path).length;
  const { PDFDocument } = await import(
    "file:///C:/Users/USER/Downloads/more30/apps/40-gannenet/node_modules/pdf-lib/cjs/index.js"
  ).then((m) => m.default ?? m);
  const savedPages = (await PDFDocument.load(readFileSync(path))).getPageCount();

  out.pdf = {
    previewIsBlob: previewSrc?.startsWith("blob:") ?? false,
    gridButtons: await grid.count(),
    counterOnLoad: counter.trim(),
    counterAfterRange: after.trim(),
    bigChunks: await pdfLibChunks(js, page),
    downloadName: download.suggestedFilename(),
    downloadBytes: bytes,
    downloadPages: savedPages,
    consoleErrors: errors,
  };
  await page.screenshot({ path: new URL("./pdf-item.png", import.meta.url).pathname.slice(1), fullPage: false });
  await ctx.close();
}

await browser.close();
writeFileSync(new URL("./_results.json", import.meta.url), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
