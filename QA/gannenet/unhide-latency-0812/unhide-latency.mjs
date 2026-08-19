// #184 (40 gannenet) — "un-hiding does not come back". The hide-roundtrip step
// of 13:44 measured the *symptom*: the write landed, the storage object read
// `{}` through a busted URL, and the public shelf still did not return the item;
// a re-check some minutes later found it back. Nobody had measured how long that
// stretch is, and the admin screen promises hiding is reversible while it runs.
//
//   GN_ADMIN_KEY=... node QA/gannenet/unhide-latency-0812/unhide-latency.mjs
//
// This walks one material through the whole curation cycle against production
// and TIMES each direction by polling the public shelf until it agrees:
//
//   upload -> hide -> poll until gone -> unhide -> poll until back -> delete
//
// Both polls are bounded (POLL_LIMIT_MS). "did not converge" is a result, not a
// crash — before the fix the un-hide leg is expected to time out here.
//
// No secret is written into the repo: SUPABASE_URL / SUPABASE_ANON_KEY come out
// of apps/40-gannenet/.env.local and the admin key out of core.secrets via
// GN_ADMIN_KEY. Everything this writes it removes: the material is unhidden and
// deleted, and the shelf is left exactly as it was found. Test mode — no user is
// created, no message is sent, no charge is made.
import { readFileSync, appendFileSync } from "node:fs";

const BASE = "https://more30.com/gannenet";
const LOG = "QA/gannenet/unhide-latency-0812/_results.txt";
const POLL_LIMIT_MS = 120_000;
const POLL_EVERY_MS = 3_000;
const cb = () => `cb=${Date.now()}-${Math.random().toString(36).slice(2)}`;

const env = Object.fromEntries(
  readFileSync("apps/40-gannenet/.env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")])
);
const ADMIN_KEY = process.env.GN_ADMIN_KEY || "";
if (!ADMIN_KEY) {
  console.error("GN_ADMIN_KEY is required (core.secrets ADMIN_PASSWORD)");
  process.exit(2);
}

const note = (name, status, detail) => {
  const line = `${String(status).padEnd(5)} ${name} — ${detail}`;
  console.log(line);
  appendFileSync(LOG, line + "\n", "utf8");
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function signIn() {
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_ANON_KEY, "content-type": "application/json" },
    body: JSON.stringify({ email: "test@more30.com", password: "More30Test2026" }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`sign-in failed ${res.status}: ${JSON.stringify(body).slice(0, 200)}`);
  note("sign-in test@more30.com", res.status, `user ${body.user?.id}`);
  return body.access_token;
}

const publicHasIt = async (id) => {
  const res = await fetch(`${BASE}/api/catalog?${cb()}`);
  const body = await res.json();
  return (body.items || []).some((i) => i.id === id);
};

const mineFlag = async (token, id) => {
  const res = await fetch(`${BASE}/api/catalog?mine=1&${cb()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  const it = (body.items || []).find((i) => i.id === id);
  return { has: Boolean(it), hidden: it?.hidden };
};

const setHidden = async (id, hidden) => {
  const res = await fetch(`${BASE}/api/admin/override?${cb()}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-admin-key": ADMIN_KEY },
    body: JSON.stringify({ fileId: id, hidden, hiddenPages: [] }),
  });
  return { status: res.status, text: (await res.text()).slice(0, 200) };
};

// The override object as Storage actually holds it, read through a busted URL —
// the only way to separate "the write did not land" from "the write landed and a
// reader is being served a stale copy", which is the whole question here.
const overrideObject = async (id) => {
  const res = await fetch(
    `${env.SUPABASE_URL}/storage/v1/object/gannenet-shelf/overrides/${id}.json?${cb()}`,
    { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` } }
  );
  return { status: res.status, text: (await res.text()).slice(0, 200) };
};

// Poll the public shelf until it reports `want`, and return how long that took.
// `null` ms means it never agreed inside the budget.
async function pollUntil(id, want, label) {
  const t0 = Date.now();
  let attempts = 0;
  while (Date.now() - t0 < POLL_LIMIT_MS) {
    attempts++;
    if ((await publicHasIt(id)) === want) {
      const ms = Date.now() - t0;
      note(label, "ok", `converged after ${ms}ms (${attempts} reads)`);
      return ms;
    }
    await sleep(POLL_EVERY_MS);
  }
  note(label, "FAIL", `still wrong after ${POLL_LIMIT_MS}ms (${attempts} reads)`);
  return null;
}

appendFileSync(LOG, `\n=== unhide latency @ ${new Date().toISOString()} ===\n`, "utf8");
const token = await signIn();

const bytes = readFileSync("QA/gannenet/upload-limit-0811/small.png");
const form = new FormData();
form.set("file", new File([bytes], "qa-unhide.png", { type: "image/png" }), "qa-unhide.png");
form.set("title", "בדיקת QA ביטול הסתרה — נמחק מיד");
form.set("category", "כללי");
form.set("sender", "QA more30");
const up = await fetch(`${BASE}/api/catalog?${cb()}`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: form,
});
const upBody = await up.json();
note("upload", up.status, JSON.stringify(upBody).slice(0, 160));
if (!up.ok) process.exit(1);
const id = upBody.item.id;

note("public shelf after upload", "ok", `has-it=${await publicHasIt(id)}`);

const hid = await setHidden(id, true);
note("override hidden=true", hid.status, hid.text);
note("storage object after hide", (await overrideObject(id)).status, (await overrideObject(id)).text);
const hideMs = await pollUntil(id, false, "public shelf drops it");
const mineHidden = await mineFlag(token, id);
note("mine while hidden", "ok", `has-it=${mineHidden.has} hidden-flag=${JSON.stringify(mineHidden.hidden)}`);

const un = await setHidden(id, false);
note("override hidden=false", un.status, un.text);
note("storage object after unhide", (await overrideObject(id)).status, (await overrideObject(id)).text);
const unhideMs = await pollUntil(id, true, "public shelf returns it");
const mineBack = await mineFlag(token, id);
note("mine after unhide", "ok", `has-it=${mineBack.has} hidden-flag=${JSON.stringify(mineBack.hidden)}`);

const del = await fetch(`${BASE}/api/admin/delete?${cb()}`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-admin-key": ADMIN_KEY },
  body: JSON.stringify({ fileId: id }),
});
note("delete", del.status, (await del.text()).slice(0, 160));
note("public shelf after delete", "ok", `has-it=${await publicHasIt(id)}`);

note("RESULT", hideMs !== null && unhideMs !== null ? "PASS" : "FAIL", `hide=${hideMs}ms unhide=${unhideMs}ms`);
