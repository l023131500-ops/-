import type { Express } from "express";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { storage } from "./storage";
import { insertLeadSchema } from "@shared/schema";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://csjekrvukbdznetsrodj.supabase.co";
const ANON_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_Bv6ysG9LfUZ2lUPgZVZO6g_l1wEZIlX";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// Hardcoded fallback questionnaire (mirrors nadlan.questionnaire_templates, 6 sections).
const FALLBACK_QUESTIONNAIRE = [
  {
    section: "מטרת הרכישה",
    items: [
      { key: "purpose", type: "single", label: "מהי מטרת הרכישה?", options: ["מגורים", "השקעה להשכרה", "השקעה להשבחה/מכירה", "דירה לילדים"] },
      { key: "horizon", type: "single", label: "אופק ההחזקה המתוכנן", options: ["עד 3 שנים", "3-7 שנים", "7+ שנים"] },
    ],
  },
  {
    section: "תקציב ומימון",
    items: [
      { key: "budget", type: "number", label: "תקציב כולל (₪)" },
      { key: "equity", type: "number", label: "הון עצמי זמין (₪)" },
      { key: "mortgage_approved", type: "single", label: "האם יש אישור עקרוני למשכנתא?", options: ["כן", "לא", "בתהליך"] },
      { key: "monthly_capacity", type: "number", label: "החזר חודשי אפשרי (₪)" },
    ],
  },
  {
    section: "מאפייני הנכס הרצוי",
    items: [
      { key: "rooms", type: "single", label: "מספר חדרים רצוי", options: ["2", "3", "4", "5+"] },
      { key: "size_sqm", type: "number", label: 'שטח רצוי (מ"ר)' },
      { key: "floor_pref", type: "single", label: "העדפת קומה", options: ["קרקע/גן", "אמצע", "גבוהה", "פנטהאוז"] },
      { key: "parking", type: "single", label: "חניה הכרחית?", options: ["כן", "רצוי", "לא"] },
      { key: "elevator", type: "single", label: "מעלית הכרחית?", options: ["כן", "לא"] },
      { key: "condition", type: "single", label: "מצב הנכס", options: ["חדש מקבלן", "משופץ", "דורש שיפוץ", "לא משנה"] },
    ],
  },
  {
    section: "שיקולי סביבה",
    items: [
      { key: "prox_transit", type: "scale", label: "חשיבות קרבה לתחבורה ציבורית", min: 1, max: 5 },
      { key: "prox_school", type: "scale", label: "חשיבות קרבה למוסדות חינוך", min: 1, max: 5 },
      { key: "prox_synagogue", type: "scale", label: "חשיבות קרבה לבית כנסת/מוסדות דת", min: 1, max: 5 },
      { key: "prox_center", type: "scale", label: "חשיבות קרבה למרכזי מסחר", min: 1, max: 5 },
      { key: "quiet_roads", type: "scale", label: "רגישות לרעש מכבישים ראשיים", min: 1, max: 5 },
      { key: "community", type: "single", label: "התאמת אופי הקהילה", options: ["חילוני", "דתי-לאומי", "חרדי", "מעורב", "לא משנה"] },
    ],
  },
  {
    section: "שיקולי השבחה וסיכון",
    items: [
      { key: "urban_renewal_interest", type: "single", label: "עניין בפינוי-בינוי/תמא 38", options: ["מחפש במיוחד", "יתרון", "לא רלוונטי", "חשש"] },
      { key: "risk_tolerance", type: "single", label: "רמת סיכון מקובלת", options: ["נמוכה", "בינונית", "גבוהה"] },
      { key: "yield_target", type: "number", label: "תשואת שכירות מטרה (%)" },
    ],
  },
  {
    section: "פרטי התקשרות",
    items: [
      { key: "contact_time", type: "single", label: "זמן מועדף ליצירת קשר", options: ["בוקר", "צהריים", "ערב"] },
      { key: "notes", type: "text", label: "הערות נוספות" },
    ],
  },
];

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // --- GET /api/health : lightweight liveness probe (no external calls) ---
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "smel-ndln", version: "2" });
  });

  // --- POST /api/research : proxy the Edge Function + SQLite cache ---
  app.post("/api/research", async (req, res) => {
    try {
      const address = String(req.body?.address ?? "").trim();
      if (!address) {
        return res.status(400).json({ error: "כתובת חסרה" });
      }

      // Cache hit?
      const cached = await storage.getCachedResearch(address);
      if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return res.json(JSON.parse(cached.payload));
      }

      // Fetch from the Supabase Edge Function.
      const upstream = await fetch(
        `${SUPABASE_URL}/functions/v1/nadlan-smart-research`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ANON_KEY}`,
            apikey: ANON_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ address }),
        },
      );

      if (!upstream.ok) {
        const text = await upstream.text();
        // Fall back to stale cache if we have it.
        if (cached) return res.json(JSON.parse(cached.payload));
        return res
          .status(502)
          .json({ error: "שירות המחקר אינו זמין כרגע", detail: text });
      }

      const payload = await upstream.json();
      await storage.upsertResearch({
        address,
        payload: JSON.stringify(payload),
        fetchedAt: Date.now(),
      });
      return res.json(payload);
    } catch (err: any) {
      return res
        .status(500)
        .json({ error: "שגיאה בעת ביצוע המחקר", detail: String(err?.message ?? err) });
    }
  });

  // --- POST /api/lead : store locally + forward to Supabase (best-effort) ---
  app.post("/api/lead", async (req, res) => {
    try {
      const parsed = insertLeadSchema.safeParse({
        fullName: req.body?.fullName,
        phone: req.body?.phone,
        email: req.body?.email,
        address: req.body?.address,
        profileId: req.body?.profileId ?? null,
        answers:
          req.body?.answers != null
            ? typeof req.body.answers === "string"
              ? req.body.answers
              : JSON.stringify(req.body.answers)
            : null,
      });
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: "נתוני הליד אינם תקינים", detail: parsed.error.flatten() });
      }

      // 1) Always persist locally.
      const lead = await storage.createLead(parsed.data);

      // 2) Best-effort forward to Supabase nadlan.research_leads.
      let supabaseOk = false;
      try {
        const answersObj =
          typeof req.body?.answers === "string"
            ? JSON.parse(req.body.answers || "null")
            : (req.body?.answers ?? null);
        const upstream = await fetch(`${SUPABASE_URL}/rest/v1/research_leads`, {
          method: "POST",
          headers: {
            apikey: ANON_KEY,
            Authorization: `Bearer ${ANON_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
            "Content-Profile": "nadlan",
            "Accept-Profile": "nadlan",
          },
          body: JSON.stringify({
            full_name: parsed.data.fullName,
            phone: parsed.data.phone,
            email: parsed.data.email,
            query_address: parsed.data.address,
            profile_id: parsed.data.profileId ?? null,
            questionnaire: answersObj,
          }),
        });
        supabaseOk = upstream.ok;
        if (!upstream.ok) {
          console.warn(
            "[lead] Supabase insert failed:",
            upstream.status,
            await upstream.text(),
          );
        }
      } catch (fwdErr) {
        console.warn("[lead] Supabase forward error:", fwdErr);
      }

      return res.json({ ok: true, id: lead.id, supabaseOk });
    } catch (err: any) {
      return res
        .status(500)
        .json({ error: "שגיאה בשמירת הליד", detail: String(err?.message ?? err) });
    }
  });

  // --- GET /api/questionnaire : active template from Supabase, else fallback ---
  app.get("/api/questionnaire", async (_req, res) => {
    try {
      const upstream = await fetch(
        `${SUPABASE_URL}/rest/v1/questionnaire_templates?active=eq.true&select=*`,
        {
          headers: {
            apikey: ANON_KEY,
            Authorization: `Bearer ${ANON_KEY}`,
            "Accept-Profile": "nadlan",
          },
        },
      );
      if (upstream.ok) {
        const rows = await upstream.json();
        const tmpl = Array.isArray(rows) ? rows[0] : null;
        if (tmpl?.questions) {
          return res.json({
            title: tmpl.title ?? "שאלון התאמה אישית",
            sections: tmpl.questions,
          });
        }
      }
    } catch (err) {
      console.warn("[questionnaire] fallback used:", err);
    }
    return res.json({
      title: "שאלון כדאיות רכישת דירה",
      sections: FALLBACK_QUESTIONNAIRE,
    });
  });

  return httpServer;
}
