/**
 * End-to-end proof that uploaded material is now served from our own origin.
 *
 * Runs against the production build (`next build` + `next start -p 3043`,
 * APP_BASE_PATH=/gannenet) and the real `gannenet-shelf` bucket. It uploads a
 * real shelf file through the real /api/catalog route, follows the URL the
 * catalog hands the browser, and then hides the item through the real admin
 * override so the QA upload does not sit on a teacher's shelf. (The anon key
 * cannot DELETE from Storage — see QA/gannenet/overrides-cas-0811/ — so hiding
 * is the only cleanup available, and it is the same mechanism the admin uses.)
 *
 *   node QA/gannenet/upload-origin-0811/probe.mjs            # upload + verify
 *   node QA/gannenet/upload-origin-0811/probe.mjs --hide ID  # hide it afterwards
 */
const APP = "http://localhost:3043/gannenet";
const ADMIN_KEY = process.env.ADMIN_PASSWORD;
if (!ADMIN_KEY) throw new Error("set ADMIN_PASSWORD (apps/40-gannenet/.env.local)");

// A real seed file, read back through our own /api/shelf route — no invented
// bytes. A .jpg on purpose: on this machine NetFree answers 418 to *PDF* bodies
// coming from supabase.co, so a seed PDF cannot be read here at all (the same
// environment limit QA/gannenet/download-disposition-0811/ ran into). An image
// goes through the identical code path, upload route and all.
const SEED = "164F9uhfHMyaYSWifZtdZCNr-4MgTG-yJ.jpg";
const SEED_TYPE = "image/jpeg";

const line = (...a) => console.log(...a);
const hideId = process.argv.includes("--hide") ? process.argv[process.argv.indexOf("--hide") + 1] : null;

async function hideItem(id) {
  const hide = await fetch(`${APP}/api/admin/override`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
    body: JSON.stringify({ fileId: id, hidden: true, hiddenPages: [] }),
  });
  line(`POST /api/admin/override (hide ${id}): ${hide.status} ${await hide.text()}`);
  const after = await (await fetch(`${APP}/api/catalog`, { cache: "no-store" })).json();
  line(`GET  /api/catalog after hide: ${after.items.length} item(s), ours present = ${after.items.some((i) => i.id === id)}`);
}

if (hideId) {
  await hideItem(hideId);
  process.exit(0);
}

const seedRes = await fetch(`${APP}/api/shelf/${SEED}`);
const seedBytes = new Uint8Array(await seedRes.arrayBuffer());
line(`seed  ${SEED}: ${seedRes.status} ${seedBytes.length} B`);

const form = new FormData();
form.set("file", new File([seedBytes], SEED, { type: SEED_TYPE }));
form.set("title", "בדיקת מסלול העלאה (QA) 11/08");
form.set("category", "כללי");
form.set("sender", "QA");

const upRes = await fetch(`${APP}/api/catalog`, { method: "POST", body: form });
const up = await upRes.json();
line(`POST /api/catalog: ${upRes.status}`, JSON.stringify(up));
const item = up.item;
if (!item) process.exit(1);
line(`item.file = ${item.file}   (same-origin: ${item.file.startsWith("/api/upload/")})`);

const list = await (await fetch(`${APP}/api/catalog`, { cache: "no-store" })).json();
const listed = list.items.find((i) => i.id === item.id);
line(`GET  /api/catalog: ${list.items.length} item(s); ours listed as ${listed && listed.file}`);

for (const suffix of ["", "?dl=1"]) {
  const r = await fetch(`${APP}${item.file}${suffix}`);
  const bytes = new Uint8Array(await r.arrayBuffer());
  const same = bytes.length === seedBytes.length && bytes[0] === seedBytes[0];
  line(
    `GET  ${item.file}${suffix} -> ${r.status} ${r.headers.get("content-type")} ` +
      `disposition=${r.headers.get("content-disposition")} ${bytes.length} B bytes-match=${same}`
  );
}

line(`ITEM_ID=${item.id}`);
line("(re-run with `--hide ITEM_ID` once the item page has been photographed)");
