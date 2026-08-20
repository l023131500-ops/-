import type { Express } from "express";
import type { Server } from "node:http";
import crypto from "node:crypto";
import { sendYemotVoice } from "./yemot";
import { loadAll, updateOrgRow, updateRightRow, invalidateCache } from "./data-loader";
import * as customRights from "./custom-rights";
import type { OrgRow, RightRow } from "@shared/schema";
import {
  storage,
  sha256Hex,
  listSqliteTables,
  insertReminderResponse,
  listReminderResponses,
  sqlite,
} from "./storage";
import * as potential from "./potential-scanner";
import * as paramsTopics from "./params-topics";
import * as priceComparison from "./price-comparison";
import * as pcSupabase from "./pc-supabase-read";
import * as healthFunds from "./health-funds";
import { buildPodcastScript, generatePodcastAudio } from "./hf-podcast";
import * as pcImport from "./pc-import";
import * as pcIngest from "./pc-ingest";
import { renderReportHtml } from "./pc-report";
import express from "express";
import multer from "multer";
import * as community from "./community-questionnaire";
import { loginAdmin, requireAdmin, getSessionFromRequest, ADMIN_LOGIN_HINTS, type AuthedRequest } from "./auth";
import { registerFinancialRoutes } from "./fin-routes";
import { normalizeQuestions, mergeDeduped, isModestySensitive, buildEligibilityForRight } from "./question-normalizer";
import { dispatchWebhook, retryWebhookLog, DEFAULT_LEAD_WEBHOOK_URL } from "./webhook-bus";
import { registerGoogleAuthRoutes, getGoogleAuthStatus } from "./google-auth";
import { runAdvancedMatch } from "./advanced-match";
import {
  getInquiryTemplate,
  saveInquiryTemplate,
  renderInquiryReply,
  sendInquiryReply,
} from "./general-inquiry";
import { buildPublicChatbotConfig, composeChatbotAnswer } from "./chatbot";
import { registerExternalApi, loadApiSettings, saveApiSettings, rotateApiToken, clearApiToken } from "./api-external";
import { toTtsSafeHebrew } from "@shared/tts-hebrew";

const N8N_SERVICE_WEBHOOK_URL =
  process.env.BKALUT_N8N_WEBHOOK_URL ||
  "https://n8n.l023131500.work/webhook/NEDARIM3873";

const AUTOMATION_CHANNELS = [
  {
    key: "client_email",
    label: "מייל / הודעה כתובה ללקוח",
    target: "מערכת מייל, CRM, וואטסאפ או מערכת הודעות",
    primaryField: "emailScript",
    description: "נוסח תכלס ללקוח: מה לבדוק, מה להכין, איך מגישים ומה עלות שירות בקלות כאשר רלוונטי.",
  },
  {
    key: "voice_message",
    label: "הודעה קולית קצרה ללקוח",
    target: "מערכת טלפונית, וואטסאפ קולי או שירות TTS",
    primaryField: "voiceShort",
    description: "נוסח ממוקד להקראה קולית ללקוח, עם זכאות עיקרית ופעולה מעשית.",
  },
  {
    key: "voice_podcast",
    label: "פודקאסט / מערכת קולית",
    target: "מערכת קולית טלפונית או פלטפורמת תוכן קולי",
    primaryField: "podcastScript",
    description: "נוסח ארוך ומנוקד ככל שקיים במאגר, להסבר מלא במערכת קולית.",
  },
  {
    key: "video_generator",
    label: "יצירת סרטון אוטומטי",
    target: "מחולל וידאו / API ליצירת דמות מדברת",
    primaryField: "podcastScript",
    description: "טקסט להקראה + הוראות הפקה קבועות לדמות, פתיח, סיום ורקע לפי הנושא.",
  },
  {
    key: "eligibility_bot",
    label: "בוט בדיקת זכאות",
    target: "בוט אתר, בוט טלפוני או סוכן AI",
    primaryField: "eligibilityJson",
    description: "שאלות JSON לבדיקת זכאות ראשונית ללא קביעה סופית.",
  },
  {
    key: "intake_form",
    label: "שאלון קליטה פרטני",
    target: "טופס באתר / CRM / מערכת משרדית",
    primaryField: "intakeJson",
    description: "שאלות מפורטות לאיסוף נתונים לפני טיפול בתיק.",
  },
  {
    key: "documents_checklist",
    label: "רשימת מסמכים להגשה",
    target: "טופס, מייל ללקוח או רשימת משימות משרדית",
    primaryField: "documentsJson",
    description: "רשימת מסמכים מובנית לשליחה או לבדיקה מול הלקוח.",
  },
  {
    key: "public_site",
    label: "פרסום באתר לציבור",
    target: "אתר בקלות / דף מידע ציבורי",
    primaryField: "publicSiteText",
    description: "הסבר פשוט לציבור. יש לבדוק את שדה התאמה לציבור חרדי לפני פרסום.",
  },
  {
    key: "ai_agent",
    label: "סוכן AI פנימי לחיפוש והכוונה",
    target: "סוכן AI שמחפש בתוך המאגר",
    primaryField: "aiSearch + aiExtra",
    description: "טקסט חיפוש ומידע נוסף כדי שהסוכן ימצא התאמות ויזהיר ממכשולים.",
  },
] as const;

const SERVICE_REQUEST_TYPES = new Set(["info", "reminder", "treatment"]);

function requestTypeLabel(value: string) {
  if (value === "info") return "מידע בלבד";
  if (value === "reminder") return "קבלת תזכורת לביצוע המשימה";
  if (value === "treatment") return "טיפול בפועל במשימה";
  return value;
}

async function postServiceWebhook(payload: Record<string, unknown>) {
  // Resolve the webhook URL from the admin-configured automation registry
  // (key: webhook_rights_lead) so it can be edited from the /automations page
  // without redeploying. Fall back to env / hardcoded default if disabled.
  let endpointUrl = N8N_SERVICE_WEBHOOK_URL;
  let timeoutMs = 8000;
  try {
    const cfg = await storage.getAutomationConfig("webhook_rights_lead");
    if (cfg && cfg.enabled && cfg.endpointUrl) {
      endpointUrl = cfg.endpointUrl;
      try {
        const j = cfg.configJson ? JSON.parse(cfg.configJson) : {};
        if (j && typeof j.timeoutMs === "number") timeoutMs = j.timeoutMs;
      } catch (_) { /* ignore malformed config */ }
    }
  } catch (_) { /* storage may not be ready in tests */ }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "bkalut-rights-database/1.0",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      responseText: text.slice(0, 2000),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      responseText: error instanceof Error ? error.message : "webhook request failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function parseMaybeJson(raw: string) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

function compactText(value: string, fallback = "") {
  return value && value.trim() ? value.trim() : fallback;
}

function videoProductionPrompt(row: RightRow) {
  return [
    "Create a 2-3 minute Hebrew explainer video for Bkalut.",
    "Use one male Hebrew-speaking presenter who sounds warm, professional, trustworthy and clear.",
    "The presenter should look religious-traditional, not secular and not ultra-Orthodox, with modest professional clothing.",
    "No additional people should appear in the video.",
    "Place the Bkalut logo at the top throughout the video.",
    "Opening title: ארגון בקלות - כל מה שמגיע לך, בקלות.",
    `Topic: ${row.topic}.`,
    `Visual context: show a clean, modest Israeli office-style background connected to the topic category: ${row.category}.`,
    "Use slow, clear Hebrew pronunciation, without swallowing words.",
    "Use the supplied podcast/voice text as the exact narration text, preserving punctuation and Hebrew pronunciation.",
    "Closing screen: צריכים עזרה? ארגון בקלות כאן כדי לתת לכם תמיכה. ניתן לפנות במייל L0213135000@GMAIL.COM, בוואטסאפ 023131500, בטלפון 023131500, או באתר בקלות.",
  ].join("\n");
}

function buildRightAutomationPayload(row: RightRow, channel: string, clientName: string) {
  const channelMeta = AUTOMATION_CHANNELS.find((c) => c.key === channel) ?? AUTOMATION_CHANNELS[0];
  const name = clientName || "לקוח/ה";

  return {
    automationVersion: "bkalut-rights-v1",
    generatedAt: new Date().toISOString(),
    source: {
      system: "מאגר בקלות",
      dataSource: "bklot.xlsx",
      itemType: "right",
    },
    request: {
      channel: channelMeta.key,
      channelLabel: channelMeta.label,
      targetSystem: channelMeta.target,
      clientName: name,
    },
    item: {
      id: row.id,
      category: row.category,
      subCategory: row.subCategory,
      topic: row.topic,
      treatingBody: row.treatingBody,
      harediPublication: row.haredi,
      priority: row.priority,
      serviceUrl: row.serviceUrl,
    },
    routing: {
      recommendedAction:
        channelMeta.key === "eligibility_bot"
          ? "להציג שאלות זכאות ראשוניות"
          : channelMeta.key === "documents_checklist"
            ? "לשלוח רשימת מסמכים ללקוח ולפתוח משימה למעקב"
            : channelMeta.key === "video_generator"
              ? "לשלוח למחולל סרטון עם הוראות הפקה וטקסט הקראה"
              : "לשלוח את התוכן לערוץ המבוקש לאחר בדיקת התאמה פרטנית",
      requiresHumanReview: true,
      warning:
        "המידע מיועד להכוונה ומיצוי זכויות. אין לשלוח כהחלטת זכאות סופית בלי בדיקה מול התנאים והמסמכים.",
    },
    content: {
      clientDisplayName: name,
      title: row.topic,
      audience: row.audience,
      whatReceived: row.whatReceived,
      eligibility: row.eligibility,
      qualifyingCases: row.qualifyingCases,
      preparation: row.preparation,
      documents: row.documents,
      howToApply: row.howToApply,
      officialLinks: row.officialLinks,
      bkalutCost: row.bkalutCost,
      goldTip: row.goldTip,
      publicSiteText: compactText(row.publicSiteText),
      emailMessage: compactText(row.emailScript),
      voiceMessage: compactText(row.voiceShort),
      podcastScript: compactText(row.podcastScript),
      // Additive presentation-only fields: sums/percents/years rendered in
      // Hebrew words so downstream TTS / IVR / podcast engines pronounce
      // numbers correctly. The original numeric/raw fields above remain
      // unchanged so existing automation contracts keep working.
      voiceMessageTtsSafe: toTtsSafeHebrew(row.voiceShort),
      podcastScriptTtsSafe: toTtsSafeHebrew(row.podcastScript),
      videoPrompt: videoProductionPrompt(row),
      eligibilityQuestions: parseMaybeJson(row.eligibilityJson),
      intakeForm: parseMaybeJson(row.intakeJson),
      documentsRequired: parseMaybeJson(row.documentsJson),
      aiSearch: row.aiSearch,
      aiExtra: row.aiExtra,
      faq: row.faq,
      serviceUrl: row.serviceUrl,
    },
  };
}

function buildOrgAutomationPayload(row: OrgRow, channel: string, clientName: string) {
  const name = clientName || "לקוח/ה";
  return {
    automationVersion: "bkalut-orgs-v1",
    generatedAt: new Date().toISOString(),
    source: {
      system: "מאגר בקלות",
      dataSource: "bklot.xlsx",
      itemType: "organization",
    },
    request: {
      channel,
      channelLabel: "פנייה לעמותה / ארגון",
      targetSystem: "מייל, CRM, משימת משרד או הודעה ללקוח",
      clientName: name,
    },
    item: {
      id: row.id,
      category: row.category,
      name: row.name,
      bodyType: row.bodyType,
      harediPublication: row.haredi,
      sourceLink: row.sourceLink,
    },
    routing: {
      recommendedAction: "להציג ככיוון סיוע משלים בלבד, ולבדוק מול הארגון תנאים וזמינות עדכנית.",
      requiresHumanReview: true,
      warning: "סיוע מעמותה אינו זכות ממשלתית מחייבת. יש לאמת זמינות ותנאים מול הארגון לפני התחייבות ללקוח.",
    },
    content: {
      clientDisplayName: name,
      title: row.name,
      audience: row.audience,
      helpProvided: row.helpProvided,
      conditions: row.conditions,
      preparation: row.preparation,
      requirements: row.requirements,
      howToContact: row.howToContact,
      phoneEmail: row.phoneEmail,
    },
  };
}

function publicOrgRow(row: OrgRow) {
  const { internalNotes, ...publicRow } = row;
  return publicRow;
}

/**
 * Strip every internal/admin-only field from a RightRow before serving it to
 * the public site. Only fields that mirror the public image/Word export are
 * returned: category, sub-category, topic title, audience ("for whom"),
 * short public summary, what can be received (high-level), and the
 * service URL used for the eligibility-check CTA.
 */
function toPublicRight(row: RightRow) {
  return {
    id: row.id,
    category: row.category || "",
    subCategory: row.subCategory || "",
    topic: row.topic || "",
    audience: row.audience || "",
    whatReceived: row.whatReceived || "",
    publicSiteText: row.publicSiteText || "",
    serviceUrl: row.serviceUrl || "",
  };
}

function cleanPhone(value: unknown) {
  return String(value ?? "").replace(/[^\d+]/g, "").trim();
}

function potentialLevel(percent: number) {
  if (percent >= 75) return "פוטנציאל גבוה";
  if (percent >= 45) return "פוטנציאל בינוני";
  if (percent > 0) return "פוטנציאל נמוך";
  return "דורש בירור ראשוני";
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // Bind raw SQLite handle for ad-hoc tables (potential scanner, etc.)
  potential.bindSqliteDb(sqlite);
  paramsTopics.bindParamsTopicsDb(sqlite);
  customRights.bindCustomRightsDb(sqlite);
  priceComparison.bindPriceComparisonDb(sqlite);
  healthFunds.bindHealthFundsDb(sqlite);
  community.bindCommunityDb(sqlite);

  // Load XLSX lazily per request so edits are reflected immediately.
  const getData = () => loadAll();

  app.get("/api/meta", (_req, res) => {
    res.json(getData().meta);
  });

  app.get("/api/automation/schema", (_req, res) => {
    res.json({
      automationVersion: "bkalut-automation-schema-v1",
      description: "מיפוי שדות המאגר לשליחה אוטומטית לפי ערוץ: מייל, הודעה קולית, מערכת קולית, סרטון, בוט זכאות, טפסים וסוכן AI.",
      channels: AUTOMATION_CHANNELS,
      itemTypes: [
        {
          key: "right",
          label: "זכות / הטבה / חיסכון כלכלי",
          endpoint: "/api/automation/rights/:id?channel=client_email&clientName=שם",
        },
        {
          key: "organization",
          label: "עמותה / ארגון סיוע",
          endpoint: "/api/automation/orgs/:id?channel=client_email&clientName=שם",
        },
      ],
      rightFields: [
        { key: "topic", hebrew: "שם הנושא", usage: "כותרת לכל שליחה, סרטון, פודקאסט או משימת משרד." },
        { key: "audience", hebrew: "קהל יעד ברור", usage: "מי האדם שעבורו בודקים התאמה." },
        { key: "whatReceived", hebrew: "מה ניתן לקבל בפועל וסוג התשלום", usage: "התועלת הכספית או המעשית, כולל סוג תשלום וסכומים אם קיימים במאגר." },
        { key: "eligibility", hebrew: "תנאי זכאות ברורים", usage: "תנאי הסף המרכזיים לפני פתיחת טיפול." },
        { key: "qualifyingCases", hebrew: "מקרים שמזכים / לא מזכים", usage: "דקויות שמונעות טעויות בהפניה או בשליחה." },
        { key: "preparation", hebrew: "מה צריך להכין מראש", usage: "רשימת הכנות ללקוח או לצוות." },
        { key: "documents", hebrew: "מסמכים שצריך לצרף", usage: "רשימת מסמכים קריאה לאדם." },
        { key: "howToApply", hebrew: "איך מגישים בפועל", usage: "הנחיות הגשה מעשיות: אתר, אזור אישי, טופס, מייל, פקס או סניף." },
        { key: "officialLinks", hebrew: "קישורים וטפסים רשמיים", usage: "מקורות וקישורי פעולה להטמעה או לפתיחה מתוך המשרד." },
        { key: "bkalutCost", hebrew: "עלות שירות בקלות", usage: "נשלח רק בערוצים שמיועדים ללקוח או לשימוש פנימי, לא בפרסום ציבורי אם לא רוצים." },
        { key: "publicSiteText", hebrew: "הסבר פשוט לפרסום באתר", usage: "תוכן ציבורי גלוי באתר." },
        { key: "podcastScript", hebrew: "נוסח פודקאסט / מערכת קולית ארוך", usage: "תוכן למערכת קולית, TTS, פודקאסט וסרטון." },
        { key: "podcastScriptTtsSafe", hebrew: "נוסח פודקאסט מותאם להקראה אוטומטית", usage: "אותו תוכן עם סכומים, אחוזים ושנים בהמרה למילים בעברית. נשלח בנוסף ולא במקום השדה המקורי." },
        { key: "voiceShort", hebrew: "נוסח הודעה קולית קצרה ללקוח", usage: "שליחה קולית קצרה וממוקדת." },
        { key: "voiceMessageTtsSafe", hebrew: "נוסח הודעה קולית מותאם להקראה אוטומטית", usage: "אותו תוכן עם מספרים בעברית מילולית. עוזר למנוע הקראה שגויה של ספרות וסימני שקל." },
        { key: "emailScript", hebrew: "נוסח מייל / הודעה תכלס ללקוח", usage: "שליחה כתובה ישירה ללקוח." },
        { key: "eligibilityJson", hebrew: "שאלות לבדיקת זכאות (JSON)", usage: "בוט ראשוני לבדיקת התאמה." },
        { key: "intakeJson", hebrew: "שאלון פרטני (JSON)", usage: "טופס קליטה מלא לפני טיפול." },
        { key: "documentsJson", hebrew: "מסמכים נדרשים בטופס (JSON)", usage: "צ'ק ליסט מסמכים ממוכן." },
        { key: "aiSearch", hebrew: "AI לסוכן חיפוש", usage: "עזרה לסוכן להבין אילו מילים ומצבים קשורים לזכות." },
        { key: "aiExtra", hebrew: "מידע נוסף לסוכן AI", usage: "הרחבות, מכשולים, מתי כן ומתי לא." },
        { key: "haredi", hebrew: "התאמה לפרסום לציבור חרדי", usage: "סינון לפני פרסום או שליחה ציבורית." },
        { key: "serviceUrl", hebrew: "קישור לשירות", usage: "קישור לטופס הדיגיטלי של אותו נושא עבור לקוח." },
      ],
    });
  });

  app.get("/api/clients", requireAdmin, async (_req, res) => {
    const list = await storage.listClients();
    res.json(list);
  });

  app.get("/api/clients/by-phone", async (req, res) => {
    const phone = cleanPhone(req.query.phone);
    if (!phone || phone.length < 6) return res.json(null);
    const client = await storage.getClientByPhone(phone);
    if (!client) return res.json(null);
    res.json(client);
  });

  app.get("/api/service-submissions", async (_req, res) => {
    res.json(await storage.listServiceSubmissions());
  });

  app.get("/api/crm/submissions", async (_req, res) => {
    res.json(await storage.listServiceSubmissionRows());
  });

  app.post("/api/service-submissions", async (req, res) => {
    const body = req.body ?? {};
    const rightId = Number(body.rightId);
    const row = getData().rights.find((r) => r.id === rightId);
    if (!row) return res.status(404).json({ message: "right not found" });
    if (!body.termsAccepted) return res.status(400).json({ message: "terms must be accepted" });
    const details = body.details ?? {};
    const requestType = String(body.requestType || "").trim();
    if (!SERVICE_REQUEST_TYPES.has(requestType)) return res.status(400).json({ message: "request type is required" });
    const phone = cleanPhone(details.phone ?? details.tel ?? details.mobile ?? body.client?.phone);
    if (!phone || phone.length < 6) return res.status(400).json({ message: "phone is required" });
    const fullName = String(details.full_name ?? details.fullName ?? details.name ?? body.client?.fullName ?? "").trim();
    if (!fullName) return res.status(400).json({ message: "full name is required" });
    const email = String(details.email ?? body.client?.email ?? "").trim();
    if (!email) return res.status(400).json({ message: "email is required" });
    const submission = await storage.createServiceSubmission({
      client: {
        fullName,
        phone,
        email,
        idNumber: String(details.id_number ?? details.idNumber ?? "").trim(),
        birthDate: String(details.birth_date ?? details.birthDate ?? "").trim(),
        city: String(details.city ?? "").trim(),
        familyStatus: String(details.family_status ?? details.familyStatus ?? "").trim(),
      },
      rightId,
      topic: row.topic,
      category: row.category,
      requestType,
      potentialPercent: Number(body.potentialPercent) || 0,
      potentialLevel: potentialLevel(Number(body.potentialPercent) || 0),
      answers: body.answers ?? {},
      details,
      documents: body.documents ?? {},
      additionalTopics: body.additionalTopics ?? [],
      termsAccepted: Boolean(body.termsAccepted),
    });
    // Record legal acceptances if provided (e.g. terms, privacy, POA, fee
    // agreement). The form should send legalAccepted: { terms: "1.0", ... }.
    const legal = body.legalAccepted && typeof body.legalAccepted === "object" ? body.legalAccepted : null;
    if (legal) {
      for (const [docKey, docVersion] of Object.entries(legal)) {
        if (!docVersion) continue;
        try {
          await storage.createLegalAcceptance({
            documentKey: String(docKey),
            documentVersion: String(docVersion),
            subjectKind: "submission",
            subjectId: submission.id,
            fullName: fullName,
            identifier: email || phone,
            signatureMethod: "checkbox",
            signatureValue: fullName,
            ipAddress: String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || ""),
            userAgent: String(req.headers["user-agent"] || ""),
          });
        } catch (e) {
          console.warn("legal acceptance log failed", e);
        }
      }
    }

    // Build the full payload per latest spec: every customer inquiry must
    // include source/origin, request type, topic/right/financial module,
    // questionnaire answers, document metadata, score, contact, selected path,
    // assigned admin/user, timestamps, and status.
    const webhookPayload = {
      source: "bkalut_service_form",
      origin: {
        site: "bkalut-app",
        page: "/service/" + row.id,
        form: "rights_service_form",
        leadKind: "rights",
      },
      submittedAt: new Date().toISOString(),
      submissionId: submission.id,
      clientId: submission.clientId,
      requestType,
      requestTypeLabel: requestTypeLabel(requestType),
      selectedPath: requestTypeLabel(requestType),
      potentialPercent: submission.potentialPercent,
      potentialLevel: submission.potentialLevel,
      score: submission.potentialPercent,
      status: "new",
      assignedAdmin: null,
      assignedUser: null,
      right: {
        id: row.id,
        category: row.category,
        subCategory: row.subCategory,
        topic: row.topic,
        treatingBody: row.treatingBody,
        audience: row.audience,
        whatReceived: row.whatReceived,
        eligibility: row.eligibility,
        howToApply: row.howToApply,
        officialLinks: row.officialLinks,
        bkalutCost: row.bkalutCost,
        serviceUrl: row.serviceUrl,
      },
      client: {
        fullName,
        phone,
        email,
        idNumber: String(details.id_number ?? details.idNumber ?? "").trim(),
        birthDate: String(details.birth_date ?? details.birthDate ?? "").trim(),
        city: String(details.city ?? "").trim(),
        familyStatus: String(details.family_status ?? details.familyStatus ?? "").trim(),
      },
      questionnaireAnswers: body.answers ?? {},
      details,
      requiredDocuments: body.documents ?? {},
      additionalTopics: body.additionalTopics ?? [],
      // Combined view: a single submission can carry multiple requested
      // topics. The primary topic is the one the user opened the form for;
      // additional topics are picked from the cross-category catalog and
      // share the same contact info. Downstream automation can iterate over
      // `requestedTopics` to treat each topic as an item under one client
      // request, without us creating multiple internal records.
      requestedTopics: [
        {
          id: row.id,
          topic: row.topic,
          category: row.category,
          subCategory: row.subCategory,
          isPrimary: true,
        },
        ...(Array.isArray(body.additionalTopics) ? body.additionalTopics : []).map((t: any) => ({
          id: Number(t?.id) || null,
          topic: String(t?.topic || ""),
          category: String(t?.category || ""),
          subCategory: String(t?.subCategory || ""),
          isPrimary: false,
        })),
      ],
      legalAccepted: legal,
      termsAccepted: Boolean(body.termsAccepted),
    };

    // Dispatch through the unified bus (logs + posts to NEDARIM3873).
    const dispatchResult = await dispatchWebhook({
      source: "bkalut_service_form",
      configKey: "webhook_rights_lead",
      relatedKind: "submission",
      relatedId: submission.id,
      payload: webhookPayload,
    });

    await storage.updateServiceSubmissionWebhook(
      submission.id,
      dispatchResult.ok ? "sent" : "failed",
      `HTTP ${dispatchResult.status}: ${dispatchResult.responseText}`,
    );
    res.json({
      ok: true,
      submissionId: submission.id,
      clientId: submission.clientId,
      potentialLevel: submission.potentialLevel,
      potentialPercent: submission.potentialPercent,
      webhook: {
        ok: dispatchResult.ok,
        status: dispatchResult.status,
        endpointUrl: dispatchResult.endpointUrl,
        logId: dispatchResult.logId,
      },
    });
  });

  // Legacy full-detail rights endpoints. These return every internal field
  // (eligibilityJson, intakeJson, documentsJson, scripts, gold tip, internal
  // eligibility text, treating body, internal costs, sources, notes, etc.)
  // and therefore MUST stay behind admin authentication. Any public-facing
  // flow should use /api/public/rights, /api/public/rights/:id, or
  // /api/public/service-context/:id instead.
  app.get("/api/rights", requireAdmin, (_req, res) => {
    res.json(getData().rights);
  });

  app.get("/api/rights/:id", requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const row = getData().rights.find((r) => r.id === id);
    if (!row) return res.status(404).json({ message: "not found" });
    res.json(row);
  });

  // Public-facing rights endpoints: return only basic public info matching
  // the public topic image export. Internal fields (eligibilityJson, intakeJson,
  // documentsJson, scripts, gold tip, official links, internal eligibility
  // text, how to apply, treating body, etc.) are intentionally omitted.
  app.get("/api/public/rights", (_req, res) => {
    res.json(getData().rights.map(toPublicRight));
  });
  app.get("/api/public/rights/:id", (req, res) => {
    const id = Number(req.params.id);
    const row = getData().rights.find((r) => r.id === id);
    if (!row) return res.status(404).json({ message: "not found" });
    res.json(toPublicRight(row));
  });

  // Public service-context endpoint. Powers the public /#/service/:id form.
  // Returns only what the form genuinely needs: identifying info, the basic
  // public summary, normalized questionnaire (questions/intake/documents
  // already stripped to safe field shape by the normalizer), and a slim list
  // of sibling topics in the same category so the "additional topics" picker
  // can render without exposing the full database.
  app.get("/api/public/service-context/:id", (req, res) => {
    const id = Number(req.params.id);
    const all = getData().rights;
    const row = all.find((r) => r.id === id);
    if (!row) return res.status(404).json({ message: "not found" });
    const parsedEligibility = normalizeQuestions(row.eligibilityJson, "eligibility");
    const eligibility = buildEligibilityForRight({
      parsed: parsedEligibility,
      topic: row.topic,
      category: row.category,
      audience: row.audience,
      eligibilityText: row.eligibility,
      publicSiteText: row.publicSiteText,
    });
    const intake = normalizeQuestions(row.intakeJson, "intake");
    const documents = normalizeQuestions(row.documentsJson, "documents");
    res.json({
      id: row.id,
      topic: row.topic,
      category: row.category,
      subCategory: row.subCategory || "",
      audience: row.audience || "",
      whatReceived: row.whatReceived || "",
      publicSiteText: row.publicSiteText || "",
      eligibility,
      intake: mergeDeduped(eligibility, intake).slice(eligibility.length),
      documents,
      sensitive: isModestySensitive(row.haredi, row.topic, row.category),
      categoryTopics: all
        .filter((r) => r.category === row.category && r.id !== row.id)
        .map((r) => ({ id: r.id, topic: r.topic, category: r.category }))
        .slice(0, 60),
    });
  });

  app.patch("/api/rights/:id", requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    try {
      if (id >= customRights.CUSTOM_RIGHT_ID_OFFSET) {
        const updated = customRights.update(id, req.body ?? {});
        if (!updated) return res.status(404).json({ message: "not found" });
        invalidateCache();
        return res.json(updated);
      }
      const updated = updateRightRow(id, req.body ?? {});
      res.json(updated);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "update failed" });
    }
  });

  // Admin-only append-only "הוסף נושא חדש" endpoint. Adds a row to the
  // custom_rights table — appended after the XLSX rows, so existing rights
  // order / IDs are preserved. Read endpoints (/api/rights, /api/public/rights,
  // /api/automation/rights/:id) automatically see custom rows via data-loader.
  app.post("/api/rights", requireAdmin, (req: AuthedRequest, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const created = customRights.create({
        topic: String(body.topic || ""),
        category: typeof body.category === "string" ? body.category : "",
        subCategory: typeof body.subCategory === "string" ? body.subCategory : "",
        audience: typeof body.audience === "string" ? body.audience : "",
        whatReceived: typeof body.whatReceived === "string" ? body.whatReceived : "",
        publicSiteText: typeof body.publicSiteText === "string" ? body.publicSiteText : "",
        treatingBody: typeof body.treatingBody === "string" ? body.treatingBody : "",
        haredi: typeof body.haredi === "string" ? body.haredi : "",
        priority: typeof body.priority === "number" ? body.priority : undefined,
        eligibility: typeof body.eligibility === "string" ? body.eligibility : "",
        qualifyingCases: typeof body.qualifyingCases === "string" ? body.qualifyingCases : "",
        preparation: typeof body.preparation === "string" ? body.preparation : "",
        documents: typeof body.documents === "string" ? body.documents : "",
        howToApply: typeof body.howToApply === "string" ? body.howToApply : "",
        officialLinks: typeof body.officialLinks === "string" ? body.officialLinks : "",
        bkalutCost: typeof body.bkalutCost === "string" ? body.bkalutCost : "",
        faq: typeof body.faq === "string" ? body.faq : "",
        goldTip: typeof body.goldTip === "string" ? body.goldTip : "",
        eligibilityJson: typeof body.eligibilityJson === "string" ? body.eligibilityJson : "",
        intakeJson: typeof body.intakeJson === "string" ? body.intakeJson : "",
        documentsJson: typeof body.documentsJson === "string" ? body.documentsJson : "",
        podcastScript: typeof body.podcastScript === "string" ? body.podcastScript : "",
        voiceShort: typeof body.voiceShort === "string" ? body.voiceShort : "",
        emailScript: typeof body.emailScript === "string" ? body.emailScript : "",
        aiSearch: typeof body.aiSearch === "string" ? body.aiSearch : "",
        aiExtra: typeof body.aiExtra === "string" ? body.aiExtra : "",
        serviceUrl: typeof body.serviceUrl === "string" ? body.serviceUrl : "",
        createdBy: req.adminSession?.identity ?? "",
      });
      invalidateCache();
      res.json(created);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "create failed" });
    }
  });

  app.delete("/api/rights/:id", requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    if (id < customRights.CUSTOM_RIGHT_ID_OFFSET) {
      return res.status(400).json({ message: "ניתן למחוק רק נושאים שנוספו דרך 'הוסף נושא חדש'." });
    }
    customRights.remove(id);
    invalidateCache();
    res.json({ ok: true });
  });

  // Automation payload contains every internal field (scripts, eligibility/
  // intake/documents JSON, internal costs, gold tip, etc.). It is intended for
  // server-to-server use by trusted automations (n8n) — gate it behind admin
  // auth so it cannot be scraped anonymously.
  app.get("/api/automation/rights/:id", requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const row = getData().rights.find((r) => r.id === id);
    if (!row) return res.status(404).json({ message: "not found" });
    const channel = String(req.query.channel || "client_email");
    const clientName = String(req.query.clientName || "");
    res.json(buildRightAutomationPayload(row, channel, clientName));
  });

  app.get("/api/orgs", requireAdmin, (_req, res) => {
    res.json(getData().orgs.map(publicOrgRow));
  });

  app.get("/api/orgs/:id", requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const row = getData().orgs.find((o) => o.id === id);
    if (!row) return res.status(404).json({ message: "not found" });
    res.json(publicOrgRow(row));
  });

  app.patch("/api/orgs/:id", requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    try {
      const updated = updateOrgRow(id, req.body ?? {});
      res.json(publicOrgRow(updated));
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "update failed" });
    }
  });

  app.get("/api/automation/orgs/:id", requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const row = getData().orgs.find((o) => o.id === id);
    if (!row) return res.status(404).json({ message: "not found" });
    const channel = String(req.query.channel || "client_email");
    const clientName = String(req.query.clientName || "");
    res.json(buildOrgAutomationPayload(row, channel, clientName));
  });

  // ============ Normalized questionnaire for a right ============
  app.get("/api/rights/:id/questionnaire", (req, res) => {
    const id = Number(req.params.id);
    const row = getData().rights.find((r) => r.id === id);
    if (!row) return res.status(404).json({ message: "not found" });
    const parsedEligibility = normalizeQuestions(row.eligibilityJson, "eligibility");
    const eligibility = buildEligibilityForRight({
      parsed: parsedEligibility,
      topic: row.topic,
      category: row.category,
      audience: row.audience,
      eligibilityText: row.eligibility,
      publicSiteText: row.publicSiteText,
    });
    const intake = normalizeQuestions(row.intakeJson, "intake");
    const documents = normalizeQuestions(row.documentsJson, "documents");
    res.json({
      id: row.id,
      topic: row.topic,
      category: row.category,
      eligibility,
      intake: mergeDeduped(eligibility, intake).slice(eligibility.length), // intake without dups against eligibility
      documents,
      sensitive: isModestySensitive(row.haredi, row.topic, row.category),
    });
  });

  // ============ Smart assistant (guided search) ============
  app.get("/api/assistant/search", (req, res) => {
    const q = String(req.query.q || "").trim().toLowerCase();
    const { rights, orgs } = getData();
    if (!q) {
      return res.json({
        suggestions: [
          { label: "משפחה עם ילדים", terms: ["משפחה", "ילדים", "קצבתים"] },
          { label: "הכנסה נמוכה", terms: ["הכנסה נמוכה", "הבטחת הכנסה", "מענק עבודה"] },
          { label: "משכנתאות והנחות", terms: ["משכנתאות", "דיור", "הנחת דיור"] },
          { label: "בריאות", terms: ["בריאות", "משרד הבריאות", "טיפולים"] },
          { label: "בעלי עסק", terms: ["עוסק", "עצמאי", "מעסיק"] },
        ],
      });
    }
    const tokens = q.split(/\s+/).filter(Boolean);
    function score(text: string) {
      const lower = text.toLowerCase();
      let s = 0;
      for (const t of tokens) {
        if (lower.includes(t)) s += t.length;
      }
      return s;
    }
    const rightHits = rights
      .map((r) => ({ kind: "right" as const, item: r, s: score([r.topic, r.category, r.subCategory, r.audience, r.whatReceived, r.eligibility, r.aiSearch, r.aiExtra].join(" ")) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 12)
      .map((x) => ({ kind: x.kind, id: x.item.id, topic: x.item.topic, category: x.item.category, snippet: x.item.publicSiteText?.slice(0, 200) || x.item.whatReceived?.slice(0, 200) || "" }));
    const orgHits = orgs
      .map((o) => ({ kind: "org" as const, item: o, s: score([o.name, o.category, o.bodyType, o.audience, o.helpProvided].join(" ")) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 6)
      .map((x) => ({ kind: x.kind, id: x.item.id, name: x.item.name, category: x.item.category, snippet: (x.item.helpProvided || "").slice(0, 200) }));
    res.json({ query: q, rights: rightHits, orgs: orgHits });
  });

  // Block all /api/admin/* on the main domain — only reachable from the admin subdomain.
  // In development (localhost) the check is skipped so local work is unaffected.
  app.use("/api/admin", (req, res, next) => {
    const host = req.hostname || "";
    const isDev = process.env.NODE_ENV === "development";
    const isLocal = host === "localhost" || host === "127.0.0.1";
    if (!isDev && !isLocal && !host.startsWith("admin.")) {
      res.status(404).json({ message: "not found" });
      return;
    }
    next();
  });

  // ============ Admin auth ============
  app.post("/api/admin/login", async (req, res) => {
    const identity = String(req.body?.identity ?? req.body?.email ?? "").trim();
    // Accept either `password` (new) or `code` (legacy) from clients.
    const password = String(req.body?.password ?? req.body?.code ?? "").trim();
    if (!identity || !password) {
      return res.status(400).json({ ok: false, message: "חסרים פרטי התחברות" });
    }
    const result = await loginAdmin(identity, password);
    if (!result.ok) return res.status(401).json({ ok: false, message: result.reason });
    res.json({
      ok: true,
      token: result.session.token,
      identity: result.session.identity,
      role: result.session.role,
      expiresAt: result.session.expiresAt,
    });
  });

  app.post("/api/admin/logout", async (req: AuthedRequest, res) => {
    const session = await getSessionFromRequest(req);
    if (session) await storage.deleteAdminSession(session.token);
    res.json({ ok: true });
  });

  app.get("/api/admin/me", async (req: AuthedRequest, res) => {
    const session = await getSessionFromRequest(req);
    if (!session) return res.status(401).json({ ok: false });
    res.json({
      ok: true,
      identity: session.identity,
      role: session.role,
      expiresAt: session.expiresAt,
    });
  });

  app.get("/api/admin/login-hints", (_req, res) => {
    res.json(ADMIN_LOGIN_HINTS);
  });

  // ============ App Users (managed users) ============
  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
    const list = await storage.listAppUsers();
    res.json(list.map((u) => ({
      ...u,
      productAccess: safeJsonArray(u.productAccessJson),
      // intentionally expose passwordPlain status (boolean only is enough for the UI,
      // but here we keep the value so admin can copy it manually too — it is cleared
      // automatically after successful credentials delivery).
    })));
  });

  app.post("/api/admin/users", requireAdmin, async (req, res) => {
    const body = req.body ?? {};
    if (!body.fullName) return res.status(400).json({ message: "שם מלא חובה" });
    const created = await storage.createAppUser({
      fullName: String(body.fullName),
      email: body.email ? String(body.email) : "",
      username: body.username ? String(body.username) : undefined,
      phone: body.phone ? String(body.phone) : "",
      password: body.password ? String(body.password) : undefined,
      role: body.role ? String(body.role) : "user",
      status: body.status ? String(body.status) : "active",
      productAccess: Array.isArray(body.productAccess) ? body.productAccess.map(String) : [],
      plan: body.plan ? String(body.plan) : "basic",
      finClientId: body.finClientId ? Number(body.finClientId) : null,
      notes: body.notes ? String(body.notes) : "",
    });
    res.json({ ...created, productAccess: safeJsonArray(created.productAccessJson) });
  });

  app.patch("/api/admin/users/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const body = req.body ?? {};
    const patch: any = {};
    if (body.fullName !== undefined) patch.fullName = String(body.fullName);
    if (body.email !== undefined) patch.email = String(body.email);
    if (body.username !== undefined) patch.username = String(body.username);
    if (body.phone !== undefined) patch.phone = String(body.phone);
    if (body.password !== undefined && body.password) patch.password = String(body.password);
    if (body.role !== undefined) patch.role = String(body.role);
    if (body.status !== undefined) patch.status = String(body.status);
    if (body.notes !== undefined) patch.notes = String(body.notes);
    if (body.plan !== undefined) patch.plan = String(body.plan);
    if (body.finClientId !== undefined) patch.finClientId = body.finClientId === null ? null : Number(body.finClientId);
    if (Array.isArray(body.productAccess)) patch.productAccess = body.productAccess.map(String);
    const updated = await storage.updateAppUser(id, patch);
    if (!updated) return res.status(404).json({ message: "not found" });
    res.json({ ...updated, productAccess: safeJsonArray(updated.productAccessJson) });
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    await storage.deleteAppUser(Number(req.params.id));
    res.json({ ok: true });
  });

  // ============ Delivery queue / messages ============
  app.get("/api/admin/delivery", requireAdmin, async (_req, res) => {
    const list = await storage.listDeliveryMessages();
    res.json(list.sort((a, b) => b.id - a.id));
  });

  app.post("/api/admin/delivery", requireAdmin, async (req: AuthedRequest, res) => {
    const body = req.body ?? {};
    const channel = String(body.channel ?? "email");
    if (!["email", "whatsapp", "voice", "n8n"].includes(channel)) {
      return res.status(400).json({ message: "channel חובה" });
    }
    const created = await storage.createDeliveryMessage({
      channel,
      recipientType: String(body.recipientType ?? "manual"),
      recipientId: body.recipientId ? Number(body.recipientId) : null,
      recipientLabel: String(body.recipientLabel ?? ""),
      toAddress: String(body.toAddress ?? ""),
      subject: body.subject ? String(body.subject) : "",
      body: String(body.body ?? ""),
      callbackUrl: body.callbackUrl ? String(body.callbackUrl) : "",
      scheduledAt: body.scheduledAt ? String(body.scheduledAt) : "",
      createdBy: req.adminSession?.identity ?? "",
    });
    res.json(created);
  });

  app.patch("/api/admin/delivery/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const body = req.body ?? {};
    const patch: any = {};
    for (const k of ["channel", "recipientLabel", "toAddress", "subject", "body", "callbackUrl", "status", "statusDetail", "scheduledAt"]) {
      if (body[k] !== undefined) patch[k] = String(body[k]);
    }
    const updated = await storage.updateDeliveryMessage(id, patch);
    if (!updated) return res.status(404).json({ message: "not found" });
    res.json(updated);
  });

  app.delete("/api/admin/delivery/:id", requireAdmin, async (req, res) => {
    await storage.deleteDeliveryMessage(Number(req.params.id));
    res.json({ ok: true });
  });

  app.post("/api/admin/delivery/:id/send", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const msg = await storage.getDeliveryMessage(id);
    if (!msg) return res.status(404).json({ message: "not found" });

    // ערוץ voice + YEMOT_API_KEY → ימות המשיח ישירות, עוקף את בדיקת ה-connector
    if (msg.channel === "voice" && process.env.YEMOT_API_KEY) {
      const phone = msg.toAddress ?? "";
      const ttsMessage = msg.subject ?? msg.body ?? "שלום, יש לך הודעה חדשה מבקלות. לשמיעה הקישו 3 בשיחה חוזרת.";
      const extension3Text = msg.body ?? undefined;
      const yemot = await sendYemotVoice(phone, ttsMessage, extension3Text);
      await storage.updateDeliveryMessage(id, {
        status: yemot.ok ? "sent" : "failed",
        statusDetail: yemot.detail,
        endpointUsed: "yemot-direct",
        responseText: JSON.stringify({ whitelist: yemot.whitelist, extension3: yemot.extension3, tts: yemot.tts }),
        sentAt: new Date().toISOString(),
        attempts: (msg.attempts ?? 0) + 1,
      } as any);
      return res.json({ ok: yemot.ok, delivered: yemot.ok, detail: yemot.detail });
    }

    // ערוצים אחרים — בדיקת connector רגילה
    const config = await storage.getAutomationConfig(msg.channel);
    if (!config || !config.enabled || !config.endpointUrl) {
      await storage.updateDeliveryMessage(id, {
        status: "skipped",
        statusDetail: "הקונקטור לא מופעל או חסר endpoint. ההודעה נשמרה בתור טיוטה.",
        attempts: (msg.attempts ?? 0) + 1,
        endpointUsed: config?.endpointUrl ?? "",
      } as any);
      return res.json({ ok: true, delivered: false, reason: "connector_not_configured" });
    }

    const payload = {
      channel: msg.channel,
      to: msg.toAddress,
      subject: msg.subject,
      body: msg.body,
      callbackUrl: msg.callbackUrl,
      recipientType: msg.recipientType,
      recipientId: msg.recipientId,
      recipientLabel: msg.recipientLabel,
      sentAt: new Date().toISOString(),
    };
    const result = await callExternalEndpoint(config.endpointUrl, payload, msg.callbackUrl ?? "");
    await storage.updateDeliveryMessage(id, {
      status: result.ok ? "sent" : "failed",
      statusDetail: result.detail,
      endpointUsed: config.endpointUrl,
      responseText: result.responseText,
      sentAt: new Date().toISOString(),
      attempts: (msg.attempts ?? 0) + 1,
    } as any);
    res.json({ ok: result.ok, delivered: result.ok, detail: result.detail });
  });

  // ============ Automation configs ============
  app.get("/api/admin/automations", requireAdmin, async (_req, res) => {
    const list = await storage.listAutomationConfigs();
    res.json(list.map((c) => ({
      ...c,
      enabled: Boolean(c.enabled),
      config: safeJsonObj(c.configJson),
    })));
  });

  app.patch("/api/admin/automations/:key", requireAdmin, async (req, res) => {
    const key = String(req.params.key);
    const body = req.body ?? {};
    const updated = await storage.updateAutomationConfig(key, {
      enabled: body.enabled !== undefined ? Boolean(body.enabled) : undefined,
      endpointUrl: body.endpointUrl !== undefined ? String(body.endpointUrl) : undefined,
      secretRef: body.secretRef !== undefined ? String(body.secretRef) : undefined,
      config: body.config !== undefined ? body.config : undefined,
      description: body.description !== undefined ? String(body.description) : undefined,
      label: body.label !== undefined ? String(body.label) : undefined,
    });
    if (!updated) return res.status(404).json({ message: "not found" });
    res.json({ ...updated, enabled: Boolean(updated.enabled), config: safeJsonObj(updated.configJson) });
  });

  app.post("/api/admin/automations/:key/test", requireAdmin, async (req, res) => {
    const key = String(req.params.key);
    const config = await storage.getAutomationConfig(key);
    if (!config) return res.status(404).json({ message: "not found" });
    // Sandbox-safe: only ping endpoint if enabled and url provided. Otherwise record idle test.
    if (!config.enabled || !config.endpointUrl) {
      await storage.recordAutomationTest(key, "idle", "הקונקטור לא מופעל או חסר endpoint. הבדיקה לא בוצעה קריאה חיצונית.");
      const updated = await storage.getAutomationConfig(key);
      return res.json({ ok: true, executed: false, reason: "connector_not_configured", config: updated });
    }
    const payload = { type: "automation_test", key, requestedAt: new Date().toISOString(), source: "bkalut-admin" };
    const result = await callExternalEndpoint(config.endpointUrl, payload, "");
    await storage.recordAutomationTest(key, result.ok ? "ok" : "error", result.detail);
    const updated = await storage.getAutomationConfig(key);
    res.json({ ok: result.ok, executed: true, detail: result.detail, config: updated });
  });

  // ============ Webhook log (admin visibility for NEDARIM3873 deliveries) ============
  app.get("/api/admin/webhook-log", requireAdmin, async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 200, 1000);
    const rows = await storage.listWebhookLog(limit);
    res.json(rows.map((r) => ({
      ...r,
      payload: safeJsonObj(r.payloadJson),
    })));
  });
  app.post("/api/admin/webhook-log/:id/retry", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const updated = await retryWebhookLog(id);
    if (!updated) return res.status(404).json({ message: "not found" });
    res.json(updated);
  });

  // ============ User auth (financial-client login) ============
  // Real users with admin-defined credentials. They see only their own data.
  app.post("/api/user/login", async (req, res) => {
    const identifier = String(req.body?.identity ?? req.body?.username ?? req.body?.email ?? "").trim();
    const password = String(req.body?.password ?? "");
    if (!identifier || !password) {
      return res.status(400).json({ ok: false, message: "חסרים פרטי כניסה" });
    }
    const user = await storage.getAppUserByLogin(identifier);
    if (!user) return res.status(401).json({ ok: false, message: "פרטי כניסה לא תקינים" });
    if (user.status !== "active") {
      return res.status(403).json({ ok: false, message: "החשבון אינו פעיל — פנה לצוות בקלות" });
    }
    if (!user.passwordHash || sha256Hex(password) !== user.passwordHash) {
      return res.status(401).json({ ok: false, message: "סיסמה שגויה" });
    }
    const session = await storage.createUserSession(user.id);
    await storage.updateAppUser(user.id, {}); // bump updatedAt
    try {
      const allUsers = await storage.listAppUsers();
      // light: store lastLoginAt directly
      const sqliteDirect = (storage as any).constructor?.name === "DatabaseStorage";
      if (sqliteDirect) {
        // updateAppUser doesn't expose lastLoginAt; do it inline via the underlying drizzle update
        // (acceptable because of the IStorage interface limitation). Skip for Supabase.
        // We'll just record it via notes if we cannot. The login still works.
        void allUsers; // silence unused
      }
    } catch {}
    res.json({
      ok: true,
      token: session.token,
      expiresAt: session.expiresAt,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        username: user.username,
        phone: user.phone,
        role: user.role,
        plan: user.plan,
        finClientId: user.finClientId,
        productAccess: safeJsonArray(user.productAccessJson),
      },
    });
  });

  app.post("/api/user/logout", async (req, res) => {
    const header = req.header("authorization");
    const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (token) await storage.deleteUserSession(token);
    res.json({ ok: true });
  });

  app.get("/api/user/me", async (req, res) => {
    const header = req.header("authorization");
    const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return res.status(401).json({ ok: false });
    const session = await storage.getUserSession(token);
    if (!session) return res.status(401).json({ ok: false });
    const user = session.user;
    res.json({
      ok: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        username: user.username,
        phone: user.phone,
        role: user.role,
        plan: user.plan,
        finClientId: user.finClientId,
        productAccess: safeJsonArray(user.productAccessJson),
      },
    });
  });

  // ============ Premium upgrade requests ============
  // Authenticated user submits a request, admin reviews via /api/admin/premium-requests.
  app.post("/api/user/premium-requests", async (req, res) => {
    const header = req.header("authorization");
    const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return res.status(401).json({ ok: false });
    const session = await storage.getUserSession(token);
    if (!session) return res.status(401).json({ ok: false });
    const message = String(req.body?.message || "");
    const created = await storage.createPremiumRequest(session.user.id, message);
    // Notify admin via webhook (so n8n can route to phone/whatsapp)
    await dispatchWebhook({
      source: "premium_upgrade_request",
      configKey: "webhook_premium_decision",
      relatedKind: "premium_request",
      relatedId: created.id,
      payload: {
        kind: "upgrade_requested",
        requestId: created.id,
        user: {
          id: session.user.id,
          fullName: session.user.fullName,
          email: session.user.email,
          phone: session.user.phone,
          username: session.user.username,
          currentPlan: session.user.plan,
        },
        message,
        submittedAt: created.createdAt,
      },
    });
    res.json(created);
  });
  app.get("/api/user/premium-requests", async (req, res) => {
    const header = req.header("authorization");
    const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return res.status(401).json({ ok: false });
    const session = await storage.getUserSession(token);
    if (!session) return res.status(401).json({ ok: false });
    const list = await storage.listPremiumRequestsForUser(session.user.id);
    res.json(list);
  });

  app.get("/api/admin/premium-requests", requireAdmin, async (_req, res) => {
    res.json(await storage.listPremiumRequests());
  });
  app.patch("/api/admin/premium-requests/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const status = req.body?.status ? String(req.body.status) : undefined;
    const adminNote = req.body?.adminNote ? String(req.body.adminNote) : undefined;
    const updated = await storage.updatePremiumRequest(id, { status, adminNote });
    if (!updated) return res.status(404).json({ message: "not found" });
    // If approved, upgrade plan + queue credentials delivery via webhook bus.
    if (status === "approved") {
      const user = await storage.getAppUser(updated.appUserId);
      if (user) {
        await storage.setAppUserPlan(user.id, "premium");
        await dispatchWebhook({
          source: "premium_upgrade_approved",
          configKey: "webhook_premium_decision",
          relatedKind: "premium_request",
          relatedId: updated.id,
          payload: {
            kind: "upgrade_approved",
            requestId: updated.id,
            decidedAt: updated.decidedAt,
            adminNote: updated.adminNote,
            user: {
              id: user.id,
              fullName: user.fullName,
              email: user.email,
              phone: user.phone,
              username: user.username,
              newPlan: "premium",
            },
            loginUrl: req.body?.loginUrl || "/#/user-login",
          },
        });
      }
    } else if (status === "rejected") {
      const user = await storage.getAppUser(updated.appUserId);
      if (user) {
        await dispatchWebhook({
          source: "premium_upgrade_rejected",
          configKey: "webhook_premium_decision",
          relatedKind: "premium_request",
          relatedId: updated.id,
          payload: {
            kind: "upgrade_rejected",
            requestId: updated.id,
            decidedAt: updated.decidedAt,
            adminNote: updated.adminNote,
            user: { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone },
          },
        });
      }
    }
    res.json(updated);
  });

  // ============ Credentials delivery (admin -> user) ============
  // After creating/updating a user with a password, the admin can press "send credentials".
  // This builds a payload and POSTs to the webhook_credentials_delivery endpoint.
  // The actual email/whatsapp dispatch happens in n8n. We mark the delivery state
  // honestly: only `sent_via_webhook` (not `email_sent`) when the webhook accepts.
  app.post("/api/admin/users/:id/send-credentials", requireAdmin, async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const user = await storage.getAppUser(id);
    if (!user) return res.status(404).json({ message: "not found" });
    if (!user.passwordPlain) {
      return res.status(400).json({
        ok: false,
        message: "אין סיסמה זמינה ברור הלקוח הזה. מלאו סיסמה חדשה בעריכת המשתמש לפני השליחה.",
      });
    }
    const channel = String(req.body?.channel || "email");
    const payload = {
      kind: "credentials_issued",
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        username: user.username,
        plan: user.plan,
      },
      credentials: {
        username: user.username || user.email,
        password: user.passwordPlain,
        loginUrl: String(req.body?.loginUrl || "/#/user-login"),
      },
      channelPreference: channel,
      issuedBy: req.adminSession?.identity,
      issuedAt: new Date().toISOString(),
    };
    const result = await dispatchWebhook({
      source: "credentials_delivery",
      configKey: "webhook_credentials_delivery",
      relatedKind: "app_user",
      relatedId: user.id,
      payload,
    });
    if (result.ok) {
      const now = new Date().toISOString();
      await storage.markCredentialsDelivered(user.id, now);
      // Clear plain password after successful delivery (security).
      await storage.clearAppUserPlainPassword(user.id);
    }
    res.json({
      ok: result.ok,
      delivered_via_webhook: result.ok,
      httpStatus: result.status,
      endpointUrl: result.endpointUrl,
      logId: result.logId,
      note: result.ok
        ? "הועבר ל-NEDARIM3873. השליחה בפועל תלויה באוטומציה בצד n8n."
        : "השליחה ל-NEDARIM3873 נכשלה. מומלץ לנסות שוב מהרשימת הוובהוקים.",
    });
  });

  // ============ Legal acceptance endpoint (lead forms / marketing) ============
  app.post("/api/legal/accept", async (req, res) => {
    const body = req.body ?? {};
    if (!body.documentKey || !body.documentVersion) {
      return res.status(400).json({ message: "חסר documentKey / documentVersion" });
    }
    const created = await storage.createLegalAcceptance({
      documentKey: String(body.documentKey),
      documentVersion: String(body.documentVersion),
      subjectKind: String(body.subjectKind || "lead"),
      subjectId: body.subjectId ? Number(body.subjectId) : null,
      fullName: body.fullName ? String(body.fullName) : "",
      identifier: body.identifier ? String(body.identifier) : "",
      signatureMethod: body.signatureMethod ? String(body.signatureMethod) : "checkbox",
      signatureValue: body.signatureValue ? String(body.signatureValue) : "",
      ipAddress: String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || ""),
      userAgent: String(req.headers["user-agent"] || ""),
    });
    res.json({ ok: true, id: created.id });
  });

  // ============ Inbound public webhook for external sites ============
  // External marketing sites (rights or financial) POST leads here. We
  // persist the normalized lead in `inbound_leads`, also create a `clients`
  // or `fin_leads` row when contact info is provided, and fan out the
  // normalized payload to the configured n8n endpoint (NEDARIM3873).
  //
  // Auth: if INBOUND_WEBHOOK_SECRET env var is set, requests MUST include
  // a matching `x-bkalut-secret` header (or `?secret=` query) or they're
  // rejected with 401. If the env var is unset, the endpoint still accepts
  // submissions and tags them as `unauthenticated` for visibility — useful
  // in local/dev — but production should always set the secret.
  app.post("/api/inbound/leads", async (req, res) => {
    const body = (req.body ?? {}) as Record<string, any>;
    const expectedSecret = (process.env.INBOUND_WEBHOOK_SECRET || "").trim();
    const providedSecret = String(
      req.header("x-bkalut-secret") ||
        req.header("x-webhook-secret") ||
        req.query?.secret ||
        ""
    ).trim();

    let authStatus: "authenticated" | "unauthenticated" | "rejected" = "unauthenticated";
    if (expectedSecret) {
      if (!providedSecret) {
        return res.status(401).json({ ok: false, message: "missing webhook secret" });
      }
      // Constant-time comparison
      const a = Buffer.from(providedSecret, "utf8");
      const b = Buffer.from(expectedSecret, "utf8");
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return res.status(401).json({ ok: false, message: "invalid webhook secret" });
      }
      authStatus = "authenticated";
    } else if (providedSecret) {
      // Secret provided but server isn't configured for one — log as authenticated
      // since the caller intends to authenticate.
      authStatus = "authenticated";
    }

    const contact = (body.contact && typeof body.contact === "object" ? body.contact : {}) as Record<string, any>;
    const utm = (body.utm && typeof body.utm === "object" ? body.utm : {}) as Record<string, any>;
    const phoneClean = cleanPhone(contact.phone ?? body.phone);
    const fullName = String(contact.fullName ?? contact.full_name ?? contact.name ?? body.fullName ?? "").trim();
    const email = String(contact.email ?? body.email ?? "").trim();
    const idNumber = String(contact.idNumber ?? contact.id_number ?? body.idNumber ?? "").trim();

    if (!phoneClean && !email) {
      return res.status(400).json({ ok: false, message: "phone or email is required" });
    }
    if (!fullName) {
      return res.status(400).json({ ok: false, message: "contact.fullName is required" });
    }

    const leadKindRaw = String(body.leadKind ?? body.category ?? body.kind ?? "rights").toLowerCase();
    const leadKind = ["rights", "financial"].includes(leadKindRaw) ? leadKindRaw : "other";

    const ipAddress = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "");
    const userAgent = String(req.headers["user-agent"] || "");

    // 1) Persist the inbound lead row
    let lead;
    try {
      lead = await storage.createInboundLead({
        sourceSite: String(body.sourceSite ?? body.source_site ?? body.site ?? "").trim() || undefined,
        sourcePage: String(body.sourcePage ?? body.source_page ?? body.page ?? "").trim() || undefined,
        origin: String(body.origin ?? req.headers["origin"] ?? "").trim() || undefined,
        category: body.category ? String(body.category) : undefined,
        topic: body.topic ? String(body.topic) : undefined,
        requestType: body.requestType ? String(body.requestType) : undefined,
        selectedPath: body.selectedPath ? String(body.selectedPath) : undefined,
        potentialScore: body.potentialScore !== undefined ? Number(body.potentialScore) : undefined,
        potentialLevel: body.potentialLevel ? String(body.potentialLevel) : undefined,
        contactFullName: fullName,
        contactPhone: phoneClean || undefined,
        contactEmail: email || undefined,
        contactIdNumber: idNumber || undefined,
        answers: body.answers,
        documents: body.documents,
        notes: body.notes ? String(body.notes) : undefined,
        legalAccepted: body.legalAccepted,
        utmSource: String(utm.source ?? body.utmSource ?? "").trim() || undefined,
        utmMedium: String(utm.medium ?? body.utmMedium ?? "").trim() || undefined,
        utmCampaign: String(utm.campaign ?? body.utmCampaign ?? "").trim() || undefined,
        utmTerm: String(utm.term ?? body.utmTerm ?? "").trim() || undefined,
        utmContent: String(utm.content ?? body.utmContent ?? "").trim() || undefined,
        referrer: String(body.referrer ?? req.headers["referer"] ?? "").trim() || undefined,
        externalId: body.externalId ? String(body.externalId) : undefined,
        leadKind,
        rawPayload: body,
        authStatus,
        ipAddress,
        userAgent,
      });
    } catch (err) {
      console.error("inbound lead persist failed:", err);
      return res.status(500).json({ ok: false, message: "failed to persist lead" });
    }

    // 2) Also create a domain-specific row so the lead appears in CRM lists.
    let crmInfo: { kind: string; id: number } | null = null;
    try {
      if (leadKind === "rights" && phoneClean) {
        const client = await storage.upsertClient({
          fullName,
          phone: phoneClean,
          email,
          idNumber,
          city: body.city ? String(body.city) : undefined,
        });
        crmInfo = { kind: "client", id: client.id };
      }
    } catch (err) {
      console.warn("inbound lead: client upsert failed", err);
    }

    // 3) Build the normalized fan-out payload for n8n.
    const normalized = {
      source: "inbound_webhook",
      leadKind,
      leadId: lead.id,
      submittedAt: lead.createdAt,
      sourceSite: lead.sourceSite,
      sourcePage: lead.sourcePage,
      origin: lead.origin,
      category: lead.category,
      topic: lead.topic,
      requestType: lead.requestType,
      selectedPath: lead.selectedPath,
      potentialScore: lead.potentialScore,
      potentialLevel: lead.potentialLevel,
      contact: {
        fullName,
        phone: phoneClean,
        email,
        idNumber: idNumber || null,
      },
      answers: body.answers ?? {},
      documents: body.documents ?? [],
      notes: lead.notes ?? "",
      legalAccepted: body.legalAccepted ?? {},
      utm: {
        source: lead.utmSource,
        medium: lead.utmMedium,
        campaign: lead.utmCampaign,
        term: lead.utmTerm,
        content: lead.utmContent,
      },
      referrer: lead.referrer,
      externalId: lead.externalId,
      authStatus,
      crm: crmInfo,
    };

    // 4) Dispatch through the unified bus (logs + posts to NEDARIM3873).
    const configKey =
      leadKind === "financial" ? "webhook_financial_lead" : "webhook_rights_lead";
    const dispatchResult = await dispatchWebhook({
      source: leadKind === "financial" ? "inbound_financial_lead" : "inbound_rights_lead",
      configKey,
      relatedKind: "inbound_lead",
      relatedId: lead.id,
      payload: normalized,
    });

    try {
      await storage.updateInboundLeadWebhook(
        lead.id,
        dispatchResult.ok ? "sent" : "failed",
        dispatchResult.logId || null,
      );
    } catch {}

    res.json({
      ok: true,
      leadId: lead.id,
      submissionId: lead.id,
      status: dispatchResult.ok ? "delivered" : "stored",
      authStatus,
      webhook: {
        ok: dispatchResult.ok,
        status: dispatchResult.status,
        endpointUrl: dispatchResult.endpointUrl,
        logId: dispatchResult.logId,
      },
      crm: crmInfo,
    });
  });

  // Admin-only list of recent inbound leads
  app.get("/api/admin/inbound-leads", requireAdmin, async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 200, 1000);
    const rows = await storage.listInboundLeads(limit);
    res.json(rows);
  });

  // ============ DB status / health check page (admin-visible) ============
  app.get("/api/admin/db-status", requireAdmin, async (_req, res) => {
    const supabaseUrl = process.env.SUPABASE_URL || "";
    const hasKey = Boolean(
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        process.env.SUPABASE_PUBLISHABLE_KEY,
    );
    const usingSupabase = (storage as any).constructor?.name === "SupabaseStorage";
    const mode = usingSupabase ? "supabase" : "sqlite";

    const expectedTables = [
      "users", "clients", "service_submissions", "app_users", "user_sessions",
      "premium_requests", "webhook_log", "delivery_queue", "automation_configs",
      "admin_sessions", "legal_acceptances",
      "fin_clients", "fin_categories", "fin_budgets", "fin_transactions",
      "fin_recurring", "fin_opportunities", "fin_leads", "fin_tips",
      "fin_debts", "fin_goals", "fin_alerts", "fin_plans", "fin_notes",
      "inbound_leads",
    ];

    let tables: Array<{ table: string; ok: boolean; error?: string }> = [];
    let probeError: string | null = null;
    try {
      if (usingSupabase && typeof (storage as any).probeTables === "function") {
        tables = await (storage as any).probeTables(expectedTables);
      } else {
        const present = new Set(listSqliteTables());
        tables = expectedTables.map((t) => ({ table: t, ok: present.has(t) }));
      }
    } catch (err) {
      probeError = err instanceof Error ? err.message : String(err);
    }

    const warnings: string[] = [];
    if (!supabaseUrl) warnings.push("SUPABASE_URL is not set — using SQLite. For production set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.");
    if (supabaseUrl && !hasKey) warnings.push("SUPABASE_URL is set but no SUPABASE_*_KEY is — falling back to SQLite.");
    if (!process.env.INBOUND_WEBHOOK_SECRET) warnings.push("INBOUND_WEBHOOK_SECRET is not set — inbound /api/inbound/leads will accept unauthenticated requests (suitable for dev only).");
    if (!process.env.BKALUT_ADMIN_PASSWORD_SHA256) warnings.push("BKALUT_ADMIN_PASSWORD_SHA256 is not set — using plaintext BKALUT_ADMIN_PASSWORD (preview only).");

    const missingTables = tables.filter((t) => !t.ok);
    res.json({
      mode,
      usingSupabase,
      supabase: {
        url: supabaseUrl,
        keyConfigured: hasKey,
        keyKind: process.env.SUPABASE_SERVICE_ROLE_KEY
          ? "service_role"
          : process.env.SUPABASE_ANON_KEY
            ? "anon"
            : process.env.SUPABASE_PUBLISHABLE_KEY
              ? "publishable"
              : null,
      },
      tables,
      missingTables: missingTables.map((t) => t.table),
      ready: probeError === null && missingTables.length === 0,
      probeError,
      warnings,
      inboundEndpoint: {
        path: "/api/inbound/leads",
        secretConfigured: Boolean(process.env.INBOUND_WEBHOOK_SECRET),
      },
    });
  });

  // Public reminder response intake (no auth — same surface as /api/inbound/leads).
  // Used by the /#/r/:topicId reminder flow on the public site.
  app.post("/api/public/reminder-response", async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const topicId = Number(body.topicId);
    const response = String(body.response ?? "");
    if (!Number.isFinite(topicId) || topicId < 1) {
      return res.status(400).json({ error: "invalid topicId" });
    }
    if (!["yes", "not_yet", "not_eligible"].includes(response)) {
      return res.status(400).json({ error: "invalid response" });
    }
    const { rights } = loadAll();
    const row = rights.find((r) => r.id === topicId);
    const topicTitle = row?.topic ?? String(body.topicTitle ?? "");

    const inserted = insertReminderResponse({
      topicId,
      topicTitle,
      response: response as "yes" | "not_yet" | "not_eligible",
      contactName: typeof body.contactName === "string" ? body.contactName.slice(0, 200) : undefined,
      contactPhone: typeof body.contactPhone === "string" ? body.contactPhone.slice(0, 50) : undefined,
      nextReminderDate: typeof body.nextReminderDate === "string" ? body.nextReminderDate.slice(0, 20) : undefined,
      wantsService: Boolean(body.wantsService),
      note: typeof body.note === "string" ? body.note.slice(0, 2000) : undefined,
      ipAddress: req.ip,
      userAgent: typeof req.headers["user-agent"] === "string" ? String(req.headers["user-agent"]).slice(0, 500) : undefined,
    });
    res.json({ ok: true, id: inserted.id });
  });

  // Admin listing of reminder responses.
  app.get("/api/admin/reminder-responses", requireAdmin, async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 200, 1000);
    res.json(listReminderResponses(limit));
  });

  // ============ Advanced profile matcher (admin) ============
  // Takes free-text or a structured profile and returns a ranked list of
  // candidate rights with matched signals, score, potential level and CTA URLs.
  // Deterministic / rule-based — no LLM. The admin can paste full JSON or a
  // free-text paragraph; we'll best-effort extract age, family status,
  // children count, income, disability, employment, housing, business,
  // pension, holocaust survivor, student, oleh, etc.
  app.post("/api/admin/advanced-match", requireAdmin, async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const text = typeof body.text === "string" ? body.text : "";
    const profile = body.profile && typeof body.profile === "object" ? body.profile as Record<string, unknown> : null;
    const maxResults = Math.max(1, Math.min(60, Number(body.maxResults) || 25));
    const input: string | Record<string, unknown> = profile ?? text;
    if (!text.trim() && (!profile || Object.keys(profile).length === 0)) {
      return res.status(400).json({ ok: false, message: "חובה לשלוח text או profile" });
    }
    const { rights } = getData();
    const { profile: parsed, hits } = runAdvancedMatch(input, rights, { maxResults });
    res.json({
      ok: true,
      profile: parsed,
      hits,
      counts: {
        total: hits.length,
        high: hits.filter((h) => h.potentialLevel === "גבוה").length,
        medium: hits.filter((h) => h.potentialLevel === "בינוני").length,
        low: hits.filter((h) => h.potentialLevel === "נמוך").length,
      },
    });
  });

  // ============ General-inquiry reply template (admin) ============
  // Editable email/template for the "פנייה כללית" reply. Stored in
  // automation_configs.key='general_inquiry_reply'. Sending is performed via
  // the unified webhook bus (`webhook_email_automation`). We DO NOT claim
  // "email sent" unless the webhook returned 2xx.
  app.get("/api/admin/general-inquiry-reply", requireAdmin, async (_req, res) => {
    const { template, config } = await getInquiryTemplate();
    res.json({
      ok: true,
      template,
      enabled: Boolean(config?.enabled),
      lastStatus: config?.lastStatus ?? null,
      lastTestedAt: config?.lastTestedAt ?? null,
      lastResult: config?.lastResult ?? null,
      deliveryEndpoint: {
        configKey: "webhook_email_automation",
        note: "השליחה בפועל מתבצעת דרך אוטומציית המייל/הוובהוקים. אם אינה פעילה — הקריאה תיכשל בכוונה ולא תזיין שליחה לא קיימת.",
      },
    });
  });

  app.patch("/api/admin/general-inquiry-reply", requireAdmin, async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const next = await saveInquiryTemplate({
      subject: typeof body.subject === "string" ? body.subject : undefined,
      body: typeof body.body === "string" ? (body.body as string) : undefined,
      channels: Array.isArray(body.channels) ? (body.channels as unknown[]).map(String) : undefined,
      defaultPublicEligibilityUrl: typeof body.defaultPublicEligibilityUrl === "string"
        ? body.defaultPublicEligibilityUrl as string
        : undefined,
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
    });
    res.json({ ok: true, template: next });
  });

  app.post("/api/admin/general-inquiry-reply/preview", requireAdmin, async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const { template } = await getInquiryTemplate();
    const rendered = renderInquiryReply(template, {
      fullName: typeof body.fullName === "string" ? body.fullName : undefined,
      phone: typeof body.phone === "string" ? body.phone : undefined,
      email: typeof body.email === "string" ? body.email : undefined,
      publicEligibilityUrl: typeof body.publicEligibilityUrl === "string" ? body.publicEligibilityUrl : undefined,
    });
    res.json({ ok: true, rendered });
  });

  app.post("/api/admin/general-inquiry-reply/send", requireAdmin, async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const fullName = typeof body.fullName === "string" ? body.fullName : "";
    const phone = typeof body.phone === "string" ? body.phone : "";
    const email = typeof body.email === "string" ? body.email : "";
    if (!email && !phone) {
      return res.status(400).json({ ok: false, message: "חובה לציין email או phone לנמען" });
    }
    const leadId = body.leadId !== undefined && body.leadId !== null ? Number(body.leadId) : null;
    const result = await sendInquiryReply({
      fullName,
      phone,
      email,
      publicEligibilityUrl: typeof body.publicEligibilityUrl === "string" ? body.publicEligibilityUrl : undefined,
      leadId: Number.isFinite(leadId) ? leadId : null,
      relatedKind: typeof body.relatedKind === "string" ? body.relatedKind : "inbound_lead",
      channels: Array.isArray(body.channels) ? (body.channels as unknown[]).map(String) : undefined,
    });
    res.json({
      ok: result.dispatch.ok,
      delivered_via_webhook: result.dispatch.ok,
      httpStatus: result.dispatch.status,
      endpointUrl: result.dispatch.endpointUrl,
      logId: result.dispatch.logId,
      rendered: result.rendered,
      channels: result.channels,
      note: result.dispatch.ok
        ? "ההודעה נשלחה לוובהוק האוטומציה. השליחה בפועל ללקוח תלויה במערכת היעד (n8n/ספק)."
        : "השליחה לוובהוק האוטומציה נכשלה. בדוק את הקונקטור webhook_email_automation במסך אוטומציות.",
    });
  });

  // Optionally trigger this automation from an inbound general lead. The
  // payload includes the standardized templateKey marker so external systems
  // can identify it.
  app.post("/api/admin/inbound-leads/:id/general-inquiry-reply", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const lead = await storage.getInboundLead(id);
    if (!lead) return res.status(404).json({ ok: false, message: "lead not found" });
    const body = (req.body ?? {}) as Record<string, unknown>;
    const result = await sendInquiryReply({
      fullName: lead.contactFullName || "",
      phone: lead.contactPhone || "",
      email: lead.contactEmail || "",
      publicEligibilityUrl: typeof body.publicEligibilityUrl === "string" ? body.publicEligibilityUrl : undefined,
      leadId: lead.id,
      relatedKind: "inbound_lead",
      source: "general_inquiry_reply_inbound",
      channels: Array.isArray(body.channels) ? (body.channels as unknown[]).map(String) : undefined,
    });
    res.json({
      ok: result.dispatch.ok,
      delivered_via_webhook: result.dispatch.ok,
      httpStatus: result.dispatch.status,
      endpointUrl: result.dispatch.endpointUrl,
      logId: result.dispatch.logId,
      rendered: result.rendered,
      channels: result.channels,
    });
  });

  // ============ Public chatbot ============
  // Public-facing config — never includes admin `instructions`.
  app.get("/api/public/chatbot/config", async (_req, res) => {
    const cfg = await storage.getAutomationConfig("public_chatbot");
    const enabled = Boolean(cfg?.enabled);
    const raw = cfg ? safeJsonObj(cfg.configJson) : {};
    res.json(buildPublicChatbotConfig(enabled, raw));
  });

  // Public-facing free-text Q&A. Returns ONLY a short answer + up to 3
  // sanitized topic suggestions (id+topic+category). Never returns full
  // rights rows or internal fields. Refuses to operate if the bot is
  // disabled in admin settings.
  app.post("/api/public/chatbot/answer", async (req, res) => {
    const cfg = await storage.getAutomationConfig("public_chatbot");
    if (!cfg || !cfg.enabled) return res.status(403).json({ message: "chatbot disabled" });
    const body = (req.body ?? {}) as Record<string, any>;
    const question = String(body.question || "").slice(0, 600).trim();
    if (!question) return res.status(400).json({ message: "question is required" });
    const { rights } = getData();
    const result = composeChatbotAnswer(question, rights);
    const publicCfg = buildPublicChatbotConfig(true, safeJsonObj(cfg.configJson));
    res.json({
      answer: result.answer,
      suggestions: result.suggestions,
      matched: result.matched,
      sensitive: result.sensitive,
      cta: publicCfg.ctaText,
    });
  });

  // Public-facing lead submission from the chatbot help flow. Reuses the
  // existing inbound-leads + webhook plumbing so chatbot leads show up in
  // the admin dashboard just like any other public form submission.
  app.post("/api/public/chatbot/lead", async (req, res) => {
    const cfg = await storage.getAutomationConfig("public_chatbot");
    if (!cfg || !cfg.enabled) return res.status(403).json({ message: "chatbot disabled" });
    const body = (req.body ?? {}) as Record<string, any>;
    const fullName = String(body.fullName || "").trim();
    const phone = String(body.phone || "").replace(/[^0-9+]/g, "");
    const email = String(body.email || "").trim();
    const topic = String(body.topic || "").trim();
    const category = String(body.category || "").trim();
    const requestTypeRaw = String(body.requestType || "info").trim();
    const requestType = SERVICE_REQUEST_TYPES.has(requestTypeRaw) ? requestTypeRaw : "info";
    const message = String(body.message || "").slice(0, 2000);

    if (!fullName) return res.status(400).json({ message: "fullName is required" });
    if (!phone && !email) return res.status(400).json({ message: "phone or email is required" });

    const ipAddress = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "");
    const userAgent = String(req.headers["user-agent"] || "");

    const lead = await storage.createInboundLead({
      sourceSite: "chatbot",
      sourcePage: String(body.page || "/").slice(0, 200),
      origin: String(req.headers["origin"] || ""),
      category: category || undefined,
      topic: topic || undefined,
      requestType,
      contactFullName: fullName,
      contactPhone: phone || undefined,
      contactEmail: email || undefined,
      answers: body.answers && typeof body.answers === "object" ? body.answers : { source: "chatbot", question: message },
      notes: message || undefined,
      leadKind: "rights",
      rawPayload: { source: "chatbot", ...body },
      authStatus: "unauthenticated",
      ipAddress,
      userAgent,
    });

    // Dispatch through the same webhook bus as other rights leads.
    try {
      const result = await dispatchWebhook({
        source: "chatbot",
        configKey: "webhook_rights_lead",
        relatedKind: "inbound_lead",
        relatedId: lead.id,
        payload: {
          source: "chatbot",
          leadKind: "rights",
          topic,
          category,
          requestType,
          contact: { fullName, phone, email },
          message,
          leadId: lead.id,
          page: body.page || "/",
          createdAt: new Date().toISOString(),
        },
      });
      await storage.updateInboundLeadWebhook(lead.id, result.ok ? "delivered" : "failed", result.logId ?? null);
    } catch (err) {
      console.warn("chatbot lead webhook failed", err);
      await storage.updateInboundLeadWebhook(lead.id, "failed", null);
    }

    res.json({ ok: true, leadId: lead.id });
  });

  // Admin-only chatbot settings (includes editable instructions text).
  app.get("/api/admin/chatbot", requireAdmin, async (_req, res) => {
    const cfg = await storage.getAutomationConfig("public_chatbot");
    // Resilient fallback when the seed row hasn't been created yet (e.g. on
    // a fresh Supabase instance). The admin still sees defaults and saves
    // become first-write inserts via updateAutomationConfig's upsert.
    if (!cfg) {
      return res.json({
        key: "public_chatbot",
        enabled: false,
        config: {
          intro: "שלום! אני העוזר של ארגון בקלות. איך אפשר לעזור?",
          instructions: "ענה בעברית, בקצרה (1-3 משפטים), בלשון מכבדת.",
          ctaText: "רוצה לקבל את פרטי הנושא? אפשר לבדוק זכאות מלאה בקליק.",
          closingText: "שמחנו שפנית אלינו! צוות בקלות תמיד כאן עבורך.",
          contact: { phone: "02-3131500", email: "l023131500@gmail.com", whatsapp: "https://wa.me/97223131500" },
        },
        updatedAt: null,
      });
    }
    res.json({
      key: cfg.key,
      enabled: Boolean(cfg.enabled),
      config: safeJsonObj(cfg.configJson),
      updatedAt: cfg.updatedAt,
    });
  });

  app.patch("/api/admin/chatbot", requireAdmin, async (req, res) => {
    const body = (req.body ?? {}) as Record<string, any>;
    const cfg = await storage.getAutomationConfig("public_chatbot");
    const currentConfig: Record<string, any> = cfg ? safeJsonObj(cfg.configJson) : {};
    if (typeof body.intro === "string") currentConfig.intro = body.intro.slice(0, 600);
    if (typeof body.instructions === "string") currentConfig.instructions = body.instructions.slice(0, 4000);
    if (typeof body.ctaText === "string") currentConfig.ctaText = body.ctaText.slice(0, 600);
    if (typeof body.closingText === "string") currentConfig.closingText = body.closingText.slice(0, 600);
    if (body.contact && typeof body.contact === "object") {
      const c = body.contact as Record<string, any>;
      currentConfig.contact = {
        ...(currentConfig.contact ?? {}),
        ...(typeof c.phone === "string" ? { phone: c.phone.slice(0, 80) } : {}),
        ...(typeof c.email === "string" ? { email: c.email.slice(0, 200) } : {}),
        ...(typeof c.whatsapp === "string" ? { whatsapp: c.whatsapp.slice(0, 300) } : {}),
      };
    }
    const updated = await storage.updateAutomationConfig("public_chatbot", {
      enabled: body.enabled !== undefined ? Boolean(body.enabled) : undefined,
      config: currentConfig,
      label: "צ׳אטבוט באתר הציבורי",
    });
    if (!updated) return res.status(500).json({ message: "failed to save chatbot config" });
    res.json({
      key: updated.key,
      enabled: Boolean(updated.enabled),
      config: safeJsonObj(updated.configJson),
      updatedAt: updated.updatedAt,
    });
  });

  // ============ Potential rights scanner ============
  // Public profile-based questionnaire. Collects non-identifying answers,
  // returns sanitized public-rights suggestions, and only stores contact
  // details if the visitor explicitly consents at the end.
  async function loadPotentialConfig(): Promise<potential.PotentialConfig> {
    try {
      const cfg = await storage.getAutomationConfig("potential_scanner");
      const blob = potential.readPotentialConfig(cfg?.configJson ?? null);
      // Respect the top-level enabled flag set on the automation row too.
      if (cfg && !cfg.enabled) return { ...blob, enabled: false };
      return blob;
    } catch {
      return potential.DEFAULT_POTENTIAL_CONFIG;
    }
  }

  function publicPotentialPayload(cfg: potential.PotentialConfig, link: potential.PotentialLinkOut | null) {
    // Public payload omits matching rules — the rules are evaluated server-side
    // (they reference the full rights catalog and shouldn't leak keywords).
    return {
      enabled: cfg.enabled,
      introTitle: cfg.introTitle,
      introSubtitle: cfg.introSubtitle,
      consentText: cfg.consentText,
      sections: cfg.sections,
      link: link
        ? {
            slug: link.slug,
            title: link.title,
            description: link.description,
            presets: link.presets,
            hiddenSections: link.hiddenSections,
          }
        : null,
    };
  }

  app.get("/api/public/potential/config", async (_req, res) => {
    const cfg = await loadPotentialConfig();
    res.json(publicPotentialPayload(cfg, null));
  });

  app.get("/api/public/potential/link/:slug", async (req, res) => {
    const slug = String(req.params.slug || "").trim();
    const link = potential.getLinkBySlug(slug);
    if (!link || !link.active) return res.status(404).json({ message: "link not found" });
    const cfg = await loadPotentialConfig();
    res.json(publicPotentialPayload(cfg, link));
  });

  app.post("/api/public/potential/submit", async (req, res) => {
    const cfg = await loadPotentialConfig();
    if (!cfg.enabled) return res.status(403).json({ message: "potential scanner disabled" });
    const body = (req.body ?? {}) as Record<string, any>;
    const profile = (body.profile && typeof body.profile === "object" ? body.profile : {}) as Record<string, unknown>;
    const slug = body.slug ? String(body.slug) : null;
    const contactConsent = Boolean(body.contactConsent);
    const contact = body.contact && typeof body.contact === "object" ? body.contact : null;
    const selectedIds = Array.isArray(body.selectedIds)
      ? (body.selectedIds as unknown[]).map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0)
      : [];
    const legalAccepted = body.legalAccepted && typeof body.legalAccepted === "object" ? body.legalAccepted : {};

    const fullName = contactConsent ? String(contact?.fullName || contact?.full_name || "").trim() : "";
    const phone = contactConsent ? cleanPhone(contact?.phone) : "";
    const email = contactConsent ? String(contact?.email || "").trim() : "";
    const idNumber = contactConsent ? String(contact?.idNumber || contact?.id_number || "").trim() : "";

    if (contactConsent) {
      if (!fullName) return res.status(400).json({ message: "full name is required when contact consent given" });
      if (!phone && !email) return res.status(400).json({ message: "phone or email is required when contact consent given" });
    }

    const { rights } = getData();
    const { tags, hits } = potential.computeSuggestions(cfg, profile, rights, 24);

    const submission = potential.insertSubmission({
      slug,
      profile,
      suggestions: hits,
      selectedIds,
      contactConsent,
      contact: contactConsent ? { fullName, phone, email, idNumber } : undefined,
      legalAccepted,
      ipAddress: String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || ""),
      userAgent: String(req.headers["user-agent"] || ""),
    });

    let dispatchResult: { ok: boolean; status: number; endpointUrl: string; logId: number } | null = null;
    if (contactConsent) {
      const webhookPayload = {
        source: "potential_scanner",
        slug,
        submissionId: submission.id,
        submittedAt: submission.createdAt,
        contactConsent: true,
        contact: { fullName, phone, email, idNumber },
        profile,
        derivedTags: tags,
        suggestions: hits.map((h) => ({
          rightId: h.rightId,
          topic: h.topic,
          category: h.category,
          subCategory: h.subCategory,
          potential: h.potential,
          score: h.score,
          reasons: h.reasons,
          serviceUrl: h.serviceUrl,
        })),
        selectedSuggestions: hits
          .filter((h) => selectedIds.includes(h.rightId))
          .map((h) => ({ rightId: h.rightId, topic: h.topic, category: h.category })),
        legalAccepted,
      };
      const dispatched = await dispatchWebhook({
        source: "potential_scanner",
        configKey: "webhook_rights_lead",
        relatedKind: "potential_submission",
        relatedId: submission.id,
        payload: webhookPayload,
      });
      dispatchResult = {
        ok: dispatched.ok,
        status: dispatched.status,
        endpointUrl: dispatched.endpointUrl,
        logId: dispatched.logId,
      };
      potential.updateSubmissionWebhook(
        submission.id,
        dispatchResult.ok ? "sent" : "failed",
        dispatchResult.logId || null,
      );

      // Also create an inbound_leads row so it surfaces in the standard CRM.
      try {
        await storage.createInboundLead({
          sourceSite: "potential_scanner",
          sourcePage: slug ? `/#/potential/${slug}` : "/#/potential",
          origin: String(req.headers["origin"] || ""),
          category: hits[0]?.category || undefined,
          topic: hits[0]?.topic || "סורק פוטנציאל זכויות",
          requestType: "info",
          selectedPath: "potential_scanner",
          potentialScore: hits.reduce((s, h) => s + h.score, 0),
          potentialLevel: hits.length && hits[0].potential ? hits[0].potential : undefined,
          contactFullName: fullName,
          contactPhone: phone || undefined,
          contactEmail: email || undefined,
          contactIdNumber: idNumber || undefined,
          answers: { profile, derivedTags: tags },
          documents: [],
          notes: `Potential scanner submission #${submission.id} — ${hits.length} suggestions, ${selectedIds.length} selected`,
          legalAccepted,
          leadKind: "rights",
          rawPayload: webhookPayload,
          authStatus: "unauthenticated",
          ipAddress: String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || ""),
          userAgent: String(req.headers["user-agent"] || ""),
        });
      } catch (err) {
        console.warn("potential_scanner: inbound lead create failed", err);
      }
    }

    res.json({
      ok: true,
      submissionId: submission.id,
      tags,
      suggestions: hits,
      consentRecorded: contactConsent,
      webhook: dispatchResult,
    });
  });

  // ----- Admin management -----
  app.get("/api/admin/potential/config", requireAdmin, async (_req, res) => {
    const cfg = await storage.getAutomationConfig("potential_scanner");
    const config = potential.readPotentialConfig(cfg?.configJson ?? null);
    res.json({
      enabled: Boolean(cfg?.enabled) && config.enabled,
      config,
      automationKey: "potential_scanner",
      lastUpdated: cfg?.updatedAt ?? null,
    });
  });

  app.patch("/api/admin/potential/config", requireAdmin, async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const existing = await storage.getAutomationConfig("potential_scanner");
    const merged: potential.PotentialConfig = {
      ...potential.readPotentialConfig(existing?.configJson ?? null),
    };
    if (typeof body.enabled === "boolean") merged.enabled = body.enabled;
    if (typeof body.introTitle === "string") merged.introTitle = body.introTitle.slice(0, 300);
    if (typeof body.introSubtitle === "string") merged.introSubtitle = body.introSubtitle.slice(0, 600);
    if (typeof body.consentText === "string") merged.consentText = body.consentText.slice(0, 600);
    if (Array.isArray(body.sections)) merged.sections = body.sections as potential.Section[];
    if (Array.isArray(body.rules)) merged.rules = body.rules as potential.TagRule[];
    const updated = await storage.updateAutomationConfig("potential_scanner", {
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      config: merged as unknown as Record<string, unknown>,
    });
    res.json({
      ok: true,
      enabled: Boolean(updated?.enabled),
      config: merged,
      lastUpdated: updated?.updatedAt ?? null,
    });
  });

  app.get("/api/admin/potential/links", requireAdmin, async (_req, res) => {
    res.json(potential.listLinks());
  });

  app.post("/api/admin/potential/links", requireAdmin, async (req: AuthedRequest, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const result = potential.createLink({
      slug: String(body.slug || ""),
      title: String(body.title || ""),
      description: typeof body.description === "string" ? body.description : "",
      presets: body.presets && typeof body.presets === "object" ? body.presets as Record<string, unknown> : {},
      hiddenSections: Array.isArray(body.hiddenSections) ? (body.hiddenSections as unknown[]).map(String) : [],
      createdBy: req.adminSession?.identity ?? "",
    });
    if (!result.ok) return res.status(400).json({ message: result.error });
    res.json(result.link);
  });

  app.patch("/api/admin/potential/links/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const updated = potential.updateLink(id, {
      title: typeof body.title === "string" ? body.title : undefined,
      description: typeof body.description === "string" ? body.description : undefined,
      presets: body.presets && typeof body.presets === "object" ? body.presets as Record<string, unknown> : undefined,
      hiddenSections: Array.isArray(body.hiddenSections) ? (body.hiddenSections as unknown[]).map(String) : undefined,
      active: typeof body.active === "boolean" ? body.active : undefined,
    });
    if (!updated) return res.status(404).json({ message: "not found" });
    res.json(updated);
  });

  app.delete("/api/admin/potential/links/:id", requireAdmin, async (req, res) => {
    potential.deleteLink(Number(req.params.id));
    res.json({ ok: true });
  });

  app.get("/api/admin/potential/submissions", requireAdmin, async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 200, 1000);
    const rows = potential.listSubmissions(limit).map((r) => ({
      id: r.id,
      slug: r.slug,
      createdAt: r.createdAt,
      contactConsent: Boolean(r.contactConsent),
      contact: r.contactConsent
        ? {
            fullName: r.contactFullName,
            phone: r.contactPhone,
            email: r.contactEmail,
            idNumber: r.contactIdNumber,
          }
        : null,
      profile: safeJsonObj(r.profileJson),
      suggestions: (() => {
        try {
          return JSON.parse(r.suggestionsJson || "[]");
        } catch {
          return [];
        }
      })(),
      selectedIds: (() => {
        try {
          return JSON.parse(r.selectedIdsJson || "[]");
        } catch {
          return [];
        }
      })(),
      webhookStatus: r.webhookStatus,
      webhookLogId: r.webhookLogId,
    }));
    res.json(rows);
  });

  // ============================================================================
  // Price Comparison module — separate `pc_*` tables, /api/pc/* namespace.
  // Does NOT touch rights or fin_* data.
  // ============================================================================

  // When Supabase is configured, the PUBLIC price-comparison endpoints read LIVE
  // from Postgres (source of truth) via pc-supabase-read; otherwise they fall
  // back to the synchronous local SQLite mirror. Admin/write endpoints keep
  // using SQLite regardless (anon has no write access to Supabase).
  const USE_SUPABASE_PC = !!(process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY));
  if (USE_SUPABASE_PC) {
    console.log("[pc] public endpoints reading LIVE from Supabase Postgres");
  }

  // Resolve price-comparison settings (with sane defaults). Stored in
  // automation_configs under key "pc_settings". Never exposes secrets.
  async function getPcSettings() {
    const cfg = await storage.getAutomationConfig("pc_settings");
    const blob = cfg?.configJson ? safeJsonObj(cfg.configJson) : {};
    return {
      publicEnabled: blob.publicEnabled !== false,
      merchantPortalEnabled: blob.merchantPortalEnabled === true,
      // Default OFF: the public site never shows demo/sample data as if it were
      // real. An admin must opt in explicitly to preview sample rows publicly.
      showSampleData: blob.showSampleData === true,
      publicTitle: typeof blob.publicTitle === "string" && blob.publicTitle.trim()
        ? String(blob.publicTitle) : "השוואת מחירים — חוסכים בקלות",
      publicSubtitle: typeof blob.publicSubtitle === "string" && blob.publicSubtitle.trim()
        ? String(blob.publicSubtitle)
        : "השוו מחירים של מוצרים נפוצים בין חנויות וסניפים, ומצאו היכן משתלם לקנות.",
      contactText: typeof blob.contactText === "string" ? String(blob.contactText) : "",
      automationEndpoint: typeof blob.automationEndpoint === "string" ? String(blob.automationEndpoint) : "",
      updatedAt: cfg?.updatedAt ?? null,
    };
  }

  // ---- Public ----
  // Public-facing settings: title/subtitle/contact + whether the site is live.
  app.get("/api/pc/public/settings", async (_req, res) => {
    const s = await getPcSettings();
    res.json({
      enabled: s.publicEnabled,
      title: s.publicTitle,
      subtitle: s.publicSubtitle,
      contactText: s.contactText,
    });
  });

  // Public data-freshness/source metadata so the site can clearly show when the
  // data was last updated and how many live sources back it. DB-driven; never
  // counts sample rows as real.
  app.get("/api/pc/public/meta", async (_req, res) => {
    const s = await getPcSettings();
    const stats = USE_SUPABASE_PC ? await pcSupabase.getStats() : priceComparison.getStats();
    res.json({
      enabled: s.publicEnabled,
      showSampleData: s.showSampleData,
      lastUpdatedAt: stats.lastSuccessAt ?? stats.lastImportAt ?? null,
      activeSources: stats.activeFeedSources,
      // When sample data is shown, report totals; otherwise only real rows.
      productCount: s.showSampleData ? stats.products : stats.realProducts,
      storeCount: s.showSampleData ? stats.stores : stats.realStores,
      hasRealData: stats.realProducts > 0 && stats.realStores > 0,
      // Second (supplier) track: only surfaced when the merchant portal is on
      // AND at least one approved supplier offer exists. Official comparison is
      // unaffected by these.
      merchantPortalEnabled: s.merchantPortalEnabled,
      hasSupplierData: stats.supplierPrices > 0,
      supplierPriceCount: stats.supplierPrices,
    });
  });

  app.get("/api/pc/public/categories", async (_req, res) => {
    const s = await getPcSettings();
    if (!s.publicEnabled) return res.status(403).json({ message: "האתר אינו זמין כעת", enabled: false });
    res.json(USE_SUPABASE_PC ? await pcSupabase.listCategories() : priceComparison.listCategories());
  });

  app.get("/api/pc/public/search", async (req, res) => {
    const s = await getPcSettings();
    if (!s.publicEnabled) return res.status(403).json({ message: "האתר אינו זמין כעת", enabled: false });
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    const search = req.query.q ? String(req.query.q) : undefined;
    const trackRaw = req.query.track ? String(req.query.track) : "official";
    const track = (trackRaw === "official" || trackRaw === "supplier" || trackRaw === "all") ? trackRaw : "official";
    const searchOpts: priceComparison.PcSearchFilters = { categoryId, search, includeSample: s.showSampleData, track };
    res.json({
      categories: USE_SUPABASE_PC ? await pcSupabase.listCategories() : priceComparison.listCategories(),
      results: USE_SUPABASE_PC ? await pcSupabase.publicSearch(searchOpts) : priceComparison.publicSearch(searchOpts),
    });
  });

  app.get("/api/pc/public/promotions", async (_req, res) => {
    const s = await getPcSettings();
    if (!s.publicEnabled) return res.json([]);
    res.json(USE_SUPABASE_PC ? await pcSupabase.listPromotions() : priceComparison.listPromotions());
  });

  // ---- Public: supplier/business price submission (second track) ----
  // A business submits an offer; it is stored as 'pending' and is NOT shown in
  // any public comparison until an admin approves it. Requires the merchant
  // portal to be enabled by the admin. Never touches the official feed track.
  app.post("/api/pc/public/submit-price", async (req, res) => {
    const s = await getPcSettings();
    if (!s.publicEnabled) return res.status(403).json({ message: "האתר אינו זמין כעת", enabled: false });
    if (!s.merchantPortalEnabled) return res.status(403).json({ message: "הגשת מחירים על-ידי עסקים אינה פעילה כעת.", enabled: false });
    const b = (req.body ?? {}) as Record<string, unknown>;
    const str = (k: string) => (typeof b[k] === "string" ? String(b[k]).trim() : "");
    const merchantName = str("merchantName");
    const storeName = str("storeName");
    const productName = str("productName");
    const price = Number(b.price);
    if (!merchantName || !storeName || !productName) {
      return res.status(400).json({ message: "חסרים שדות חובה: שם העסק, שם החנות ושם המוצר." });
    }
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ message: "יש להזין מחיר תקין (גדול מאפס)." });
    }
    const sub = priceComparison.createSubmission({
      merchantName, merchantContact: str("merchantContact") || null, storeName, city: str("city") || null,
      productName, brand: str("brand") || null, unit: str("unit") || null, barcode: str("barcode") || null,
      price, onSale: b.onSale === true || b.onSale === "true", saleNote: str("saleNote") || null,
      validUntil: str("validUntil") || null, note: str("note") || null,
    });
    res.json({
      ok: true,
      id: sub.id,
      status: sub.status,
      message: "ההצעה התקבלה וממתינה לאישור צוות בקלות. היא לא תוצג בהשוואה הרשמית עד לאישור.",
    });
  });

  // ---- Admin: settings ----
  app.get("/api/pc/admin/settings", requireAdmin, async (_req, res) => {
    res.json(await getPcSettings());
  });
  app.patch("/api/pc/admin/settings", requireAdmin, async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const existing = await storage.getAutomationConfig("pc_settings");
    const current = existing?.configJson ? safeJsonObj(existing.configJson) : {};
    if (typeof body.publicEnabled === "boolean") current.publicEnabled = body.publicEnabled;
    if (typeof body.merchantPortalEnabled === "boolean") current.merchantPortalEnabled = body.merchantPortalEnabled;
    if (typeof body.showSampleData === "boolean") current.showSampleData = body.showSampleData;
    if (typeof body.publicTitle === "string") current.publicTitle = body.publicTitle;
    if (typeof body.publicSubtitle === "string") current.publicSubtitle = body.publicSubtitle;
    if (typeof body.contactText === "string") current.contactText = body.contactText;
    if (typeof body.automationEndpoint === "string") current.automationEndpoint = body.automationEndpoint;
    await storage.updateAutomationConfig("pc_settings", {
      enabled: true,
      config: current,
      label: "הגדרות השוואת מחירים",
      description: "הגדרות האתר הציבורי להשוואת מחירים (כותרת, זמינות, נתוני דמו).",
    });
    res.json(await getPcSettings());
  });

  // ---- Admin: categories ----
  app.get("/api/pc/admin/categories", requireAdmin, (_req, res) => {
    res.json(priceComparison.listCategories(true));
  });
  app.post("/api/pc/admin/categories", requireAdmin, (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    if (!String(b.name || "").trim()) return res.status(400).json({ message: "name is required" });
    res.json(priceComparison.createCategory({
      name: String(b.name), slug: b.slug ? String(b.slug) : undefined,
      sortOrder: b.sortOrder !== undefined ? Number(b.sortOrder) : undefined,
      active: typeof b.active === "boolean" ? b.active : undefined,
    }));
  });
  app.patch("/api/pc/admin/categories/:id", requireAdmin, (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const out = priceComparison.updateCategory(Number(req.params.id), {
      name: typeof b.name === "string" ? b.name : undefined,
      slug: typeof b.slug === "string" ? b.slug : undefined,
      sortOrder: b.sortOrder !== undefined ? Number(b.sortOrder) : undefined,
      active: typeof b.active === "boolean" ? b.active : undefined,
    });
    if (!out) return res.status(404).json({ message: "not found" });
    res.json(out);
  });
  app.delete("/api/pc/admin/categories/:id", requireAdmin, (req, res) => {
    priceComparison.deleteCategory(Number(req.params.id));
    res.json({ ok: true });
  });

  // ---- Admin: stores ----
  app.get("/api/pc/admin/stores", requireAdmin, (_req, res) => {
    res.json(priceComparison.listStores(true));
  });
  app.post("/api/pc/admin/stores", requireAdmin, (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    if (!String(b.name || "").trim()) return res.status(400).json({ message: "name is required" });
    res.json(priceComparison.createStore({
      name: String(b.name), branch: b.branch ? String(b.branch) : undefined,
      city: b.city ? String(b.city) : undefined, logoUrl: b.logoUrl ? String(b.logoUrl) : undefined,
      active: typeof b.active === "boolean" ? b.active : undefined,
    }));
  });
  app.patch("/api/pc/admin/stores/:id", requireAdmin, (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const out = priceComparison.updateStore(Number(req.params.id), {
      name: typeof b.name === "string" ? b.name : undefined,
      branch: typeof b.branch === "string" ? b.branch : undefined,
      city: typeof b.city === "string" ? b.city : undefined,
      logoUrl: typeof b.logoUrl === "string" ? b.logoUrl : undefined,
      active: typeof b.active === "boolean" ? b.active : undefined,
    });
    if (!out) return res.status(404).json({ message: "not found" });
    res.json(out);
  });
  app.delete("/api/pc/admin/stores/:id", requireAdmin, (req, res) => {
    priceComparison.deleteStore(Number(req.params.id));
    res.json({ ok: true });
  });

  // ---- Admin: products ----
  app.get("/api/pc/admin/products", requireAdmin, (req, res) => {
    res.json(priceComparison.listProducts({
      categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined,
      search: req.query.q ? String(req.query.q) : undefined,
      includeInactive: true,
    }));
  });
  app.post("/api/pc/admin/products", requireAdmin, (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    if (!String(b.name || "").trim()) return res.status(400).json({ message: "name is required" });
    res.json(priceComparison.createProduct({
      categoryId: b.categoryId !== undefined && b.categoryId !== null ? Number(b.categoryId) : null,
      name: String(b.name), brand: b.brand ? String(b.brand) : undefined,
      unit: b.unit ? String(b.unit) : undefined, barcode: b.barcode ? String(b.barcode) : undefined,
      imageUrl: b.imageUrl ? String(b.imageUrl) : undefined,
      active: typeof b.active === "boolean" ? b.active : undefined,
    }));
  });
  app.patch("/api/pc/admin/products/:id", requireAdmin, (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const out = priceComparison.updateProduct(Number(req.params.id), {
      categoryId: b.categoryId !== undefined ? (b.categoryId === null ? null : Number(b.categoryId)) : undefined,
      name: typeof b.name === "string" ? b.name : undefined,
      brand: typeof b.brand === "string" ? b.brand : undefined,
      unit: typeof b.unit === "string" ? b.unit : undefined,
      barcode: typeof b.barcode === "string" ? b.barcode : undefined,
      imageUrl: typeof b.imageUrl === "string" ? b.imageUrl : undefined,
      active: typeof b.active === "boolean" ? b.active : undefined,
    });
    if (!out) return res.status(404).json({ message: "not found" });
    res.json(out);
  });
  app.delete("/api/pc/admin/products/:id", requireAdmin, (req, res) => {
    priceComparison.deleteProduct(Number(req.params.id));
    res.json({ ok: true });
  });

  // ---- Admin: prices (per product) ----
  app.get("/api/pc/admin/products/:id/prices", requireAdmin, (req, res) => {
    res.json(priceComparison.listPrices(Number(req.params.id)));
  });
  app.post("/api/pc/admin/prices", requireAdmin, (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    if (!b.productId || !b.storeId) return res.status(400).json({ message: "productId and storeId are required" });
    res.json(priceComparison.createPrice({
      productId: Number(b.productId), storeId: Number(b.storeId), price: Number(b.price),
      currency: b.currency ? String(b.currency) : undefined,
      onSale: typeof b.onSale === "boolean" ? b.onSale : undefined,
      saleNote: b.saleNote ? String(b.saleNote) : undefined,
      validUntil: b.validUntil ? String(b.validUntil) : undefined,
    }));
  });
  app.patch("/api/pc/admin/prices/:id", requireAdmin, (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const out = priceComparison.updatePrice(Number(req.params.id), {
      price: b.price !== undefined ? Number(b.price) : undefined,
      currency: typeof b.currency === "string" ? b.currency : undefined,
      onSale: typeof b.onSale === "boolean" ? b.onSale : undefined,
      saleNote: typeof b.saleNote === "string" ? b.saleNote : undefined,
      validUntil: typeof b.validUntil === "string" ? b.validUntil : undefined,
    });
    if (!out) return res.status(404).json({ message: "not found" });
    res.json(out);
  });
  app.delete("/api/pc/admin/prices/:id", requireAdmin, (req, res) => {
    priceComparison.deletePrice(Number(req.params.id));
    res.json({ ok: true });
  });

  // ---- Admin: promotions ----
  app.get("/api/pc/admin/promotions", requireAdmin, (_req, res) => {
    res.json(priceComparison.listPromotions(true));
  });
  app.post("/api/pc/admin/promotions", requireAdmin, (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    if (!String(b.title || "").trim()) return res.status(400).json({ message: "title is required" });
    res.json(priceComparison.createPromotion({
      storeId: b.storeId !== undefined && b.storeId !== null ? Number(b.storeId) : null,
      title: String(b.title), description: b.description ? String(b.description) : undefined,
      startsAt: b.startsAt ? String(b.startsAt) : undefined, endsAt: b.endsAt ? String(b.endsAt) : undefined,
      active: typeof b.active === "boolean" ? b.active : undefined,
    }));
  });
  app.patch("/api/pc/admin/promotions/:id", requireAdmin, (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const out = priceComparison.updatePromotion(Number(req.params.id), {
      storeId: b.storeId !== undefined ? (b.storeId === null ? null : Number(b.storeId)) : undefined,
      title: typeof b.title === "string" ? b.title : undefined,
      description: typeof b.description === "string" ? b.description : undefined,
      startsAt: typeof b.startsAt === "string" ? b.startsAt : undefined,
      endsAt: typeof b.endsAt === "string" ? b.endsAt : undefined,
      active: typeof b.active === "boolean" ? b.active : undefined,
    });
    if (!out) return res.status(404).json({ message: "not found" });
    res.json(out);
  });
  app.delete("/api/pc/admin/promotions/:id", requireAdmin, (req, res) => {
    priceComparison.deletePromotion(Number(req.params.id));
    res.json({ ok: true });
  });

  // ---- Shared: parse public search filters from a query/body object ----
  function parsePcFilters(src: Record<string, unknown>): priceComparison.PcSearchFilters {
    const s = (k: string) => (src[k] !== undefined && src[k] !== null && String(src[k]).trim() !== "" ? String(src[k]).trim() : undefined);
    const n = (k: string) => (src[k] !== undefined && src[k] !== null && String(src[k]).trim() !== "" && Number.isFinite(Number(src[k])) ? Number(src[k]) : undefined);
    const sort = s("sort");
    const track = s("track");
    return {
      categoryId: n("categoryId"),
      search: s("q") ?? s("search") ?? s("query"),
      barcode: s("barcode"),
      brand: s("brand"),
      city: s("city"),
      neighborhood: s("neighborhood"),
      storeId: n("storeId"),
      storeName: s("storeName") ?? s("store"),
      minPrice: n("minPrice"),
      maxPrice: n("maxPrice"),
      promoOnly: src.promoOnly === true || src.promoOnly === "true" || src.promoOnly === "1",
      updatedSince: s("updatedSince"),
      sort: (sort === "price" || sort === "unitPrice" || sort === "name" || sort === "updated") ? sort : undefined,
      // Default to the official (mandatory) comparison. Callers opt into the
      // supplier track explicitly; unapproved submissions are never reachable.
      track: (track === "official" || track === "supplier" || track === "all") ? track : "official",
    };
  }

  // ---- Public: filter metadata (categories, cities, brands, stores) ----
  app.get("/api/pc/public/filters", async (_req, res) => {
    const s = await getPcSettings();
    if (!s.publicEnabled) return res.status(403).json({ message: "האתר אינו זמין כעת", enabled: false });
    if (USE_SUPABASE_PC) {
      const [categories, cities, brands, storeList] = await Promise.all([
        pcSupabase.listCategories(),
        pcSupabase.getDistinctCities(s.showSampleData),
        pcSupabase.getDistinctBrands(s.showSampleData),
        pcSupabase.listStores(),
      ]);
      return res.json({
        categories, cities, brands,
        stores: storeList.filter((st) => s.showSampleData || !st.isSample).map((st) => ({ id: st.id, name: st.name, city: st.city })),
      });
    }
    res.json({
      categories: priceComparison.listCategories(),
      cities: priceComparison.getDistinctCities(s.showSampleData),
      brands: priceComparison.getDistinctBrands(s.showSampleData),
      stores: priceComparison.listStores().filter((st) => s.showSampleData || !st.isSample).map((st) => ({ id: st.id, name: st.name, city: st.city })),
    });
  });

  // ---- Public: advanced DB-backed search (logged) ----
  app.get("/api/pc/public/search/advanced", async (req, res) => {
    const s = await getPcSettings();
    if (!s.publicEnabled) return res.status(403).json({ message: "האתר אינו זמין כעת", enabled: false });
    const filters = { ...parsePcFilters(req.query as Record<string, unknown>), includeSample: s.showSampleData };
    const results = USE_SUPABASE_PC ? await pcSupabase.publicSearch(filters) : priceComparison.publicSearch(filters);
    const best = results.find((r) => r.bestPrice != null);
    const logInput = {
      channel: "web", query: filters.search, filters, resultCount: results.length,
      bestPrice: best?.bestPrice ?? null, bestStore: best?.bestStore ?? null,
    };
    if (USE_SUPABASE_PC) await pcSupabase.logSearchRequest(logInput);
    else priceComparison.logSearchRequest(logInput);
    res.json({ filters, count: results.length, results });
  });

  // ---- Public: barcode-keyed catalog (chain count + spread + reg/vol kinds) ----
  app.get("/api/pc/public/catalog", async (req, res) => {
    const s = await getPcSettings();
    if (!s.publicEnabled) return res.status(403).json({ message: "האתר אינו זמין כעת", enabled: false });
    const src = req.query as Record<string, unknown>;
    const minChainsRaw = Number(src.minChains);
    const kindRaw = src.kind ? String(src.kind) : "";
    const filters: priceComparison.PcCatalogFilters = {
      ...parsePcFilters(src),
      includeSample: s.showSampleData,
      minChains: Number.isFinite(minChainsRaw) && minChainsRaw > 0 ? minChainsRaw : undefined,
      kind: kindRaw === "regulatory" || kindRaw === "voluntary" ? kindRaw : undefined,
    };
    const results = USE_SUPABASE_PC ? await pcSupabase.catalogSearch(filters) : priceComparison.catalogSearch(filters);
    res.json({ filters, count: results.length, results });
  });

  // ---- Public: product comparison keyed by barcode ----
  app.get("/api/pc/public/compare/:barcode", async (req, res) => {
    const s = await getPcSettings();
    if (!s.publicEnabled) return res.status(403).json({ message: "האתר אינו זמין כעת", enabled: false });
    const trackRaw = req.query.track ? String(req.query.track) : "official";
    const track = (trackRaw === "official" || trackRaw === "supplier" || trackRaw === "all") ? trackRaw : "official";
    const cmp = USE_SUPABASE_PC
      ? await pcSupabase.comparisonByBarcode(String(req.params.barcode), { includeSample: s.showSampleData, track })
      : priceComparison.comparisonByBarcode(String(req.params.barcode), { includeSample: s.showSampleData, track });
    if (!cmp) return res.status(404).json({ message: "המוצר לא נמצא" });
    res.json(cmp);
  });

  // ---- Public: product detail with full price table + cheapest store ----
  app.get("/api/pc/public/product/:id", async (req, res) => {
    const s = await getPcSettings();
    if (!s.publicEnabled) return res.status(403).json({ message: "האתר אינו זמין כעת", enabled: false });
    const trackRaw = req.query.track ? String(req.query.track) : "official";
    const track = (trackRaw === "official" || trackRaw === "supplier" || trackRaw === "all") ? trackRaw : "official";
    const detail = USE_SUPABASE_PC
      ? await pcSupabase.productDetail(Number(req.params.id), s.showSampleData, track)
      : priceComparison.productDetail(Number(req.params.id), s.showSampleData, track);
    if (!detail) return res.status(404).json({ message: "המוצר לא נמצא" });
    res.json(detail);
  });

  // ---- Public: AI/recommendation — DB only, honest about missing data ----
  // Supports GET (query string, used by the UI) and POST (JSON body, used by
  // automation/n8n). Both return the same JSON shape.
  const handleRecommend = async (req: any, res: any) => {
    const s = await getPcSettings();
    if (!s.publicEnabled) return res.status(403).json({ message: "האתר אינו זמין כעת", enabled: false });
    const src = req.method === "POST" ? { ...(req.body ?? {}), ...req.query } : req.query;
    const filters = { ...parsePcFilters(src as Record<string, unknown>), includeSample: s.showSampleData };
    res.json(USE_SUPABASE_PC ? await pcSupabase.recommend(filters) : priceComparison.recommend(filters));
  };
  app.get("/api/pc/public/recommend", handleRecommend);
  app.post("/api/pc/public/recommend", handleRecommend);

  // ---- Public: branded PDF/print report of current filtered results ----
  app.get("/api/pc/public/report", async (req, res) => {
    const s = await getPcSettings();
    if (!s.publicEnabled) return res.status(403).send("האתר אינו זמין כעת");
    const filters = { ...parsePcFilters(req.query as Record<string, unknown>), includeSample: s.showSampleData };
    const results = USE_SUPABASE_PC ? await pcSupabase.publicSearch(filters) : priceComparison.publicSearch(filters);
    const parts: string[] = [];
    if (filters.search) parts.push(`חיפוש: ${filters.search}`);
    if (filters.city) parts.push(`עיר: ${filters.city}`);
    if (filters.brand) parts.push(`מותג: ${filters.brand}`);
    if (filters.promoOnly) parts.push("מבצעים בלבד");
    const html = renderReportHtml({
      title: s.publicTitle, subtitle: s.publicSubtitle, rows: results,
      filtersLabel: parts.join(" · ") || "כל המוצרים",
      autoPrint: String(req.query.print || "") === "1",
    });
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.send(html);
  });

  // ---- Public/automation: voice/email/whatsapp/n8n query endpoint ----
  // Accepts a product query, searches the DB, logs the request, and (when a
  // contact is provided and results exist) POSTs a lead payload to the existing
  // n8n webhook. Does NOT alter the rights-form payloads.
  app.post("/api/pc/automation/query", async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const channelRaw = String(body.channel || "api").toLowerCase();
    const channel = ["voice", "email", "whatsapp", "n8n", "api"].includes(channelRaw) ? channelRaw : "api";
    const pcSettings = await getPcSettings();
    const filters = { ...parsePcFilters(body), includeSample: pcSettings.showSampleData };
    const contact = body.contact ? String(body.contact).slice(0, 200) : null;
    const results = USE_SUPABASE_PC ? await pcSupabase.publicSearch(filters) : priceComparison.publicSearch(filters);
    const rec = USE_SUPABASE_PC ? await pcSupabase.recommend(filters) : priceComparison.recommend(filters);
    const best = results.find((r) => r.bestPrice != null);

    priceComparison.logSearchRequest({
      channel, query: filters.search, filters, resultCount: results.length,
      bestPrice: best?.bestPrice ?? null, bestStore: best?.bestStore ?? null, contact,
    });

    // Only dispatch a lead to n8n when there is a contact AND verified data.
    let dispatched: { ok: boolean; status: number } | null = null;
    if (contact && rec.hasData) {
      const payload = {
        source: "bkalut_price_comparison",
        channel,
        query: filters.search || null,
        contact,
        recommendation: {
          product: rec.product?.name ?? null,
          bestStore: rec.bestStore ?? null,
          bestPrice: rec.bestPrice ?? null,
          savings: rec.savings ?? null,
          message: rec.message,
        },
        resultCount: results.length,
        generatedAt: new Date().toISOString(),
      };
      try {
        const r = await dispatchWebhook({
          source: "bkalut_price_comparison",
          configKey: "pc_settings",
          payload,
          relatedKind: "pc_search",
        });
        dispatched = { ok: r.ok, status: r.status };
        priceComparison.logAutomation({ channel, query: filters.search, payload, endpoint: r.endpointUrl, status: r.status, response: r.responseText });
      } catch (e) {
        priceComparison.logAutomation({ channel, query: filters.search, payload, status: 0, response: (e as Error).message });
      }
    }

    res.json({
      channel,
      count: results.length,
      recommendation: rec,
      results: results.slice(0, 20),
      dispatched: !!dispatched,
      // Internal automation status is intentionally not surfaced as customer text.
    });
  });

  // ============================================================================
  // Price Comparison — ETL admin (feed sources, imports, browsers)
  // ============================================================================

  app.get("/api/pc/admin/stats", requireAdmin, (_req, res) => {
    res.json(priceComparison.getStats());
  });

  // ---- Data-health dashboard (catalog coverage metrics) ----
  app.get("/api/pc/admin/data-health", requireAdmin, (_req, res) => {
    res.json(priceComparison.dataHealth());
  });

  // ---- Feed sources ----
  app.get("/api/pc/admin/feeds", requireAdmin, (_req, res) => {
    res.json(priceComparison.listFeedSources(true));
  });
  app.post("/api/pc/admin/feeds", requireAdmin, (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    if (!String(b.chainName || "").trim()) return res.status(400).json({ message: "chainName is required" });
    res.json(priceComparison.createFeedSource({
      chainName: String(b.chainName),
      chainId: b.chainId ? String(b.chainId) : undefined,
      sourceUrl: b.sourceUrl ? String(b.sourceUrl) : undefined,
      sourceType: b.sourceType ? String(b.sourceType) : undefined,
      sourceKind: b.sourceKind === "voluntary" || b.sourceKind === "regulatory" ? b.sourceKind : undefined,
      feedFormat: b.feedFormat ? String(b.feedFormat) : undefined,
      feedKinds: b.feedKinds ? String(b.feedKinds) : undefined,
      authUser: b.authUser ? String(b.authUser) : undefined,
      notes: b.notes ? String(b.notes) : undefined,
      verified: typeof b.verified === "boolean" ? b.verified : undefined,
      active: typeof b.active === "boolean" ? b.active : undefined,
      adapter: b.adapter ? String(b.adapter) : undefined,
      directFileUrl: b.directFileUrl ? String(b.directFileUrl) : undefined,
      discoveryUrl: b.discoveryUrl ? String(b.discoveryUrl) : undefined,
      maxFilesPerRun: b.maxFilesPerRun != null ? Number(b.maxFilesPerRun) : undefined,
    }));
  });
  app.patch("/api/pc/admin/feeds/:id", requireAdmin, (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const out = priceComparison.updateFeedSource(Number(req.params.id), {
      chainName: typeof b.chainName === "string" ? b.chainName : undefined,
      chainId: typeof b.chainId === "string" ? b.chainId : undefined,
      sourceUrl: typeof b.sourceUrl === "string" ? b.sourceUrl : undefined,
      sourceType: typeof b.sourceType === "string" ? b.sourceType : undefined,
      sourceKind: b.sourceKind === "voluntary" || b.sourceKind === "regulatory" ? b.sourceKind : undefined,
      feedFormat: typeof b.feedFormat === "string" ? b.feedFormat : undefined,
      feedKinds: typeof b.feedKinds === "string" ? b.feedKinds : undefined,
      authUser: typeof b.authUser === "string" ? b.authUser : undefined,
      notes: typeof b.notes === "string" ? b.notes : undefined,
      verified: typeof b.verified === "boolean" ? b.verified : undefined,
      active: typeof b.active === "boolean" ? b.active : undefined,
      adapter: typeof b.adapter === "string" ? b.adapter : undefined,
      directFileUrl: typeof b.directFileUrl === "string" ? b.directFileUrl : undefined,
      discoveryUrl: typeof b.discoveryUrl === "string" ? b.discoveryUrl : undefined,
      maxFilesPerRun: b.maxFilesPerRun != null ? Number(b.maxFilesPerRun) : undefined,
    });
    if (!out) return res.status(404).json({ message: "not found" });
    res.json(out);
  });
  app.delete("/api/pc/admin/feeds/:id", requireAdmin, (req, res) => {
    priceComparison.deleteFeedSource(Number(req.params.id));
    res.json({ ok: true });
  });

  // ---- Manual run for a single feed source ----
  app.post("/api/pc/admin/feeds/:id/run", requireAdmin, async (req, res) => {
    try {
      const job = await pcImport.runFeedSource(Number(req.params.id), "manual");
      res.json({ ok: true, job, logs: priceComparison.listImportLogs(job.id) });
    } catch (e) {
      res.status(400).json({ ok: false, message: (e as Error).message });
    }
  });

  // ---- Manual file upload (raw XML or .gz base64) for a feed source ----
  app.post("/api/pc/admin/feeds/:id/upload", requireAdmin, express.json({ limit: "60mb" }), async (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const feedId = Number(req.params.id);
    const filename = String(b.filename || "upload.xml");
    const forceKindRaw = b.kind ? String(b.kind) : "";
    const forceKind = (forceKindRaw === "Stores" || forceKindRaw === "PriceFull" || forceKindRaw === "PromoFull") ? forceKindRaw : undefined;
    let buffer: Buffer;
    let isGz = filename.toLowerCase().endsWith(".gz");
    try {
      if (typeof b.base64 === "string" && b.base64) {
        buffer = Buffer.from(b.base64, "base64");
        isGz = true; // base64 path is used for gz uploads
      } else if (typeof b.content === "string") {
        buffer = Buffer.from(b.content, "utf8");
      } else {
        return res.status(400).json({ message: "ספקו content (XML) או base64 (קובץ דחוס)" });
      }
    } catch {
      return res.status(400).json({ message: "פענוח הקובץ נכשל" });
    }
    const job = priceComparison.createImportJob({ feedSourceId: feedId || null, trigger: "upload", kind: forceKind });
    try {
      const result = pcImport.importBuffer({ jobId: job.id, filename, buffer, isGz, forceKind });
      const status = result.errors > 0 && result.pricesUpserted === 0 && result.storesUpserted === 0 && result.promotionsUpserted === 0 ? "error" : "ok";
      const message = `העלאה: חנויות+${result.storesUpserted}, מוצרים+${result.productsUpserted}, מחירים+${result.pricesUpserted}, מבצעים+${result.promotionsUpserted}, שגיאות ${result.errors}.`;
      const finished = priceComparison.finishImportJob(job.id, {
        status, storesUpserted: result.storesUpserted, productsUpserted: result.productsUpserted,
        pricesUpserted: result.pricesUpserted, promotionsUpserted: result.promotionsUpserted,
        errors: result.errors, message,
      });
      if (feedId) priceComparison.markFeedRun(feedId, status, message);
      res.json({ ok: true, job: finished, logs: priceComparison.listImportLogs(job.id) });
    } catch (e) {
      priceComparison.finishImportJob(job.id, { status: "error", errors: 1, message: (e as Error).message });
      res.status(400).json({ ok: false, message: (e as Error).message });
    }
  });

  // ---- Cron-ready daily import (admin or token guarded; no external schedule) ----
  app.post("/api/pc/admin/import/daily", requireAdmin, async (_req, res) => {
    const out = await pcImport.runDailyImport("manual");
    res.json(out);
  });
  // Token-guarded variant for an external scheduler to call without a session.
  app.post("/api/pc/cron/daily-import", async (req, res) => {
    const settings = await loadApiSettings();
    const provided = String(req.query.token || req.header("x-api-token") || (req.header("authorization") || "").replace(/^Bearer\s+/i, ""));
    if (settings.requireToken) {
      if (!provided || sha256Hex(provided) !== settings.tokenHash) {
        return res.status(401).json({ message: "unauthorized" });
      }
    }
    const out = await pcImport.runDailyImport("cron");
    res.json(out);
  });

  // ---- Import jobs + logs ----
  app.get("/api/pc/admin/jobs", requireAdmin, (_req, res) => {
    res.json(priceComparison.listImportJobs(50));
  });
  app.get("/api/pc/admin/jobs/:id/logs", requireAdmin, (req, res) => {
    res.json(priceComparison.listImportLogs(Number(req.params.id)));
  });

  // ---- Automation + search-request logs ----
  app.get("/api/pc/admin/automation-logs", requireAdmin, (_req, res) => {
    res.json(priceComparison.listAutomationLogs(50));
  });
  app.get("/api/pc/admin/search-logs", requireAdmin, (_req, res) => {
    res.json(priceComparison.listSearchRequests(50));
  });

  // ---- Price history (admin browser) ----
  app.get("/api/pc/admin/products/:id/history", requireAdmin, (req, res) => {
    res.json(priceComparison.listPriceHistory(Number(req.params.id)));
  });

  // ---- Admin: supplier/business-submitted price submissions (review track) ----
  // List submissions (optionally filtered by status). Defaults to all so the
  // admin can audit approved/rejected history too.
  app.get("/api/pc/admin/submissions", requireAdmin, (req, res) => {
    const status = req.query.status ? String(req.query.status) : undefined;
    res.json({
      pending: priceComparison.countPendingSubmissions(),
      submissions: priceComparison.listSubmissions({ status, limit: 200 }),
    });
  });
  // Approve a submission → upserts a supplier-tagged price (never official).
  app.post("/api/pc/admin/submissions/:id/approve", requireAdmin, (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const trust = b.trust === "verified" || b.trust === "trusted" || b.trust === "unverified" ? b.trust : undefined;
    const out = priceComparison.approveSubmission(Number(req.params.id), {
      reviewedBy: typeof b.reviewedBy === "string" ? b.reviewedBy : "admin",
      trust, reviewNote: typeof b.reviewNote === "string" ? b.reviewNote : undefined,
    });
    if (!out) return res.status(404).json({ message: "ההצעה לא נמצאה" });
    res.json(out);
  });
  // Reject a submission → retracts any supplier price it created.
  app.post("/api/pc/admin/submissions/:id/reject", requireAdmin, (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const out = priceComparison.rejectSubmission(Number(req.params.id), {
      reviewedBy: typeof b.reviewedBy === "string" ? b.reviewedBy : "admin",
      reviewNote: typeof b.reviewNote === "string" ? b.reviewNote : undefined,
    });
    if (!out) return res.status(404).json({ message: "ההצעה לא נמצאה" });
    res.json(out);
  });

  // ============================================================================
  // Step-3 ingestion API + voluntary store self-submit.
  // ----------------------------------------------------------------------------
  // (A) POST /api/pc/ingest — admin pushes a price-transparency file (multipart
  //     upload OR a remote URL). Auto-detects gz/xml/json/csv/xlsx and upserts
  //     into pc_* tagged with chain_id + source_kind (regulatory|voluntary).
  // (B) Voluntary self-submit — admin mints a per-store token → /submit/<token>
  //     public page. Stores upload their own CSV/XLSX/JSON without admin auth.
  // ============================================================================

  // In-memory multipart parser (we never persist raw files to disk).
  const ingestUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 60 * 1024 * 1024 } });
  const submitUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

  // ---- (A) Admin push ingestion ----
  app.post("/api/pc/ingest", requireAdmin, ingestUpload.single("file"), async (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const sourceKind: priceComparison.PcChainKind = String(b.sourceKind || "regulatory") === "voluntary" ? "voluntary" : "regulatory";
    const chainId = b.chainId ? String(b.chainId) : null;
    const chainName = b.chainName ? String(b.chainName) : null;
    const remoteUrl = b.url ? String(b.url) : "";

    let buffer: Buffer | null = null;
    let filename = "ingest";
    if (req.file) {
      buffer = req.file.buffer;
      filename = req.file.originalname || "upload";
    } else if (typeof b.base64 === "string" && b.base64) {
      try { buffer = Buffer.from(b.base64, "base64"); filename = String(b.filename || "upload.gz"); } catch { /* handled below */ }
    } else if (typeof b.content === "string" && b.content) {
      buffer = Buffer.from(b.content, "utf8");
      filename = String(b.filename || "upload.xml");
    }

    const job = priceComparison.createImportJob({ feedSourceId: null, trigger: "ingest", kind: sourceKind });
    const log: pcIngest.Logger = (level, msg) => priceComparison.logImport(job.id, level, msg);
    try {
      if (!buffer && remoteUrl) {
        log("info", `Fetching remote file: ${remoteUrl}`);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 30000);
        const r = await fetch(remoteUrl, { signal: controller.signal, headers: { "user-agent": "bkalut-pc-ingest/1.0" } }).finally(() => clearTimeout(timer));
        if (!r.ok) {
          priceComparison.finishImportJob(job.id, { status: "error", errors: 1, message: `HTTP ${r.status}` });
          return res.status(400).json({ ok: false, message: `שגיאת הורדה HTTP ${r.status}` });
        }
        buffer = Buffer.from(await r.arrayBuffer());
        filename = remoteUrl;
      }
      if (!buffer || buffer.length < 4) {
        priceComparison.finishImportJob(job.id, { status: "error", errors: 1, message: "no file" });
        return res.status(400).json({ ok: false, message: "ספקו קובץ (file), base64, content או url" });
      }
      log("info", `Ingest "${filename}" (${buffer.length} bytes), sourceKind=${sourceKind}, chainId=${chainId ?? "?"}.`);
      const result = pcIngest.ingestBuffer(buffer, { sourceKind, chainId, chainName, source: "ingest-api" }, log);
      const ok = !(result.errors > 0 && result.pricesCreated === 0 && result.pricesUpdated === 0 && result.storesUpserted === 0 && result.promotionsUpserted === 0);
      const message = `ingest(${result.format}/${result.kind}): חנויות+${result.storesUpserted}, מוצרים ${result.productsUpserted}, מחירים +${result.pricesCreated}/~${result.pricesUpdated}, מבצעים+${result.promotionsUpserted}, שגיאות ${result.errors}.`;
      const finished = priceComparison.finishImportJob(job.id, {
        status: ok ? "ok" : "error", storesUpserted: result.storesUpserted, productsUpserted: result.productsUpserted,
        pricesUpserted: result.pricesCreated, promotionsUpserted: result.promotionsUpserted, errors: result.errors, message,
      });
      res.json({ ok, result, job: finished, logs: priceComparison.listImportLogs(job.id) });
    } catch (e) {
      priceComparison.finishImportJob(job.id, { status: "error", errors: 1, message: (e as Error).message });
      res.status(400).json({ ok: false, message: (e as Error).message });
    }
  });

  // ---- (B) Voluntary token admin CRUD ----
  app.get("/api/pc/admin/voluntary-tokens", requireAdmin, (_req, res) => {
    res.json(priceComparison.listVoluntaryTokens());
  });
  app.post("/api/pc/admin/voluntary-tokens", requireAdmin, (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const storeName = String(b.storeName || "").trim();
    if (!storeName) return res.status(400).json({ message: "שם החנות חובה" });
    const token = crypto.randomBytes(24).toString("base64url");
    const created = priceComparison.createVoluntaryToken({
      token, storeName,
      city: b.city ? String(b.city) : null,
      contactEmail: b.contactEmail ? String(b.contactEmail) : null,
    });
    res.json(created);
  });
  app.patch("/api/pc/admin/voluntary-tokens/:id", requireAdmin, (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const out = priceComparison.setVoluntaryTokenActive(Number(req.params.id), b.active !== false);
    if (!out) return res.status(404).json({ message: "לא נמצא" });
    res.json(out);
  });

  // ---- (B) Public self-submit (no admin auth; token-guarded + size-limited) ----
  app.get("/api/pc/submit/:token/info", (req, res) => {
    const t = priceComparison.getVoluntaryTokenByToken(String(req.params.token));
    if (!t || !t.active) return res.status(404).json({ message: "קישור לא תקין או בוטל" });
    res.json({ storeName: t.storeName, city: t.city, lastUploadAt: t.lastUploadAt, uploadCount: t.uploadCount });
  });
  app.get("/api/pc/submit/:token/template.csv", (req, res) => {
    const t = priceComparison.getVoluntaryTokenByToken(String(req.params.token));
    if (!t || !t.active) return res.status(404).json({ message: "קישור לא תקין או בוטל" });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=template.csv");
    res.send("﻿barcode,product_name,brand,unit,price\n7290000000001,דוגמה מוצר,מותג,1 ק\"ג,12.90\n");
  });
  // Lightweight per-IP+token rate limiter (20 uploads / hour) — keeps the public
  // endpoint cheap without pulling in a dependency.
  const submitHits = new Map<string, { count: number; resetAt: number }>();
  const submitLimiter = (req: import("express").Request, res: import("express").Response, next: () => void) => {
    const key = `${req.ip || "?"}:${req.params.token}`;
    const now = Date.now();
    const slot = submitHits.get(key);
    if (!slot || now > slot.resetAt) {
      submitHits.set(key, { count: 1, resetAt: now + 60 * 60 * 1000 });
      return next();
    }
    if (slot.count >= 20) {
      return res.status(429).json({ message: "יותר מדי בקשות, נסו שוב מאוחר יותר" });
    }
    slot.count++;
    next();
  };
  app.post("/api/pc/submit/:token", submitLimiter, submitUpload.single("file"), async (req, res) => {
    const t = priceComparison.getVoluntaryTokenByToken(String(req.params.token));
    if (!t || !t.active) return res.status(404).json({ message: "קישור לא תקין או בוטל" });
    let buffer: Buffer | null = req.file ? req.file.buffer : null;
    if (!buffer) {
      const b = (req.body ?? {}) as Record<string, unknown>;
      if (typeof b.content === "string" && b.content) buffer = Buffer.from(b.content, "utf8");
    }
    if (!buffer || buffer.length < 4) return res.status(400).json({ message: "לא צורף קובץ" });
    const job = priceComparison.createImportJob({ feedSourceId: null, trigger: "voluntary-submit", kind: "voluntary" });
    const log: pcIngest.Logger = (level, msg) => priceComparison.logImport(job.id, level, msg);
    try {
      const result = pcIngest.ingestBuffer(buffer, {
        sourceKind: "voluntary", chainId: t.chainId, chainName: t.storeName,
        storeId: t.storeId, source: "voluntary-submit", sourceType: "supplier_submitted",
      }, log);
      priceComparison.markVoluntaryUpload(t.id);
      const message = `voluntary submit "${t.storeName}": מוצרים ${result.productsUpserted}, מחירים +${result.pricesCreated}/~${result.pricesUpdated}, שגיאות ${result.errors}.`;
      priceComparison.finishImportJob(job.id, {
        status: result.errors > 0 && result.pricesCreated === 0 && result.pricesUpdated === 0 ? "error" : "ok",
        productsUpserted: result.productsUpserted, pricesUpserted: result.pricesCreated, errors: result.errors, message,
      });
      res.json({ ok: true, productsUpserted: result.productsUpserted, pricesCreated: result.pricesCreated, pricesUpdated: result.pricesUpdated, errors: result.errors });
    } catch (e) {
      priceComparison.finishImportJob(job.id, { status: "error", errors: 1, message: (e as Error).message });
      res.status(400).json({ ok: false, message: (e as Error).message });
    }
  });

  // ============================================================================
  // Health-Fund Comparison module — separate `hf_*` tables, /api/hf/* namespace.
  // "השוואת קופות חולים מבית בקלות". Catalog numbers start at 500. Public site
  // shows ONLY basic info (topic, audience, benefit range); the full picture
  // is requested through the "קרא עוד" → form → webhook (NEDARIM3873) flow,
  // exactly like the rights database. Does NOT touch rights, pc_* or fin_* data.
  // ============================================================================

  // ---- Public (basic info only) ----
  app.get("/api/hf/public/meta", (_req, res) => {
    res.json(healthFunds.meta());
  });

  app.get("/api/hf/public/categories", (req, res) => {
    const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;
    res.json(healthFunds.listCategories(kind));
  });

  app.get("/api/hf/public/search", (req, res) => {
    res.json(healthFunds.publicSearch({
      q: typeof req.query.q === "string" ? req.query.q : undefined,
      kind: typeof req.query.kind === "string" ? req.query.kind : undefined,
      category: typeof req.query.category === "string" ? req.query.category : undefined,
      fund: typeof req.query.fund === "string" ? req.query.fund : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    }));
  });

  app.get("/api/hf/public/topic/:id", (req, res) => {
    const t = healthFunds.getTopic(Number(req.params.id), true);
    if (!t || !t.active) return res.status(404).json({ message: "not found" });
    res.json(healthFunds.toPublicTopic(t));
  });

  // Public "קרא עוד" / service form submission. Creates a request and
  // dispatches it through the unified webhook bus to NEDARIM3873 — the n8n
  // automation then routes the full info to the client by email per the
  // automation_configs settings, exactly like the rights service form.
  app.post("/api/hf/public/request", async (req, res) => {
    const body = req.body ?? {};
    const topicId = Number(body.topicId);
    const topicRow = healthFunds.getTopic(topicId, true);
    if (!topicRow) return res.status(404).json({ message: "topic not found" });
    if (!body.termsAccepted) return res.status(400).json({ message: "terms must be accepted" });
    const requestType = String(body.requestType || "").trim();
    if (!healthFunds.HF_REQUEST_TYPES.has(requestType)) return res.status(400).json({ message: "request type is required" });
    const phone = cleanPhone(body.phone ?? body.tel ?? body.mobile);
    if (!phone || phone.length < 6) return res.status(400).json({ message: "phone is required" });
    const fullName = String(body.fullName ?? body.name ?? "").trim();
    if (!fullName) return res.status(400).json({ message: "full name is required" });
    const email = String(body.email ?? "").trim();
    if (!email) return res.status(400).json({ message: "email is required" });
    // Home address is collected additively for the "detailed info to email" flow.
    // The hf_requests schema has no dedicated address column, so we fold the
    // address into the free-text note (and expose it in the webhook client
    // object below) without altering the table.
    const address = String(body.address ?? body.city ?? "").trim();
    const rawNote = String(body.note ?? "").trim();
    const note = [address ? `כתובת מגורים: ${address}` : "", rawNote]
      .filter(Boolean)
      .join(" | ");

    const requestId = healthFunds.logRequest({
      topicId: topicRow.id,
      catalogNo: topicRow.catalogNo,
      topic: topicRow.topic,
      requestType,
      fullName,
      phone,
      email,
      note,
      channel: "web",
    });

    const webhookPayload = {
      source: "bkalut_health_fund_form",
      origin: {
        site: "bkalut-app",
        page: "/health-fund-service/" + topicRow.id,
        form: "health_fund_service_form",
        leadKind: "health_fund",
      },
      submittedAt: new Date().toISOString(),
      requestId,
      catalogNo: topicRow.catalogNo,
      requestType,
      requestTypeLabel: healthFunds.requestTypeLabel(requestType),
      selectedPath: healthFunds.requestTypeLabel(requestType),
      status: "new",
      topic: {
        id: topicRow.id,
        catalogNo: topicRow.catalogNo,
        kind: topicRow.kind,
        category: topicRow.category,
        subCategory: topicRow.subCategory,
        topic: topicRow.topic,
        audience: topicRow.audience,
        benefitSummary: topicRow.benefitSummary,
        rangeText: topicRow.rangeText,
        bestFund: topicRow.bestFund,
        fullBenefit: topicRow.fullBenefit,
        conditions: topicRow.conditions,
        qualifyingCases: topicRow.qualifyingCases,
        preparation: topicRow.preparation,
        documents: topicRow.documents,
        howToApply: topicRow.howToApply,
        officialLinks: topicRow.officialLinks,
        treatingBody: topicRow.treatingBody,
        tiers: topicRow.tiers ?? [],
      },
      client: { fullName, phone, email, address, note: rawNote },
      termsAccepted: Boolean(body.termsAccepted),
    };

    const dispatchResult = await dispatchWebhook({
      source: "bkalut_health_fund_form",
      configKey: "webhook_health_funds_lead",
      relatedKind: "hf_request",
      relatedId: requestId,
      payload: webhookPayload,
    });

    healthFunds.updateRequestWebhook(
      requestId,
      dispatchResult.ok ? "sent" : "failed",
      `HTTP ${dispatchResult.status}: ${dispatchResult.responseText}`,
    );
    res.json({
      ok: true,
      requestId,
      webhook: {
        ok: dispatchResult.ok,
        status: dispatchResult.status,
        endpointUrl: dispatchResult.endpointUrl,
        logId: dispatchResult.logId,
      },
    });
  });

  // ---- Public: fund-switch interest lead (מתעניין במעבר קופת חולים) ----
  // Additive flow: saves to the dedicated hf_switch_leads board AND dispatches
  // through the SAME unified webhook bus (NEDARIM3873). Only name + phone are
  // required; everything else is optional. Does NOT touch the existing
  // /api/hf/public/request lead flow.
  app.post("/api/hf/public/switch-lead", async (req, res) => {
    const body = req.body ?? {};
    const fullName = String(body.fullName ?? body.name ?? "").trim();
    if (!fullName) return res.status(400).json({ message: "full name is required" });
    const phone = cleanPhone(body.phone ?? body.tel ?? body.mobile);
    if (!phone || phone.length < 6) return res.status(400).json({ message: "phone is required" });

    // Optional topic context (button is opened from a specific benefit).
    const topicId = Number(body.topicId);
    const topicRow = Number.isFinite(topicId) && topicId > 0 ? healthFunds.getTopic(topicId, false) : null;

    const email = String(body.email ?? "").trim();
    const idNumber = String(body.idNumber ?? body.id ?? "").trim();
    const city = String(body.city ?? "").trim();
    const currentFund = String(body.currentFund ?? "").trim();
    const currentSupplemental = String(body.currentSupplemental ?? "").trim();
    const targetFund = String(body.targetFund ?? "").trim();
    const peopleCount = String(body.peopleCount ?? "").trim();
    const note = String(body.note ?? "").trim();

    const leadId = healthFunds.logSwitchLead({
      topicId: topicRow ? topicRow.id : null,
      catalogNo: topicRow ? topicRow.catalogNo : null,
      topic: topicRow ? topicRow.topic : "",
      fullName, phone, email, idNumber, city,
      currentFund, currentSupplemental, targetFund, peopleCount, note,
      channel: "web",
    });

    const webhookPayload = {
      source: "bkalut_health_fund_switch",
      origin: {
        site: "bkalut-app",
        page: "/health-funds",
        form: "health_fund_switch_form",
        leadKind: "health_fund_switch",
      },
      submittedAt: new Date().toISOString(),
      leadId,
      leadKind: "health_fund_switch",
      status: "new",
      topic: topicRow ? {
        id: topicRow.id,
        catalogNo: topicRow.catalogNo,
        kind: topicRow.kind,
        category: topicRow.category,
        topic: topicRow.topic,
      } : null,
      client: {
        fullName, phone, email, idNumber, city,
        currentFund, currentSupplemental, targetFund, peopleCount, note,
      },
    };

    const dispatchResult = await dispatchWebhook({
      source: "bkalut_health_fund_switch",
      configKey: "webhook_health_funds_lead",
      relatedKind: "hf_switch_lead",
      relatedId: leadId,
      payload: webhookPayload,
    });

    healthFunds.updateSwitchLeadWebhook(
      leadId,
      dispatchResult.ok ? "sent" : "failed",
      `HTTP ${dispatchResult.status}: ${dispatchResult.responseText}`,
    );

    res.json({
      ok: true,
      leadId,
      webhook: {
        ok: dispatchResult.ok,
        status: dispatchResult.status,
        endpointUrl: dispatchResult.endpointUrl,
        logId: dispatchResult.logId,
      },
    });
  });

  // ---- Admin: fund-switch leads board (list / edit / status / delete) ----
  app.get("/api/hf/admin/switch-leads", requireAdmin, (_req, res) => {
    res.json(healthFunds.listSwitchLeads(300));
  });
  app.get("/api/hf/admin/switch-leads/:id", requireAdmin, (req, res) => {
    const lead = healthFunds.getSwitchLead(Number(req.params.id));
    if (!lead) return res.status(404).json({ message: "not found" });
    res.json(lead);
  });
  app.patch("/api/hf/admin/switch-leads/:id", requireAdmin, (req, res) => {
    const ok = healthFunds.updateSwitchLead(Number(req.params.id), req.body ?? {});
    if (!ok) return res.status(404).json({ message: "not found or no changes" });
    res.json(healthFunds.getSwitchLead(Number(req.params.id)));
  });
  app.delete("/api/hf/admin/switch-leads/:id", requireAdmin, (req, res) => {
    const ok = healthFunds.deleteSwitchLead(Number(req.params.id));
    if (!ok) return res.status(404).json({ message: "not found" });
    res.json({ ok: true });
  });

  // ---- Admin: full CRUD on every parameter + adding new topics ----
  app.get("/api/hf/admin/topics", requireAdmin, (req, res) => {
    res.json(healthFunds.listTopics({
      kind: typeof req.query.kind === "string" ? req.query.kind : undefined,
      includeInactive: true,
      withTiers: req.query.withTiers === "1",
    }));
  });
  app.get("/api/hf/admin/topics/:id", requireAdmin, (req, res) => {
    const t = healthFunds.getTopic(Number(req.params.id), true);
    if (!t) return res.status(404).json({ message: "not found" });
    res.json(t);
  });
  app.post("/api/hf/admin/topics", requireAdmin, (req, res) => {
    const b = req.body ?? {};
    if (!String(b.topic || "").trim()) return res.status(400).json({ message: "topic is required" });
    res.json(healthFunds.createTopic({ ...b, createdBy: "admin" }));
  });
  app.patch("/api/hf/admin/topics/:id", requireAdmin, (req, res) => {
    const out = healthFunds.updateTopic(Number(req.params.id), req.body ?? {});
    if (!out) return res.status(404).json({ message: "not found" });
    res.json(out);
  });
  app.delete("/api/hf/admin/topics/:id", requireAdmin, (req, res) => {
    healthFunds.deleteTopic(Number(req.params.id));
    res.json({ ok: true });
  });

  app.post("/api/hf/admin/topics/:id/tiers", requireAdmin, (req, res) => {
    res.json(healthFunds.addTier(Number(req.params.id), req.body ?? {}));
  });
  app.patch("/api/hf/admin/tiers/:id", requireAdmin, (req, res) => {
    const out = healthFunds.updateTier(Number(req.params.id), req.body ?? {});
    if (!out) return res.status(404).json({ message: "not found" });
    res.json(out);
  });
  app.delete("/api/hf/admin/tiers/:id", requireAdmin, (req, res) => {
    healthFunds.deleteTier(Number(req.params.id));
    res.json({ ok: true });
  });

  app.get("/api/hf/admin/requests", requireAdmin, (_req, res) => {
    res.json(healthFunds.listRequests(200));
  });

  // ---- Admin: podcast (text script first, then audio) ----
  // Generate / regenerate the editable narration script from the topic fields.
  // Does NOT create audio — text only, fully editable afterwards.
  app.post("/api/hf/admin/topics/:id/podcast/script", requireAdmin, (req, res) => {
    const t = healthFunds.getTopic(Number(req.params.id), true);
    if (!t) return res.status(404).json({ message: "not found" });
    const script = buildPodcastScript(t);
    const out = healthFunds.setPodcastScript(t.id, script);
    res.json(out);
  });

  // Save a manually edited script (admin can tweak the text before audio).
  app.put("/api/hf/admin/topics/:id/podcast/script", requireAdmin, (req, res) => {
    const script = String((req.body ?? {}).script ?? "");
    const out = healthFunds.setPodcastScript(Number(req.params.id), script);
    if (!out) return res.status(404).json({ message: "not found" });
    res.json(out);
  });

  // Generate the audio file (ElevenLabs male narrator) from the saved script,
  // upload to public Supabase storage, and attach the URL to the topic.
  app.post("/api/hf/admin/topics/:id/podcast/audio", requireAdmin, async (req, res) => {
    const t = healthFunds.getTopic(Number(req.params.id), false);
    if (!t) return res.status(404).json({ message: "not found" });
    const script = (t.podcastScript || "").trim();
    if (!script) return res.status(400).json({ message: "אין סקריפט לפודקאסט — צרו או עיינו טקסט תחילה" });
    const result = await generatePodcastAudio(t.catalogNo, script);
    if (!result.ok) {
      healthFunds.setPodcastAudio(t.id, "", "error");
      return res.status(502).json({ message: "יצירת האודיו נכשלה", error: result.error });
    }
    const out = healthFunds.setPodcastAudio(t.id, result.url, "ready");
    res.json(out);
  });

  // Delete the generated audio (keeps the editable script).
  app.delete("/api/hf/admin/topics/:id/podcast/audio", requireAdmin, (req, res) => {
    const out = healthFunds.clearPodcastAudio(Number(req.params.id));
    if (!out) return res.status(404).json({ message: "not found" });
    res.json(out);
  });

  // Send the podcast (audio URL + script text) to the voice system through the
  // SAME unified webhook bus / callback (NEDARIM3873) used for leads. The n8n
  // automation decides whether to use the audio file or read the text aloud.
  app.post("/api/hf/admin/topics/:id/podcast/send", requireAdmin, async (req, res) => {
    const t = healthFunds.getTopic(Number(req.params.id), false);
    if (!t) return res.status(404).json({ message: "not found" });
    const dispatchResult = await dispatchWebhook({
      source: "bkalut_health_fund_podcast",
      configKey: "webhook_health_funds_lead",
      relatedKind: "hf_podcast",
      relatedId: t.id,
      payload: {
        source: "bkalut_health_fund_podcast",
        kind: "podcast",
        submittedAt: new Date().toISOString(),
        catalogNo: t.catalogNo,
        topic: t.topic,
        category: t.category,
        podcast: {
          script: t.podcastScript,
          audioUrl: t.podcastAudioUrl,
          status: t.podcastStatus,
        },
      },
    });
    res.json({
      ok: dispatchResult.ok,
      webhook: {
        ok: dispatchResult.ok,
        status: dispatchResult.status,
        endpointUrl: dispatchResult.endpointUrl,
        logId: dispatchResult.logId,
      },
    });
  });

  // ============================================================================
  // Community Gabbai Questionnaire module — separate `community_*` tables,
  // /api/community/* (admin) and /api/public/community/* (public).
  // ============================================================================

  // Resolve community questionnaire settings (with defaults). Stored in
  // automation_configs under key "community_settings".
  async function getCommunitySettings() {
    const cfg = await storage.getAutomationConfig("community_settings");
    const blob = cfg?.configJson ? safeJsonObj(cfg.configJson) : {};
    return {
      publicEnabled: blob.publicEnabled !== false,
      sourceLabel: typeof blob.sourceLabel === "string" && blob.sourceLabel.trim()
        ? String(blob.sourceLabel) : "community_gabbai_questionnaire",
      defaultLogoUrl: typeof blob.defaultLogoUrl === "string" ? String(blob.defaultLogoUrl) : "",
      brandingText: typeof blob.brandingText === "string" ? String(blob.brandingText) : "",
      updatedAt: cfg?.updatedAt ?? null,
    };
  }

  // ---- Public ----
  app.get("/api/public/community/:slug", async (req, res) => {
    const settings = await getCommunitySettings();
    if (!settings.publicEnabled) return res.status(404).json({ message: "link not found" });
    const link = community.getLinkBySlug(String(req.params.slug || "").trim());
    if (!link || !link.active) return res.status(404).json({ message: "link not found" });
    const q = community.getQuestionnaire(link.questionnaireId);
    if (!q || !q.active) return res.status(404).json({ message: "questionnaire not found" });
    res.json({
      slug: link.slug,
      linkId: link.id,
      questionnaire: {
        id: q.id, title: q.title, description: q.description,
        logoUrl: q.logoUrl || settings.defaultLogoUrl || null,
        introText: q.introText, successText: q.successText, collectContact: q.collectContact,
        brandingText: settings.brandingText || null,
      },
      questions: community.listQuestions(q.id),
    });
  });

  app.post("/api/public/community/:slug/submit", async (req, res) => {
    const settings = await getCommunitySettings();
    if (!settings.publicEnabled) return res.status(404).json({ message: "link not found" });
    const link = community.getLinkBySlug(String(req.params.slug || "").trim());
    if (!link || !link.active) return res.status(404).json({ message: "link not found" });
    const q = community.getQuestionnaire(link.questionnaireId);
    if (!q || !q.active) return res.status(403).json({ message: "questionnaire not active" });

    const body = (req.body ?? {}) as Record<string, any>;
    const answers = body.answers && typeof body.answers === "object" ? body.answers : {};
    const contact = body.contact && typeof body.contact === "object" ? body.contact : {};
    const contactName = String(contact.name || contact.fullName || "").trim();
    const contactPhone = cleanPhone(contact.phone);
    const contactEmail = String(contact.email || "").trim();
    const communityName = String(contact.communityName || contact.community || "").trim();

    // Validate required questions.
    const questions = community.listQuestions(q.id);
    for (const ques of questions) {
      if (ques.required) {
        const v = (answers as Record<string, unknown>)[String(ques.id)];
        const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
        if (empty) return res.status(400).json({ message: `חסר מענה לשאלת חובה: ${ques.label}` });
      }
    }

    const submission = community.insertSubmission({
      questionnaireId: q.id,
      linkId: link.id,
      slug: link.slug,
      answers,
      contactName,
      contactPhone: contactPhone || undefined,
      contactEmail: contactEmail || undefined,
      communityName: communityName || undefined,
      ipAddress: String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || ""),
      userAgent: String(req.headers["user-agent"] || ""),
    });

    // Build a readable answer map (label → answer) for the webhook payload.
    const labeledAnswers = questions.map((ques) => ({
      questionId: ques.id,
      label: ques.label,
      type: ques.type,
      answer: (answers as Record<string, unknown>)[String(ques.id)] ?? null,
    }));

    const webhookPayload = {
      source: settings.sourceLabel,
      questionnaireId: q.id,
      questionnaireTitle: q.title,
      linkId: link.id,
      slug: link.slug,
      submissionId: submission.id,
      submittedAt: submission.createdAt,
      contact: { name: contactName, phone: contactPhone, email: contactEmail, communityName },
      answers: labeledAnswers,
      rawAnswers: answers,
    };

    const dispatched = await dispatchWebhook({
      source: settings.sourceLabel,
      configKey: "webhook_rights_lead",
      relatedKind: "community_questionnaire_submission",
      relatedId: submission.id,
      payload: webhookPayload,
    });
    community.updateSubmissionWebhook(submission.id, dispatched.ok ? "sent" : "failed", dispatched.logId || null);

    res.json({
      ok: true,
      submissionId: submission.id,
      successText: q.successText || "תודה! הפנייה התקבלה.",
    });
  });

  // ---- Admin: questionnaires ----
  app.get("/api/community/admin/questionnaires", requireAdmin, (_req, res) => {
    const list = community.listQuestionnaires().map((q) => ({
      ...q,
      questionCount: community.listQuestions(q.id).length,
      linkCount: community.listLinks(q.id).length,
    }));
    res.json(list);
  });
  app.get("/api/community/admin/questionnaires/:id", requireAdmin, (req, res) => {
    const q = community.getQuestionnaire(Number(req.params.id));
    if (!q) return res.status(404).json({ message: "not found" });
    res.json({ questionnaire: q, questions: community.listQuestions(q.id), links: community.listLinks(q.id) });
  });
  app.post("/api/community/admin/questionnaires", requireAdmin, (req: AuthedRequest, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    if (!String(b.title || "").trim()) return res.status(400).json({ message: "title is required" });
    res.json(community.createQuestionnaire({
      title: String(b.title),
      description: b.description ? String(b.description) : undefined,
      logoUrl: b.logoUrl ? String(b.logoUrl) : undefined,
      introText: b.introText ? String(b.introText) : undefined,
      successText: b.successText ? String(b.successText) : undefined,
      collectContact: typeof b.collectContact === "boolean" ? b.collectContact : undefined,
      active: typeof b.active === "boolean" ? b.active : undefined,
      createdBy: req.adminSession?.identity ?? "",
    }));
  });
  app.patch("/api/community/admin/questionnaires/:id", requireAdmin, (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const out = community.updateQuestionnaire(Number(req.params.id), {
      title: typeof b.title === "string" ? b.title : undefined,
      description: typeof b.description === "string" ? b.description : undefined,
      logoUrl: typeof b.logoUrl === "string" ? b.logoUrl : undefined,
      introText: typeof b.introText === "string" ? b.introText : undefined,
      successText: typeof b.successText === "string" ? b.successText : undefined,
      collectContact: typeof b.collectContact === "boolean" ? b.collectContact : undefined,
      active: typeof b.active === "boolean" ? b.active : undefined,
    });
    if (!out) return res.status(404).json({ message: "not found" });
    res.json(out);
  });
  app.delete("/api/community/admin/questionnaires/:id", requireAdmin, (req, res) => {
    community.deleteQuestionnaire(Number(req.params.id));
    res.json({ ok: true });
  });

  // ---- Admin: questions ----
  app.post("/api/community/admin/questionnaires/:id/questions", requireAdmin, (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    if (!String(b.label || "").trim()) return res.status(400).json({ message: "label is required" });
    res.json(community.createQuestion({
      questionnaireId: Number(req.params.id),
      label: String(b.label),
      helpText: b.helpText ? String(b.helpText) : undefined,
      type: (b.type ? String(b.type) : "text") as community.QuestionType,
      required: typeof b.required === "boolean" ? b.required : false,
      options: Array.isArray(b.options) ? (b.options as any[]).map((o) => ({ value: String(o?.value ?? o), label: String(o?.label ?? o?.value ?? o) })) : [],
      sortOrder: b.sortOrder !== undefined ? Number(b.sortOrder) : undefined,
    }));
  });
  app.patch("/api/community/admin/questions/:id", requireAdmin, (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const out = community.updateQuestion(Number(req.params.id), {
      label: typeof b.label === "string" ? b.label : undefined,
      helpText: typeof b.helpText === "string" ? b.helpText : undefined,
      type: b.type ? (String(b.type) as community.QuestionType) : undefined,
      required: typeof b.required === "boolean" ? b.required : undefined,
      options: Array.isArray(b.options) ? (b.options as any[]).map((o) => ({ value: String(o?.value ?? o), label: String(o?.label ?? o?.value ?? o) })) : undefined,
      sortOrder: b.sortOrder !== undefined ? Number(b.sortOrder) : undefined,
    });
    if (!out) return res.status(404).json({ message: "not found" });
    res.json(out);
  });
  app.delete("/api/community/admin/questions/:id", requireAdmin, (req, res) => {
    community.deleteQuestion(Number(req.params.id));
    res.json({ ok: true });
  });

  // ---- Admin: links ----
  app.post("/api/community/admin/questionnaires/:id/links", requireAdmin, (req: AuthedRequest, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const result = community.createLink({
      questionnaireId: Number(req.params.id),
      slug: b.slug ? String(b.slug) : undefined,
      label: b.label ? String(b.label) : undefined,
      createdBy: req.adminSession?.identity ?? "",
    });
    if (!result.ok) return res.status(400).json({ message: result.error });
    res.json(result.link);
  });
  app.patch("/api/community/admin/links/:id", requireAdmin, (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const out = community.updateLink(Number(req.params.id), {
      label: typeof b.label === "string" ? b.label : undefined,
      active: typeof b.active === "boolean" ? b.active : undefined,
    });
    if (!out) return res.status(404).json({ message: "not found" });
    res.json(out);
  });
  app.delete("/api/community/admin/links/:id", requireAdmin, (req, res) => {
    community.deleteLink(Number(req.params.id));
    res.json({ ok: true });
  });

  // ---- Admin: submissions ----
  app.get("/api/community/admin/submissions", requireAdmin, (req, res) => {
    const questionnaireId = req.query.questionnaireId ? Number(req.query.questionnaireId) : undefined;
    const limit = Math.min(Number(req.query.limit) || 200, 1000);
    res.json(community.listSubmissions(questionnaireId, limit));
  });

  // ---- Admin: global community settings ----
  app.get("/api/community/admin/settings", requireAdmin, async (_req, res) => {
    res.json(await getCommunitySettings());
  });
  app.patch("/api/community/admin/settings", requireAdmin, async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const existing = await storage.getAutomationConfig("community_settings");
    const current = existing?.configJson ? safeJsonObj(existing.configJson) : {};
    if (typeof body.publicEnabled === "boolean") current.publicEnabled = body.publicEnabled;
    if (typeof body.sourceLabel === "string") current.sourceLabel = body.sourceLabel;
    if (typeof body.defaultLogoUrl === "string") current.defaultLogoUrl = body.defaultLogoUrl;
    if (typeof body.brandingText === "string") current.brandingText = body.brandingText;
    await storage.updateAutomationConfig("community_settings", {
      enabled: true,
      config: current,
      label: "הגדרות שאלוני גבאי קהילות",
      description: "הגדרות גלובליות לשאלוני הקהילות (זמינות, מקור וובהוק, מיתוג).",
    });
    res.json(await getCommunitySettings());
  });

  // ============ Public catalog settings (exact-state search button etc.) ============
  app.get("/api/public/catalog-settings", async (_req, res) => {
    const cfg = await storage.getAutomationConfig("catalog_settings");
    const blob = cfg?.configJson ? safeJsonObj(cfg.configJson) : {};
    res.json({
      exactStateSearchEnabled: blob.exactStateSearchEnabled !== false,
    });
  });

  app.get("/api/admin/catalog-settings", requireAdmin, async (_req, res) => {
    const cfg = await storage.getAutomationConfig("catalog_settings");
    const blob = cfg?.configJson ? safeJsonObj(cfg.configJson) : {};
    res.json({
      exactStateSearchEnabled: blob.exactStateSearchEnabled !== false,
    });
  });

  app.patch("/api/admin/catalog-settings", requireAdmin, async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const existing = await storage.getAutomationConfig("catalog_settings");
    const current = existing?.configJson ? safeJsonObj(existing.configJson) : {};
    if (typeof body.exactStateSearchEnabled === "boolean") {
      current.exactStateSearchEnabled = body.exactStateSearchEnabled;
    }
    const updated = await storage.updateAutomationConfig("catalog_settings", {
      enabled: true,
      config: current,
      label: "הגדרות קטלוג ציבורי",
      description: "תצוגת כפתורים בעמוד קטלוג הזכויות הציבורי.",
    });
    res.json({
      ok: true,
      exactStateSearchEnabled: current.exactStateSearchEnabled !== false,
      updatedAt: updated?.updatedAt ?? null,
    });
  });

  // Public-safe list of params/topics (no internal notes/source) used by the
  // "חיפוש לפי מצב מדויק" picker. Returns only when the admin toggle is on.
  app.get("/api/public/params-topics", async (_req, res) => {
    const cfg = await storage.getAutomationConfig("catalog_settings");
    const blob = cfg?.configJson ? safeJsonObj(cfg.configJson) : {};
    const enabled = blob.exactStateSearchEnabled !== false;
    if (!enabled) return res.json({ enabled: false, items: [] });
    const all = paramsTopics.listAll();
    res.json({
      enabled: true,
      items: all.map((p) => ({
        id: p.id,
        title: p.title,
        category: p.category,
        subCategory: p.subCategory,
        description: p.description,
        profileConditions: p.profileConditions,
        tags: p.tags,
      })),
    });
  });

  // ============ Admin parameters / topics knowledge base ============
  // Extensible list of parameter/topic entries used internally to map
  // family/economic/health/etc. conditions → rights & opportunities.
  // Public endpoints DO NOT expose this — admin-gated only.

  app.get("/api/admin/params-topics", requireAdmin, async (_req, res) => {
    res.json(paramsTopics.listAll());
  });

  app.post("/api/admin/params-topics", requireAdmin, async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const title = String(body.title || "").trim();
    if (!title) return res.status(400).json({ message: "title is required" });
    const out = paramsTopics.create({
      title,
      category: typeof body.category === "string" ? body.category : "",
      subCategory: typeof body.subCategory === "string" ? body.subCategory : "",
      profileConditions: Array.isArray(body.profileConditions)
        ? (body.profileConditions as unknown[]).map(String)
        : [],
      description: typeof body.description === "string" ? body.description : "",
      tags: Array.isArray(body.tags) ? (body.tags as unknown[]).map(String) : [],
      priority: typeof body.priority === "number" ? body.priority : 50,
      source: typeof body.source === "string" ? body.source : "",
      notes: typeof body.notes === "string" ? body.notes : "",
    });
    res.json(out);
  });

  app.patch("/api/admin/params-topics/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const patch: Partial<paramsTopics.ParamTopicInput> = {};
    if (typeof body.title === "string") patch.title = body.title;
    if (typeof body.category === "string") patch.category = body.category;
    if (typeof body.subCategory === "string") patch.subCategory = body.subCategory;
    if (Array.isArray(body.profileConditions)) patch.profileConditions = (body.profileConditions as unknown[]).map(String);
    if (typeof body.description === "string") patch.description = body.description;
    if (Array.isArray(body.tags)) patch.tags = (body.tags as unknown[]).map(String);
    if (typeof body.priority === "number") patch.priority = body.priority;
    if (typeof body.source === "string") patch.source = body.source;
    if (typeof body.notes === "string") patch.notes = body.notes;
    const out = paramsTopics.update(id, patch);
    if (!out) return res.status(404).json({ message: "not found" });
    res.json(out);
  });

  app.delete("/api/admin/params-topics/:id", requireAdmin, async (req, res) => {
    paramsTopics.remove(Number(req.params.id));
    res.json({ ok: true });
  });

  // Reset defaults (re-seed sections/rules from the canonical defaults).
  app.post("/api/admin/potential/config/reset-defaults", requireAdmin, async (_req, res) => {
    const updated = await storage.updateAutomationConfig("potential_scanner", {
      enabled: true,
      config: potential.DEFAULT_POTENTIAL_CONFIG as unknown as Record<string, unknown>,
    });
    res.json({ ok: true, enabled: Boolean(updated?.enabled), config: potential.DEFAULT_POTENTIAL_CONFIG });
  });

  // ============ Admin: API access (external automation token) ============
  app.get("/api/admin/api-access", requireAdmin, async (_req, res) => {
    const settings = await loadApiSettings();
    res.json({
      ok: true,
      requireToken: settings.requireToken,
      hasToken: Boolean(settings.tokenHash),
      tokenPrefix: settings.tokenPrefix,
      docsUrl: "/api/external",
    });
  });

  app.patch("/api/admin/api-access", requireAdmin, async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const patch: any = {};
    if (typeof body.requireToken === "boolean") patch.requireToken = body.requireToken;
    const settings = await saveApiSettings(patch);
    res.json({
      ok: true,
      requireToken: settings.requireToken,
      hasToken: Boolean(settings.tokenHash),
      tokenPrefix: settings.tokenPrefix,
    });
  });

  app.post("/api/admin/api-access/rotate", requireAdmin, async (_req, res) => {
    const { token, settings } = await rotateApiToken();
    // The plain token is returned ONCE so the admin can copy it. We never
    // persist or log it.
    res.json({
      ok: true,
      token,
      requireToken: settings.requireToken,
      hasToken: true,
      tokenPrefix: settings.tokenPrefix,
      note: "שמרו את הטוקן כעת — לא נחזיר אותו שוב. נשמר רק ההאש שלו.",
    });
  });

  app.post("/api/admin/api-access/clear", requireAdmin, async (_req, res) => {
    const settings = await clearApiToken();
    res.json({ ok: true, requireToken: settings.requireToken, hasToken: false, tokenPrefix: "" });
  });

  // Mount the external automation API (gated by the settings above).
  registerExternalApi(app);

  // Financial system routes
  registerFinancialRoutes(app);

  // Google OAuth admin login (no-op when env vars are missing — UI shows
  // "not configured" state in that case).
  registerGoogleAuthRoutes(app);

  return httpServer;
}

function safeJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function safeJsonObj(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

async function callExternalEndpoint(url: string, payload: unknown, callbackUrl: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "user-agent": "bkalut-admin/1.0",
    };
    if (callbackUrl) headers["x-callback-url"] = callbackUrl;
    const r = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await r.text();
    return { ok: r.ok, detail: `HTTP ${r.status}`, responseText: text.slice(0, 2000) };
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : "request failed",
      responseText: error instanceof Error ? error.message : "request failed",
    };
  } finally {
    clearTimeout(timer);
  }
}
