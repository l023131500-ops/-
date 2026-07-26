import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/**
 * הפורטל קורא את המערכות מ-Supabase דרך anon. בלי המשתנים האלה ב-build
 * הבאנדל נבנה בלי חיבור, `createBrowserClient` זורק, והאתר עולה על נפילת
 * החירום (המרשם הסטטי) — כלומר בלי live_url, כך שכל כרטיס נראה "בהכנה"
 * והשאלון לא נשלח. זה קרה בשקט פעם אחת, ולכן ה-build נופל כאן במפורש.
 * הערכים יושבים ב-portal/.env.local (gitignored) — anon בלבד, לא סוד.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  if (mode === "production" && (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY)) {
    throw new Error(
      "portal build: חסרים VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.\n" +
        "צרו portal/.env.local (ראו portal/.env.example) או ייצאו אותם לסביבה לפני ה-build.",
    );
  }
  return { base: "/", plugins: [react()] };
});
