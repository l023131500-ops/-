import { HDate, Location, Zmanim } from "@hebcal/core";

interface CityCoords {
  lat: number;
  lng: number;
}

// Approximate coordinates for major Israeli cities/communities, used to
// compute halachic day-times (architecture.md §3.2 "zmanim" — "לפי אזור").
// @hebcal/core's built-in Location.lookup() only resolves English city
// names, so tenant.city (stored in Hebrew) is matched against this table
// instead. Unrecognized/empty cities fall back to Jerusalem.
const ISRAELI_CITIES: Record<string, CityCoords> = {
  "ירושלים": { lat: 31.7683, lng: 35.2137 },
  "תל אביב": { lat: 32.0853, lng: 34.7818 },
  "תל אביב יפו": { lat: 32.0853, lng: 34.7818 },
  "תל אביב-יפו": { lat: 32.0853, lng: 34.7818 },
  "חיפה": { lat: 32.794, lng: 34.9896 },
  "באר שבע": { lat: 31.253, lng: 34.7915 },
  "אשדוד": { lat: 31.8014, lng: 34.6435 },
  "אשקלון": { lat: 31.6693, lng: 34.5715 },
  "נתניה": { lat: 32.3215, lng: 34.8532 },
  "בני ברק": { lat: 32.0807, lng: 34.8338 },
  "פתח תקווה": { lat: 32.0917, lng: 34.8872 },
  "פתח תקוה": { lat: 32.0917, lng: 34.8872 },
  "ראשון לציון": { lat: 31.973, lng: 34.7925 },
  "חולון": { lat: 32.0158, lng: 34.7874 },
  "רמת גן": { lat: 32.0684, lng: 34.8248 },
  "בית שמש": { lat: 31.7457, lng: 34.9891 },
  "מודיעין": { lat: 31.8928, lng: 35.0095 },
  "מודיעין עילית": { lat: 31.9367, lng: 35.0472 },
  "ביתר עילית": { lat: 31.6969, lng: 35.1122 },
  "אילת": { lat: 29.5577, lng: 34.9519 },
  "טבריה": { lat: 32.7922, lng: 35.5312 },
  "צפת": { lat: 32.9646, lng: 35.496 },
  "הרצליה": { lat: 32.1663, lng: 34.8434 },
  "רעננה": { lat: 32.1848, lng: 34.8713 },
  "כפר סבא": { lat: 32.1858, lng: 34.9077 },
  "רחובות": { lat: 31.8928, lng: 34.8113 },
  "לוד": { lat: 31.9516, lng: 34.8942 },
  "רמלה": { lat: 31.9285, lng: 34.8656 },
  "עפולה": { lat: 32.6078, lng: 35.2897 },
  "נצרת": { lat: 32.7018, lng: 35.2973 },
  "קריית שמונה": { lat: 33.2075, lng: 35.5697 },
  "דימונה": { lat: 31.0687, lng: 35.0327 },
  "כרמיאל": { lat: 32.9171, lng: 35.2966 },
  "עכו": { lat: 32.9281, lng: 35.0818 },
  "נהריה": { lat: 33.0084, lng: 35.093 },
  "קריית גת": { lat: 31.61, lng: 34.7642 },
  "אלעד": { lat: 32.05, lng: 34.95 },
};

const DEFAULT_CITY_LABEL = "ירושלים";
const TZID = "Asia/Jerusalem";

function resolveLocation(city?: string | null): { location: Location; isApproximate: boolean; label: string } {
  const trimmed = (city ?? "").trim();
  const coords = trimmed ? ISRAELI_CITIES[trimmed] : undefined;
  if (coords) {
    return { location: new Location(coords.lat, coords.lng, true, TZID, trimmed, "IL"), isApproximate: false, label: trimmed };
  }
  const fallback = ISRAELI_CITIES[DEFAULT_CITY_LABEL];
  return {
    location: new Location(fallback.lat, fallback.lng, true, TZID, DEFAULT_CITY_LABEL, "IL"),
    isApproximate: true,
    label: DEFAULT_CITY_LABEL,
  };
}

export function formatIsraelTime(d: Date): string {
  return new Intl.DateTimeFormat("he-IL", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZID }).format(d);
}

function nextOrTodayFriday(from: Date): Date {
  const d = new Date(from);
  const day = d.getDay(); // 0=Sun ... 5=Fri, 6=Sat
  const diff = (5 - day + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

export interface DailyZmanim {
  alotHaShachar: Date;
  sunrise: Date;
  sofZmanShma: Date;
  minchaGedola: Date;
  plagHaMincha: Date;
  sunset: Date;
  tzeitHakochavim: Date;
}

export interface ZmanimSnapshot {
  cityLabel: string;
  isApproximate: boolean;
  today: DailyZmanim;
  shabbat: { fridayDate: Date; candleLighting: Date; saturdayDate: Date; havdalah: Date };
}

export function getZmanimSnapshot(city?: string | null, now: Date = new Date()): ZmanimSnapshot {
  const { location, isApproximate, label } = resolveLocation(city);

  const todayZ = new Zmanim(location, new HDate(now), false);
  const today: DailyZmanim = {
    alotHaShachar: todayZ.alotHaShachar(),
    sunrise: todayZ.sunrise(),
    sofZmanShma: todayZ.sofZmanShma(),
    minchaGedola: todayZ.minchaGedola(),
    plagHaMincha: todayZ.plagHaMincha(),
    sunset: todayZ.sunset(),
    tzeitHakochavim: todayZ.tzeit(),
  };

  const fridayDate = nextOrTodayFriday(now);
  const saturdayDate = new Date(fridayDate);
  saturdayDate.setDate(saturdayDate.getDate() + 1);
  const fridayZ = new Zmanim(location, new HDate(fridayDate), false);
  const saturdayZ = new Zmanim(location, new HDate(saturdayDate), false);

  return {
    cityLabel: label,
    isApproximate,
    today,
    shabbat: {
      fridayDate,
      candleLighting: fridayZ.sunsetOffset(-18, true),
      saturdayDate,
      havdalah: saturdayZ.tzeit(8.5),
    },
  };
}
