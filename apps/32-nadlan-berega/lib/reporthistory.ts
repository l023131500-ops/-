// ==== build_tasks id=6 חלק (c) · היסטוריה אישית מאחורי הכניסה הקיימת ====
//
// /report ו-/p/[slug] נשארים ציבוריים לגמרי בלי שינוי — ראו הסבר מלא ב-
// apps/32-nadlan-berega/CLAUDE.md (session 9) ובמיגרציה 0158. הקובץ הזה הוא
// היכולת ה**נוספת** מאחורי הכניסה: כשמשתמש מחובר צופה בדוח, הצפייה נרשמת
// לזהות שלו; מסך "ההיסטוריה שלי" (`app/history/page.tsx`) קורא ממנה בחזרה.
// כתיבה/קריאה best-effort בדיוק כמו כל שאר `lib/store.ts`/`lib/savedreports.ts`
// — כישלון אחסון לעולם אינו שובר את מסך הדוח שכבר הופק.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

type NadlanClient = SupabaseClient<any, 'nadlan', any>;

let admin: NadlanClient | null = null;
function store(): NadlanClient | null {
  if (admin) return admin;
  const url = env('SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_KEY') || env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  admin = createClient(url, key, { db: { schema: 'nadlan' }, auth: { persistSession: false } });
  return admin;
}

/** רושם צפייה של משתמש מחובר בדוח שמור. best-effort, שקט על כשלון. */
export async function recordView(userId: string, slug: string): Promise<void> {
  const db = store();
  if (!db) return;
  try {
    await db
      .from('report_history')
      .upsert({ user_id: userId, slug, viewed_at: new Date().toISOString() }, { onConflict: 'user_id,slug' });
  } catch {
    /* best-effort */
  }
}

export interface HistoryEntry {
  slug: string;
  viewedAt: string;
  headline: string | null;
  city: string | null;
  street: string | null;
  houseNum: string | null;
  gush: string | null;
  helka: string | null;
}

/** ההיסטוריה של משתמש מחובר, החדש ביותר קודם — למסך "ההיסטוריה שלי". */
export async function listHistory(userId: string, limit = 50): Promise<HistoryEntry[]> {
  const db = store();
  if (!db) return [];
  const { data } = await db
    .from('report_history')
    .select('slug,viewed_at,saved_reports(headline,city,street,house_num,gush,helka)')
    .eq('user_id', userId)
    .order('viewed_at', { ascending: false })
    .limit(limit);
  return (data ?? []).map((r: any) => ({
    slug: String(r.slug),
    viewedAt: String(r.viewed_at),
    headline: r.saved_reports?.headline ?? null,
    city: r.saved_reports?.city ?? null,
    street: r.saved_reports?.street ?? null,
    houseNum: r.saved_reports?.house_num ?? null,
    gush: r.saved_reports?.gush ?? null,
    helka: r.saved_reports?.helka ?? null,
  }));
}
