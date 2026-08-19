import { buildSmartProfile } from "./engine.ts";

const addr = Deno.args[0] ?? "דיזנגוף 100 תל אביב";
console.log("=== בדיקת מנוע מחקר חכם ===");
console.log("כתובת:", addr);
const t0 = Date.now();
const profile = await buildSmartProfile(addr);
console.log(`זמן: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log("ok:", profile.ok, profile.error ?? "");
console.log("שיוך:", profile.locality_name, "| שכונה:", profile.neighborhood_name, "| סמל:", profile.locality_code, "| אזור סטטיסטי:", profile.stat_area);
console.log("קואורדינטות:", profile.lat, profile.lon);
console.log("\n--- פרמטרים (" + profile.parameters.length + ") ---");
for (const p of profile.parameters) {
  console.log(`• ${p.label}: ${p.value}${p.unit ? " " + p.unit : ""}  [${p.source_key}]`);
}
console.log("\n--- ציון כדאיות:", profile.opportunity_score, "---");
for (const s of profile.score_breakdown ?? []) {
  console.log(`  ${s.points >= 0 ? "+" : ""}${s.points}  ${s.factor} (${s.note})`);
}
console.log("\n--- מקורות:", profile.sources.map((s) => s.title).join(", "));
