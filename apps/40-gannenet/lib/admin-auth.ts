import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * שער הניהול המשותף לארבעת נתיבי /api/admin/* (list, delete, override, usage).
 * עד כה כל נתיב הגדיר `authorized()` משלו, ארבעה עותקים זהים בכל קובץ, וכולם
 * השוו את הכותרת לסיסמה עם `===` — השוואת מחרוזות רגילה יוצאת מוקדם בתו הראשון
 * שלא תואם, כך שזמן התגובה דולף כמה תווים מההתחלה נחשו נכון. `ADMIN_PASSWORD`
 * הוא 24 תווים אקראיים (LOGINS.md), ולכן פענוח ערוץ-הזמן הזה דורש דיוק וכמות
 * בקשות לא מציאותיים בפועל — זו הקשחה, לא סגירת פרצה מנוצלת. `timingSafeEqual`
 * דורש באפרים באורך שווה, ולכן אי-התאמת אורך (המקרה השכיח) נבדקת בנפרד ולפני
 * הקריאה אליו, באותו אורך זמן קבוע כמו אי-התאמת תוכן.
 */
export function isAuthorizedAdmin(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-key") || "";
  const pass = process.env.ADMIN_PASSWORD || "";
  if (!pass) return false;
  const keyBuf = Buffer.from(key);
  const passBuf = Buffer.from(pass);
  if (keyBuf.length !== passBuf.length) return false;
  return timingSafeEqual(keyBuf, passBuf);
}
