import { createClient } from "@supabase/supabase-js";
import ws from "ws";

/**
 * לקוח Supabase (צד-שרת בלבד).
 * הנתונים נשמרים בסכימת `otvedaf` בתוך פרויקט bkalut-production.
 * מפתח ה-anon נחשב בטוח לחשיפה בצד-שרת; אין קידומת VITE_ כדי שלא ידלוף ללקוח.
 */
const SUPABASE_URL = process.env.SUPABASE_URL;
// בפריסה תחת more30.com הטבלה מוגנת ב-RLS ללא policies (anon חסום לגמרי),
// ולכן השרת עובד עם service_role. הקוד עדיין תומך ב-anon כשזו ההגדרה בסביבה
// המקורית — לכן העדפה, לא דרישה.
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const SCHEMA = process.env.SUPABASE_SCHEMA || "otvedaf";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    "חסרים משתני סביבה: SUPABASE_URL + SUPABASE_SERVICE_KEY (או SUPABASE_ANON_KEY)."
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: SCHEMA },
  auth: { persistSession: false, autoRefreshToken: false },
  // Node 20 אינו כולל WebSocket טבעי — מספקים את מודול `ws` ל-realtime.
  // (אין שימוש ב-realtime באפליקציה, אך הלקוח מאתחל אותו בבנייה).
  realtime: { transport: ws as unknown as typeof WebSocket },
});

export default supabase;
