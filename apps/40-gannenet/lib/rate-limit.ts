/**
 * תקרת שימוש יומית למחולל דפי המשימה — לכל חשבון ולכלל המערכת.
 *
 * הצעד הקודם (#185) גידר את `POST /api/ai-generate` מאחורי חשבון more30, ורשם
 * במפורש מה נשאר פתוח: "משתמשת מחוברת עדיין לוחצת בלי הגבלה — אין מונה לכל
 * חשבון ואין תקרה יומית, וחשבון more30 חינמי ומיידי". כלומר מחיר ההתעללות עלה
 * מאפס ל"צריך חשבון", ופתיחת חשבון היא טופס של פחות מדקה (§8ב). כל לחיצה היא
 * קריאה בתשלום ל-claude-opus-5 עם max_tokens 16000 שרצה ~45 שניות; בלי תקרה,
 * חשבון אחד יכול להוציא את הארנק בלולאה, ועשרה חשבונות בוודאי.
 *
 * המונה יושב באותו bucket שכל שאר המצב של המערכת יושב בו (`gannenet-shelf`),
 * כי אין כאן טבלה ואין Redis — ומאותה סיבה שגם `lib/overrides.ts` בחר בזה.
 *
 * **סימון אחד לכל יצירה, בתיקייה שטוחה אחת ליום:**
 *   usage/aigen/<YYYY-MM-DD>/<userId>__<ts>-<rand>.json
 *
 * זה נבחר על פני "אובייקט מונה לכל משתמשת" בכוונה. מונה מחייב read-modify-write
 * על מצב משותף, ול-Storage אין compare-and-set שיסגור את זה — `lib/overrides.ts`
 * מתעד את המדידה: `If-Match` מתקבל ומתעלמים ממנו, ומנעול אי אפשר לשחרר כי
 * המפתח האנונימי רשאי ליצור ולדרוס אך לא למחוק. שתי לחיצות במקביל היו קוראות
 * 4, כותבות 5, ומחייבות פעם אחת. שם ייחודי לכל יצירה אינו מתנגש עם כלום, וספירה
 * היא LIST אחד.
 *
 * ולכן גם התיקייה שטוחה ולא `<date>/<userId>/`: LIST יחיד מחזיר את כל היום, ומתוכו
 * נספרות גם התקרה הכללית (מספר השורות) וגם התקרה האישית (השורות שמתחילות ב-
 * `<userId>__`). עלות הבדיקה היא בקשה אחת ולא אחת לכל משתמשת.
 *
 * היום נספר לפי UTC. חצות UTC היא 03:00 בישראל, כלומר ההתחדשות נופלת בשעה שאין
 * בה גננות בעבודה — וזו הסיבה שלא נטרחתי להזיז אותה.
 *
 * המפתח האנונימי אינו יכול למחוק, ולכן הסימונים נשארים. הם ~40 בתים כל אחד,
 * מחולקים לפי תאריך, ואף נתיב אינו קורא תיקייה של יום שעבר — כלומר הם נטל אחסון
 * זניח ולא נטל ריצה. מחיקה תקופתית אפשרית עם מפתח השירות, ואינה נדרשת.
 */

const URL_ = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const KEY_ = process.env.SUPABASE_ANON_KEY || "";
const BUCKET = "gannenet-shelf";
const PREFIX = "usage/aigen";

function cap(raw: string | undefined, fallback: number): number {
  const n = parseInt(raw || "", 10);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

// ברירות מחדל שנבחרו לפי השימוש האמיתי: גננת שמכינה שבוע עבודה יוצרת יחידות
// בודדות ביום, ולא 20. אפשר לשנות בלי פריסה דרך משתני הסביבה.
export const CAP_USER = cap(process.env.GENERATE_DAILY_CAP_USER, 20);
export const CAP_ALL = cap(process.env.GENERATE_DAILY_CAP_ALL, 200);

export const OVER_USER_MSG = `הגעת למכסת היצירה היומית (${CAP_USER} דפים ליום לחשבון). המכסה מתחדשת מדי יום — והדפים שכבר יצרת נשארים אצלך.`;
export const OVER_ALL_MSG = "מחולל דפי המשימה הגיע למכסת השימוש היומית של המערכת. הוא יחזור לפעול מחר; הצפייה במדף ובמערכי השיעור נשארת פתוחה.";
export const QUOTA_UNAVAILABLE_MSG = "לא ניתן לבדוק כרגע את מכסת השימוש היומית, ולכן היצירה לא הופעלה. נסי שוב בעוד רגע.";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function authHeaders(extra: Record<string, string> = {}) {
  return { apikey: KEY_, Authorization: `Bearer ${KEY_}`, ...extra };
}

/**
 * שמות הסימונים של היום. `null` — ולא `[]` — כשהקריאה נכשלה: אפס וכישלון הם
 * שתי תשובות שונות, והמתקשר סוגר על השנייה.
 */
async function listToday(date: string): Promise<string[] | null> {
  try {
    const res = await fetch(`${URL_}/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      // מעל התקרה הכללית בכוונה: התקרה עצמה נמדדת מהאורך, ותקרה ששווה בדיוק
      // ל-limit לא ניתנת להבחנה מ"נקטע כאן".
      body: JSON.stringify({ prefix: `${PREFIX}/${date}`, limit: CAP_ALL + 50 }),
      // אותה סיבה כמו בכל שאר הנתיבים כאן: Next שומר `fetch` בנתיב שרת כברירת
      // מחדל, וספירת מכסה שנשמרת במטמון היא מכסה שלא נאכפת.
      cache: "no-store",
    });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows)) return null;
    // שורות `id: null` הן תיקיות ולא אובייקטים (אין כאלה כאן, וזה נשמר לעקביות
    // עם `listUploadFiles()`).
    return rows.filter((r) => r && r.id).map((r) => String(r.name));
  } catch {
    return null;
  }
}

async function mark(date: string, userId: string): Promise<boolean> {
  const name = `${PREFIX}/${date}/${userId}__${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.json`;
  try {
    const res = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${name}`, {
      method: "POST",
      // בלי `x-upsert`: השם ייחודי, ובקשה שכן מתנגשת (409) היא באג שעדיף לראות.
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ at: new Date().toISOString(), user: userId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export type Reservation =
  | { ok: true; usedUser: number; usedAll: number }
  | { ok: false; reason: "user" | "global" | "unavailable" };

/**
 * מה שהגננת רואה על המסך לפני שהיא לוחצת. התקרה נאכפה מהצעד הקודם אבל לא הוצגה
 * בשום מקום — כלומר הדרך היחידה לגלות אותה הייתה להיחסם באמצע העבודה, וזו בדיוק
 * ההפתעה שתקרה אמורה למנוע. אותו LIST של `reserveGeneration`, בלי לכתוב סימון.
 */
export type QuotaView = {
  capUser: number; usedUser: number; remainingUser: number;
  capAll: number; usedAll: number; remainingAll: number;
};

export function quotaView(usedUser: number, usedAll: number): QuotaView {
  return {
    capUser: CAP_USER,
    usedUser,
    remainingUser: Math.max(0, CAP_USER - usedUser),
    capAll: CAP_ALL,
    usedAll,
    remainingAll: Math.max(0, CAP_ALL - usedAll),
  };
}

/**
 * ספירה בלבד — בלי הזמנה ובלי סימון. `null` כשאי אפשר לספור, מאותה סיבה
 * ש-`listToday()` מבדיל בין אפס לכישלון: מסך שמציג "נותרו לך 20" כשהספירה לא
 * עלתה בכלל משקר, ועדיף שלא יציג כלום.
 */
export async function peekQuota(userId: string): Promise<QuotaView | null> {
  if (!URL_ || !KEY_) return null;
  const names = await listToday(today());
  if (names === null) return null;
  return quotaView(names.filter((n) => n.startsWith(`${userId}__`)).length, names.length);
}

/**
 * מה שמנהל המערכת רואה — התקרה הכללית, שהיא היחידה כאן שנופלת על מישהי שלא
 * עשתה כלום. גננת שמיצתה את 20 שלה יודעת למה: היא יצרה עשרים דפים. גננת
 * שנחסמת על ה-200 של כלל המערכת נחסמת בגלל שימוש של אחרות, ועד עכשיו לא היה
 * שום מקום שבו אפשר היה לראות שהמערכת מתקרבת לשם — התקרה נאכפה, הודעת החסימה
 * הוצגה למי שנתקלה בה, ואיש לא יכול היה לדעת מראש שהיום עמוס.
 *
 * `accounts` הוא מספר החשבונות המובחנים שיצרו היום, ו-`top` הוא הפילוח לפיהם.
 * שניהם נגזרים מאותו LIST — לא נוספת כאן אף בקשה מעבר לזו שהמכסה עושה ממילא.
 * מזהה החשבון הוא ה-UUID שהסימון נכתב תחתיו; אין כאן מייל, כי אין בסימון מייל.
 */
// בכוונה לא `QuotaView` עם אפסים באישי: המסך הזה אינו של אף גננת, ושדה
// `remainingUser: 20` שאין לו בעלים הוא בדיוק סוג המספר שנקרא לא נכון.
export type SystemUsage = {
  date: string;
  capAll: number;
  usedAll: number;
  remainingAll: number;
  capUser: number;
  accounts: number;
  top: { userId: string; count: number }[];
};

export async function peekSystemUsage(): Promise<SystemUsage | null> {
  if (!URL_ || !KEY_) return null;
  const date = today();
  const names = await listToday(date);
  if (names === null) return null;

  const byUser = new Map<string, number>();
  for (const n of names) {
    // `usage/aigen/<date>/<userId>__<ts>-<rand>.json` — ה-LIST מחזיר שם יחסי
    // לתיקייה, ולכן מה שנשאר הוא החלק שאחרי הקידומת. שם בלי `__` אינו סימון
    // שהמערכת כתבה, ולכן הוא נספר בכללי (הוא צורך מהתקרה) ולא מיוחס לחשבון.
    const base = n.slice(n.lastIndexOf("/") + 1);
    const i = base.indexOf("__");
    if (i <= 0) continue;
    const id = base.slice(0, i);
    byUser.set(id, (byUser.get(id) || 0) + 1);
  }
  const top = Array.from(byUser, ([userId, count]) => ({ userId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    date,
    capAll: CAP_ALL,
    usedAll: names.length,
    remainingAll: Math.max(0, CAP_ALL - names.length),
    capUser: CAP_USER,
    accounts: byUser.size,
    top,
  };
}

/**
 * נבדק ונרשם לפני שנוגעים ב-Anthropic — הסימון נכתב מראש ולא אחרי הצלחה, כי
 * אחרי הצלחה עשרים בקשות מקבילות היו כולן רואות אפס. המשמעות היא שיצירה שנפלה
 * במעלה הזרם עדיין נספרת: זה מחיר שנבחר ביודעין לטובת הצד שבו טעות אינה עולה
 * כסף, והתקרה רחבה מספיק שזה לא יפגע בשימוש אמיתי.
 *
 * כישלון של הספירה או של הרישום עוצר את היצירה (`unavailable`) ולא מוותר על
 * התקרה. זו בדיוק הבחירה ההפוכה מ"אם המנגנון שבור, שיעבור": מה שעומד מעבר
 * לשורה הזאת הוא כסף, ותקלה זמנית באחסון היא סיבה גרועה להחזיר את החור שנסגר.
 *
 * **שתי בדיקות, לא אחת:** בדיקה ראשונה זולה (LIST בלבד, בלי כתיבה) דוחה מיד
 * חשבון שכבר מעל התקרה — כדי שקריאה חוזרת ונשנית אחרי חסימה לא תעלה לנו כתיבה
 * בכל פעם (`mark` לא ניתן למחיקה במפתח האנונימי, ראו כותרת הקובץ). מי שעובר
 * את הבדיקה הזולה נרשם (`mark`) *לפני* הבדיקה הקובעת שנייה, לא אחריה: קרא-ואז-
 * החלט הוא חלון מרוץ — שתי בקשות שקוראות את אותו LIST *לפני* ששתיהן נרשמו
 * היו יכולות שתיהן לעבור את התקרה ולהגיע ל-Anthropic בתשלום. כתיבה קודם וLIST
 * שני אחריה מבטיחים שההחלטה הסופית (זו שקובעת אם קוראים ל-Anthropic) תמיד
 * רואה את הסימון של הבקשה הזו עצמה. זה לא הופך את הבדיקה לאטומית מול כתיבה
 * אחרת שמתרחשת ממש באותו רגע (ל-Storage כאן אין compare-and-set, כמתועד
 * למעלה) — אבל סוגר את החלון הרחב שהיה קיים כשההחלטה נפלה על בסיס LIST שנכתב
 * לפני שאף אחת מהבקשות המקבילות נרשמה.
 */
export async function reserveGeneration(userId: string): Promise<Reservation> {
  if (!URL_ || !KEY_) return { ok: false, reason: "unavailable" };
  const date = today();

  const names = await listToday(date);
  if (names === null) return { ok: false, reason: "unavailable" };
  if (names.length >= CAP_ALL) return { ok: false, reason: "global" };
  const usedUser = names.filter((n) => n.startsWith(`${userId}__`)).length;
  if (usedUser >= CAP_USER) return { ok: false, reason: "user" };

  if (!(await mark(date, userId))) return { ok: false, reason: "unavailable" };

  const namesAfter = await listToday(date);
  // הסימון כבר נכתב; כישלון ה-LIST השני נופל לאותו טיפול כמו הראשון (עוצר,
  // לא מוותר) — המחיר הוא סימון יתום זניח באחסון, לא חריגה מהתקרה.
  if (namesAfter === null) return { ok: false, reason: "unavailable" };
  if (namesAfter.length > CAP_ALL) return { ok: false, reason: "global" };
  const usedUserAfter = namesAfter.filter((n) => n.startsWith(`${userId}__`)).length;
  if (usedUserAfter > CAP_USER) return { ok: false, reason: "user" };

  return { ok: true, usedUser: usedUserAfter, usedAll: namesAfter.length };
}
