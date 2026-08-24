// ==== נקודות-כתובת ברמת הבניין — התיקון האחרון למספר בית שלא אומת ====
//
// שני מסלולים, שניהם חינמיים, ושניהם רצים רק אחרי שכל שירותי האיתור
// (GovMap / Google / Nominatim) השאירו את מספר הבית לא-מאומת:
//
// 1) `registryAddressPoint` — מאגר "מספרי בתים ושמות הרחובות" ב-data.gov.il
//    (dataset `addresses-br7`, משאב CSV-ITM). פילטר **מדויק** בלבד
//    (cityCode+StreetCode+HouseNuber) — לא חיפוש חופשי — ולכן או הבניין
//    המבוקש או כלום. נמדד חי 24/08/2026:
//      · `StreetCode` במאגר == `official_code` במרשם הרחובות הארצי
//        (102 = "דרך חברון" בבאר שבע בשניהם) — לכן אפשר לסנן לפי הקוד
//        שמחזיר `resolveStreet`, בלי תלות בכתיב השם.
//      · ⚠️ שדות הקואורדינטות הפוכים מהשם שלהם: במשאב ה-ITM `lat` מחזיק
//        את ה-northing (Y) ו-`lon` את ה-easting (X). "דרך חברון 18 באר שבע"
//        → lon=180526 / lat=571927, שהם X/Y ITM תקינים של באר שבע.
//      · הכיסוי כיום עירוני (באר שבע, 29,387 נקודות; יישוב אחר → 0 שורות).
//        בגלל הפילטר המדויק, יישוב לא-מכוסה מחזיר null בשקט — ואם המאגר
//        יורחב, התיקון יתרחב מעצמו בלי שינוי קוד.
//
// 2) `interpolatedHousePoint` — כשהמספר המבוקש אינו רשום בשום מקור:
//    מאתרים שכנים **באותה זוגיות** (אותו צד רחוב בישראל: ±2, ±4) דרך
//    GovMap, מקבלים רק שכן שמאומת בכל שלוש הרמות (יישוב+רחוב+מספר —
//    אותה שרשרת אימות של lib/geocode.ts), ומחשבים את הנקודה ביניהם לפי
//    היחס המספרי. שני עוגנים → אינטרפולציה; עוגן צמוד יחיד (±2) → הנקודה
//    שלו כקירוב. עוגן לא-מאומת לעולם לא משמש — קירוב שלא ניתן לעגן
//    בבניינים אמיתיים מחזיר null, לא ניחוש.

import { datastoreSearch } from './datagov';
import { itmToWgs84, isPlausibleItm } from './itm';
import { geocodeGovmap, verifyStreetName, type GeocodeResult } from './geocode';

const ADDRESS_POINTS =
  process.env.DATAGOV_ADDRESS_POINTS || '4cff55d6-4bc7-4aec-bf75-73e8c08c4e98';

/** עוגנים רחוקים מזה כנראה אינם אותו קטע רחוב (רחוב מפוצל/מוספר מחדש). */
const MAX_ANCHOR_SPAN_METERS = 600;

export interface ExactAddressPoint {
  itmX: number;
  itmY: number;
  lat: number;
  lng: number;
  /** אות הבית במרשם ("א"), אם קיימת ברשומה שנבחרה. */
  letter: string | null;
}

/**
 * הבניין המדויק ממרשם נקודות-הכתובת, או null.
 * `streetCode` הוא ה-`official_code` שמחזיר `resolveStreet` — קוד, לא שם,
 * כדי שכתיב/כינוי לא יפילו התאמה. פילטר מדויק בלבד: אין דירוג ואין ניחוש.
 */
export async function registryAddressPoint(
  cityCode: number,
  streetCode: number,
  houseNum: number,
): Promise<ExactAddressPoint | null> {
  if (!Number.isFinite(cityCode) || !Number.isFinite(streetCode) || !Number.isFinite(houseNum)) {
    return null;
  }
  try {
    const res = await datastoreSearch(ADDRESS_POINTS, {
      filters: { cityCode, StreetCode: streetCode, HouseNuber: houseNum },
      limit: 10,
    });
    const rows = res.records
      .map((r: any) => ({
        // ⚠️ שמות השדות במאגר הפוכים: lat=Y (northing), lon=X (easting).
        x: Number(r?.lon),
        y: Number(r?.lat),
        letter: String(r?.letter ?? '').trim() || null,
      }))
      .filter((r) => isPlausibleItm(r.x, r.y));
    if (!rows.length) return null;
    // כשלמספר יש כמה כניסות ("18", "18א") — הרשומה ללא אות היא הבניין עצמו.
    const row = rows.find((r) => !r.letter) ?? rows[0];
    const wgs = itmToWgs84(row.x, row.y);
    return { itmX: row.x, itmY: row.y, lat: wgs.lat, lng: wgs.lng, letter: row.letter };
  } catch {
    return null; // מקור העשרה — כישלון שלו לעולם לא מפיל את הדוח.
  }
}

export interface HousePointEstimate {
  itmX: number;
  itmY: number;
  lat: number;
  lng: number;
  /** interpolated = בין שני עוגנים · adjacent = עוגן צמוד יחיד (±2). */
  kind: 'interpolated' | 'adjacent';
  /** הבניינים המאומתים שעליהם נשען הקירוב — לתצוגה שקופה למשתמש. */
  anchors: { label: string; houseNum: number }[];
}

interface Anchor {
  houseNum: number;
  result: GeocodeResult;
}

/**
 * קירוב נקודת הבניין כשהמספר המבוקש אינו רשום באף שירות איתור.
 *
 * העוגנים מחויבים באימות המלא של lib/geocode.ts (יישוב+רחוב+מספר, כולל
 * הכינויים מהמרשם ב-`knownStreetNames`) — כך הקירוב לעולם לא נשען על
 * אותה התאמה מטושטשת שהוא בא לתקן. הקורא אחראי להציג את הנקודה כקירוב
 * (houseVerified נשאר false אצלו) — הפונקציה משפרת מיקום, לא מייצרת ודאות.
 */
export async function interpolatedHousePoint(opts: {
  /** שם הרחוב כפי שהוקלד — נאמן למה שהמשתמש מכיר, בלי מלכודת השם-הרשמי. */
  street: string;
  /** שם רשמי שונה מהמוקלד, אם ידוע — ניסיון שני לכל שכן. */
  officialStreet?: string | null;
  city: string;
  houseNum: number;
  knownStreetNames?: (string | null | undefined)[];
}): Promise<HousePointEstimate | null> {
  const { street, city, houseNum } = opts;
  if (!street || !city || !Number.isFinite(houseNum)) return null;

  const streets = [street];
  if (opts.officialStreet && opts.officialStreet.trim() && opts.officialStreet.trim() !== street) {
    streets.push(opts.officialStreet.trim());
  }

  const verifiedNeighbor = async (n: number): Promise<Anchor | null> => {
    for (const st of streets) {
      const q = `${st} ${n} ${city}`;
      try {
        const candidates = await geocodeGovmap(q);
        const hit = candidates.find(
          (c) =>
            c.kind === 'address' &&
            c.cityVerified &&
            c.houseVerified === true &&
            (c.streetVerified !== false ||
              verifyStreetName(q, c.label, opts.knownStreetNames ?? []) !== false),
        );
        if (hit) return { houseNum: n, result: hit };
      } catch {
        /* שכן אחד שנכשל לא עוצר את השאר */
      }
    }
    return null;
  };

  // אותה זוגיות = אותו צד רחוב. ±2 קודם (הצמוד ביותר), ±4 כגיבוי.
  let lo: Anchor | null = null;
  for (const off of [2, 4]) {
    if (houseNum - off <= 0) break;
    lo = await verifiedNeighbor(houseNum - off);
    if (lo) break;
  }
  let hi: Anchor | null = null;
  for (const off of [2, 4]) {
    hi = await verifiedNeighbor(houseNum + off);
    if (hi) break;
  }

  if (lo && hi) {
    const dx = hi.result.itmX - lo.result.itmX;
    const dy = hi.result.itmY - lo.result.itmY;
    if (Math.hypot(dx, dy) <= MAX_ANCHOR_SPAN_METERS) {
      const t = (houseNum - lo.houseNum) / (hi.houseNum - lo.houseNum);
      const itmX = lo.result.itmX + dx * t;
      const itmY = lo.result.itmY + dy * t;
      const wgs = itmToWgs84(itmX, itmY);
      return {
        itmX,
        itmY,
        lat: wgs.lat,
        lng: wgs.lng,
        kind: 'interpolated',
        anchors: [
          { label: lo.result.label, houseNum: lo.houseNum },
          { label: hi.result.label, houseNum: hi.houseNum },
        ],
      };
    }
    // עוגנים רחוקים מדי זה מזה — ממשיכים למסלול העוגן-הצמוד למטה.
  }

  // עוגן צמוד יחיד (בדיוק ±2) — הבניין הסמוך המאומת, קירוב הוגן ושקוף.
  const adjacent =
    (lo && houseNum - lo.houseNum === 2 ? lo : null) ??
    (hi && hi.houseNum - houseNum === 2 ? hi : null);
  if (adjacent) {
    return {
      itmX: adjacent.result.itmX,
      itmY: adjacent.result.itmY,
      lat: adjacent.result.lat,
      lng: adjacent.result.lng,
      kind: 'adjacent',
      anchors: [{ label: adjacent.result.label, houseNum: adjacent.houseNum }],
    };
  }
  return null;
}
