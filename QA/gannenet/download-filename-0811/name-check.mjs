// Runs lib/download-name.ts's rules over every real catalog row and asserts the
// properties a filename has to have. Transpile-free: the two functions are
// re-declared here from the .ts source (no build step for a probe), and the
// header they produce is compared against what the running route actually sends
// in serve-check.mjs.
import { readFileSync } from "node:fs";
const APP = "C:/Users/USER/Downloads/more30/apps/40-gannenet";

const src = readFileSync(`${APP}/lib/download-name.ts`, "utf8");
// Strip the TypeScript annotations the probe cannot run, and evaluate the rest —
// so this tests the shipped source, not a copy of it that could drift.
const js = src
  .replace(/^import[^\n]*\n/gm, "")
  .replace(/\bexport /g, "")
  .replace(/: Record<string, string>/g, "")
  .replace(/\(opts: \{[\s\S]*?\}\)/, "(opts)")
  .replace(/\(mime: string\)/g, "(mime)")
  .replace(/\(name: string\)/g, "(name)")
  .replace(/\(dl: boolean, filename: string\)/g, "(dl, filename)")
  .replace(/: string(?= \{|\)|;|,)/g, "")
  .replace(/\(c\) =>/g, "(c) =>");
const mod = new Function(js + "\nreturn {downloadFilename, contentDisposition, extForMime};")();
const { downloadFilename, contentDisposition } = mod;

const ILLEGAL = /[<>:"/\\|?*\u0000-\u001f\u007f]/;
const drive = JSON.parse(readFileSync(`${APP}/content/drive-catalog.json`, "utf8"));
const seed = JSON.parse(readFileSync(`${APP}/content/catalog.json`, "utf8"));

let checked = 0;
const fail = [];
const noExt = [];
for (const [source, items] of [["drive", drive], ["seed", seed]]) {
  for (const it of items) {
    const objectName = it.file.split("?")[0].split("/").pop();
    const fn = downloadFilename({ title: it.title, mime: it.mime, objectName });
    const cd = contentDisposition(true, fn);
    checked++;
    const why = [];
    if (!fn) why.push("empty");
    if (ILLEGAL.test(fn)) why.push("illegal char");
    if (/^[.\s]|[.\s]$/.test(fn)) why.push("leading/trailing dot or space");
    if (fn.length > 100) why.push(`too long (${fn.length})`);
    // No double extension, e.g. "x.pdf.pdf"
    if (/\.([A-Za-z0-9]{1,5})\.\1$/i.test(fn)) why.push("doubled extension");
    // The header must be a single line and must not break out of the quoted string
    if (/[\r\n]/.test(cd)) why.push("header injection");
    if (!/^attachment; filename="[^"\\]*"; filename\*=UTF-8''[\x21-\x7e]*$/.test(cd))
      why.push("malformed header: " + cd.slice(0, 120));
    if (why.length) fail.push({ source, title: it.title, fn, why });
    if (!/\.[A-Za-z0-9]{1,5}$/.test(fn)) noExt.push({ source, title: it.title, mime: it.mime, fn });
  }
}

console.log(`checked ${checked} catalog rows`);
console.log(`failures: ${fail.length}`);
for (const f of fail.slice(0, 10)) console.log("  ", f);
console.log(`still without any extension: ${noExt.length}`);
for (const n of noExt.slice(0, 5)) console.log("  ", n);

console.log("\n-- worked examples --");
const show = [
  drive[0],
  drive.find((x) => x.mime === "application/vnd.google-apps.document"),
  drive.find((x) => /"/.test(x.title)),
  seed.find((x) => !/\.[A-Za-z0-9]{1,5}$/.test(x.title)),
  seed.find((x) => /\?/.test(x.title)),
  drive.reduce((a, b) => (b.title.length > a.title.length ? b : a)),
].filter(Boolean);
for (const it of show) {
  const objectName = it.file.split("?")[0].split("/").pop();
  const fn = downloadFilename({ title: it.title, mime: it.mime, objectName });
  console.log(`\n  was:  ${objectName}`);
  console.log(`  title: ${it.title}`);
  console.log(`  now:  ${fn}`);
  console.log(`  hdr:  ${contentDisposition(true, fn)}`);
}

console.log("\n-- edge cases --");
for (const c of [
  { title: "", mime: "application/pdf", objectName: "1AbCdEfGhIj" },
  { title: "   ...   ", mime: "", objectName: "up_x_y.png" },
  { title: 'a"b\\c', mime: "image/png", objectName: "z.png" },
  { title: "report\r\nX-Injected: 1", mime: "application/pdf", objectName: "q.pdf" },
  { title: "שם.JPEG", mime: "image/jpeg", objectName: "w.jpg" },
  { title: "no-mime-known", mime: "application/x-weird", objectName: "e" },
]) {
  const fn = downloadFilename(c);
  console.log(`  ${JSON.stringify(c.title)} + ${c.mime || "(none)"} -> ${JSON.stringify(fn)}`);
  console.log(`      ${contentDisposition(true, fn)}`);
}
console.log("\n  inline:", contentDisposition(false, "whatever.pdf"));

process.exit(fail.length ? 1 : 0);
