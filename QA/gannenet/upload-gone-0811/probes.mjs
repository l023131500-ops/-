// Does /api/upload/[name] tell a deleted file apart from a broken one?
//
// Before this step every non-ok upstream collapsed into 502, so the service
// worker had no way to know an upload had been deleted and kept serving its
// cached copy for ever. This uploads a real seed asset through the real
// POST /api/catalog, probes GET and HEAD on it, deletes it through the real
// /api/admin/delete, and probes both again.
//
// Run from apps/40-gannenet with the production build up:
//   $env:APP_BASE_PATH="/gannenet"; .\node_modules\.bin\next.cmd start -p 3043
//   $env:ADMIN_PASSWORD=…; node <this file>
const B = "http://localhost:3043/gannenet";
const PW = process.env.ADMIN_PASSWORD;

const out = [];
const say = (s) => { out.push(s); console.log(s); };

const probe = async (path, method = "GET") => {
  // A HEAD that never returns is itself a failure mode — the first run of this
  // file hung on one — so every probe is bounded rather than awaited for ever.
  const r = await fetch(`${B}${path}`, { method, signal: AbortSignal.timeout(20000) });
  const len = method === "HEAD" ? r.headers.get("content-length") : (await r.arrayBuffer()).byteLength;
  return `${method.padEnd(4)} ${path.padEnd(46)} -> ${r.status}  ${r.headers.get("content-type") || "-"}  len=${len ?? "-"}  cc=${r.headers.get("cache-control") || "-"}`;
};

// Names that must never reach Storage at all — the pattern is the whole guard.
say("== guards (no upload needed) ==");
for (const bad of ["index.json", "seed", "up_a_b.tar.gz", "up_a_b", "..%2Findex.json"]) {
  say(await probe(`/api/upload/${bad}`));
  say(await probe(`/api/upload/${bad}`, "HEAD"));
}

// Real source bytes: one of the 258 seed assets, read back out of the real
// bucket through our own origin. An image, not a PDF — NetFree answers 418 to
// PDF bodies from supabase.co on this machine.
const src = await fetch(`${B}/api/shelf/16QLfhd7JsxdUZtVXgs33DhIXUZGT916_.jpg`);
const bytes = new Uint8Array(await src.arrayBuffer());
say(`\n== upload ==\nsource: ${src.status} ${src.headers.get("content-type")} ${bytes.length} B`);

const fd = new FormData();
fd.set("file", new File([bytes], "gone-probe.jpg", { type: "image/jpeg" }));
fd.set("title", "QA מחיקה — 404 ולא 502");
fd.set("category", "כללי");
fd.set("sender", "QA");
const up = await fetch(`${B}/api/catalog`, { method: "POST", body: fd });
const upJson = await up.json();
const id = upJson?.item?.id;
say(`upload: ${up.status} id=${id}`);
if (!id) { say("NO ID — abort"); process.exit(1); }

say("\n== while it exists ==");
say(await probe(`/api/upload/${id}.jpg`));
say(await probe(`/api/upload/${id}.jpg`, "HEAD"));
say(await probe(`/api/upload/${id}.jpg?dl=1`, "HEAD"));

const d = await fetch(`${B}/api/admin/delete`, {
  method: "POST",
  headers: { "x-admin-key": PW, "Content-Type": "application/json" },
  body: JSON.stringify({ fileId: id }),
});
say(`\n== delete ==\n${d.status} ${await d.text()}`);

say("\n== after it is gone ==");
say(await probe(`/api/upload/${id}.jpg`));
say(await probe(`/api/upload/${id}.jpg`, "HEAD"));
say(await probe(`/api/upload/${id}.jpg?dl=1`, "HEAD"));

// The first run of this file hung on the HEAD above and left its probe upload
// behind. Cleared here, through the product path, the way upload-delete-0811
// cleared the orphans before it.
for (const old of []) {
  const r = await fetch(`${B}/api/admin/delete`, {
    method: "POST",
    headers: { "x-admin-key": PW, "Content-Type": "application/json" },
    body: JSON.stringify({ fileId: old }),
  });
  say(`leftover ${old}: ${r.status} ${await r.text()}`);
}

const final = await (await fetch(`${B}/api/catalog`)).json();
say(`\ncatalog final: ${final.items.length} item(s)`);

const fs = await import("node:fs");
fs.writeFileSync(new URL("./_probes.txt", import.meta.url), out.join("\n") + "\n");
