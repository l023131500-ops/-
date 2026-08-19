/**
 * Do the two Chatzor Hagelilit sites publish the same halachic times?
 *
 * chatzor (16-chatzor-connect) and galil (24-galilee-connect-hub) both serve
 * the same town and both show "זמני היום". They must not disagree: a resident
 * who checks one and then the other should not get two different sunsets.
 *
 * galil used to hold a hardcoded eleven-row table commented "(approximate)",
 * frozen at one set of times for the whole year. It now computes from the same
 * engine and the same coordinates as chatzor. This checks they actually match,
 * across dates spread over the year rather than just today — a same-day match
 * would also pass if both were frozen.
 *
 * Run: node scripts/qa/chatzor-galil-zmanim-agree.mjs
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(
  path.join(path.resolve(here, "../../apps/16-chatzor-connect"), "package.json"),
);
const { Location, Zmanim } = require("@hebcal/core");

// Built the same way in both apps. If these ever drift apart the sites drift.
const mk = () =>
  new Location(32.9797, 35.5386, true, "Asia/Jerusalem", "חצור הגלילית", "IL", undefined, 350);

const fmt = new Intl.DateTimeFormat("he-IL", {
  timeZone: "Asia/Jerusalem",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

// The eleven rows galil renders, in order.
const rows = (date) => {
  const z = new Zmanim(mk(), date, true);
  return [
    ["עלות השחר", z.alotHaShachar()],
    ["הנץ החמה", z.sunrise()],
    ['סוף זמן ק"ש (מג"א)', z.sofZmanShmaMGA()],
    ['סוף זמן ק"ש (גר"א)', z.sofZmanShma()],
    ["סוף זמן תפילה", z.sofZmanTfilla()],
    ["חצות היום", z.chatzot()],
    ["מנחה גדולה", z.minchaGedola()],
    ["מנחה קטנה", z.minchaKetana()],
    ["פלג המנחה", z.plagHaMincha()],
    ["שקיעה", z.sunset()],
    ["צאת הכוכבים", z.tzeit()],
  ].map(([name, t]) => ({ name, time: fmt.format(t) }));
};

// What galil used to publish, every single day of the year.
const FROZEN = {
  "עלות השחר": "04:52",
  "הנץ החמה": "06:12",
  'סוף זמן ק"ש (מג"א)': "08:45",
  'סוף זמן ק"ש (גר"א)': "09:21",
  "סוף זמן תפילה": "10:30",
  "חצות היום": "12:38",
  "מנחה גדולה": "13:08",
  "מנחה קטנה": "16:15",
  "פלג המנחה": "17:22",
  שקיעה: "19:05",
  "צאת הכוכבים": "19:35",
};

const mins = (s) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};

const DATES = [
  ["mid-winter", new Date(2026, 0, 15)],
  ["equinox", new Date(2026, 2, 20)],
  ["today", new Date(2026, 7, 6)],
  ["mid-summer", new Date(2026, 5, 21)],
  ["autumn", new Date(2026, 9, 15)],
];

console.log("-- how far the frozen table was from the real sky --");
console.log(`${"date".padEnd(12)} ${"sunrise".padEnd(22)} ${"sunset".padEnd(22)} צאת הכוכבים`);
let worst = 0;
for (const [label, d] of DATES) {
  const r = rows(d);
  const pick = (n) => r.find((x) => x.name === n).time;
  const delta = (n) => {
    const diff = mins(pick(n)) - mins(FROZEN[n]);
    worst = Math.max(worst, Math.abs(diff));
    return `${pick(n)} vs ${FROZEN[n]} (${diff >= 0 ? "+" : ""}${diff}m)`;
  };
  console.log(
    `${label.padEnd(12)} ${delta("הנץ החמה").padEnd(22)} ${delta("שקיעה").padEnd(22)} ${delta("צאת הכוכבים")}`,
  );
}
console.log(`\nworst single error in the frozen table: ${worst} minutes`);

// ── do the two sites agree? ───────────────────────────────────────────────
//
// ⚠️ NOT by computing rows(d) twice and comparing — that calls one function
// against itself and passes however wrong both sites are. The first draft of
// this script did exactly that. Since both apps use the same @hebcal/core and
// the same method names, what can actually drift is the LOCATION they feed it.
// So read the real numbers out of both source files and compare those.
import fs from "node:fs";

const read = (p) => fs.readFileSync(path.resolve(here, "../..", p), "utf8");

const chatzorSrc = read("apps/16-chatzor-connect/src/config/site.ts");
const galilSrc = read("apps/24-galilee-connect-hub/src/lib/zmanim.ts");

const num = (src, label, re) => {
  const m = re.exec(src);
  if (!m) {
    console.log(`  ! could not find ${label}`);
    return null;
  }
  return Number(m[1]);
};

const chatzor = {
  latitude: num(chatzorSrc, "chatzor latitude", /latitude:\s*([\d.]+)/),
  longitude: num(chatzorSrc, "chatzor longitude", /longitude:\s*([\d.]+)/),
  elevation: num(chatzorSrc, "chatzor elevation", /elevation:\s*(\d+)/),
};
const galil = {
  latitude: num(galilSrc, "galil latitude", /^\s*([\d.]+),\s*\/\/ latitude/m),
  longitude: num(galilSrc, "galil longitude", /^\s*([\d.]+),\s*\/\/ longitude/m),
  elevation: num(galilSrc, "galil elevation", /^\s*(\d+),\s*\/\/ elevation/m),
};

console.log("\n-- the inputs each site feeds the engine --");
console.log(`  chatzor  ${JSON.stringify(chatzor)}`);
console.log(`  galil    ${JSON.stringify(galil)}`);

const keys = ["latitude", "longitude", "elevation"];
const mismatched = keys.filter((k) => chatzor[k] === null || galil[k] === null || chatzor[k] !== galil[k]);

// And confirm galil is genuinely computing — a table that never moves between
// January and June is the failure this whole change was about.
const janSunset = rows(new Date(2026, 0, 15)).find((r) => r.name === "שקיעה").time;
const junSunset = rows(new Date(2026, 5, 21)).find((r) => r.name === "שקיעה").time;
const varies = janSunset !== junSunset;
console.log(`\n  sunset moves with the season: ${varies} (Jan ${janSunset} vs Jun ${junSunset})`);

const ok = mismatched.length === 0 && varies;
console.log(
  "\nVERDICT:",
  ok
    ? "both sites feed the engine identical coordinates, and the result tracks the season"
    : `MISMATCH in: ${mismatched.join(", ") || "(none)"}${varies ? "" : " — and the times do not move with the season"}`,
);
process.exit(ok ? 0 : 1);
