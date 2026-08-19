/**
 * API של עימוד תורני (04) לפריסה תחת more30.com/imud.
 *
 * המקור (apps/04-imud-torani) מגיש את המסלולים האלה מתהליך Express חי
 * (server/routes.ts). כאן אותם מסלולים רצים כפונקציית Vercel אחת, ושכבת
 * האחסון היא עותק של זו של האפליקציה — ולכן צורות התשובה זהות, והחבילה
 * שבדפדפן אינה צריכה שינוי מעבר לבסיס ה-API שכבר תוקן (קומיט 8c0721b).
 *
 * למה זה נכתב: עד כה לפריסה לא הייתה פונקציה כלל, ו-vercel.json הפנה את
 * /imud/:path* אל index.html. לכן /imud/api/books החזיר 200 text/html —
 * קליפת ה-SPA — והלקוח נכשל על JSON.parse ולא על סטטוס. ‏core.issues #153.
 *
 * הניתוב: הפורטל מעביר /imud/:path* לפריסה הזאת, ו-vercel.json כאן מעביר
 * /imud/api/(.*) אל /api/index?__path=$1 — אותה צורה שעובדת ב-mechiron.
 */
import { storage } from "./_lib/storage";
import { insertBookSchema, updateBookSchema } from "./_lib/schema";
import { TEMPLATES, HEBREW_FONTS, DEFAULT_SETTINGS } from "./_lib/templates";
import { FEATURES, QUESTIONS, inferSetup, type WizardAnswers } from "./_lib/wizard";
import { bookToDocx } from "./_lib/docx";

/**
 * טיפוסי הבקשה/תשובה מוגדרים כאן ולא מיובאים מ-@vercel/node: אלה בדיוק
 * החברים שהקוד משתמש בהם, וכך אפשר להריץ typecheck על התיקייה בלי להתקין
 * את חבילת הטיפוסים. ‏Vercel מזריק את המימוש בזמן ריצה.
 */
interface Req {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, string | string[] | undefined>;
  body?: unknown;
}
interface Res {
  status(code: number): Res;
  json(body: unknown): void;
  send(body: unknown): void;
  setHeader(name: string, value: string): void;
  end(): void;
}

/** מזהה המבקר לצורך בידוד נתונים — כמו במקור, מכותרת X-Visitor-Id. */
function visitorId(req: Req): string {
  const h = req.headers["x-visitor-id"];
  const v = Array.isArray(h) ? h[0] : h;
  return (v && String(v).trim()) || "anon";
}

/**
 * המסלול המבוקש, בלי הקידומות. ‏__path מגיע מה-rewrite; הנפילה ל-url היא
 * למקרה שהפונקציה נקראת ישירות (למשל /api/index?…) ולא דרך ה-rewrite.
 */
function routePath(req: Req): string {
  const q = req.query?.__path;
  const fromQuery = Array.isArray(q) ? q[0] : q;
  if (fromQuery !== undefined && fromQuery !== null) {
    return String(fromQuery).replace(/^\/+|\/+$/g, "");
  }
  const raw = (req.url || "").split("?")[0];
  return raw
    .replace(/^\/imud/, "")
    .replace(/^\/api\/index$/, "")
    .replace(/^\/api/, "")
    .replace(/^\/+|\/+$/g, "");
}

/** גוף הבקשה — Vercel מפענח JSON, אבל לא כשה-Content-Type חסר. */
function jsonBody(req: Req): Record<string, unknown> {
  const b = req.body;
  if (b == null) return {};
  if (typeof b === "string") {
    try {
      return JSON.parse(b) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return b as Record<string, unknown>;
}

export default async function handler(req: Req, res: Res) {
  const path = routePath(req);
  const method = (req.method || "GET").toUpperCase();
  const uid = visitorId(req);
  const seg = path ? path.split("/") : [];

  try {
    // ── מטא-דאטה: תבניות, גופנים, הגדרות ברירת-מחדל ──
    if (path === "meta" && method === "GET") {
      return void res.status(200).json({
        templates: TEMPLATES,
        fonts: HEBREW_FONTS,
        defaults: DEFAULT_SETTINGS,
        features: FEATURES,
        questions: QUESTIONS,
      });
    }

    // ── אשף חכם: שאלון + שפה חופשית → המלצת תבנית/פונקציות/הגדרות ──
    if (path === "wizard/infer" && method === "POST") {
      return void res.status(200).json(inferSetup(jsonBody(req) as WizardAnswers));
    }

    // ── ייצוא Word (.docx) לספר ──
    if (seg.length === 3 && seg[0] === "books" && seg[2] === "docx" && method === "GET") {
      const book = await storage.getBook(Number(seg[1]), uid);
      if (!book) return void res.status(404).json({ message: "לא נמצא" });
      try {
        const buf = await bookToDocx(book);
        const safe = encodeURIComponent((book.title || "book").replace(/[\/\\?%*:|"<>\s]+/g, "_"));
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );
        res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${safe}.docx`);
        return void res.send(buf);
      } catch (e) {
        return void res.status(500).json({ message: "כשל ביצירת קובץ Word", error: String(e) });
      }
    }

    // ── רשימת ספרים / יצירה ──
    if (path === "books") {
      if (method === "GET") {
        try {
          return void res.status(200).json(await storage.listBooks(uid));
        } catch (e) {
          return void res.status(500).json({ message: "כשל בטעינת ספרים", error: String(e) });
        }
      }
      if (method === "POST") {
        const parsed = insertBookSchema.safeParse(jsonBody(req));
        if (!parsed.success) {
          return void res
            .status(400)
            .json({ message: "נתונים שגויים", errors: parsed.error.flatten() });
        }
        try {
          return void res.status(201).json(await storage.createBook(parsed.data, uid));
        } catch (e) {
          return void res.status(500).json({ message: "כשל ביצירת ספר", error: String(e) });
        }
      }
    }

    // ── ספר בודד: קריאה / עדכון / מחיקה ──
    if (seg.length === 2 && seg[0] === "books") {
      const id = Number(seg[1]);
      if (method === "GET") {
        const book = await storage.getBook(id, uid);
        if (!book) return void res.status(404).json({ message: "לא נמצא" });
        return void res.status(200).json(book);
      }
      if (method === "PATCH") {
        const parsed = updateBookSchema.safeParse(jsonBody(req));
        if (!parsed.success) {
          return void res
            .status(400)
            .json({ message: "נתונים שגויים", errors: parsed.error.flatten() });
        }
        try {
          const updated = await storage.updateBook(id, parsed.data, uid);
          if (!updated) return void res.status(404).json({ message: "לא נמצא" });
          return void res.status(200).json(updated);
        } catch (e) {
          return void res.status(500).json({ message: "כשל בעדכון ספר", error: String(e) });
        }
      }
      if (method === "DELETE") {
        try {
          const ok = await storage.deleteBook(id, uid);
          if (!ok) return void res.status(404).json({ message: "לא נמצא" });
          return void res.status(204).end();
        } catch (e) {
          return void res.status(500).json({ message: "כשל במחיקת ספר", error: String(e) });
        }
      }
    }

    // הנתיב המבוקש מוחזר בגוף: כך אפשר להבחין מבחוץ בין 404 של הפונקציה
    // הזאת לבין 404 של הפורטל (text/plain) או קליפת SPA (text/html).
    return void res.status(404).json({ message: "not found", path, method });
  } catch (e) {
    return void res.status(500).json({ message: "כשל בשרת", error: String(e) });
  }
}
