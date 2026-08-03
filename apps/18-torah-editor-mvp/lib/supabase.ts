import { createClient } from '@supabase/supabase-js';

// ============================================================
// Supabase client למודול HTR.
// שני מצבים:
//  - server (service_role) — לשימוש ב-API routes בלבד. עוקף RLS.
//  - anon — לא בשימוש כרגע (הפרונט ניגש רק דרך ה-API).
// המפתחות מגיעים ממשתני סביבה (ראה .env.example).
// ============================================================

/**
 * ערך שנכתב ל-`vercel env add` דרך pipeline של PowerShell מקבל BOM (U+FEFF)
 * בתחילתו. supabase-js בונה ממנו כותרת HTTP ונופל עם
 *   "Cannot convert argument to a ByteString ... value of 65279"
 * — שגיאה שלא מרמזת על הסיבה, ו-`vercel env pull` מחזיר "[SECRET]" ולכן הערק
 * המושחת בלתי נראה. `/api/htr/jobs` החזיר 500 בדיוק מהסיבה הזו.
 * הניקוי כאן הוא הגנה קבועה: גם אם ערך יוזן שוב עם BOM, הוא לא יפיל את המסלול.
 */
const clean = (v: string | undefined) => (v || '').replace(/^﻿+/, '').trim();

const SUPABASE_URL = clean(process.env.NEXT_PUBLIC_SUPABASE_URL) || clean(process.env.SUPABASE_URL);
const SERVICE_ROLE_KEY = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);

export const HTR_SCHEMA = 'otvedaf';
export const HTR_BUCKET = 'htr-uploads';

let _admin: ReturnType<typeof createClient<any, typeof HTR_SCHEMA>> | null = null;

/**
 * client עם service_role — עוקף RLS. אך ורק בצד השרת.
 * זורק שגיאה ברורה אם המפתח חסר כדי למנוע כשל שקט.
 */
export function getAdminClient() {
  if (!SUPABASE_URL) {
    throw new Error('חסר NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL בסביבה');
  }
  if (!SERVICE_ROLE_KEY) {
    throw new Error('חסר SUPABASE_SERVICE_ROLE_KEY בסביבה — נדרש לגישת backend ל-otvedaf.htr_jobs');
  }
  if (!_admin) {
    _admin = createClient<any, typeof HTR_SCHEMA>(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: HTR_SCHEMA }
    });
  }
  return _admin;
}
