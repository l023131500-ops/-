import type { Express, Request, Response } from "express";
import type { Server } from 'node:http';
import { storage } from "./storage";
import { insertBookSchema, updateBookSchema } from "@shared/schema";
import { TEMPLATES, HEBREW_FONTS, DEFAULT_SETTINGS } from "@shared/templates";
import { FEATURES, QUESTIONS, inferSetup, type WizardAnswers } from "@shared/wizard";
import { bookToDocx } from "./docx";

/** מזהה המבקר לצורך בידוד נתונים — מגיע מכותרת שהלקוח (client/src/lib/visitorId.ts) שולח בכל בקשה. */
function visitorId(req: Request): string | null {
  const h = req.header("X-Visitor-Id") || req.header("x-visitor-id");
  const v = h && String(h).trim();
  return v || null;
}

/**
 * מוודא שיש מזהה מבקר ומחזיר אותו, או עונה 400 ומחזיר null.
 * ללא זה, בקשות בלי הכותרת (curl/API ישיר, לא הלקוח עצמו) היו נופלות
 * כולן לדלי-משותף אחד ("anon") ויכלו לקרוא/לדרוס ספרים של בקשות זרות
 * אחרות בלי הכותרת — ראו SECURITY_REVIEW.md WARN #2.
 */
function requireVisitorId(req: Request, res: Response): string | null {
  const id = visitorId(req);
  if (!id) {
    res.status(400).json({ message: "חסרה כותרת X-Visitor-Id" });
    return null;
  }
  return id;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // מטא-דאטה: תבניות, גופנים, הגדרות ברירת-מחדל
  app.get("/api/meta", (_req, res) => {
    res.json({ templates: TEMPLATES, fonts: HEBREW_FONTS, defaults: DEFAULT_SETTINGS, features: FEATURES, questions: QUESTIONS });
  });

  // אשף חכם: שאלון + שפה חופשית → המלצת תבנית + פונקציות + הגדרות
  app.post("/api/wizard/infer", (req, res) => {
    const ans = (req.body || {}) as WizardAnswers;
    res.json(inferSetup(ans));
  });

  // ייצוא Word (.docx) לספר
  app.get("/api/books/:id/docx", async (req, res) => {
    const vid = requireVisitorId(req, res);
    if (!vid) return;
    const book = await storage.getBook(Number(req.params.id), vid);
    if (!book) return res.status(404).json({ message: "לא נמצא" });
    try {
      const buf = await bookToDocx(book);
      const safe = encodeURIComponent((book.title || "book").replace(/[\/\\?%*:|"<>\s]+/g, "_"));
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${safe}.docx`);
      res.send(buf);
    } catch (e) {
      res.status(500).json({ message: "כשל ביצירת קובץ Word", error: String(e) });
    }
  });

  app.get("/api/books", async (req, res) => {
    const vid = requireVisitorId(req, res);
    if (!vid) return;
    try {
      res.json(await storage.listBooks(vid));
    } catch (e) {
      res.status(500).json({ message: "כשל בטעינת ספרים", error: String(e) });
    }
  });

  app.get("/api/books/:id", async (req, res) => {
    const vid = requireVisitorId(req, res);
    if (!vid) return;
    const book = await storage.getBook(Number(req.params.id), vid);
    if (!book) return res.status(404).json({ message: "לא נמצא" });
    res.json(book);
  });

  app.post("/api/books", async (req, res) => {
    const vid = requireVisitorId(req, res);
    if (!vid) return;
    const parsed = insertBookSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "נתונים שגויים", errors: parsed.error.flatten() });
    try {
      res.status(201).json(await storage.createBook(parsed.data, vid));
    } catch (e) {
      res.status(500).json({ message: "כשל ביצירת ספר", error: String(e) });
    }
  });

  app.patch("/api/books/:id", async (req, res) => {
    const vid = requireVisitorId(req, res);
    if (!vid) return;
    const parsed = updateBookSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "נתונים שגויים", errors: parsed.error.flatten() });
    try {
      const updated = await storage.updateBook(Number(req.params.id), parsed.data, vid);
      if (!updated) return res.status(404).json({ message: "לא נמצא" });
      res.json(updated);
    } catch (e) {
      res.status(500).json({ message: "כשל בעדכון ספר", error: String(e) });
    }
  });

  app.delete("/api/books/:id", async (req, res) => {
    const vid = requireVisitorId(req, res);
    if (!vid) return;
    try {
      const ok = await storage.deleteBook(Number(req.params.id), vid);
      if (!ok) return res.status(404).json({ message: "לא נמצא" });
      res.status(204).end();
    } catch (e) {
      res.status(500).json({ message: "כשל במחיקת ספר", error: String(e) });
    }
  });

  return httpServer;
}
