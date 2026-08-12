// "החומרים שלי" (40 gannenet) — the round trip the previous step could not run:
// a real upload by the official test user, seen in the list, then removed again.
//
//   node QA/gannenet/mine-roundtrip-0812/roundtrip.mjs upload
//   node QA/gannenet/mine-roundtrip-0812/roundtrip.mjs delete <up_id>
//
// Split in two so a browser screenshot can be taken while the item is live.
// The session is handed between the halves through %TEMP% and never written into
// the repo; SUPABASE_URL / SUPABASE_ANON_KEY are read out of
// apps/40-gannenet/.env.local, and the admin key out of core.secrets by the
// caller (passed in GN_ADMIN_KEY), so no secret is stored here either.
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = "https://more30.com/gannenet";
const SESSION_FILE = join(tmpdir(), "gn-roundtrip-session.json");
const LOG = "QA/gannenet/mine-roundtrip-0812/_results.txt";
const cb = () => `cb=${Date.now()}-${Math.random().toString(36).slice(2)}`;

const env = Object.fromEntries(
  readFileSync("apps/40-gannenet/.env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")])
);

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
  const res = await fetch(`${BASE}/api/catalog?mine=1&${cb()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { status: res.status, body: await res.json() };
};

const publicList = async () => {
  const res = await fetch(`${BASE}/api/catalog?${cb()}`);
  return { status: res.status, body: await res.json() };
};

const mode = process.argv[2];

if (mode === "upload") {
  appendFileSync(LOG, `\n=== upload @ ${new Date().toISOString()} ===\n`, "utf8");
  const session = await signIn();
  const token = session.access_token;

  const before = await mineList(token);
  note("mine before", before.status, `items=${before.body.items?.length}`);
  const pubBefore = await publicList();
  note("public shelf before", pubBefore.status, `items=${pubBefore.body.items?.length}`);

  const bytes = readFileSync("QA/gannenet/upload-limit-0811/small.png");
  const form = new FormData();
  form.set("file", new File([bytes], "qa-roundtrip.png", { type: "image/png" }), "qa-roundtrip.png");
  form.set("title", "בדיקת QA — נמחק מיד");
  form.set("category", "כללי");
  form.set("sender", "QA more30");

  const up = await fetch(`${BASE}/api/catalog?${cb()}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const upBody = await up.json();
  note("POST /api/catalog (real token)", up.status, JSON.stringify(upBody).slice(0, 300));
  if (!up.ok) process.exit(1);
  const id = upBody.item.id;

  const after = await mineList(token);
  const found = (after.body.items || []).find((i) => i.id === id);
  note("mine after upload", after.status, `items=${after.body.items?.length} mine-has-it=${Boolean(found)}`);
  note("uploader_email absent", after.status, String(!JSON.stringify(after.body).includes("uploader_email")));

  const pubAfter = await publicList();
  note(
    "public shelf after upload",
    pubAfter.status,
    `items=${pubAfter.body.items?.length} has-it=${(pubAfter.body.items || []).some((i) => i.id === id)}`
  );

  // `item.file` is stored mount-relative ("/api/upload/..."); the browser gets it
  // through withBase(). A probe that forgets that gets a 404 from the portal, not
  // from the app — which is what this line did on the first run.
  const file = await fetch(`https://more30.com/gannenet${found?.file || ""}?${cb()}`);
  note("uploaded file reachable", file.status, `${file.headers.get("content-type")} ${(await file.arrayBuffer()).byteLength}B`);

  writeFileSync(SESSION_FILE, JSON.stringify({ id, session }), "utf8");
  console.log(`\nUPLOAD_ID=${id}`);
} else if (mode === "delete") {
  appendFileSync(LOG, `\n=== delete @ ${new Date().toISOString()} ===\n`, "utf8");
  const id = process.argv[3] || JSON.parse(readFileSync(SESSION_FILE, "utf8")).id;
  const token = JSON.parse(readFileSync(SESSION_FILE, "utf8")).session.access_token;
  const adminKey = process.env.GN_ADMIN_KEY || "";

  // the route must refuse a caller without the key, before it is trusted with one
  const noKey = await fetch(`${BASE}/api/admin/delete?${cb()}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fileId: id }),
  });
  note("POST /api/admin/delete (no key)", noKey.status, (await noKey.text()).slice(0, 80));

  const del = await fetch(`${BASE}/api/admin/delete?${cb()}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-admin-key": adminKey },
    body: JSON.stringify({ fileId: id }),
  });
  const delBody = await del.text();
  note("POST /api/admin/delete", del.status, delBody.slice(0, 300));

  const after = await mineList(token);
  note(
    "mine after delete",
    after.status,
    `items=${after.body.items?.length} still-has-it=${(after.body.items || []).some((i) => i.id === id)}`
  );
  const pubAfter = await publicList();
  note(
    "public shelf after delete",
    pubAfter.status,
    `items=${pubAfter.body.items?.length} still-has-it=${(pubAfter.body.items || []).some((i) => i.id === id)}`
  );

  const gone = await fetch(`https://more30.com/gannenet/api/upload/${id}.png?${cb()}`);
  note("uploaded file after delete", gone.status, "expect 4xx");

  // second run of the same delete: the route calls this idempotent, so it must
  // answer 404 "already gone" rather than pretend it removed something again
  const again = await fetch(`${BASE}/api/admin/delete?${cb()}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-admin-key": adminKey },
    body: JSON.stringify({ fileId: id }),
  });
  note("POST /api/admin/delete (repeat)", again.status, (await again.text()).slice(0, 200));
} else {
  console.error("usage: roundtrip.mjs upload | delete [id]");
  process.exit(2);
}
