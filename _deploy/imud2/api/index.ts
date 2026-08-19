/**
 * API של "אות ודף" (מערכת 04) לפריסה תחת more30.com/imud.
 *
 * `registerRoutes` של האפליקציה המקורית מועתק כמו-שהוא ומורכב על Express בתוך
 * Vercel Function אחת, כך שכל מסלול שומר על הנתיב והתשובה המדויקים. שני
 * הבדלים כפויי-serverless:
 *   - האחסון ב-Supabase (public.otvedaf_books) במקום סכימת otvedaf, כי
 *     PostgREST חושף רק public. שם הטבלה נקבע ב-SUPABASE_TABLE.
 *   - אין תהליך חי, ולכן ה-http.Server שנמסר ל-registerRoutes הוא placeholder
 *     (המקור משתמש בו ל-websockets, שאין בהם שימוש כאן).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import { createServer, type Server } from "node:http";
import { registerRoutes } from "./_lib/server/routes";

let appPromise: Promise<express.Express> | null = null;

async function buildApp(): Promise<express.Express> {
  const app = express();
  // תוכן ספר שלם נשלח כ-JSON אחד; 25mb מתיישר עם המקור.
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: false, limit: "25mb" }));

  // הפורטל מנתב /imud/api/* לכאן, ו-vercel.json מעביר את הסיומת ב-__path.
  // מחזירים את ה-URL לצורה ש-registerRoutes מצפה לה לפני הניתוב.
  app.use((req, _res, next) => {
    const url = new URL(req.url ?? "/", "http://local");
    const p = url.searchParams.get("__path");
    if (p) {
      url.searchParams.delete("__path");
      const qs = url.searchParams.toString();
      req.url = `/api/${p}${qs ? `?${qs}` : ""}`;
    }
    next();
  });

  const httpServer: Server = createServer();
  await registerRoutes(httpServer, app);
  return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!appPromise) appPromise = buildApp();
    const app = await appPromise;
    (app as unknown as (rq: VercelRequest, rs: VercelResponse) => void)(req, res);
  } catch (err) {
    appPromise = null; // מאפשר ניסיון חדש אחרי cold start שנכשל
    const message = err instanceof Error ? err.message : String(err);
    console.error("[imud-api] boot failed:", message);
    res.status(500).json({ ok: false, error: "imud API failed to start", detail: message });
  }
}
