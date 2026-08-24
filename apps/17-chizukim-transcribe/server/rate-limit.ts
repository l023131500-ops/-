// ---------------------------------------------------------------------------
// תקרת בקשות לשעה, לכל כתובת IP — מגנה על POST /api/transcribe/:id (קריאת
// RunPod/OpenAI בתשלום אמיתי, פתוחה לציבור בלי אימות) מפני ריקון קרדיט ע"י
// בקשות חוזרות. כל הקלטה בודדת כבר אידמפוטנטית (status ready/transcribing/
// editing/transcribed נחסם בהתחלת ה-handler), אבל /api/upload/register
// הציבורי מאפשר ליצור הקלטות חדשות בלי הגבלה — כך שהגנה לפי-מזהה בלבד לא
// עוצרת סקריפט שרושם הקלטות חדשות ומתמלל כל אחת פעם אחת. אותו דפוס בדיוק
// (עלות-אמיתית ציבורית בלי הגבלה) כבר תוקן במערכות אחיות — 28-kupot-health-
// funds/server/rate-limit.ts, 27-bkalut-price, 19-igud-shiurim-portal.
//
// זיכרון-תהליך בלבד, לא DB: המונה שורד בין קריאות על אותו מופע חם — לא הגנה
// מושלמת מול כמה מופעים בו-זמנית, אבל עוצרת בדיוק את דפוס ההתעללות הריאלי
// (סקריפט בלולאה על אותה כתובת/מופע).
// ---------------------------------------------------------------------------

const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();

/** true אם המפתח חרג מהתקרה בשעה האחרונה; אחרת רושם פגיעה ומחזיר false. */
export function hitRateLimit(key: string, limit: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

export function clientIp(req: {
  headers: Record<string, unknown>;
  socket?: { remoteAddress?: string };
}): string {
  const fwd = req.headers["x-forwarded-for"];
  const first = Array.isArray(fwd) ? fwd[0] : fwd;
  if (first) return String(first).split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}
