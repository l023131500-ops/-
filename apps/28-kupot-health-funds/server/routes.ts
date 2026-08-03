import type { Express } from "express";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { storage } from "./storage";
import { insertSwitchLeadSchema, agentRequestSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import Anthropic from "@anthropic-ai/sdk";
import {
  insertLeadToSupabase,
  supabaseEnabled,
  useSupabaseStore,
  fetchTopicsFromSupabase,
  fetchTopicFromSupabase,
} from "./supabase";
import type { HfTopic } from "@shared/schema";
import { fundDetailsFor } from "./fund-details";

// קריאת נושאים — מ-Supabase בפרודקשן, אחרת מ-SQLite המקומי.
async function readTopics(): Promise<HfTopic[]> {
  return useSupabaseStore() ? fetchTopicsFromSupabase() : storage.listTopics();
}
async function readTopic(id: number): Promise<HfTopic | undefined> {
  return useSupabaseStore() ? fetchTopicFromSupabase(id) : storage.getTopic(id);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ---- מטא-דאטה (כותרת, ספירות, קטגוריות, קופות) ----
  app.get("/api/hf/meta", (_req, res) => {
    res.json(storage.getMeta());
  });

  // ---- כל הנושאים ----
  app.get("/api/hf/topics", async (_req, res) => {
    try {
      res.json(await readTopics());
    } catch (e: any) {
      console.error("[topics] error", e?.message || e);
      res.status(502).json({ error: "שגיאה בטעינת נושאים" });
    }
  });

  // ---- נושא בודד (כולל פירוט הכיסוי לכל קופה — ההשוואה עצמה) ----
  // הפירוט מוחזר רק כאן ולא ברשימה: הוא ~1.1MB לכל 435 הנושאים, ולכן צירופו
  // לרשימה היה מכפיל פי-3 את משקל טעינת העמוד בשביל מידע שנקרא נושא אחד בכל פעם.
  app.get("/api/hf/topics/:id", async (req, res) => {
    const id = Number(req.params.id);
    try {
      const topic = await readTopic(id);
      if (!topic) return res.status(404).json({ error: "נושא לא נמצא" });
      res.json({ ...topic, fundDetails: fundDetailsFor(topic.catalogNo) });
    } catch (e: any) {
      console.error("[topic] error", e?.message || e);
      res.status(502).json({ error: "שגיאה בטעינת נושא" });
    }
  });

  // ---- טופס מעבר קופה (ליד) ----
  app.post("/api/switch-lead", async (req, res) => {
    const parsed = insertSwitchLeadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: fromZodError(parsed.error).toString() });
    }
    // שמירה מקומית (SQLite) כגיבוי/מראה — קיימת רק בהרצה עם דיסק.
    // בפריסה serverless אין SQLite כלל (useSupabaseStore), ואז Supabase הוא
    // מקום השמירה היחיד; כתיבה כפולה הייתה מפילה את הבקשה על db=null.
    const lead = useSupabaseStore() ? null : storage.createSwitchLead(parsed.data);

    // כתיבה למאגר העצמאי ב-Supabase — נגיש גם לניהול בקלות
    let savedRemotely = false;
    if (supabaseEnabled()) {
      savedRemotely = await insertLeadToSupabase(parsed.data);
    }

    if (!lead && !savedRemotely) {
      return res.status(503).json({ error: "שמירת הפנייה נכשלה — נסו שוב מאוחר יותר" });
    }
    res.status(201).json({ ok: true, id: lead?.id ?? null });
  });

  // ---- (לניהול) רשימת פניות — מוגן בטוקן ניהול, אסור לחשוף ציבורית ----
  app.get("/api/switch-leads", (req, res) => {
    const adminToken = process.env.ADMIN_TOKEN;
    const provided = req.header("x-admin-token");
    if (!adminToken || provided !== adminToken) {
      return res.status(403).json({ error: "גישה נדחתה" });
    }
    res.json(storage.listSwitchLeads());
  });

  // ---- היועץ החכם — מבוסס אך ורק על מידע ציבורי בסיסי ----
  app.post("/api/agent", async (req, res) => {
    const parsed = agentRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: fromZodError(parsed.error).toString() });
    }
    const { topicId, question } = parsed.data;
    const topic = await readTopic(topicId);
    if (!topic) return res.status(404).json({ error: "נושא לא נמצא" });

    // ההקשר נבנה מפירוט הכיסוי האמיתי לכל קופה ומסלול. קודם הוזנה לכאן
    // `fundsAvailable`, שמחזיקה בכל 435 הנושאים בדיוק את אותה רשימת ארבע קופות
    // ומסלולים — קבוע, לא נתון — והמודל הסיק ממנה בביטחון "ההטבה מוצעת בכל
    // ארבע הקופות" ומנה מסלולים, קביעה שלא נבדקה לנושא הזה.
    const decided =
      !!topic.bestFund && !topic.bestFund.includes("טעון") && !topic.bestFund.includes("אין מידע");
    const details = fundDetailsFor(topic.catalogNo);
    const FUND_NAMES: Record<string, string> = {
      clalit: "כללית",
      maccabi: "מכבי",
      meuhedet: "מאוחדת",
      leumit: "לאומית",
    };

    const perFund = details
      ? Object.entries(details)
          .map(([key, plans]) => {
            const lines = plans
              .map((p) => {
                const facts = [
                  p.rate ? `שיעור ${p.rate}` : "",
                  p.amount ? `סכום ${p.amount}` : "",
                  p.waiting ? `תקופת המתנה ${p.waiting}` : "",
                ]
                  .filter(Boolean)
                  .join(", ");
                const body = p.text ? p.text.slice(0, 400) : "אין מידע במקורות שנסקרו";
                return `  · ${p.plan}${facts ? ` (${facts})` : ""}: ${body}`;
              })
              .join("\n");
            return `${FUND_NAMES[key] ?? key}:\n${lines}`;
          })
          .join("\n")
      : "";

    const context = [
      `נושא: ${topic.topic}`,
      topic.category ? `קטגוריה: ${topic.category}` : "",
      topic.audience ? `למי מיועד: ${topic.audience}` : "",
      topic.rangeText ? `מה ניתן לקבל (כללי): ${topic.rangeText}` : "",
      decided
        ? `המסלול הבולט בנושא לפי המקורות שנסקרו: ${topic.bestFund}`
        : "המקורות שנסקרו לא סימנו מסלול בולט אחד בנושא זה.",
      perFund ? `פירוט הכיסוי לפי קופה ומסלול (מתוך תקנוני השב״ן):\n${perFund}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const system = `את/ה יועץ/ת מידע בעברית רשמית ומכובדת עבור אתר "השוואת קופות חולים מבית בקלות".
מטרתך לסייע למשתמש להבין איזו קופת חולים או מסלול שירותי בריאות נוסף (שב"ן) עשוי להתאים לו לנושא מסוים, על סמך המידע הציבורי הבסיסי בלבד שמסופק לך.

כללי ברזל:
- הסתמך/י אך ורק על המידע שסופק בהקשר. אין להמציא נתונים.
- מותר ואף רצוי להשוות בין הקופות והמסלולים על סמך פירוט הכיסוי שסופק, ולציין שיעור, סכום ותקופת המתנה — אך אך ורק כפי שהם מופיעים בהקשר, ותוך ציון שם המסלול שממנו נלקחו.
- על מסלול שנאמר עליו בהקשר "אין מידע במקורות שנסקרו" — יש לומר זאת במפורש. אין להסיק ממנו שההטבה אינה קיימת, ואין להשלים את החסר בהשערה.
- אם ההקשר לא סימן מסלול בולט אחד — אמור/י זאת בכנות; מותר עדיין להציג את ההבדלים שכן מופיעים בפירוט.
- הבהר/י שהנתונים משקפים את תקנוני השב״ן כפי שנסקרו, ושתנאי הזכאות המדויקים מאומתים מול הקופה עצמה.
- שמור/י על נימה רשמית, אדיבה, בהירה ומכבדת. תשובות קצרות וממוקדות (עד ~5 משפטים).
- השב/י בטקסט עברי רצוד ופשוט בלבד. אין להשתמש ב-Markdown, בכותרות (#), בהדגשות (**), או בטבלאות. מותר למנות פריטים בשורות נפרדות עם מקף (-) בלבד.
- אין לתת ייעוץ רפואי. את/ה מסייע/ת רק בהתמצאות בזכויות ובהטבות.
- סיים/י בהמלצה עדינה: ניתן להשאיר פרטים לבדיקת מעבר/התאמת קופה דרך הטופס באתר.`;

    try {
      // מודל ומפתח נקבעים לפי הסביבה: בסנדבוקס — proxy (claude_sonnet_4_6);
      // בפרודקשן (Vercel) — מפתח Anthropic אמיתי + שם מודל אמיתי.
      const model = process.env.ANTHROPIC_MODEL || "claude_sonnet_4_6";
      const client = new Anthropic();
      const message = await client.messages.create({
        model,
        max_tokens: 700,
        system,
        messages: [
          {
            role: "user",
            content: `הקשר (מידע ציבורי בלבד):\n${context}\n\nשאלת המשתמש: ${question}`,
          },
        ],
      });
      const answer = message.content
        .filter((b: any) => b.type === "text")
        .map((b: any) => b.text)
        .join("\n")
        .trim();
      res.json({ answer: answer || "לא התקבלה תשובה. נא לנסות שוב." });
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("[agent] error", err?.message || err);
      res
        .status(502)
        .json({ error: "היועץ החכם אינו זמין כרגע. נא לנסות שוב מאוחר יותר." });
    }
  });

  return httpServer;
}
