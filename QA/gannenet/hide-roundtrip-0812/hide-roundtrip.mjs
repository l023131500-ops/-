// "מוסתר מהמדף" (40 gannenet) — the one line the mine-roundtrip step left open:
// the hidden marker on "החומרים שלי" had never been seen on a real item, because
// seeing it means hiding a live material through /shelf/admin and then looking at
// it as its uploader. Two accounts' worth of state on one item.
//
//   node QA/gannenet/hide-roundtrip-0812/hide-roundtrip.mjs hide
//   node QA/gannenet/hide-roundtrip-0812/hide-roundtrip.mjs restore [up_id]
//
// Split in two so the browser screenshot can be taken while the item is hidden
// and live. The session travels between the halves through %TEMP% and is never
// written into the repo; SUPABASE_URL / SUPABASE_ANON_KEY come out of
// apps/40-gannenet/.env.local and the admin key out of core.secrets via
// GN_ADMIN_KEY, so no secret is stored here either.
//
// Everything this writes is removed by `restore`: the material is unhidden, then
// deleted, and the shelf is left exactly as it was found.
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = "https://more30.com/gannenet";
const SESSION_FILE = join(tmpdir(), "gn-hide-roundtrip-session.json");
const LOG = "QA/gannenet/hide-roundtrip-0812/_results.txt";
const cb = () => `cb=${Date.now()}-${Math.random().toString(36).slice(2)}`;

const env = Object.fromEntries(
  readFileSync("apps/40-gannenet/.env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")])
);
const ADMIN_KEY = process.env.GN_ADMIN_KEY || "";

const note = (name, status, detail) => {
  const line = `${String(status).padEnd(5)} ${name} — ${detail}`;
  console.log(line);
  appendFileSync(LOG, line + "\n", "utf8");
};

async function signIn() {
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_ANON_KEY, "content-type": "application/json" },
    body: JSON.stringify({ email: "test@more30.com", password: "More30Test2026" }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`sign-in failed ${res.status}: ${JSON.stringify(body).slice(0, 200)}`);
  note("sign-in test@more30.com", res.status, `user ${body.user?.id}`);
  return body;
}

const mineList = async (token) => {
  const res = await fetch(`${BASE}/api/catalog?mine=1&${cb()}`, { headers: { Authorization: `Bearer ${token}` } });
  return { status: res.status, body: await res.json() };
};

const publicList = async () => {
  const res = await fetch(`${BASE}/api/catalog?${cb()}`);
  return { status: res.status, body: await res.json() };
};

const setHidden = async (id, hidden, key = ADMIN_KEY) => {
  const res = await fetch(`${BASE}/api/admin/override?${cb()}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(key ? { "x-admin-key": key } : {}) },
    body: JSON.stringify({ fileId: id, hidden, hiddenPages: [] }),
  });
  return { status: res.status, text: (await res.text()).slice(0, 200) };
};

// The override object the anon key wrote, read back straight from Storage — the
// only way to tell "cleared" (an empty object) from "still hidden" and from
// "never existed", since the app's own readers collapse the first two.
const overrideObject = async (id) => {
  const res = await fetch(
    `${env.SUPABASE_URL}/storage/v1/object/gannenet-shelf/overrides/${id}.json?${cb()}`,
    { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` } }
  );
  return { status: res.status, text: (await res.text()).slice(0, 200) };
};

const mode = process.argv[2];

if (mode === "hide") {
  appendFileSync(LOG, `\n=== hide @ ${new Date().toISOString()} ===\n`, "utf8");
  const session = await signIn();
  const token = session.access_token;

  const pubBefore = await publicList();
  note("public shelf before", pubBefore.status, `items=${pubBefore.body.items?.length}`);
  const mineBefore = await mineList(token);
  note("mine before", mineBefore.status, `items=${mineBefore.body.items?.length}`);

  const bytes = readFileSync("QA/gannenet/upload-limit-0811/small.png");
  const form = new FormData();
  form.set("file", new File([bytes], "qa-hide.png", { type: "image/png" }), "qa-hide.png");
  form.set("title", "בדיקת QA הסתרה — נמחק מיד");
  form.set("category", "כללי");
  form.set("sender", "QA more30");

  const up = await fetch(`${BASE}/api/catalog?${cb()}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const upBody = await up.json();
  note("POST /api/catalog (real token)", up.status, JSON.stringify(upBody).slice(0, 200));
  if (!up.ok) process.exit(1);
  const id = upBody.item.id;
  writeFileSync(SESSION_FILE, JSON.stringify({ id, session }), "utf8");

  const mineVisible = await mineList(token);
  const before = (mineVisible.body.items || []).find((i) => i.id === id);
  note("mine while visible", mineVisible.status, `has-it=${Boolean(before)} hidden-flag=${JSON.stringify(before?.hidden)}`);

  // the curation route must refuse a caller without the key, before it is trusted with one
  const noKey = await setHidden(id, true, "");
  note("POST /api/admin/override (no key)", noKey.status, noKey.text);

  const hid = await setHidden(id, true);
  note("POST /api/admin/override hidden=true", hid.status, hid.text);
  note("overrides object in storage", (await overrideObject(id)).status, (await overrideObject(id)).text);

  const mineHidden = await mineList(token);
  const after = (mineHidden.body.items || []).find((i) => i.id === id);
  note(
    "mine while hidden",
    mineHidden.status,
    `has-it=${Boolean(after)} hidden-flag=${JSON.stringify(after?.hidden)}`
  );

  const pubHidden = await publicList();
  note(
    "public shelf while hidden",
    pubHidden.status,
    `items=${pubHidden.body.items?.length} still-has-it=${(pubHidden.body.items || []).some((i) => i.id === id)}`
  );

  // What the uploader's own card links at. /shelf/[id] treats a hidden file as
  // removed, so this is the page she reaches from "פתיחה וצפייה".
  const itemPage = await fetch(`${BASE}/shelf/${id}?${cb()}`);
  const html = await itemPage.text();
  note("/shelf/<id> while hidden", itemPage.status, `says-not-found=${html.includes("החומר לא נמצא")}`);

  // And what the download button on that same card links at — a direct file URL
  // that never consults the overrides at all.
  const file = await fetch(`${BASE}/api/upload/${id}.png?${cb()}`);
  note(
    "raw file while hidden",
    file.status,
    `${file.headers.get("content-type")} ${(await file.arrayBuffer()).byteLength}B`
  );

  console.log(`\nHIDDEN_ID=${id}`);
} else if (mode === "restore") {
  appendFileSync(LOG, `\n=== restore @ ${new Date().toISOString()} ===\n`, "utf8");
  const saved = JSON.parse(readFileSync(SESSION_FILE, "utf8"));
  const id = process.argv[3] || saved.id;
  const token = saved.session.access_token;

  const un = await setHidden(id, false);
  note("POST /api/admin/override hidden=false", un.status, un.text);
  note("overrides object after unhide", (await overrideObject(id)).status, (await overrideObject(id)).text);

  const mineBack = await mineList(token);
  const back = (mineBack.body.items || []).find((i) => i.id === id);
  note("mine after unhide", mineBack.status, `has-it=${Boolean(back)} hidden-flag=${JSON.stringify(back?.hidden)}`);
  const pubBack = await publicList();
  note(
    "public shelf after unhide",
    pubBack.status,
    `items=${pubBack.body.items?.length} has-it=${(pubBack.body.items || []).some((i) => i.id === id)}`
  );

  const del = await fetch(`${BASE}/api/admin/delete?${cb()}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-admin-key": ADMIN_KEY },
    body: JSON.stringify({ fileId: id }),
  });
  note("POST /api/admin/delete", del.status, (await del.text()).slice(0, 200));

  const mineGone = await mineList(token);
  note(
    "mine after delete",
    mineGone.status,
    `items=${mineGone.body.items?.length} still-has-it=${(mineGone.body.items || []).some((i) => i.id === id)}`
  );
  const pubGone = await publicList();
  note("public shelf after delete", pubGone.status, `items=${pubGone.body.items?.length}`);
  const gone = await fetch(`${BASE}/api/upload/${id}.png?${cb()}`);
  note("raw file after delete", gone.status, "expect 404");
  // The curation object is written by the anon key, which may not delete — so it
  // outlives the material it curated. Recorded rather than assumed.
  note("overrides object after delete", (await overrideObject(id)).status, (await overrideObject(id)).text);
} else {
  console.error("usage: hide-roundtrip.mjs hide | restore [id]");
  process.exit(2);
}
