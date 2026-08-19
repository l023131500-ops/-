/**
 * מזהה מבקר קבוע לדפדפן זה — נוצר פעם אחת ונשמר ב-localStorage.
 * נשלח לשרת בכותרת X-Visitor-Id (server/routes.ts: visitorId()) כדי לבודד
 * את הספרים של כל מבקר. בלי זה כל בקשה נופלת ל-"anon" המשותף לכולם —
 * ראה portal/public/admin-imud.html והערה בליבת core.issues #ה-04.
 */
const KEY = "imud-visitor-id";

// גיבוי בזיכרון: אם localStorage חסום (מצב פרטי/iframe) עדיין רוצים אותו
// מזהה לאורך כל טעינת העמוד, לא מזהה חדש בכל בקשה.
let memoryId: string | null = null;

export function getVisitorId(): string {
  try {
    let id = window.localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    if (!memoryId) memoryId = crypto.randomUUID();
    return memoryId;
  }
}
