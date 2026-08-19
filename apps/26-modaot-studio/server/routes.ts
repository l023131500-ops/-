import type { Express, Request, Response } from "express";
import type { Server } from "node:http";
import { storage } from "./storage";
import { insertProjectSchema } from "@shared/schema";
import { generateBackground, editImage, enhanceBackgroundPrompt } from "./gemini";
import { generateCopy, generateConcepts, critiqueDesign } from "./ai";
import { generateStrategy, generateLogoConcepts, vectorizeLogo, deriveVisuals, generateBackgroundRecraft, removeBackgroundImage } from "./branding";
import { ARCHETYPES, ARCHETYPE_GROUPS, AAKER_DIMENSIONS, BRIEF_CATEGORIES, ALL_QUESTIONS, CORE_QUESTIONS, TOTAL_QUESTIONS, BRAND_BOOK_SECTIONS, HEBREW_FONTS, VISUAL_STYLE_TO_ARCHETYPE, getArchetype } from "@shared/branding";
import { insertBrandSchema } from "@shared/schema";
import { STYLES } from "@shared/styles";
import { FORMATS } from "@shared/formats";
import { KNOWLEDGE_BASE, GROUPS } from "@shared/knowledge";
import { PRESETS, STUDIOS, MOODS, getPreset, renderPreset } from "@shared/presetCatalog";
import { matchPresets, conceptUnderstanding, AUDIENCES, type Brief } from "@shared/brief";
import { getCategoryTemplates, listCategoryTemplateKeys, renderCategoryTemplate } from "@shared/categoryTemplates";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.use((req, res, next) => { if (req.path.startsWith("/api")) res.setHeader("Cache-Control", "no-store"); next(); });

  // מטא-דאטה: סגנונות, פורמטים, בסיס-ידע, ומטא של מחלקת הפרסום
  app.get("/api/meta", (_req, res) => {
    res.json({
      styles: STYLES,
      formats: FORMATS,
      knowledge: KNOWLEDGE_BASE,
      groups: GROUPS,
      studios: STUDIOS,
      moods: MOODS,
      audiences: AUDIENCES,
      presetCount: PRESETS.length,
      categoryTemplateKeys: listCategoryTemplateKeys(),
    });
  });

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  // ═══════════════════ מחלקת פרסום — קטלוג פריסטים ═══════════════════
  // רשימת פריסטים (מטא בלבד, ללא render כבד) עם סינון לפי משרד/מצב-רוח/חיפוש.
  app.get("/api/presets", (req, res) => {
    const { studio, mood, q } = req.query as Record<string, string | undefined>;
    let list = PRESETS;
    if (studio && studio !== "הכל") list = list.filter((p) => p.studio === studio);
    if (mood) list = list.filter((p) => p.mood.includes(mood));
    if (q) {
      const s = q.trim();
      list = list.filter((p) => p.name.includes(s) || p.studio.includes(s) || p.mood.some((m) => m.includes(s)));
    }
    res.json(list.map((p) => ({ key: p.key, name: p.name, studio: p.studio, mood: p.mood })));
  });

  // render של פריסט בודד למסמך עריכה (TemplateDoc). מקבל שדות טקסט אופציונליים.
  app.post("/api/presets/:key/render", (req, res) => {
    const { key } = req.params;
    const { width, height, fields, withPhoto } = req.body || {};
    const preset = getPreset(key);
    if (!preset) return res.status(404).json({ error: "פריסט לא נמצא" });
    const doc = renderPreset(key, Number(width) || 1080, Number(height) || 1350, fields, withPhoto !== false);
    if (!doc) return res.status(500).json({ error: "כשל ביצירת המסמך" });
    res.json({ preset: { key: preset.key, name: preset.name, studio: preset.studio, mood: preset.mood }, doc });
  });

  // ═══════════════════ תבניות מומלצות לפי קטגוריה ("כמו שמקובל") ═══════════════════
  // מחזיר את סט התבניות הבנויות-נכון לקטגוריית תוכן (חתונה/אבל/סיום/מועד...).
  app.get("/api/categories/:key/templates", (req, res) => {
    const set = getCategoryTemplates(req.params.key);
    if (!set) return res.status(404).json({ error: "אין קטלוג תבניות לקטגוריה זו" });
    res.json(set);
  });

  // render של תבנית-קטגוריה בודדת ל-TemplateDoc (עם מיזוג ברירות-מחדל של הסוג).
  app.post("/api/categories/:key/templates/:tpl/render", (req, res) => {
    const { key, tpl } = req.params;
    const { width, height, fields, withPhoto } = req.body || {};
    const doc = renderCategoryTemplate(key, tpl, Number(width) || 1080, Number(height) || 1350, fields, withPhoto !== false);
    if (!doc) return res.status(404).json({ error: "תבנית לא נמצאה" });
    res.json({ categoryKey: key, templateKey: tpl, doc });
  });

  // ═══════════════════ מנוע הבריף החכם ═══════════════════
  // מקבל בריף → מדרג פריסטים → מנסח הבנה. אם AI זמין, מעשיר בקונספטים מ-Claude.
  app.post("/api/brief/concepts", async (req: Request, res: Response) => {
    const brief = (req.body || {}) as Brief;
    if (!brief.category && !brief.message && !(brief.mood && brief.mood.length))
      return res.status(400).json({ error: "בריף ריק — נדרש לפחות קטגוריה, מסר או אווירה" });

    const ranked = matchPresets(brief, 4);
    const fallbackUnderstanding = conceptUnderstanding(brief);
    const localConcepts = ranked.map((r) => ({
      presetKey: r.preset.key,
      preset: { key: r.preset.key, name: r.preset.name, studio: r.preset.studio, mood: r.preset.mood },
      title: r.preset.name,
      why: r.reason,
      score: r.score,
    }));

    // ניסיון העשרה ב-AI (Claude). אם נכשל — מחזירים את הדירוג המקומי.
    try {
      const ai = await generateConcepts({
        category: brief.category,
        audience: brief.audience,
        mood: brief.mood,
        message: brief.message,
        colorPref: brief.colorPref,
        refNotes: brief.refNotes,
        presets: ranked.map((r) => ({ key: r.preset.key, name: r.preset.name, studio: r.preset.studio, mood: r.preset.mood })),
      });
      if (ai.ok && ai.data) {
        // מיזוג: לכל קונספט מ-AI נצרף את מטא הפריסט (אם presetKey תקין)
        const merged = (ai.data.concepts || []).map((c) => {
          const p = c.presetKey ? getPreset(c.presetKey) : undefined;
          const fallbackP = p ?? ranked[0]?.preset;
          return {
            presetKey: fallbackP?.key,
            preset: fallbackP ? { key: fallbackP.key, name: fallbackP.name, studio: fallbackP.studio, mood: fallbackP.mood } : undefined,
            title: c.title || fallbackP?.name,
            angle: c.angle,
            why: c.why,
            palette: c.palette,
            copyHint: c.copyHint,
          };
        });
        return res.json({
          understanding: ai.data.understanding || fallbackUnderstanding,
          concepts: merged.length ? merged : localConcepts,
          source: "ai",
        });
      }
    } catch { /* ניפול חזרה למקומי */ }

    res.json({ understanding: fallbackUnderstanding, concepts: localConcepts, source: "local" });
  });

  // ═══════════════════ קופי חכם (Claude) ═══════════════════
  app.post("/api/ai/copy", async (req: Request, res: Response) => {
    const { category, message, audience, mood, fields, variants } = req.body || {};
    const ai = await generateCopy({ category, message, audience, mood, fields, variants });
    if (ai.ok && ai.data) return res.json(ai.data);
    res.status(502).json({ error: ai.error || "שגיאת AI", detail: ai.detail });
  });

  // ═══════════════════ ביקורת AI (מבקר QA) — CHECKLIST/graphics.md #13 ═══════════════════
  // בודק את הטיוטה הנוכחית בעורך (שכבות+רקע, בלי base64 תמונות) ומחזיר משוב מובנה.
  app.post("/api/ai/critique", async (req: Request, res: Response) => {
    const { category, style, width, height, background, layers } = req.body || {};
    if (!Array.isArray(layers) || !width || !height) {
      return res.status(400).json({ error: "חסרים נתוני התבנית לביקורת" });
    }
    const ai = await critiqueDesign({ category, style, width, height, background: background || {}, layers });
    if (ai.ok && ai.data) return res.json(ai.data);
    res.status(502).json({ error: ai.error || "שגיאת AI", detail: ai.detail });
  });

  // ---- תבניות ----
  app.get("/api/templates", async (_req, res) => {
    const t = await storage.listTemplates();
    res.json(t);
  });
  app.get("/api/templates/:id", async (req, res) => {
    const t = await storage.getTemplate(Number(req.params.id));
    if (!t) return res.status(404).json({ error: "לא נמצאה תבנית" });
    res.json(t);
  });

  // ---- פרויקטים ----
  app.get("/api/projects", async (_req, res) => res.json(await storage.listProjects()));
  app.get("/api/projects/:id", async (req, res) => {
    const p = await storage.getProject(Number(req.params.id));
    if (!p) return res.status(404).json({ error: "לא נמצא פרויקט" });
    res.json(p);
  });
  app.post("/api/projects", async (req, res) => {
    const parsed = insertProjectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    res.json(await storage.createProject(parsed.data));
  });
  app.patch("/api/projects/:id", async (req, res) => {
    const p = await storage.updateProject(Number(req.params.id), req.body);
    if (!p) return res.status(404).json({ error: "לא נמצא פרויקט" });
    res.json(p);
  });
  app.delete("/api/projects/:id", async (req, res) => {
    await storage.deleteProject(Number(req.params.id));
    res.json({ ok: true });
  });

  /**
   * רקע AI — מייצר רק רקע/עיטור דקורטיבי (ללא טקסט/אנשים). הטקסט מולבש בצד הלקוח כשכבה.
   * שני מנועים לבחירת המשתמש (engine בגוף הבקשה, ברירת מחדל "gemini"):
   *   - gemini: Nano Banana Pro / gemini-3-pro-image — קומפוזיציה, תומך גם עריכת תמונה קיימת.
   *   - recraft: Recraft V4 — רקעים פוטוריאליסטיים (text-to-image בלבד, אין imageBase64).
   * שני המנועים ממשיכים לעבוד גם לאחר פרסום (custom-cred נשמר). מחזיר data URL.
   */
  app.post("/api/ai/background", async (req: Request, res: Response) => {
    const { prompt, aspectRatio, enhance, engine, imageBase64, imageMediaType } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "חסר תיאור לרקע" });

    if (engine === "recraft") {
      try {
        const finalPrompt = enhance !== false ? await enhanceBackgroundPrompt(prompt) : prompt;
        const result = await generateBackgroundRecraft(finalPrompt, aspectRatio || "4:5");
        if (!result.ok || !result.dataUrl) {
          return res.status(502).json({ error: result.error || "שגיאת Recraft", detail: result.detail });
        }
        return res.json({ dataUrl: result.dataUrl, prompt: finalPrompt, engine: "recraft" });
      } catch (recErr: any) {
        return res.status(502).json({ error: aiErr(recErr), detail: String(recErr?.message || recErr).slice(0, 300) });
      }
    }

    // ברירת מחדל — Gemini ישיר (Nano Banana Pro / gemini-3-pro-image) דרך המפתח בתשלום.
    try {
      const finalPrompt = enhance !== false ? await enhanceBackgroundPrompt(prompt) : prompt;
      const img = imageBase64
        ? await editImage(imageBase64, finalPrompt, imageMediaType || "image/png", aspectRatio || "4:5")
        : await generateBackground(finalPrompt, aspectRatio || "4:5");
      return res.json({ dataUrl: `data:${img.mimeType};base64,${img.base64}`, prompt: finalPrompt, engine: "gemini" });
    } catch (gemErr: any) {
      return res.status(502).json({ error: aiErr(gemErr), detail: String(gemErr?.message || gemErr).slice(0, 300) });
    }
  });

  // ═══════════════════ מחלקת מיתוג ═══════════════════
  // מטא-דאטה של מחלקת המיתוג: ארכיטיפים, שאלון, פונטים, מבנה ספר-מותג.
  app.get("/api/branding/meta", (_req, res) => {
    res.json({
      archetypes: ARCHETYPES,
      archetypeGroups: ARCHETYPE_GROUPS,
      aaker: AAKER_DIMENSIONS,
      briefCategories: BRIEF_CATEGORIES,
      coreQuestions: CORE_QUESTIONS,
      totalQuestions: TOTAL_QUESTIONS,
      brandBookSections: BRAND_BOOK_SECTIONS,
      hebrewFonts: HEBREW_FONTS,
      visualStyleToArchetype: VISUAL_STYLE_TO_ARCHETYPE,
    });
  });

  // רשימת מותגים שמורים
  app.get("/api/brands", async (_req, res) => {
    const list = await storage.listBrands();
    res.json(list);
  });

  // מותג יחיד
  app.get("/api/brands/:id", async (req, res) => {
    const b = await storage.getBrand(Number(req.params.id));
    if (!b) return res.status(404).json({ error: "מותג לא נמצא" });
    res.json(b);
  });

  // יצירת מותג חדש (שומר את הבריף)
  app.post("/api/brands", async (req, res) => {
    const parsed = insertBrandSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "נתונים לא תקינים", detail: parsed.error.message });
    const b = await storage.createBrand(parsed.data);
    res.json(b);
  });

  // עדכון מותג (בריף / kit / לוגו)
  app.patch("/api/brands/:id", async (req, res) => {
    const b = await storage.updateBrand(Number(req.params.id), req.body || {});
    if (!b) return res.status(404).json({ error: "מותג לא נמצא" });
    res.json(b);
  });

  // מחיקת מותג
  app.delete("/api/brands/:id", async (req, res) => {
    await storage.deleteBrand(Number(req.params.id));
    res.json({ ok: true });
  });

  // יצירת אסטרטגיית מותג + פלטה + טיפוגרפיה (Claude, עם גיבוי מקומי)
  app.post("/api/branding/strategy", async (req: Request, res: Response) => {
    const { brandName, brief, preferredArchetype } = req.body || {};
    if (!brandName) return res.status(400).json({ error: "חסר שם מותג" });
    try {
      const result = await generateStrategy({ brandName, brief: brief || {}, preferredArchetype });
      res.json(result);
    } catch (e: any) {
      res.status(502).json({ error: aiErr(e), detail: String(e?.message || e).slice(0, 300) });
    }
  });

  // גזירת פלטה/טיפוגרפיה מארכיטיפ בלבד (ללא AI) — לתצוגה מקדימה מהירה
  app.get("/api/branding/visuals/:archetype", (req, res) => {
    const arch = getArchetype(req.params.archetype);
    if (!arch) return res.status(404).json({ error: "ארכיטיפ לא נמצא" });
    res.json({ archetype: arch, ...deriveVisuals(arch.key) });
  });

  // יצירת קונספטי לוגו (Nano Banana Pro) — מחזיר data URLs
  app.post("/api/branding/logo", async (req: Request, res: Response) => {
    const { brandName, archetypeKey, palette, style, count } = req.body || {};
    if (!brandName) return res.status(400).json({ error: "חסר שם מותג" });
    if (!Array.isArray(palette) || palette.length === 0) return res.status(400).json({ error: "חסרה פלטת צבעים" });
    try {
      const result = await generateLogoConcepts({ brandName, archetypeKey: archetypeKey || "sage", palette, style, count });
      if (!result.ok) return res.status(502).json({ error: result.error || "יצירת לוגו נכשלה", detail: result.detail });
      const concepts = (result.concepts || []).map((c) => ({
        dataUrl: `data:${c.mimeType};base64,${c.base64}`,
        base64: c.base64,
        mimeType: c.mimeType,
        label: c.label,
        prompt: c.prompt,
      }));
      res.json({ ok: true, concepts });
    } catch (e: any) {
      res.status(502).json({ error: aiErr(e), detail: String(e?.message || e).slice(0, 300) });
    }
  });

  // וקטוריזציה של לוגו נבחר (Recraft) — מחזיר תוכן SVG
  app.post("/api/branding/vectorize", async (req: Request, res: Response) => {
    const { base64, mimeType } = req.body || {};
    if (!base64) return res.status(400).json({ error: "חסרה תמונה" });
    try {
      const result = await vectorizeLogo(base64, mimeType || "image/png");
      if (!result.ok) return res.status(502).json({ error: result.error || "וקטוריזציה נכשלה", detail: result.detail });
      res.json({ ok: true, svg: result.svg });
    } catch (e: any) {
      res.status(502).json({ error: "שגיאת וקטוריזציה: " + String(e?.message || e).slice(0, 200) });
    }
  });

  // הסרת רקע משכבת תמונה נבחרת (Recraft) — מחזיר data URL של PNG עם שקיפות
  app.post("/api/branding/remove-background", async (req: Request, res: Response) => {
    const { base64, mimeType } = req.body || {};
    if (!base64) return res.status(400).json({ error: "חסרה תמונה" });
    try {
      const result = await removeBackgroundImage(base64, mimeType || "image/png");
      if (!result.ok) return res.status(502).json({ error: result.error || "הסרת רקע נכשלה", detail: result.detail });
      res.json({ ok: true, dataUrl: result.dataUrl });
    } catch (e: any) {
      res.status(502).json({ error: "שגיאת הסרת רקע: " + String(e?.message || e).slice(0, 200) });
    }
  });

  return httpServer;
}

function aiErr(err: any): string {
  const raw = err?.message || String(err);
  if (/429|quota|prepayment|depleted|RESOURCE_EXHAUSTED/i.test(raw))
    return "מנוע ה-AI פעיל אך אין חיוב/קרדיט פעיל. השתמש ברקעים המובנים.";
  if (/403|API key|PERMISSION|invalid/i.test(raw))
    return "בעיית הרשאה במפתח ה-AI (403).";
  return "שגיאה ביצירת רקע AI: " + raw.slice(0, 200);
}
