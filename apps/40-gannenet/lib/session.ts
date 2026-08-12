/**
 * הסשן של הכניסה המשותפת, כפי שהדפדפן רואה אותו. `auth-button.js` (שנטען
 * ב-layout) כותב אותו ל-localStorage תחת `more30-auth`, וכל המערכות מוגשות תחת
 * more30.com — origin אחד — ולכן אין כאן כניסה נפרדת ואין תלות ב-supabase-js.
 *
 * זו טענה של הדפדפן ולא הוכחה, והשרת לא סומך עליה: כל בקשה מאומתת מול
 * `/auth/v1/user` ב-`lib/require-user.ts`. מה שנעשה כאן הוא רק לחסוך בקשה
 * שממילא תיענה 401 ולומר לגננת מראש שצריך חשבון.
 *
 * היה עותק אחד מזה בתוך `/shelf/upload`; משנוסף `/shelf/mine` שקורא את אותו
 * מפתח, הוא הועבר לכאן — שני מסכים שקוראים סשן בשתי דרכים הם שני מסכים
 * שיחלקו על השאלה אם המשתמשת מחוברת.
 */
export function sessionToken(): string | null {
  try {
    const raw = localStorage.getItem("more30-auth");
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || !s.access_token) return null;
    if (s.expires_at && s.expires_at * 1000 <= Date.now()) return null;
    return String(s.access_token);
  } catch {
    return null;
  }
}

/**
 * הקישורים שהכפתור המשותף בונה, כולל `from` — כדי שההתחברות תחזיר את הגננת
 * בדיוק לעמוד שממנו יצאה ולא לדף הבית של הפורטל. נקרא בתוך `useEffect` בלבד
 * (`location`), אחרת הרינדור בשרת ובלקוח לא יסכימו.
 */
export function authLinks(): { login: string; signup: string } {
  const from = encodeURIComponent(location.href);
  return {
    login: `https://more30.com/login?from=${from}`,
    signup: `https://more30.com/login?mode=signup&from=${from}`,
  };
}
