// ==== הסשן של הכניסה המשותפת, כפי שהדפדפן רואה אותו ====
//
// `auth-button.js` (נטען ב-`app/layout.tsx`) כותב אותו ל-localStorage תחת
// `more30-auth`, וכל המערכות מוגשות תחת more30.com — origin אחד — ולכן אין
// כאן כניסה נפרדת ואין תלות ב-supabase-js בצד הלקוח. זו טענה של הדפדפן ולא
// הוכחה: השרת לא סומך עליה, כל בקשה מאומתת מול `/auth/v1/user`
// (`lib/requireuser.ts`). מה שנעשה כאן הוא רק לחסוך בקשת רשת שממילא תיענה 401
// כשאין סשן, ואנונימי — הרוב המכריע של הביקורים בדוח הציבורי — לא שולח כלום.

export function sessionToken(): string | null {
  try {
    const raw = localStorage.getItem('more30-auth');
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || !s.access_token) return null;
    if (s.expires_at && s.expires_at * 1000 <= Date.now()) return null;
    return String(s.access_token);
  } catch {
    return null;
  }
}

export function authLinks(): { login: string; signup: string } {
  const from = encodeURIComponent(location.href);
  return {
    login: `https://more30.com/login?from=${from}`,
    signup: `https://more30.com/login?mode=signup&from=${from}`,
  };
}
