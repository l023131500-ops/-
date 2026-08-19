// ==== קריאת משתני סביבה בצורה שלא נשברת בשקט ====
//
// ⚠️ למה זה קיים. שני כשלים אמיתיים שקרו בפרויקט הזה:
// 1. ערך שנכתב ל-Vercel דרך pipe של PowerShell קיבל BOM (U+FEFF) בתחילתו.
//    supabase-js נפל על `ByteString ... 65279` בבניית הכותרת, ו-`vercel env ls`
//    מציג "Encrypted" — כלומר הבית המושחת בלתי נראה מבחוץ.
// 2. מזהה מאגר עם רווח או שורה חדשה בסופו החזיר 404 מ-CKAN. הקוד תפס את
//    השגיאה והחזיר רשימה ריקה, ולכן הדוח כתב "אין מקוואות ביישוב" — שהיא
//    אמירה עובדתית שגויה שנוצרה מתקלת הגדרה, לא ממקור.
//
// לכן: כל קריאה עוברת ניקוי, ומזהה מאגר שאינו בפורמט תקין נדחה לטובת ברירת
// המחדל במקום להישלח כמו שהוא ולהיכשל.

/** ערך נקי מ-BOM, מרווחים ומגרשיים עוטפים. מחזיר undefined כשהוא ריק. */
export function env(name: string): string | undefined {
  const raw = process.env[name];
  if (raw == null) return undefined;
  const v = raw
    .replace(/^﻿/, '')
    .trim()
    .replace(/^["'](.*)["']$/s, '$1')
    .trim();
  return v || undefined;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * מזהה מאגר CKAN. ערך שאינו UUID תקין נדחה — עדיף להשתמש בברירת המחדל
 * המוכרת מלהיכשל בשקט ולהציג "לא נמצא" על תקלת הגדרה.
 */
export function envResourceId(name: string, fallback: string): string {
  const v = env(name);
  return v && UUID.test(v) ? v : fallback;
}

/** האם המשתנה הוגדר בפועל (אחרי ניקוי). */
export function envSet(name: string): boolean {
  return env(name) !== undefined;
}
