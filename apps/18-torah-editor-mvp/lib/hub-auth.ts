import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

/**
 * אימות שרת-צד למודול HTR מול **ההאב** (אותו פרויקט שמזהה את המשתמש דרך
 * ה-pill המשותף, auth-button.js -- ראה lib/hub.ts). ה-API routes של HTR
 * (jobs/upload/process/approve) רצות תחת service_role שעוקף RLS לגמרי
 * (lib/supabase.ts), ועד כה לא בדקו בכלל מי קורא להן -- קריאה אנונימית
 * הייתה יכולה לקרוא/לתקן/**לאשר** כל job, כולל הטקסט ש"נכנס לספר"
 * (עקרון "הטקסט קדוש" שמתועד ב-migration 0001 וב-app/htr/page.tsx).
 * זו לא בדיקת בעלות (אין user_id על htr_jobs -- זהו כלי צוות משותף),
 * אלא סף-כניסה: חייבים להיות מחוברים דרך ה-pill הקיים כדי לגעת במודול.
 */

const clean = (v: string | undefined) => (v || '').replace(/^﻿+/, '').trim();

const HUB_URL = clean(process.env.NEXT_PUBLIC_HUB_SUPABASE_URL);
const HUB_ANON = clean(process.env.NEXT_PUBLIC_HUB_SUPABASE_ANON_KEY);

export interface HubUser {
  id: string;
  email: string | null;
}

/**
 * קורא את ה-Bearer token מכותרת Authorization ומאמת אותו מול ה-Auth server
 * של ההאב (auth.getUser(token) -- קריאת רשת שמאמתת את הטוקן עצמו, לא רק
 * מפענחת אותו מקומית). מחזיר null על כל כשל -- חסר טוקן, טוקן פג, האב לא
 * מוגדר בסביבה -- ואז ה-route מחזיר 401.
 */
export async function getHubUserFromRequest(req: NextRequest): Promise<HubUser | null> {
  if (!HUB_URL || !HUB_ANON) return null;

  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;

  const supabase = createClient(HUB_URL, HUB_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}
