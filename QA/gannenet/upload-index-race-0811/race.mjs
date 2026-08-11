// Two concurrent uploads through the REAL /api/catalog route against the REAL
// bucket. Counts how many of the two survive in the catalog afterwards.
//
// Usage: node race.mjs <base> <label>
//   base  = http://127.0.0.1:3042/gannenet
//   label = tag written into each title so the probes are identifiable
const BASE = process.argv[2] || "http://127.0.0.1:3042/gannenet";
const LABEL = process.argv[3] || "probe";
const RUNS = Number(process.argv[4] || 4);

// 1x1 PNG
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

async function upload(title) {
  const fd = new FormData();
  fd.append("title", title);
  fd.append("category", "כללי");
  fd.append("sender", "race-probe");
  fd.append("file", new File([PNG], "probe.png", { type: "image/png" }));
  const res = await fetch(`${BASE}/api/catalog`, { method: "POST", body: fd });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, id: body?.item?.id, error: body?.error };
}

async function listed() {
  const res = await fetch(`${BASE}/api/catalog`, { cache: "no-store" });
  const body = await res.json();
  return body.items || [];
}

let lost = 0;
for (let run = 1; run <= RUNS; run++) {
  const a = `${LABEL}-r${run}-A`;
  const b = `${LABEL}-r${run}-B`;
  const [ra, rb] = await Promise.all([upload(a), upload(b)]);
  // give the write a beat to settle before reading back
  await new Promise((r) => setTimeout(r, 400));
  const items = await listed();
  const seenA = items.some((i) => i.title === a);
  const seenB = items.some((i) => i.title === b);
  const missing = [!seenA && a, !seenB && b].filter(Boolean);
  if (missing.length) lost++;
  console.log(
    `run ${run}: A=${ra.status}${ra.ok ? "" : " " + ra.error} B=${rb.status}${rb.ok ? "" : " " + rb.error}` +
      ` | in catalog: A=${seenA} B=${seenB}` +
      (missing.length ? `  <-- LOST ${missing.join(", ")}` : "")
  );
}
console.log(`\nlost a save in ${lost} of ${RUNS} runs`);
