/**
 * מי שולח את הבקשה — נשאל משרת האימות, לא מהדפדפן.
 *
 * למדף הגננת יש נתיב כתיבה אחד (`POST /api/catalog`), והוא היה פתוח לכל קורא
 * באינטרנט: כל מי שידע את הכתובת יכול היה לשתול קובץ במדף של מערכת חיה,
 * בלי חשבון, בלי שם ובלי שום עקבה. הכתיבה עצמה נעשית במפתח האנונימי של השרת,
 * ולכן ההרשאה של Storage לא עצרה כלום — היא ראתה את השרת, לא את השולח.
 *
 * הכניסה המשותפת (`auth-button.js`) שומרת את הסשן ב-localStorage תחת המפתח
 * `more30-auth`, וכל המערכות מוגשות תחת more30.com — origin אחד — ולכן הדפדפן
 * כאן קורא את אותו סשן בלי supabase-js ובלי כניסה נפרדת. אבל טוקן שהדפדפן
 * שולח הוא טענה, לא הוכחה: הוא נבדק מול `/auth/v1/user` של אותו פרויקט
 * שהאפליקציה כבר מדברת איתו (SUPABASE_URL), וכל תשובה שאינה 200 היא "לא מחובר".
 * זה גם מכסה טוקן שפג תוקפו ואת המקרה שבו נשלח טוקן של פרויקט אחר.
 */

const URL_ = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const KEY_ = process.env.SUPABASE_ANON_KEY || "";

export type Caller = { id: string; email: string | null };

export const AUTH_REQUIRED_MSG =
  "כדי להוסיף חומר למדף יש להתחבר לחשבון more30. הצפייה וההורדה נשארות פתוחות לכולם.";

export async function callerFromRequest(req: Request): Promise<Caller | null> {
  const token = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") || "")?.[1]?.trim();
  if (!token || !URL_ || !KEY_) return null;
  try {
    const res = await fetch(`${URL_}/auth/v1/user`, {
      headers: { apikey: KEY_, Authorization: `Bearer ${token}` },
      // אותה סיבה כמו בכל שאר הנתיבים כאן: Next שומר `fetch` בנתיב שרת כברירת
      // מחדל, ותשובת זהות שנשמרת במטמון היא בדיוק מה שלא צריך להישמר.
      cache: "no-store",
    });
    if (!res.ok) return null;
    const user = await res.json();
    return user && user.id ? { id: String(user.id), email: user.email ?? null } : null;
  } catch {
    return null;
  }
}
