import { HDate, Location, Sedra, Zmanim } from "@hebcal/core";
import { SITE } from "@/config/site";

/**
 * Halachic times for Chatzor Hagelilit — computed astronomically from date +
 * coordinates (never scraped from a third party). This is the "auto-updating,
 * no-legal-risk" data source the platform relies on.
 */
const { latitude, longitude, elevation, timeZone, label } = SITE.location;

const LOCATION = new Location(
  latitude,
  longitude,
  true, // Israel
  timeZone,
  label,
  "IL",
  undefined,
  elevation,
);

const timeFormatter = new Intl.DateTimeFormat("he-IL", {
  timeZone,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat("he-IL", {
  timeZone,
  weekday: "long",
  day: "numeric",
  month: "long",
});

export interface Zman {
  key: string;
  label: string;
  time: Date;
}

export interface DailyZmanim {
  date: Date;
  gregorian: string;
  hebrewDate: string;
  parsha: string | null;
  sunrise: Date;
  sunset: Date;
  zmanim: Zman[];
}

/** Format a zman as HH:MM in the local (Jerusalem) timezone. */
export function formatZman(time: Date): string {
  return timeFormatter.format(time);
}

/** Compute the full set of daily zmanim for the given date (defaults to now). */
export function computeDailyZmanim(date: Date = new Date()): DailyZmanim {
  const z = new Zmanim(LOCATION, date, true);

  const zmanim: Zman[] = [
    { key: "alotHaShachar", label: "עלות השחר", time: z.alotHaShachar() },
    { key: "misheyakir", label: "זמן טלית ותפילין", time: z.misheyakir() },
    { key: "sunrise", label: "הנץ החמה", time: z.sunrise() },
    { key: "sofZmanShma", label: 'סוף זמן ק"ש (גר"א)', time: z.sofZmanShma() },
    { key: "sofZmanTfilla", label: "סוף זמן תפילה", time: z.sofZmanTfilla() },
    { key: "chatzot", label: "חצות היום", time: z.chatzot() },
    { key: "minchaGedola", label: "מנחה גדולה", time: z.minchaGedola() },
    { key: "minchaKetana", label: "מנחה קטנה", time: z.minchaKetana() },
    { key: "plagHaMincha", label: "פלג המנחה", time: z.plagHaMincha() },
    { key: "sunset", label: "שקיעה", time: z.sunset() },
    { key: "tzeit", label: "צאת הכוכבים", time: z.tzeit() },
  ];

  const hd = new HDate(date);
  let parsha: string | null = null;
  try {
    const sedra = new Sedra(hd.getFullYear(), true);
    parsha = sedra.getString(hd, "he");
  } catch {
    parsha = null;
  }

  return {
    date,
    gregorian: dateFormatter.format(date),
    hebrewDate: hd.renderGematriya(true),
    parsha,
    sunrise: z.sunrise(),
    sunset: z.sunset(),
    zmanim,
  };
}

/** The next upcoming zman relative to `now`, for the "coming up" highlight. */
export function nextZman(daily: DailyZmanim, now: Date = new Date()): Zman | null {
  return daily.zmanim.find((z) => z.time.getTime() > now.getTime()) ?? null;
}

export interface ShabbatTimes {
  candleLighting: Date;
  havdala: Date;
}

/** Candle-lighting (40 min before sunset) and havdala (tzeit) for a given Friday/Shabbat date. */
export function computeShabbatTimes(date: Date): ShabbatTimes {
  const z = new Zmanim(LOCATION, date, true);
  return {
    candleLighting: z.sunsetOffset(-SITE.location.candleLightingMinutes, true),
    havdala: z.tzeit(),
  };
}
