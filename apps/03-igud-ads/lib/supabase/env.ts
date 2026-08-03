/**
 * קריאת משתני הסביבה של Supabase, נקייה מ-BOM.
 *
 * ⚠️ מלכודת שחוזרת בכל מערכת שהוזן לה env דרך pipe של PowerShell: הערך מקבל
 * U+FEFF בתחילתו. supabase-js משרשר את המפתח לכותרת HTTP, ו-ByteString לא
 * מקבל תו מעל 255 — כך שכל קריאה נופלת עם
 * "character at index 0 has a value of 65279", ו-`vercel env ls` מציג
 * "Encrypted" ולכן הבית המושחת בלתי נראה לגמרי מבחוץ.
 *
 * זה קרה כאן בפועל: `/modaot/api/templates` החזיר 500 עם בדיוק ההודעה הזו.
 * הניקוי בקוד הוא הבלם — הוא לא תלוי באיך שהערך הוזן.
 */
function clean(v: string | undefined): string {
  return (v ?? "").replace(/^﻿/, "").replace(/﻿/g, "").trim();
}

export const SUPABASE_URL = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_ANON_KEY = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const SUPABASE_SERVICE_ROLE_KEY = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
