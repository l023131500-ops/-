// scripts/qa/smel-prod-geocode-city.mjs
// core.issues #158 — מדידה מול הייצור (לא מול המקור): האם העיר שהוקלדה
// מגבילה את ההתאמה בפונקציה הפרוסה nadlan-smart-research.
// לכל כתובת נבדק: היישוב שהוחזר, סמל היישוב (שכל מספר בדוח מפתחו), ושיש קואורדינטות.
//
// שימוש: node scripts/qa/smel-prod-geocode-city.mjs [out.json]

const URL_ = "https://csjekrvukbdznetsrodj.supabase.co/functions/v1/nadlan-smart-research";

const CASES = [
  { address: "יפו 30 ירושלים", expect_city: "ירושלים", expect_code: "3000" },
  { address: "הרצל 10 חיפה", expect_city: "חיפה", expect_code: "4000" },
  { address: "דיזנגוף 100 תל אביב", expect_city: "תל אביב-יפו", expect_code: "5000" },
];

const norm = (s) => String(s || "").replace(/[–—-]/g, " ").replace(/['"׳״]/g, "").replace(/\s+/g, " ").trim();
const contains = (a, b) => { a = norm(a); b = norm(b); return !!a && !!b && (a.includes(b) || b.includes(a)); };

const out = [];
for (const c of CASES) {
  const t0 = Date.now();
  let row = { ...c };
  try {
    const res = await fetch(URL_, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: c.address }),
    });
    const j = await res.json();
    row = {
      ...row,
      http: res.status,
      ok: j.ok,
      matched_address: j.matched_address ?? null,
      locality_name: j.locality_name ?? null,
      locality_code: j.locality_code ?? null,
      neighborhood_name: j.neighborhood_name ?? null,
      lat: j.lat ?? null,
      lon: j.lon ?? null,
      profile_id: j.profile_id ?? null,
      ms: Date.now() - t0,
    };
  } catch (e) {
    row = { ...row, error: String(e) };
  }
  row.pass_city = contains(row.locality_name, c.expect_city);
  row.pass_code = String(row.locality_code ?? "") === c.expect_code;
  row.pass_coords = Number.isFinite(row.lat) && Number.isFinite(row.lon) && row.lat !== 0;
  row.pass = row.pass_city && row.pass_code && row.pass_coords;
  out.push(row);
  console.log(`${row.pass ? "PASS" : "FAIL"}  ${c.address}  ->  ${row.locality_name} (${row.locality_code})  ${row.matched_address}`);
}

const passed = out.filter((r) => r.pass).length;
console.log(`\n${passed}/${out.length} passed`);

const target = process.argv[2];
if (target) {
  const { writeFile } = await import("node:fs/promises");
  await writeFile(target, JSON.stringify({ url: URL_, cases: out, passed, total: out.length }, null, 2), "utf8");
  console.log(`wrote ${target}`);
}
