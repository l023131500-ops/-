// Server-side half of upload-limit-0811, against the production build on :3043.
// The browser half (client pre-flight, the edge's HTML 413) is in README.md.
//
//   node probes.mjs <ADMIN_PASSWORD>
//
// Leaves the bucket as it found it: every item it uploads is removed through
// /api/admin/delete, the product's own path.
import fs from "node:fs";

const BASE = "http://localhost:3043/gannenet";
const ADMIN = process.argv[2] || "";
const out = [];
const log = (s) => { out.push(s); console.log(s); };

async function post(file, name, type, title) {
  const fd = new FormData();
  fd.append("title", title);
  fd.append("category", "כללי");
  fd.append("sender", "QA");
  fd.append("file", new Blob([fs.readFileSync(file)], { type }), name);
  const res = await fetch(`${BASE}/api/catalog`, { method: "POST", body: fd });
  const body = await res.text();
  return { status: res.status, body };
}

async function catalog() {
  const r = await fetch(`${BASE}/api/catalog`, { cache: "no-store" });
  return await r.json();
}

// 5MB of nothing with a PDF magic number — not committed, it is only a size.
if (!fs.existsSync("big.pdf")) {
  const buf = Buffer.alloc(5 * 1024 * 1024);
  Buffer.from("%PDF-1.4").copy(buf);
  fs.writeFileSync("big.pdf", buf);
}

const before = await catalog();
log(`before: ready=${before.ready} items=${before.items.length}`);

// 1. Over the limit, sent straight at the route (no browser to stop it). The old
//    check was 25MB, so this body was accepted and stored.
const big = await post("big.pdf", "big.pdf", "application/pdf", "QA oversize");
log(`5MB pdf   -> ${big.status} ${big.body.slice(0, 120)}`);

// 2. Just under it — the same path must still work.
const small = await post("small.png", "small.png", "image/png", "QA under limit");
log(`2KB png   -> ${small.status} ${small.body.slice(0, 120)}`);

// 3. Wrong type is still 400, not 413.
fs.writeFileSync("bad.txt", "not a worksheet");
const bad = await post("bad.txt", "bad.txt", "text/plain", "QA bad type");
log(`txt       -> ${bad.status} ${bad.body.slice(0, 120)}`);
fs.unlinkSync("bad.txt");

const after = await catalog();
log(`after:    items=${after.items.length} (${after.items.map((i) => i.title).join(", ")})`);

// Cleanup through the product path.
for (const item of after.items) {
  const r = await fetch(`${BASE}/api/admin/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-key": ADMIN },
    body: JSON.stringify({ fileId: item.id }),
  });
  log(`delete ${item.id} -> ${r.status} ${(await r.text()).slice(0, 120)}`);
}
const end = await catalog();
log(`end:      items=${end.items.length}`);
fs.writeFileSync("_probes.txt", out.join("\n") + "\n");
