// The upload path is the one that reads the title back out of Storage at
// download time (`titleFor()`), so it is exercised against the real bucket with
// a real upload through the real form route, then removed through the real
// admin delete. Nothing is left behind.
import { readFileSync } from "node:fs";
const APP = "C:/Users/USER/Downloads/more30/apps/40-gannenet";
const ORIGIN = "http://localhost:3043/gannenet";

const env = Object.fromEntries(
  readFileSync(`${APP}/.env.local`, "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")])
);

const decodeStar = (cd) => {
  const m = /filename\*=UTF-8''([^;]+)/.exec(cd || "");
  return m ? decodeURIComponent(m[1]) : null;
};

// A tiny real PNG, so nothing large moves and nothing is invented.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAHElEQVQoz2NgGAWjYBSMglEwCkbBKBgFo2AUAAAGkAABAvKcXwAAAABJRU5ErkJggg==",
  "base64"
);

const TITLE = 'דף עבודה: ט"ו בשבט / כיתת גן — עותק?';
console.log("title being uploaded:", TITLE);

const form = new FormData();
form.set("file", new File([PNG], "my scan.png", { type: "image/png" }), "my scan.png");
form.set("title", TITLE);
form.set("category", "כללי");
form.set("sender", "QA");

const up = await fetch(`${ORIGIN}/api/catalog`, { method: "POST", body: form });
const upBody = await up.json();
console.log("POST /api/catalog ->", up.status, JSON.stringify(upBody).slice(0, 220));
if (!up.ok) process.exit(1);

const item = upBody.item;
console.log("file url:", item.file);

for (const [label, url] of [
  ["inline", `${ORIGIN}${item.file}`],
  ["dl=1", `${ORIGIN}${item.file}?dl=1`],
]) {
  const r = await fetch(url);
  const cd = r.headers.get("content-disposition");
  console.log(`  ${label}: ${r.status}  ${cd}`);
  if (decodeStar(cd)) console.log(`      saves as: ${decodeStar(cd)}`);
  const bytes = Buffer.from(await r.arrayBuffer());
  console.log(`      bytes: ${bytes.length} (uploaded ${PNG.length}), identical: ${bytes.equals(PNG)}`);
}

// HEAD is the service worker's existence check; it must still answer without a
// metadata read.
const h = await fetch(`${ORIGIN}${item.file}`, { method: "HEAD" });
console.log(`  HEAD: ${h.status}  cd=${h.headers.get("content-disposition")}`);

const del = await fetch(`${ORIGIN}/api/admin/delete`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-admin-key": env.ADMIN_PASSWORD || "" },
  body: JSON.stringify({ fileId: item.id }),
});
console.log("cleanup POST /api/admin/delete ->", del.status, (await del.text()).slice(0, 200));

const after = await fetch(`${ORIGIN}/api/catalog`).then((r) => r.json());
console.log("catalog items after cleanup:", after.items.length);
const gone = await fetch(`${ORIGIN}${item.file}`);
console.log("file after cleanup:", gone.status);
