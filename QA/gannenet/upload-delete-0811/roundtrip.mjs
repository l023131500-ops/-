// Real round trip against the real bucket: upload through POST /api/catalog,
// confirm it lists and its bytes serve, delete through POST /api/admin/delete,
// confirm it is gone from the catalog AND from Storage.
//
// Run from apps/40-gannenet with the production build up:
//   $env:APP_BASE_PATH="/gannenet"; .\node_modules\.bin\next.cmd start -p 3043
//   $env:ADMIN_PASSWORD=…; $env:SUPABASE_URL=…; $env:SUPABASE_SERVICE_ROLE_KEY=…
//   node <this file>
const B = "http://localhost:3043/gannenet";
const PW = process.env.ADMIN_PASSWORD;
const URL_ = process.env.SUPABASE_URL;
const SK = process.env.SUPABASE_SERVICE_ROLE_KEY;

const out = [];
const say = (s) => { out.push(s); console.log(s); };

async function list(prefix) {
  const r = await fetch(`${URL_}/storage/v1/object/list/gannenet-shelf`, {
    method: "POST",
    headers: { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix, limit: 1000 }),
  });
  return (await r.json()).filter((x) => x.id).map((x) => x.name).sort();
}
const bucketRoot = () => list("");
const bucketUploads = () => list("uploads");

async function del(id) {
  const r = await fetch(`${B}/api/admin/delete`, {
    method: "POST",
    headers: { "x-admin-key": PW, "Content-Type": "application/json" },
    body: JSON.stringify({ fileId: id }),
  });
  return `${r.status} ${await r.text()}`;
}

say(`root  before: ${JSON.stringify(await bucketRoot())}`);
say(`uploads before: ${JSON.stringify(await bucketUploads())}`);

// Real source bytes: one of the 258 seed assets, read back out of the real
// bucket through our own origin the way a browser reads it. (An image, not a
// PDF: NetFree answers 418 to PDF bodies from supabase.co on this machine.)
const src = await fetch(`${B}/api/shelf/16QLfhd7JsxdUZtVXgs33DhIXUZGT916_.jpg`);
const bytes = new Uint8Array(await src.arrayBuffer());
say(`source: ${src.status} ${src.headers.get("content-type")} ${bytes.length} B`);

const fd = new FormData();
fd.set("file", new File([bytes], "delete-probe.jpg", { type: "image/jpeg" }));
fd.set("title", "QA מחיקה לצמיתות");
fd.set("category", "כללי");
fd.set("sender", "QA");
const up = await fetch(`${B}/api/catalog`, { method: "POST", body: fd });
const upJson = await up.json();
say(`upload: ${up.status} ${JSON.stringify(upJson)}`);
const id = upJson?.item?.id;
if (!id) { say("NO ID — abort"); process.exit(1); }

const listed = await (await fetch(`${B}/api/catalog`)).json();
say(`catalog after upload: ${listed.items.length} item(s), ids=${JSON.stringify(listed.items.map((i) => i.id))}`);
const served = await fetch(`${B}${listed.items.find((i) => i.id === id).file}`);
say(`file serves: ${served.status} ${served.headers.get("content-type")} ${(await served.arrayBuffer()).byteLength} B`);
say(`root  with upload: ${JSON.stringify(await bucketRoot())}`);

say(`DELETE ${id}: ${await del(id)}`);
const after = await (await fetch(`${B}/api/catalog`)).json();
say(`catalog after delete: ${after.items.length} item(s), ids=${JSON.stringify(after.items.map((i) => i.id))}`);
// Storage's own CDN can still answer for a short window here — see _roundtrip.txt.
const gone = await fetch(`${B}/api/upload/${id}.jpg`);
say(`file after delete: ${gone.status}`);
say(`DELETE again (idempotent?): ${await del(id)}`);

// Cleared in the first run of this harness: the two QA uploads earlier steps
// left (entry + blob) and the upload-race orphan `up_msoxh0q3_hx4s.png`, which
// had a blob and no entry at all — the case only the by-object-name lookup
// reaches. All three answer "already gone" now.
for (const old of ["up_msp02sp4_cr56", "up_msp01lno_a1kw", "up_msoxh0q3_hx4s"]) {
  say(`DELETE leftover ${old}: ${await del(old)}`);
}
say(`root  after: ${JSON.stringify(await bucketRoot())}`);
say(`uploads after: ${JSON.stringify(await bucketUploads())}`);
const final = await (await fetch(`${B}/api/catalog`)).json();
say(`catalog final: ${final.items.length} item(s)`);

const fs = await import("node:fs");
fs.writeFileSync(new URL("./_roundtrip.txt", import.meta.url), out.join("\n") + "\n");
