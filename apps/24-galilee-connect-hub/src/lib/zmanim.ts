import { Location, Zmanim } from "@hebcal/core";

/**
 * Halachic times for Chatzor Hagelilit, computed astronomically from date +
 * coordinates.
 *
 * ⚠️ This replaces a hardcoded table in data/synagogues.ts — eleven fixed
 * strings, commented "(approximate)", rendered under the heading "זמני היום"
 * with a live "next zman" highlight computed against the real clock. Being
 * fixed, it was wrong on all but a handful of days a year: measured against
 * the real position of the sun here on 6 Aug 2026 it had sunrise 20 minutes
 * late, sunset 29 minutes early and צאת הכוכבים 36 minutes early. A frozen
 * צאת הכוכבים is the dangerous kind of wrong — it ends the day early.
 *
 * The numbers below are deliberately identical to
 * apps/16-chatzor-connect/src/config/site.ts. Both sites serve the same town,
 * and two sites for one town publishing different Shabbat times would be worse
 * than either being slightly off. If one changes, change both.
 *
 * ⚠️ Two of those inputs are still unverified assumptions inherited from
 * chatzor — the 350 m elevation (switched ON, worth ~3 minutes on sunset) and
 * the 40-minute candle lighting. They are halachic decisions for the מועצה
 * דתית, filed as NEEDS_USER §0ז. Do not silently change them here; changing
 * them here alone would put the two sites into disagreement.
 */
const LOCATION = new Location(
  32.9797, // latitude  — Chatzor Hagelilit
  35.5386, // longitude
  true, // Israel
  "Asia/Jerusalem",
  "חצור הגלילית",
  "IL",
  undefined,
  350, // elevation, metres — see NEEDS_USER §0ז
);

const timeFormatter = new Intl.DateTimeFormat("he-IL", {
  timeZone: "Asia/Jerusalem",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export interface DailyZman {
  name: string;
  time: string;
}

/**
 * The day's zmanim as HH:MM strings.
 *
 * The names and their order match what the page showed before, so the icon
 * map in ZmanimSidebar and the ticker layout keep working unchanged — only
 * the numbers stopped being invented.
 */
export function getDailyZmanim(date: Date = new Date()): DailyZman[] {
  const z = new Zmanim(LOCATION, date, true);
  return [
    { name: "עלות השחר", time: timeFormatter.format(z.alotHaShachar()) },
    { name: "הנץ החמה", time: timeFormatter.format(z.sunrise()) },
    { name: 'סוף זמן ק"ש (מג"א)', time: timeFormatter.format(z.sofZmanShmaMGA()) },
    { name: 'סוף זמן ק"ש (גר"א)', time: timeFormatter.format(z.sofZmanShma()) },
    { name: "סוף זמן תפילה", time: timeFormatter.format(z.sofZmanTfilla()) },
    { name: "חצות היום", time: timeFormatter.format(z.chatzot()) },
    { name: "מנחה גדולה", time: timeFormatter.format(z.minchaGedola()) },
    { name: "מנחה קטנה", time: timeFormatter.format(z.minchaKetana()) },
    { name: "פלג המנחה", time: timeFormatter.format(z.plagHaMincha()) },
    { name: "שקיעה", time: timeFormatter.format(z.sunset()) },
    { name: "צאת הכוכבים", time: timeFormatter.format(z.tzeit()) },
  ];
}
