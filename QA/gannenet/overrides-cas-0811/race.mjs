// Drives the OLD and NEW setOverride() logic against the real gannenet-shelf
// bucket, two concurrent saves of two DIFFERENT files, which is the case the
// previous step lost one of. Run: node race.mjs
// Restores overrides.json to {} at the end.
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(process.argv[2], "utf8")
    .split(/\r?\n/)
    .filter((l) => /^\s*[A-Z_]+\s*=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const URL_ = env.SUPABASE_URL;
const KEY_ = env.SUPABASE_ANON_KEY;
const BUCKET = "gannenet-shelf";
const OBJECT = "overrides.json";
const H = { apikey: KEY_, Authorization: `Bearer ${KEY_}` };

async function read({ fresh = false } = {}) {
  const bust = fresh ? `?t=${Date.now()}-${Math.random().toString(36).slice(2)}` : "";
  const r = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${OBJECT}${bust}`, {
    headers: H,
    cache: "no-store",
  });
  if (!r.ok) return {};
  return (await r.json()) || {};
}
async function putRaw(name, body) {
  const r = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${name}`, {
    method: "POST",
    headers: { ...H, "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify(body),
  });
  return r.ok;
}
async function write(map) {
  const r = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${OBJECT}`, {
    method: "POST",
    headers: { ...H, "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify(map),
  });
  return r.ok;
}
function merge(map, id, patch) {
  const next = { ...(map[id] || {}), ...patch };
  if (!next.hidden) delete next.hidden;
  if (!next.hiddenPages || next.hiddenPages.length === 0) delete next.hiddenPages;
  if (!next.note) delete next.note;
  if (Object.keys(next).length === 0) {
    delete map[id];
    return null;
  }
  map[id] = next;
  return next;
}
function same(a, b) {
  if (a === null) return b === undefined;
  if (!b) return false;
  return (
    Boolean(a.hidden) === Boolean(b.hidden) &&
    (a.note || "") === (b.note || "") &&
    (a.hiddenPages || []).join(",") === (b.hiddenPages || []).join(",")
  );
}

// exactly the code that shipped before this step
async function oldSet(id, patch) {
  const map = await read();
  merge(map, id, patch);
  if (!(await write(map))) return { ok: false, reason: "write" };
  return { ok: true };
}
// exactly the code that ships now
async function newSet(id, patch) {
  for (let a = 0; a < 3; a++) {
    const map = await read();
    const want = merge(map, id, patch);
    if (!(await write(map))) return { ok: false, reason: "write" };
    const after = await read({ fresh: true });
    if (same(want, after[id])) return { ok: true, attempts: a + 1 };
  }
  return { ok: false, reason: "conflict" };
}

// what ships now: one object per file, no shared map to lose
const PREFIX = "overrides";
async function getOne(id) {
  const r = await fetch(
    `${URL_}/storage/v1/object/${BUCKET}/${PREFIX}/${id}.json?t=${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`,
    { headers: H, cache: "no-store" }
  );
  return r.ok ? await r.json() : null;
}
async function perFileSet(id, patch) {
  const cur = (await getOne(id)) || {};
  const next = { ...cur, ...patch };
  const r = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${PREFIX}/${id}.json`, {
    method: "POST",
    headers: { ...H, "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify(next),
  });
  return r.ok ? { ok: true } : { ok: false, reason: "write" };
}
async function listOverrides() {
  const r = await fetch(`${URL_}/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: PREFIX, limit: 1000 }),
    cache: "no-store",
  });
  if (!r.ok) return {};
  const rows = await r.json();
  const out = {};
  for (const row of rows.filter((x) => x && x.id && x.name.endsWith(".json"))) {
    const id = row.name.replace(/\.json$/, "");
    const v = await getOne(id);
    if (v && Object.keys(v).length) out[id] = v;
  }
  return out;
}

const A = "CASPROBEfileAAAAA";
const B = "CASPROBEfileBBBBB";

async function round(label, fn) {
  const perFile = fn === perFileSet;
  if (perFile) {
    // clear both keys the way the app clears an override: write {}
    await Promise.all([perFileSet(A, {}), perFileSet(B, {})]);
    await Promise.all([
      putRaw(`${PREFIX}/${A}.json`, {}),
      putRaw(`${PREFIX}/${B}.json`, {}),
    ]);
  } else {
    await write({});
  }
  const res = await Promise.all([fn(A, { hidden: true }), fn(B, { hidden: true })]);
  const final = perFile ? await listOverrides() : await read({ fresh: true });
  const ids = Object.keys(final).sort();
  console.log(
    `${label}\n  results : ${JSON.stringify(res)}\n  stored  : ${ids.length} entr${
      ids.length === 1 ? "y" : "ies"
    } ${JSON.stringify(ids)}\n  verdict : ${ids.length === 2 ? "both saves survived" : "A SAVE WAS LOST"}\n`
  );
  return ids.length;
}

const runs = Number(process.argv[3] || 3);
let oldLost = 0,
  verifyLost = 0,
  perFileLost = 0;
for (let i = 1; i <= runs; i++) {
  if ((await round(`OLD shared map, read-modify-write   run ${i}`, oldSet)) !== 2) oldLost++;
  if ((await round(`REJECTED write-then-verify          run ${i}`, newSet)) !== 2) verifyLost++;
  if ((await round(`NEW one object per file             run ${i}`, perFileSet)) !== 2) perFileLost++;
}
await write({});
await Promise.all([putRaw(`${PREFIX}/${A}.json`, {}), putRaw(`${PREFIX}/${B}.json`, {})]);
console.log(
  `over ${runs} runs a save was lost in:\n` +
    `  OLD shared map        ${oldLost}/${runs}\n` +
    `  write-then-verify     ${verifyLost}/${runs}\n` +
    `  one object per file   ${perFileLost}/${runs}\n` +
    `overrides.json restored to ${JSON.stringify(await read({ fresh: true }))}; ` +
    `probe keys emptied (anon cannot DELETE, so {} is the cleared state)`
);
