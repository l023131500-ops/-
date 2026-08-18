import { createClient } from '@supabase/supabase-js';

/**
 * הלקוח של **ההאב** — שם יושבת הזהות המאוחדת של הפלטפורמה, ושם נשמרים
 * המסמכים של המשתמש.
 *
 * ⚠️ זה לקוח נפרד מ-`lib/supabase/client.ts` בכוונה. האפליקציה עצמה יושבת על
 * `bieebmnm`, שהוא המסד של igud-ads עם הסליקה החיה; התקנת סכימה שם היא הכרעה
 * פתוחה של המשתמש. הזהות המאוחדת של more30 כבר יושבת בהאב, ולכן משתמש שנכנס
 * דרך `more30.com/login` מזוהה מול ההאב — ורק לקוח של ההאב יראה את הסשן שלו.
 * שימוש בלקוח של bieebmnm כאן היה מחזיר "לא מחובר" למשתמש שכן מחובר.
 *
 * ⚠️ `storageKey: 'more30-auth'` הוא חובה, לא קוסמטיקה: כל 30+ המערכות
 * מוגשות מ-more30.com — אותו origin — וה-pill המשותף (auth-button.js) כותב
 * את הסשן ל-localStorage תחת המפתח הקבוע הזה. ברירת המחדל של supabase-js
 * (מפתח שנגזר ממזהה הפרויקט) הייתה יוצרת סשן נפרד לאפליקציה הזו, כך
 * שמשתמש מחובר לפי ה-pill עדיין רואה "צריך להתחבר" כאן. אותה סיבה בדיוק
 * שבגללה chatzor/lib/supabase.ts מגדיר את אותו storageKey.
 */

const clean = (v: string | undefined) => (v || '').replace(/^﻿+/, '').trim();

export const HUB_URL = clean(process.env.NEXT_PUBLIC_HUB_SUPABASE_URL);
export const HUB_ANON = clean(process.env.NEXT_PUBLIC_HUB_SUPABASE_ANON_KEY);

export function hubConfigured(): boolean {
  return !!HUB_URL && !!HUB_ANON;
}

let _client: ReturnType<typeof createClient<any>> | null = null;

export function getHubClient() {
  if (!hubConfigured()) {
    throw new Error('חסרים NEXT_PUBLIC_HUB_SUPABASE_URL / NEXT_PUBLIC_HUB_SUPABASE_ANON_KEY');
  }
  if (!_client) {
    _client = createClient<any>(HUB_URL, HUB_ANON, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'more30-auth',
      },
    });
  }
  return _client;
}

export type DocStatus = 'draft' | 'editing' | 'done';

export const DOC_STATUS_LABEL: Record<DocStatus, string> = {
  draft: 'טיוטה',
  editing: 'בעריכה',
  done: 'הושלם',
};

export interface OrechDocument {
  id: string;
  title: string;
  body: string;
  status: DocStatus;
  source_name: string | null;
  source_kind: string | null;
  word_count: number;
  created_at: string;
  updated_at: string;
}

/** ספירת מילים לעברית — רצפים של תווים שאינם רווח. */
export function countWords(s: string): number {
  const t = (s || '').trim();
  return t ? t.split(/\s+/).length : 0;
}

/** כותרת סבירה מתוך הטקסט, כשהמשתמש לא נתן אחת. */
export function titleFrom(text: string, fallback = 'ללא שם'): string {
  const first = (text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 1);
  if (!first) return fallback;
  return first.length > 70 ? first.slice(0, 70).trim() + '…' : first;
}
