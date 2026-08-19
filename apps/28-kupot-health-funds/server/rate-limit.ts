// ---------------------------------------------------------------------------
// תקרת בקשות לשעה, לכל כתובת IP — מגנה על /api/agent (קריאת Anthropic בתשלום,
// פתוחה לציבור בלי אימות) מפני ריקון קרדיט ע"י בקשות חוזרות. אותו דפוס בדיוק
// (יועץ AI ציבורי בלי הגבלה) כבר תוקן במערכות אחיות — core.issues #190
// (22-get-your-rights rights-agent) ו-#192 (01-torah-platform ai-match-teacher).
//
// זיכרון-תהליך בלבד, לא DB: server/app.ts::getApp() ממזטן את אפליקציית
// Express למופע ה-lambda החם, כך שהמונה שורד בין קריאות על אותו מופע — לא
// הגנה מושלמת מול כמה מופעים חמים בו-זמנית, אבל עוצרת בדיוק את דפוס
// ההתעללות הריאלי (סקריפט בלולאה על אותה כתובת/מופע).
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
