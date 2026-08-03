import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/rights/",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    /*
      🔴 הממצא שהסביר את הביצועים יותר מכל דבר אחר: **החבילה הראשית הוגשה
      בלי דחיסה בכלל.** נמדד מול הפרודקשן — ‎content-encoding‎ ריק על
      ‎index-*.js‎, בעוד שגיליון הסגנון שלידו ושאר הקטעים מקבלים ‎br‎.
      771KB עברו בקו במקום 232KB.

      הגבול נמדד בניסוי: אותם בייטים בדיוק, חתוכים לגדלים שונים ונפרסים
      יחד — 204,800 בתים חזרו ‎br‎, 245,760 חזרו בלי דחיסה. כלומר יש סף
      איפשהו בין 200KB ל-240KB, והוא אינו ניתן להגדרה מהצד שלנו.

      התיקון: לא לייצר אף קטע במסלול הנחיתה שגדול ממנו. כל קטע יורד גם
      במקביל, ולכן זה עדיף ממילא. לא לאחד: react ו-react-dom חייבים לשבת
      יחד (אותו singleton).
    */
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return "react";
            if (id.includes("framer-motion") || id.includes("motion-dom") || id.includes("motion-utils")) return "motion";
            if (id.includes("@supabase")) return "supabase";
            if (id.includes("@tanstack")) return "query";
            if (id.includes("lucide-react")) return "icons";
            if (id.includes("@radix-ui")) return "radix";
            return undefined;
          }
          // 64KB של מאגר הזכויות — תוכן, לא קוד. נטען פעם אחת ונשמר לנצח.
          if (id.includes("src/data/rightsData")) return "rights-data";
          return undefined;
        },
      },
    },
  },
}));
