import { HDate, HebrewCalendar, gematriya } from "@hebcal/core";

// Which shelf category a date on the Hebrew calendar sends the גננת to.
//
// The keys are hebcal `basename()` values — stable English names that do not
// change with the render locale, unlike `render("he")`, which is what the page
// shows. Every value must be a category that exists in CATEGORY_ORDER
// (lib/catalog.ts); a value that is not on the shelf would link to an empty
// filter, so the page drops any category with no material behind it.
//
// Dates hebcal knows that the shelf has no material for — the modern Israeli
// memorial and independence days, Rosh Chodesh of the other eleven months, the
// minor fasts outside בין המצרים — are deliberately absent. An unmapped date
// still appears in the month list on the page; it just does not claim there is
// a folder waiting for it.
const EVENT_CATEGORY: Record<string, string> = {
  // אלול ותשרי — the run-up is when a gan starts preparing, not ר"ה itself
  "Rosh Chodesh Elul": "ראש השנה / תשרי",
  "Leil Selichot": "ראש השנה / תשרי",
  "Rosh Hashana": "ראש השנה / תשרי",
  "Rosh Hashana LaBehemot": "ראש השנה / תשרי",
  "Tzom Gedaliah": "ראש השנה / תשרי",
  "Shabbat Shuva": "ראש השנה / תשרי",
  "Yom Kippur": "ראש השנה / תשרי",
  Sukkot: "ראש השנה / תשרי",
  "Shmini Atzeret": "ראש השנה / תשרי",
  "Simchat Torah": "ראש השנה / תשרי",

  Chanukah: "חנוכה",
  "Chag HaBanot": "חנוכה",

  "Tu BiShvat": 'ט"ו בשבט',

  "Purim Katan": "פורים",
  "Shabbat Shekalim": "פורים",
  "Shabbat Zachor": "פורים",
  "Ta'anit Esther": "פורים",
  Purim: "פורים",
  "Shushan Purim": "פורים",

  "Shabbat Parah": "פסח",
  "Shabbat HaChodesh": "פסח",
  "Shabbat HaGadol": "פסח",
  "Ta'anit Bechorot": "פסח",
  Pesach: "פסח",

  "Lag BaOmer": 'ספירת העומר / ל"ג בעומר',

  Shavuot: "שבועות",

  "Tzom Tammuz": "תשעה באב / בין המצרים",
  "Shabbat Chazon": "תשעה באב / בין המצרים",
  "Tish'a B'Av": "תשעה באב / בין המצרים",
  "Shabbat Nachamu": "תשעה באב / בין המצרים",
  "Tu B'Av": "תשעה באב / בין המצרים",
};

/** "בעוד 2 ימים" is not how the count is said in Hebrew. */
export function inDaysLabel(inDays: number): string {
  if (inDays <= 0) return "השבוע";
  if (inDays === 1) return "מחר";
  if (inDays === 2) return "בעוד יומיים";
  if (inDays <= 7) return `בעוד ${inDays} ימים`;
  if (inDays <= 10) return "בעוד שבוע וחצי";
  const weeks = Math.round(inDays / 7);
  return weeks === 2 ? "בעוד שבועיים" : `בעוד ${weeks} שבועות`;
}

export type WeekTopic = {
  category: string;
  /** The Hebrew name of the date that put this category on the list. */
  reason: string;
  /** Hebrew date of that event. */
  hebrewDate: string;
  /** Civil date, dd/mm/yyyy. */
  civilDate: string;
  /** Whole days from today; negative while the date is still running. */
  inDays: number;
};

function civil(d: Date): string {
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

/**
 * The dates between two days back and `daysAhead` forward that the shelf holds
 * material for, earliest first, one entry per category — a gan preparing for
 * חנוכה wants the חנוכה shelf once, not once per candle.
 *
 * Israel schedule (`il: true`): this is a kindergarten in Israel, so Pesach and
 * Shavuot run the Israeli number of days and Simchat Torah falls with Shmini
 * Atzeret.
 */
export function weekTopics(today: HDate, daysAhead = 45): WeekTopic[] {
  let events: any[];
  try {
    events = HebrewCalendar.calendar({
      start: new HDate(today.abs() - 2).greg(),
      end: new HDate(today.abs() + daysAhead).greg(),
      il: true,
      locale: "he",
    });
  } catch {
    return [];
  }

  const seen = new Set<string>();
  const out: WeekTopic[] = [];
  for (const e of events) {
    const category = EVENT_CATEGORY[e.basename()];
    if (!category || seen.has(category)) continue;
    seen.add(category);
    const hd: HDate = e.getDate();
    out.push({
      category,
      reason: e.render("he"),
      hebrewDate: hd.render("he"),
      civilDate: civil(hd.greg()),
      inDays: hd.abs() - today.abs(),
    });
  }
  return out;
}

export type MonthEvent = {
  /** The Hebrew name hebcal renders, e.g. "שַׁבַּת חֲזוֹן". */
  name: string;
  /** Day of the Hebrew month in gematriya — "כ״ח". The month is in the heading. */
  day: string;
  /** Civil date, dd/mm/yyyy. */
  civilDate: string;
  /** Whole days from today; negative once the date has passed. */
  inDays: number;
  /** The shelf category this date sends the גננת to, or null if none is mapped. */
  category: string | null;
};

/**
 * Every date hebcal has in `today`'s Hebrew month, in order, with the day it
 * falls on — a list of names alone cannot be planned against.
 *
 * Bounded by the Gregorian dates of day 1 and the last day of that Hebrew month
 * rather than pulled from the whole year and filtered, so nothing has to be
 * truncated to keep the list short: תשרי holds 16 dates and ניסן 14, and the two
 * months a gan plans hardest for are exactly the ones a cap would cut.
 */
export function monthEvents(today: HDate): MonthEvent[] {
  const month = today.getMonth();
  const year = today.getFullYear();
  const first = new HDate(1, month, year);
  let events: any[];
  try {
    events = HebrewCalendar.calendar({
      start: first.greg(),
      end: new HDate(first.daysInMonth(), month, year).greg(),
      il: true,
      locale: "he",
    });
  } catch {
    return [];
  }

  const out: MonthEvent[] = [];
  for (const e of events) {
    const hd: HDate = e.getDate();
    if (hd.getMonth() !== month) continue;
    out.push({
      name: e.render("he"),
      day: gematriya(hd.getDate()),
      civilDate: civil(hd.greg()),
      inDays: hd.abs() - today.abs(),
      category: EVENT_CATEGORY[e.basename()] || null,
    });
  }
  return out;
}
