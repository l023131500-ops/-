// ==== מי שולח את הבקשה — נשאל משרת האימות, לא מהדפדפן ====
//
// הכניסה המשותפת (`auth-button.js`) שומרת את הסשן ב-localStorage תחת המפתח
// `more30-auth` (ראה `lib/session.ts`), אבל טוקן שהדפדפן שולח הוא טענה, לא
// הוכחה: הוא נבדק כאן מול `/auth/v1/user` של אותו פרויקט Supabase שהאפליקציה
// כבר מדברת איתו, וכל תשובה שאינה 200 היא "לא מחובר" — כולל טוקן שפג תוקפו
// וטוקן של פרויקט אחר. אותו דפוס בדיוק כמו `require-user.ts` ב-apps/40-gannenet.

import { env } from './env';

export type Caller = { id: string; email: string | null };

export async function callerFromRequest(req: Request): Promise<Caller | null> {
  const token = /^Bearer\s+(.+)$/i.exec(req.headers.get('authorization') || '')?.[1]?.trim();
  const url = env('SUPABASE_URL');
  const key = env('SUPABASE_ANON_KEY');
  if (!token || !url || !key) return null;
  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const user = await res.json();
    return user && user.id ? { id: String(user.id), email: user.email ?? null } : null;
  } catch {
    return null;
  }
}
