import { createClient } from "@supabase/supabase-js";

/**
 * חיבור לפלטפורמה (more30 hub) — בנפרד מהמסד של המערכת עצמה.
 *
 * למה שני חיבורים: המערכת הזו יושבת על פרויקט Supabase משלה, ולכן אי אפשר
 * לחלוק איתה את מפתח הסשן של הפלטפורמה — JWT של ההאב אינו תקף מול פרויקט אחר,
 * וזה היה מנתק את המשתמשים הקיימים. במקום זה יש כאן חיבור **שני**, שקורא את
 * הסשן המשותף (אותו origin: more30.com) ושואל שאלה אחת בלבד: האם המשתמש
 * המחובר הוא מנהל של המערכת הזו — מקומי או סופר-אדמין גלובלי.
 *
 * המפתח כאן הוא ה-anon הציבורי של ההאב, אותו אחד שמוטמע ב-auth-button.js
 * שכל אתר בפלטפורמה טוען. אין כאן סוד.
 */
const HUB_URL = "https://uhnrgujbdxhhmoxcjria.supabase.co";
const HUB_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw";

/** השם שהמערכת הזו מוכרת בו בפלטפורמה (core.projects.path). */
export const APP_KEY = "egod";

export const hub = createClient(HUB_URL, HUB_ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "more30-auth",
    // דווקא false: הכתובת עשויה להכיל טוקנים שמיועדים לחיבור של המערכת
    // עצמה, ושני לקוחות שמנסים לצרוך אותם נכנסים למירוץ.
    detectSessionInUrl: false,
  },
});

/**
 * "אדמין מקומי או סופר-אדמין גלובלי" — התשובה מגיעה מהשרת, לא מהדפדפן.
 * מחזיר false כשאין סשן או כשהקריאה נכשלה: שער שנפתח בגלל תקלת רשת אינו שער.
 */
export async function isPlatformAdmin(): Promise<boolean> {
  try {
    const { data } = await hub.rpc("more30_app_access", { p_app: APP_KEY });
    return (data as { is_admin?: boolean } | null)?.is_admin === true;
  } catch {
    return false;
  }
}
