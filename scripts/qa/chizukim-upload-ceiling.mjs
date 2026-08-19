/**
 * The chizukim upload page tells the user, in so many words:
 *   "תומך בקבצים גדולים (עד 500MB) — ההעלאה נעשית ישירות לאחסון"
 *
 * That number is a promise about someone else's service. The 500MB in the
 * repo is a multer limit on the Express fallback route; the direct path the
 * sentence describes goes browser → Supabase Storage and never touches it.
 * What actually governs is the bucket's file_size_limit, and above that the
 * project's global upload ceiling — neither of which lives in this repo.
 *
 * So: ask the storage service, don't read the source.
 *
 * Method. A real 500MB upload would push half a gigabyte into a live archive
 * of 1,138 recordings to prove a point, so this does not do that. Supabase's
 * storage-api rejects an oversized body on the declared Content-Length before
 * reading it, and names the limit in the error. This declares a large
 * Content-Length, writes a few bytes, and waits for the refusal.
 *
 * ⚠️ It has to use node:https, not fetch. The first version used fetch and
 * every request died as "network error" without leaving this machine: undici
 * refuses to send a body shorter than the Content-Length you declared, so the
 * lie the probe depends on never reached Supabase. Six identical failures in a
 * row that never touched the network — and they would have read as six
 * rejections if the script had been less careful about distinguishing them.
 *
 * Writes nothing: the request is abandoned before the body completes, and the
 * probe path is deleted in the same run either way.
 *
 * Run: node scripts/qa/chizukim-upload-ceiling.mjs
 */
import https from "node:https";

const SUPABASE_URL = "https://csjekrvukbdznetsrodj.supabase.co";
const KEY = "sb_publishable_Bv6ysG9LfUZ2lUPgZVZO6g_l1wEZIlX";
const BUCKET = "recordings-audio";
const PROBE = "_qa/upload-ceiling-probe.bin";
const CLAIMED_MB = 500;

const h = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const MB = 1024 * 1024;

async function show(label, res) {
  const body = await res.text().catch(() => "");
  console.log(`${label}: ${res.status} ${res.statusText} ${body.slice(0, 300)}`);
  return body;
}

console.log("-- reachability --");
try {
  const ping = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, { headers: h });
  await show("GET /storage/v1/bucket (needs service_role)", ping);
} catch (e) {
  console.log("network error:", e.message);
  console.log("\nNOT AVAILABLE — cannot reach Supabase from this machine.");
  process.exit(2);
}

console.log("\n-- what does the service accept? --");

/**
 * Declare `bytes`, send a token, never finish the body. Resolves with whatever
 * the server says, or `reachedServer: false` if nothing came back — which is a
 * different answer from a rejection and must never be counted as one.
 */
function declareSize(bytes) {
  return new Promise((resolve) => {
    const req = https.request(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${PROBE}`,
      {
        method: "POST",
        headers: {
          ...h,
          "Content-Type": "application/octet-stream",
          "Content-Length": String(bytes),
          "x-upsert": "true",
        },
      },
      (res) => {
        let body = "";
        res.on("data", (d) => (body += d));
        res.on("end", () => {
          req.destroy();
          resolve({ reachedServer: true, status: res.statusCode, body });
        });
      },
    );
    req.on("error", (e) => resolve({ reachedServer: false, status: 0, body: e.message }));
    req.write("probe");
    // deliberately no req.end() — the body stays short of what was declared
    setTimeout(() => {
      req.destroy();
      resolve({ reachedServer: false, status: 0, body: "no response within 20s" });
    }, 20000);
  });
}

// Route A — plain POST, declared Content-Length. Kept only to record that it
// does NOT work: storage-api enforces the limit mid-stream, so it says nothing
// until the body arrives. One size is enough to demonstrate that.
const a = await declareSize(501 * MB);
console.log(
  `  plain POST, declared 501MB -> ${a.reachedServer ? `${a.status} ${a.body.slice(0, 160)}` : `no early answer (${a.body})`}`,
);
console.log("  (enforced mid-stream, so this route cannot answer without sending the bytes)");

// Route B — resumable/TUS. A TUS server validates Upload-Length up front and
// refuses oversized uploads before a single content byte is sent. This is the
// probe that can actually answer the question.
function tusCreate(bytes) {
  return new Promise((resolve) => {
    const meta = Buffer.from(`${BUCKET}/${PROBE}`).toString("base64");
    const req = https.request(
      `${SUPABASE_URL}/storage/v1/upload/resumable`,
      {
        method: "POST",
        headers: {
          ...h,
          "Tus-Resumable": "1.0.0",
          "Upload-Length": String(bytes),
          "Upload-Metadata": `bucketName ${Buffer.from(BUCKET).toString("base64")},objectName ${Buffer.from(PROBE).toString("base64")},contentType ${Buffer.from("application/octet-stream").toString("base64")}`,
          "Content-Length": "0",
          "x-upsert": "true",
          _meta: meta,
        },
      },
      (res) => {
        let body = "";
        res.on("data", (d) => (body += d));
        res.on("end", () =>
          resolve({ reachedServer: true, status: res.statusCode, body, location: res.headers.location }),
        );
      },
    );
    req.on("error", (e) => resolve({ reachedServer: false, status: 0, body: e.message }));
    req.end();
    setTimeout(() => {
      req.destroy();
      resolve({ reachedServer: false, status: 0, body: "no response within 20s" });
    }, 20000);
  });
}

console.log("\n  resumable (TUS) — Upload-Length validated before any body:");
const sizes = [40, 49, 50, 51, 60, 101, 251, 501];
let firstRejected = null;
let anyReachedServer = a.reachedServer;
const created = [];
for (const mb of sizes) {
  const r = await tusCreate(mb * MB);
  anyReachedServer ||= r.reachedServer;
  console.log(
    `    ${String(mb).padStart(3)}MB -> ${r.reachedServer ? `${r.status} ${(r.body || "").slice(0, 160)}` : `NO SERVER RESPONSE (${r.body})`}`,
  );
  if (r.location) created.push(r.location);
  if (r.reachedServer && (r.status === 413 || /too large|exceeded the maximum|entity too large/i.test(r.body))) {
    firstRejected ??= mb;
  }
}

// A TUS "create" reserves an upload without storing content; drop any that were
// accepted so nothing is left half-open on the bucket.
for (const loc of created) {
  await fetch(loc, { method: "DELETE", headers: { ...h, "Tus-Resumable": "1.0.0" } }).catch(() => {});
}
if (created.length) console.log(`  cleaned up ${created.length} reserved upload(s)`);

console.log("\n-- cleanup --");
const del = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${PROBE}`, {
  method: "DELETE",
  headers: h,
});
await show("DELETE probe object", del);

console.log("\n-- verdict --");
if (!anyReachedServer) {
  console.log("NOT AVAILABLE — no request reached Supabase, so nothing was measured.");
  process.exit(2);
}
if (firstRejected === null) {
  console.log(`No size up to ${CLAIMED_MB}MB was refused on Content-Length alone.`);
  console.log("INCONCLUSIVE — the service may only enforce mid-stream. Do not");
  console.log("record the 500MB claim as verified on the strength of this.");
  process.exit(3);
}
console.log(`First declared size refused: ${firstRejected}MB.`);
console.log(
  firstRejected <= CLAIMED_MB
    ? `CLAIM FALSE — the page promises ${CLAIMED_MB}MB, the bucket refuses at ${firstRejected}MB.`
    : `Claim holds up to ${CLAIMED_MB}MB.`,
);


