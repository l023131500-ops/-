/**
 * Are the halachic times chatzor publishes actually computed, and are the
 * inputs they depend on real?
 *
 * 16-chatzor-connect puts zmanim, a Hebrew date and a parsha on its home page
 * for the Chatzor Hagelilit religious council. That is the highest-stakes
 * "real data" on the platform: people use it to know when Shabbat starts.
 *
 * WHAT THIS CONFIRMED
 *   The engine is genuine — @hebcal/core computing astronomically from date +
 *   coordinates, not scraped and not hardcoded. The eleven zmanim come out in
 *   strictly increasing order and at plausible Galil times.
 *
 * WHAT IT EXPOSED
 *   Two *inputs* are unverified assumptions that move the published times:
 *     · elevation: 350 m, marked "(approx.)" in config/site.ts. Elevation is
 *       switched ON (Zmanim's third argument), and it pushes sunset 3 minutes
 *       later than sea level. Candle lighting is derived from sunset, so the
 *       guess moves Shabbat onset — in the less protective direction.
 *     · candleLightingMinutes: 40, justified in a comment as the custom "in
 *       most of the Galil". 40 is the Jerusalem figure; Tzfat and Haifa are
 *       commonly 30. This version of @hebcal/core carries no candle-lighting
 *       minutes on Location and has no entry for Chatzor, Tzfat or Rosh Pina,
 *       so the claim cannot be checked from anything on this machine.
 *
 * Neither is a bug to be quietly "fixed" — both are halachic decisions for the
 * council, and changing them silently would be worse than leaving them. They
 * are filed in NEEDS_USER.md. This script exists so the next person can see
 * the difference between what is computed and what is assumed.
 *
 * Run: node scripts/qa/chatzor-zmanim-verify.mjs
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

// @hebcal/core lives in the app, not at the repo root.
const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(here, "../../apps/16-chatzor-connect");
const require = createRequire(path.join(appDir, "package.json"));
const { Location, Zmanim, HDate, Sedra } = require("@hebcal/core");

// Mirrors src/config/site.ts.
const SITE = { latitude: 32.9797, longitude: 35.5386, elevation: 350, tz: "Asia/Jerusalem", candles: 40 };

const fmt = new Intl.DateTimeFormat("he-IL", {
  timeZone: SITE.tz,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

// ── 1. can the candle-lighting custom be checked offline at all? ──────────
console.log("-- hebcal city data --");
const probe = Location.lookup("Jerusalem");
console.log("Location fields:", Object.keys(probe).join(", "));
console.log(
  "carries candle-lighting minutes:",
  ["candleLightingMins", "candleLightingMinutes"].some((k) => probe[k] != null),
);
for (const name of ["Hatzor HaGelilit", "Zefat", "Safed", "Rosh Pina", "Tiberias", "Haifa", "Jerusalem"]) {
  const loc = Location.lookup(name);
  console.log(
    `  ${name.padEnd(18)}`,
    loc ? `lat=${loc.getLatitude().toFixed(4)} lon=${loc.getLongitude().toFixed(4)} elev=${loc.getElevation() ?? "-"}` : "not in hebcal",
  );
}

// ── 2. is the engine real and self-consistent? ────────────────────────────
const loc = new Location(SITE.latitude, SITE.longitude, true, SITE.tz, "Chatzor", "IL", undefined, SITE.elevation);
const date = new Date(2026, 7, 7); // Fri 7 Aug 2026
const z = new Zmanim(loc, date, true);
const seq = [
  ["alotHaShachar", z.alotHaShachar()], ["misheyakir", z.misheyakir()], ["sunrise", z.sunrise()],
  ["sofZmanShma", z.sofZmanShma()], ["sofZmanTfilla", z.sofZmanTfilla()], ["chatzot", z.chatzot()],
  ["minchaGedola", z.minchaGedola()], ["minchaKetana", z.minchaKetana()],
  ["plagHaMincha", z.plagHaMincha()], ["sunset", z.sunset()], ["tzeit", z.tzeit()],
];
console.log("\n-- computed zmanim, Fri 7 Aug 2026 --");
let ordered = true;
seq.forEach(([k, t], i) => {
  if (i && t.getTime() <= seq[i - 1][1].getTime()) ordered = false;
  console.log(`  ${k.padEnd(16)} ${fmt.format(t)}`);
});
console.log("strictly increasing:", ordered);

const hd = new HDate(date);
console.log("hebrewDate:", hd.renderGematriya(true));
console.log("parsha:", new Sedra(hd.getFullYear(), true).getString(hd, "he"));

// ── 3. how much do the two assumptions actually move? ─────────────────────
const flat = new Zmanim(
  new Location(SITE.latitude, SITE.longitude, true, SITE.tz, "Chatzor", "IL"),
  date,
  true,
);
const deltaMin = Math.round((z.sunset().getTime() - flat.sunset().getTime()) / 60000);

console.log("\n-- what the assumptions cost --");
console.log(`sunset @ ${SITE.elevation}m: ${fmt.format(z.sunset())}   @ sea level: ${fmt.format(flat.sunset())}   (${deltaMin >= 0 ? "+" : ""}${deltaMin} min)`);
console.log(`candle lighting, sunset-${SITE.candles} (configured): ${fmt.format(z.sunsetOffset(-SITE.candles, true))}`);
console.log(`candle lighting, sunset-30 (Tzfat/Haifa custom):    ${fmt.format(z.sunsetOffset(-30, true))}`);
console.log(`combined spread between the two readings: ${Math.abs(deltaMin) + Math.abs(SITE.candles - 30)} min`);

console.log(
  "\nVERDICT: engine real and ordered =",
  ordered,
  "| elevation and candle-lighting minutes remain UNVERIFIED — council decision, see NEEDS_USER.md",
);
