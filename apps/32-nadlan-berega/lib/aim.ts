/**
 * גאומטריה טהורה: מרחק, אזימוט, והשאלה אם מותר בכלל לצלם את הנכס.
 *
 * ── למה זה קובץ נפרד
 * שלוש הפונקציות האלה ישבו בתוך `googlemaps.ts`, שמייבא רשת, סודות וסביבה.
 * המשמעות המעשית: **אי אפשר היה לבדוק אותן**. `aimQuality` היא ההגנה היחידה
 * שמונעת מהמערכת להציג צילום של בניין אחר, והמפרט קורא לזה קריטי — ולוגיקת
 * בטיחות שאי אפשר להריץ בבדיקה היא לוגיקה שאיש לא אימת.
 *
 * כאן אין import לשום דבר. אפשר להריץ את הקובץ הזה ישירות, ולכן אפשר לאמת
 * שהמצלמה באמת מופנית אל הבניין ולא ממנו — ראה `scripts/qa/streetview-aim.mjs`.
 *
 * ‎`googlemaps.ts`‎ ו-`datagov.ts` מייצאים מכאן מחדש, ולכן אף קריאה קיימת
 * במערכת לא השתנתה.
 */

/** מרחק הברסין בק"מ. הגדרה אחת בלבד במערכת — `datagov` מייצא אותה מכאן. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * אזימוט התחלתי במעלות מצפון, **מ**נקודה אחת **אל** השנייה.
 *
 * ⚠️ סדר הארגומנטים הוא כל ההבדל בין צילום נכון לצילום של המדרכה ממול.
 * החלפה בין הזוגות מתקמפלת, עוברת בדיקת טיפוסים, רצה, ומחזירה 180° הפוך —
 * כלומר בדיוק הבאג שדווח. לכן הכיוון נבדק במפורש ב-QA ולא מונח.
 */
export function bearingDeg(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const rad = Math.PI / 180;
  const φ1 = fromLat * rad;
  const φ2 = toLat * rad;
  const Δλ = (toLng - fromLng) * rad;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) / rad + 360) % 360;
}

/** מה שצריך לדעת על הפנורמה כדי להחליט אם אפשר לכוון ממנה. */
export interface PanoMeta {
  available: boolean;
  lat: number | null;
  lng: number | null;
  date: string | null;
}

export interface AimQuality {
  /** מותר לצלם: אפשר לכוון את המצלמה אל הבניין הזה ולא אל משהו אחר. */
  ok: boolean;
  /** למה לא — בעברית מדוברת, להצגה ללקוח במקום התמונה. */
  reason?: string;
  heading: number | null;
  panoMeters: number | null;
}

/**
 * §3 · האם אפשר להראות את **הבניין הנכון**, או שעדיף לא להראות כלום.
 *
 * המפרט קובע כלל חד: "אם Street View לא יכול להראות את הבניין/הכניסה
 * המדויקים — אל תציג צילום שגוי. כתוב 'צילום מדויק לא זמין'. עדיף כך מאשר
 * פדיחה." שלושה מצבים שבהם התמונה אינה בת-אמון, וכולם החזירו עד עכשיו תמונה:
 *
 * 1. **אין מיקום לפנורמה.** בלי לדעת איפה עמדה המצלמה אי אפשר לחשב אזימוט,
 *    וגוגל מצלם לכיוון ברירת המחדל שלה — כלומר לאן שיצא. זה בדיוק הבאג
 *    שהמפרט מציין בשם ("דורש טוב 17 הראה את הצד השני").
 * 2. **הפנורמה יושבת כמעט על הנכס** (פחות מ-4 מ'). האזימוט אז נקבע מרעש של
 *    מטרים בודדים, ויכול להצביע לכל כיוון. תמונה רחבה במקרה כזה היא ניחוש.
 * 3. **הפנורמה רחוקה מדי** (מעל 80 מ'). גם בכיוון נכון, הבניין המבוקש הוא
 *    נקודה בין בניינים אחרים, ואי אפשר לזהות אותו או את הכניסה שלו.
 */
export function aimQuality(meta: PanoMeta, lat: number, lng: number): AimQuality {
  if (!meta.available) {
    return {
      ok: false,
      reason: 'אין צילום רחוב זמין לנקודה הזו.',
      heading: null,
      panoMeters: null,
    };
  }
  if (meta.lat == null || meta.lng == null) {
    return {
      ok: false,
      reason:
        'שירות צילומי הרחוב לא מסר את המיקום שממנו צולמה הפנורמה, ולכן אי אפשר לכוון את ' +
        'המצלמה אל הבניין. לא הצגנו צילום, כדי שלא יוצג בניין אחר.',
      heading: null,
      panoMeters: null,
    };
  }

  const panoMeters = Math.round(haversineKm(meta.lat, meta.lng, lat, lng) * 1000);
  if (panoMeters < 4) {
    return {
      ok: false,
      reason:
        `נקודת הצילום הקרובה ביותר יושבת כמעט בדיוק על הנכס (${panoMeters} מ׳), ולכן אין כיוון ` +
        'מובהק שאפשר לכוון אליו את המצלמה. לא הצגנו צילום, כדי שלא יוצג הצד הלא נכון.',
      heading: null,
      panoMeters,
    };
  }
  if (panoMeters > 80) {
    return {
      ok: false,
      reason:
        `נקודת הצילום הקרובה ביותר רחוקה ${panoMeters} מ׳ מהנכס. במרחק כזה הבניין אינו ניתן ` +
        'לזיהוי ודאי בתמונה, ולכן לא הצגנו צילום.',
      heading: null,
      panoMeters,
    };
  }

  // מהפנורמה **אל** הבניין. ראה האזהרה על סדר הארגומנטים ב-`bearingDeg`.
  return { ok: true, heading: bearingDeg(meta.lat, meta.lng, lat, lng), panoMeters };
}
