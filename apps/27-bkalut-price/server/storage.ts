import {
  clients,
  serviceSubmissions,
  users,
  appUsers,
  deliveryQueue,
  automationConfigs,
  adminSessions,
  userSessions,
  premiumRequests,
  webhookLog,
  legalAcceptances,
  finClients,
  finCategories,
  finBudgets,
  finTransactions,
  finRecurring,
  finOpportunities,
  finLeads,
  finTips,
  finDebts,
  finGoals,
  finAlerts,
  finPlans,
  finNotes,
  inboundLeads,
} from "@shared/schema";
import type {
  Client,
  ServiceSubmission,
  User,
  InsertUser,
  AppUser,
  DeliveryMessage,
  AutomationConfig,
  AdminSession,
  UserSession,
  PremiumRequest,
  WebhookLog,
  LegalAcceptance,
  FinClient,
  FinCategory,
  FinBudget,
  FinTransaction,
  FinRecurring,
  FinOpportunity,
  FinLead,
  FinTip,
  InboundLead,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and, lte } from "drizzle-orm";
import crypto from "node:crypto";
import type {
  IStorage,
  ClientInput,
  ServiceSubmissionInput,
  ServiceSubmissionRow,
  AppUserInput,
  DeliveryMessageInput,
  AutomationConfigInput,
  InboundLeadInput,
} from "./storage-types";
import { SupabaseStorage } from "./supabase-storage";

export type {
  IStorage,
  ClientInput,
  ServiceSubmissionInput,
  ServiceSubmissionRow,
  AppUserInput,
  DeliveryMessageInput,
  AutomationConfigInput,
  InboundLeadInput,
};

export const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(String(input ?? ""), "utf8").digest("hex");
}
export { sha256Hex };
sqlite.exec(`
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  id_number TEXT,
  birth_date TEXT,
  city TEXT,
  family_status TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS service_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  right_id INTEGER NOT NULL,
  topic TEXT NOT NULL,
  category TEXT NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'info',
  potential_percent INTEGER NOT NULL,
  potential_level TEXT NOT NULL,
  answers_json TEXT NOT NULL,
  details_json TEXT NOT NULL,
  documents_json TEXT NOT NULL,
  additional_topics_json TEXT NOT NULL,
  terms_accepted INTEGER NOT NULL,
  webhook_status TEXT NOT NULL DEFAULT 'pending',
  webhook_response TEXT,
  webhook_sent_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'active',
  product_access_json TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS delivery_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,
  recipient_type TEXT NOT NULL,
  recipient_id INTEGER,
  recipient_label TEXT NOT NULL,
  to_address TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  callback_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  status_detail TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  endpoint_used TEXT,
  response_text TEXT,
  scheduled_at TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS automation_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  enabled INTEGER NOT NULL DEFAULT 0,
  endpoint_url TEXT,
  secret_ref TEXT,
  config_json TEXT NOT NULL DEFAULT '{}',
  last_status TEXT,
  last_tested_at TEXT,
  last_result TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  identity TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  mode TEXT NOT NULL DEFAULT 'household',
  family_size INTEGER,
  city TEXT,
  monthly_income INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'expense',
  color TEXT,
  icon TEXT,
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  monthly_limit INTEGER NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  category_id INTEGER,
  kind TEXT NOT NULL DEFAULT 'expense',
  amount INTEGER NOT NULL,
  description TEXT,
  occurred_on TEXT NOT NULL,
  source TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_recurring (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  amount INTEGER,
  kind TEXT NOT NULL DEFAULT 'reminder',
  category_id INTEGER,
  cadence TEXT NOT NULL DEFAULT 'monthly',
  next_date TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_opportunities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER,
  title TEXT NOT NULL,
  topic TEXT,
  category TEXT,
  right_id INTEGER,
  estimated_yearly_value INTEGER,
  status TEXT NOT NULL DEFAULT 'new',
  recommendation TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  mode TEXT,
  message TEXT,
  source TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  webhook_status TEXT NOT NULL DEFAULT 'pending',
  webhook_response TEXT,
  webhook_sent_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_tips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tag TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  app_user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS premium_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_user_id INTEGER NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  decided_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS webhook_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  related_kind TEXT,
  related_id INTEGER,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  http_status INTEGER,
  response_text TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT,
  next_retry_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS legal_acceptances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_key TEXT NOT NULL,
  document_version TEXT NOT NULL,
  subject_kind TEXT NOT NULL,
  subject_id INTEGER,
  full_name TEXT,
  identifier TEXT,
  signature_method TEXT NOT NULL DEFAULT 'checkbox',
  signature_value TEXT,
  ip_address TEXT,
  user_agent TEXT,
  accepted_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_debts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  creditor TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'loan',
  original_amount INTEGER,
  current_balance INTEGER NOT NULL,
  monthly_payment INTEGER,
  interest_rate INTEGER,
  start_date TEXT,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  target_amount INTEGER NOT NULL,
  saved_amount INTEGER NOT NULL DEFAULT 0,
  target_date TEXT,
  monthly_contribution INTEGER,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  level TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT,
  source TEXT,
  acknowledged INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  steps_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  premium INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  author_role TEXT NOT NULL DEFAULT 'admin',
  title TEXT,
  body TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'both',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inbound_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_site TEXT,
  source_page TEXT,
  origin TEXT,
  category TEXT,
  topic TEXT,
  request_type TEXT,
  selected_path TEXT,
  potential_score INTEGER,
  potential_level TEXT,
  contact_full_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  contact_id_number TEXT,
  answers_json TEXT NOT NULL DEFAULT '{}',
  documents_json TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  legal_accepted_json TEXT NOT NULL DEFAULT '{}',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  referrer TEXT,
  external_id TEXT,
  lead_kind TEXT NOT NULL DEFAULT 'rights',
  raw_payload_json TEXT NOT NULL DEFAULT '{}',
  auth_status TEXT NOT NULL DEFAULT 'unauthenticated',
  webhook_status TEXT NOT NULL DEFAULT 'pending',
  webhook_log_id INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  assignee_id INTEGER,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  sender_role TEXT NOT NULL,
  sender_name TEXT,
  body TEXT NOT NULL,
  channel TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'pending',
  url TEXT,
  storage_key TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  notes TEXT,
  uploaded_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  ref_id INTEGER,
  title TEXT NOT NULL,
  detail TEXT,
  actor_role TEXT,
  actor_name TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  related_kind TEXT,
  related_id INTEGER,
  title TEXT NOT NULL,
  body TEXT,
  due_at TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'internal',
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  period_month TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  summary TEXT,
  metrics_json TEXT NOT NULL DEFAULT '{}',
  sent_at TEXT,
  url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reminder_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id INTEGER NOT NULL,
  topic_title TEXT,
  response TEXT NOT NULL,            -- yes | not_yet | not_eligible
  contact_name TEXT,
  contact_phone TEXT,
  next_reminder_date TEXT,            -- YYYY-MM-DD when response = not_yet
  wants_service INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);
`);

function ensureColumn(table: string, column: string, definition: string) {
  const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!cols.some((col) => col.name === column)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

ensureColumn("clients", "birth_date", "TEXT");
ensureColumn("service_submissions", "request_type", "TEXT NOT NULL DEFAULT 'info'");
ensureColumn("service_submissions", "webhook_status", "TEXT NOT NULL DEFAULT 'pending'");
ensureColumn("service_submissions", "webhook_response", "TEXT");
ensureColumn("service_submissions", "webhook_sent_at", "TEXT");
// New columns on app_users for real login users
ensureColumn("app_users", "username", "TEXT");
ensureColumn("app_users", "password_hash", "TEXT");
ensureColumn("app_users", "password_plain", "TEXT");
ensureColumn("app_users", "plan", "TEXT NOT NULL DEFAULT 'basic'");
ensureColumn("app_users", "fin_client_id", "INTEGER");
ensureColumn("app_users", "last_login_at", "TEXT");
ensureColumn("app_users", "credentials_delivered_at", "TEXT");
// Coach assignment on financial clients (FK to app_users with role='coach').
ensureColumn("fin_clients", "coach_id", "INTEGER");

export const db = drizzle(sqlite);

/** Return the list of tables actually present in the SQLite db. */
export function listSqliteTables(): string[] {
  const rows = sqlite
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
    .all() as Array<{ name: string }>;
  return rows.map((r) => r.name);
}

// ---------------------------------------------------------------------------
// Automation defaults (seed if empty)
// ---------------------------------------------------------------------------
const AUTOMATION_DEFAULTS: Array<Omit<AutomationConfig, "id" | "updatedAt">> = [
  // ---- Webhook-style integrations (Hebrew label: כתובות וובהוק לקבלת נתונים) ----
  { key: "webhook_rights_lead", label: "וובהוק — פניות זכויות (NEDARIM3873)", description: "כתובת n8n נוספת לקבלת פניות מתוך טפסי הזכויות והשאלונים בבקלות. נשלח בנוסף לשמירה ב-DB המקומי.", enabled: 1, endpointUrl: "https://n8n.l023131500.work/webhook/NEDARIM3873", secretRef: "", configJson: '{"timeoutMs":8000}', lastStatus: "idle", lastTestedAt: null, lastResult: null },
  { key: "webhook_financial_lead", label: "וובהוק — פניות ניהול פיננסי (NEDARIM3873)", description: "כתובת n8n נוספת לפניות מאתר השיווק הפיננסי. נשלח בנוסף לשמירה ב-DB המקומי.", enabled: 1, endpointUrl: "https://n8n.l023131500.work/webhook/NEDARIM3873", secretRef: "", configJson: '{"timeoutMs":8000}', lastStatus: "idle", lastTestedAt: null, lastResult: null },
  { key: "webhook_credentials_delivery", label: "וובהוק — שליחת פרטי כניסה ללקוחות", description: "שליחה אוטומטית של שם משתמש/סיסמה שנוצרו על ידי האדמין למייל/וואטסאפ של הלקוח דרך n8n.", enabled: 1, endpointUrl: "https://n8n.l023131500.work/webhook/NEDARIM3873", secretRef: "", configJson: '{"channelPreference":["email","whatsapp"]}', lastStatus: "idle", lastTestedAt: null, lastResult: null },
  { key: "webhook_premium_decision", label: "וובהוק — החלטות שדרוג פרימיום", description: "שליחת אישור/דחיה של בקשת שדרוג פרימיום ופרטי גישה למסלול חדש.", enabled: 1, endpointUrl: "https://n8n.l023131500.work/webhook/NEDARIM3873", secretRef: "", configJson: '{}', lastStatus: "idle", lastTestedAt: null, lastResult: null },
  { key: "webhook_callback", label: "וובהוק — בקשת חזרה (Callback)", description: "כתובת לקבלת בקשות שיחה חוזרת מהאתר.", enabled: 0, endpointUrl: "", secretRef: "", configJson: '{}', lastStatus: "idle", lastTestedAt: null, lastResult: null },
  { key: "webhook_voice_message", label: "וובהוק — בקשת הודעה קולית", description: "כתובת לקבלת בקשה לשליחת הודעה קולית ללקוח.", enabled: 0, endpointUrl: "", secretRef: "", configJson: '{}', lastStatus: "idle", lastTestedAt: null, lastResult: null },
  { key: "webhook_email_automation", label: "וובהוק — אוטומציית מייל/הודעות", description: "כתובת לשליחת מייל/וואטסאפ ללקוח דרך n8n או ספק חיצוני.", enabled: 0, endpointUrl: "", secretRef: "", configJson: '{}', lastStatus: "idle", lastTestedAt: null, lastResult: null },
  { key: "general_inquiry_reply", label: "תבנית — מייל לפנייה כללית", description: "תבנית טקסט עברית לתשובה אוטומטית לפנייה כללית. ניתן לערוך כאן את הנושא, גוף הטקסט וברירות מחדל. השליחה בפועל מתבצעת דרך אוטומציית המייל/הוובהוקים, ומתועדת ב-webhook_log.", enabled: 1, endpointUrl: "", secretRef: "", configJson: JSON.stringify({ subject: "תודה שפניתם לארגון בקלות", body: "שלום וברכה {{fullName}},\n\nאנחנו שמחים שפניתם לארגון בקלות.\nכדי שנוכל להחזיר לכם תשובה ממוקדת ומהירה, נשמח שתעדכנו אותנו באיזה תחום מדובר: זכויות והטבות, ניהול פיננסי, סיוע לחיוב חודשי או נושא אחר.\n\nניתן לבדוק התאמה ראשונית ולמלא פנייה ישירות בעמוד הזכאות שלנו:\n{{publicEligibilityUrl}}\n\nאם נוח לכם, אפשר לחזור אלינו גם בטלפון 02-3131500 או במייל l023131500@gmail.com.\nפרטי הקשר שמסרתם: טלפון {{phone}}, מייל {{email}}.\n\nבברכה,\nצוות ארגון בקלות", channels: ["email"], defaultPublicEligibilityUrl: "/#/" }), lastStatus: "idle", lastTestedAt: null, lastResult: null },
  { key: "webhook_yemot_podcast", label: "וובהוק — Yemot / מערכת קולית", description: "כתובת לדחיפת תכני פודקאסט / מערכת קולית למערכת ימות.", enabled: 0, endpointUrl: "", secretRef: "", configJson: '{"extension":"7"}', lastStatus: "idle", lastTestedAt: null, lastResult: null },
  { key: "webhook_video_automation", label: "וובהוק — יצירת וידאו אוטומטית", description: "כתובת לדחיפת בקשת יצירת סרטון עם דמות מדברת.", enabled: 0, endpointUrl: "", secretRef: "", configJson: '{}', lastStatus: "idle", lastTestedAt: null, lastResult: null },
  { key: "email", label: "מייל יוצא", description: "שליחה לכתובת דוא\"ל ללקוח. ניתן לחבר לספק SMTP/SendGrid או n8n.", enabled: 0, endpointUrl: "", secretRef: "EMAIL_PROVIDER_TOKEN", configJson: '{"from":"שירות בקלות <service@bklot.example>"}', lastStatus: "idle", lastTestedAt: null, lastResult: null },
  { key: "whatsapp", label: "WhatsApp", description: "שליחה ב-WhatsApp דרך ספק עסקי או n8n. דרושה הסכמת לקוח.", enabled: 0, endpointUrl: "", secretRef: "WHATSAPP_PROVIDER_TOKEN", configJson: '{"sender":"02-3131500"}', lastStatus: "idle", lastTestedAt: null, lastResult: null },
  { key: "voice", label: "מערכת קולית", description: "מערכת קולית טלפונית. שלוחה ראשית 02-3131500.", enabled: 0, endpointUrl: "", secretRef: "VOICE_API_TOKEN", configJson: '{"mainNumber":"02-3131500","extension":"7"}', lastStatus: "idle", lastTestedAt: null, lastResult: null },
  { key: "n8n", label: "n8n Webhook", description: "Webhook מרכזי לתזמור. שליחת השירות הציבורית (טופס שירות) זורמת ל-NEDARIM3873. שליחה מנהלית דרך התור מתבצעת רק כשהקונקטור מופעל.", enabled: 0, endpointUrl: "https://n8n.l023131500.work/webhook/NEDARIM3873", secretRef: "BKALUT_N8N_TOKEN", configJson: '{}', lastStatus: "idle", lastTestedAt: null, lastResult: null },
  { key: "github", label: "GitHub ייצוא", description: "מאגר קוד וסנכרון Push. ניהול דרך .git ושירות חיצוני.", enabled: 0, endpointUrl: "https://github.com", secretRef: "GITHUB_TOKEN", configJson: '{"defaultBranch":"main"}', lastStatus: "idle", lastTestedAt: null, lastResult: null },
  { key: "supabase", label: "Supabase", description: "בסיס נתונים בענן לשני המוצרים. סנכרון ידני בשלב זה.", enabled: 0, endpointUrl: "https://supabase.com", secretRef: "SUPABASE_SERVICE_KEY", configJson: '{"projectRef":""}', lastStatus: "idle", lastTestedAt: null, lastResult: null },
  { key: "google_drive", label: "Google Drive", description: "עדכון מאגר הזכויות מ-XLSX. נדרשת הרשאה דרך Connectors.", enabled: 0, endpointUrl: "https://drive.google.com", secretRef: "GOOGLE_DRIVE_TOKEN", configJson: '{"folderId":""}', lastStatus: "idle", lastTestedAt: null, lastResult: null },
  { key: "monthly_refresh", label: "רענון חודשי", description: "תזמון אוטומטי שמושך עדכונים מ-kolzchut/btl/gov.il. 1 בכל חודש 09:00.", enabled: 0, endpointUrl: "", secretRef: "", configJson: '{"cron":"0 9 1 * *","timezone":"Asia/Jerusalem"}', lastStatus: "idle", lastTestedAt: null, lastResult: null },
  { key: "rights_api", label: "Rights API פנימי", description: "חשיפת מאגר הזכויות לשירותים אחרים (כולל מערכת פיננסית) עם טוקן.", enabled: 0, endpointUrl: "/api/v1/rights", secretRef: "RIGHTS_API_TOKEN", configJson: '{}', lastStatus: "idle", lastTestedAt: null, lastResult: null },
  // Public chatbot floating widget. `enabled` toggles whether the bot
  // renders on the public site. configJson carries the admin-editable
  // system instructions and copy. Instructions are never returned by
  // the public config endpoint — only by the admin endpoint.
  // Potential rights scanner — configurable questionnaire + matching rules.
  // The `configJson` blob is editable from the admin scanner page; defaults
  // are filled in lazily by potential-scanner.ts when the blob is empty.
  { key: "potential_scanner", label: "סורק פוטנציאל זכויות (שאלון פרופיל)", description: "שאלון פרופיל אישי ציבורי שמציע אילו זכויות שווה לבדוק. ניתן להפעיל/לכבות, לערוך סעיפים, אפשרויות וכללי מיפוי, ולהפיק קישורים מותאמים אישית.", enabled: 1, endpointUrl: "", secretRef: "", configJson: JSON.stringify({ enabled: true }), lastStatus: "idle", lastTestedAt: null, lastResult: null },
  { key: "automation_api", label: "API חיצוני / אוטומציות", description: "טוקן וגישה לנקודות הקצה /api/external/* לאוטומציות.", enabled: 1, endpointUrl: "", secretRef: "", configJson: JSON.stringify({ requireToken: true, tokenHash: "", tokenPrefix: "" }), lastStatus: "idle", lastTestedAt: null, lastResult: null },
  { key: "catalog_settings", label: "הגדרות קטלוג ציבורי", description: "תצוגת כפתורים בעמוד קטלוג הזכויות הציבורי (חיפוש לפי מצב מדויק וכו').", enabled: 1, endpointUrl: "", secretRef: "", configJson: JSON.stringify({ exactStateSearchEnabled: true }), lastStatus: "idle", lastTestedAt: null, lastResult: null },
  { key: "public_chatbot", label: "צ׳אטבוט באתר הציבורי", description: "בוט צף בפינת האתר הציבורי. שני נתיבים: שאלות על זכויות והטבות, או בקשת סיוע מארגון בקלות. ניתן להפעיל/לכבות ולערוך הנחיות.", enabled: 0, endpointUrl: "", secretRef: "", configJson: JSON.stringify({ intro: "שלום! אני העוזר של ארגון בקלות. איך אפשר לעזור?", instructions: "ענה בעברית, בקצרה (1-3 משפטים), בלשון מכבדת. אל תחשוף את כל פרטי הזכות, התסריטים הפנימיים או הגוף המטפל. אם נושא רגיש, הצע פנייה אישית לצוות בקלות.", contact: { phone: "02-3131500", email: "l023131500@gmail.com", whatsapp: "https://wa.me/97223131500" }, ctaText: "מעניין אותך לקבל את פרטי הנושא המלאים? אוכל לשלוח לך אותם ללא עלות. אפשר גם להפעיל תזכורת או טיפול מלא של צוות בקלות.", closingText: "שמחנו שפנית אלינו! צוות בקלות תמיד כאן עבורך. אפשר לחזור אלינו בטלפון 02-3131500, בוואטסאפ או במייל." }), lastStatus: "idle", lastTestedAt: null, lastResult: null },
];

(function seedAutomations() {
  const now = new Date().toISOString();
  const existing = db.select().from(automationConfigs).all();
  const existingKeys = new Set(existing.map((r) => r.key));
  for (const def of AUTOMATION_DEFAULTS) {
    if (!existingKeys.has(def.key)) {
      db.insert(automationConfigs).values({ ...def, updatedAt: now }).run();
    }
  }
  // Force-migrate any pre-existing rows that still point at the old IGUDHASHIURIM_NEDARIM
  // endpoint to the new NEDARIM3873 endpoint per latest user direction.
  const oldUrl = "https://n8n.l023131500.work/webhook/IGUDHASHIURIM_NEDARIM";
  const newUrl = "https://n8n.l023131500.work/webhook/NEDARIM3873";
  sqlite
    .prepare(`UPDATE automation_configs SET endpoint_url = ?, updated_at = ? WHERE endpoint_url = ?`)
    .run(newUrl, now, oldUrl);
})();

// ---------------------------------------------------------------------------
// Demo accounts seed (financial management) — coaches + sample clients with
// editable credentials. Demo accounts are only created when no app_users
// exist yet, so a production environment with real users is never touched.
// All demo entries are marked clearly in `notes` so admins can delete them.
// ---------------------------------------------------------------------------
const DEMO_ACCOUNTS: Array<{
  fullName: string;
  email: string;
  username: string;
  phone: string;
  password: string;
  role: "user" | "admin" | "coach";
  plan: "basic" | "premium";
  productAccess: string[];
  status: "active";
  notes: string;
}> = [
  {
    fullName: "מאמן דוגמה — חיים לוי",
    email: "coach.haim@bkalut.demo",
    username: "coach.haim",
    phone: "050-1111111",
    password: "Bkalut!Coach1",
    role: "coach",
    plan: "premium",
    productAccess: ["financial", "bkalut"],
    status: "active",
    notes: "חשבון דוגמה למאמן — ניתן למחוק לאחר טעינת מאמנים אמיתיים.",
  },
  {
    fullName: "מאמנת דוגמה — דבורה כהן",
    email: "coach.dvora@bkalut.demo",
    username: "coach.dvora",
    phone: "050-2222222",
    password: "Bkalut!Coach2",
    role: "coach",
    plan: "premium",
    productAccess: ["financial", "bkalut"],
    status: "active",
    notes: "חשבון דוגמה למאמנת — ניתן למחוק לאחר טעינת מאמנים אמיתיים.",
  },
  {
    fullName: "לקוח דוגמה — משפחת ישראלי",
    email: "demo.family@bkalut.demo",
    username: "demo.family",
    phone: "050-3333333",
    password: "Bkalut!Demo1",
    role: "user",
    plan: "basic",
    productAccess: ["financial"],
    status: "active",
    notes: "חשבון דוגמה למשתמש פיננסי — ניתן למחוק לאחר טעינת לקוחות אמיתיים.",
  },
  {
    fullName: "לקוח דוגמה — עסק קטן",
    email: "demo.business@bkalut.demo",
    username: "demo.business",
    phone: "050-4444444",
    password: "Bkalut!Demo2",
    role: "user",
    plan: "premium",
    productAccess: ["financial"],
    status: "active",
    notes: "חשבון דוגמה לעסק קטן (פרימיום) — ניתן למחוק לאחר טעינת לקוחות אמיתיים.",
  },
];

(function seedDemoAccounts() {
  try {
    // SECURITY: these demo accounts ship with hardcoded, publicly-visible
    // passwords (source is public). Never auto-create them in a live/public
    // deployment. Require an explicit opt-in env var to seed them (e.g. for
    // local development only).
    if (process.env.BKALUT_SEED_DEMO_ACCOUNTS !== "true") return;
    const existing = db.select().from(appUsers).all();
    if (existing.length > 0) return; // never overwrite real data
    const now = new Date().toISOString();
    for (const acc of DEMO_ACCOUNTS) {
      db.insert(appUsers).values({
        fullName: acc.fullName,
        email: acc.email,
        username: acc.username,
        phone: acc.phone,
        passwordHash: sha256Hex(acc.password),
        passwordPlain: acc.password,
        role: acc.role,
        status: acc.status,
        productAccessJson: JSON.stringify(acc.productAccess),
        plan: acc.plan,
        finClientId: null,
        notes: acc.notes,
        createdAt: now,
        updatedAt: now,
      }).run();
    }
  } catch (err) {
    console.warn("demo accounts seed skipped:", err);
  }
})();

// ---------------------------------------------------------------------------
// SQLite implementation
// ---------------------------------------------------------------------------

export class DatabaseStorage implements IStorage {
  // ----- legacy user table -----
  async getUser(id: number): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.id, id)).get();
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.username, username)).get();
  }
  async createUser(insertUser: InsertUser): Promise<User> {
    return db.insert(users).values(insertUser).returning().get();
  }

  // ----- clients (leads) -----
  async getClientByPhone(phone: string): Promise<Client | undefined> {
    return db.select().from(clients).where(eq(clients.phone, phone)).get();
  }
  async getClient(id: number): Promise<Client | undefined> {
    return db.select().from(clients).where(eq(clients.id, id)).get();
  }
  async listClients(): Promise<Client[]> {
    return db.select().from(clients).all();
  }
  async upsertClient(input: ClientInput): Promise<Client> {
    const now = new Date().toISOString();
    const existing = await this.getClientByPhone(input.phone);
    const values = {
      fullName: input.fullName || existing?.fullName || "לקוח ללא שם",
      phone: input.phone,
      email: input.email || existing?.email || "",
      idNumber: input.idNumber || existing?.idNumber || "",
      birthDate: input.birthDate || existing?.birthDate || "",
      city: input.city || existing?.city || "",
      familyStatus: input.familyStatus || existing?.familyStatus || "",
      updatedAt: now,
    };
    if (existing) {
      db.update(clients).set(values).where(eq(clients.id, existing.id)).run();
      return db.select().from(clients).where(eq(clients.id, existing.id)).get()!;
    }
    return db.insert(clients).values({ ...values, createdAt: now }).returning().get();
  }

  // ----- service submissions -----
  async createServiceSubmission(input: ServiceSubmissionInput): Promise<ServiceSubmission> {
    const client = await this.upsertClient(input.client);
    return db
      .insert(serviceSubmissions)
      .values({
        clientId: client.id,
        rightId: input.rightId,
        topic: input.topic,
        category: input.category,
        requestType: input.requestType,
        potentialPercent: input.potentialPercent,
        potentialLevel: input.potentialLevel,
        answersJson: JSON.stringify(input.answers ?? {}),
        detailsJson: JSON.stringify(input.details ?? {}),
        documentsJson: JSON.stringify(input.documents ?? {}),
        additionalTopicsJson: JSON.stringify(input.additionalTopics ?? []),
        termsAccepted: input.termsAccepted ? 1 : 0,
        webhookStatus: "pending",
        webhookResponse: "",
        webhookSentAt: "",
        createdAt: new Date().toISOString(),
      })
      .returning()
      .get();
  }
  async updateServiceSubmissionWebhook(id: number, status: string, response: string): Promise<void> {
    db.update(serviceSubmissions)
      .set({
        webhookStatus: status,
        webhookResponse: response.slice(0, 2000),
        webhookSentAt: new Date().toISOString(),
      })
      .where(eq(serviceSubmissions.id, id))
      .run();
  }
  async listServiceSubmissions(): Promise<ServiceSubmission[]> {
    return db.select().from(serviceSubmissions).all();
  }
  async listServiceSubmissionRows(): Promise<ServiceSubmissionRow[]> {
    return sqlite
      .prepare(`
        SELECT s.id, s.created_at AS createdAt, s.client_id AS clientId,
          c.full_name AS fullName, c.phone AS phone, c.email AS email,
          c.id_number AS idNumber, c.birth_date AS birthDate, c.family_status AS familyStatus,
          c.city AS city, s.right_id AS rightId, s.topic AS topic, s.category AS category,
          s.request_type AS requestType, s.potential_percent AS potentialPercent,
          s.potential_level AS potentialLevel, s.answers_json AS answersJson,
          s.details_json AS detailsJson, s.documents_json AS documentsJson,
          s.additional_topics_json AS additionalTopicsJson, s.webhook_status AS webhookStatus,
          s.webhook_response AS webhookResponse, s.webhook_sent_at AS webhookSentAt
        FROM service_submissions s JOIN clients c ON c.id = s.client_id
        ORDER BY s.id DESC LIMIT 500
      `)
      .all() as ServiceSubmissionRow[];
  }

  // ----- app_users -----
  async listAppUsers(): Promise<AppUser[]> {
    return db.select().from(appUsers).all();
  }
  async getAppUser(id: number): Promise<AppUser | undefined> {
    return db.select().from(appUsers).where(eq(appUsers.id, id)).get();
  }
  async getAppUserByLogin(identifier: string): Promise<AppUser | undefined> {
    const ident = String(identifier || "").trim();
    if (!ident) return undefined;
    // Look up by username, email or phone in priority order.
    const all = db.select().from(appUsers).all();
    const lower = ident.toLowerCase();
    return all.find(
      (u) =>
        (u.username || "").toLowerCase() === lower ||
        (u.email || "").toLowerCase() === lower ||
        (u.phone || "").replace(/[^\d]/g, "") === ident.replace(/[^\d]/g, ""),
    );
  }
  async createAppUser(input: AppUserInput): Promise<AppUser> {
    const now = new Date().toISOString();
    const passwordHash = input.password ? sha256Hex(input.password) : null;
    return db.insert(appUsers).values({
      fullName: input.fullName,
      email: input.email ?? "",
      username: input.username ?? null,
      phone: input.phone ?? "",
      passwordHash: passwordHash,
      passwordPlain: input.password ?? null,
      role: input.role ?? "user",
      status: input.status ?? "active",
      productAccessJson: JSON.stringify(input.productAccess ?? []),
      plan: input.plan ?? "basic",
      finClientId: input.finClientId ?? null,
      notes: input.notes ?? "",
      createdAt: now,
      updatedAt: now,
    }).returning().get();
  }
  async updateAppUser(id: number, input: Partial<AppUserInput>): Promise<AppUser | undefined> {
    const existing = await this.getAppUser(id);
    if (!existing) return undefined;
    const values: any = { updatedAt: new Date().toISOString() };
    if (input.fullName !== undefined) values.fullName = input.fullName;
    if (input.email !== undefined) values.email = input.email;
    if (input.username !== undefined) values.username = input.username || null;
    if (input.phone !== undefined) values.phone = input.phone;
    if (input.role !== undefined) values.role = input.role;
    if (input.status !== undefined) values.status = input.status;
    if (input.productAccess !== undefined) values.productAccessJson = JSON.stringify(input.productAccess);
    if (input.plan !== undefined) values.plan = input.plan;
    if (input.finClientId !== undefined) values.finClientId = input.finClientId;
    if (input.notes !== undefined) values.notes = input.notes;
    if (input.password !== undefined && input.password) {
      values.passwordHash = sha256Hex(input.password);
      values.passwordPlain = input.password;
      values.credentialsDeliveredAt = null; // reset delivery state on password rotation
    }
    db.update(appUsers).set(values).where(eq(appUsers.id, id)).run();
    return this.getAppUser(id);
  }
  async deleteAppUser(id: number): Promise<void> {
    db.delete(appUsers).where(eq(appUsers.id, id)).run();
  }
  async clearAppUserPlainPassword(id: number): Promise<void> {
    db.update(appUsers).set({ passwordPlain: null }).where(eq(appUsers.id, id)).run();
  }
  async markCredentialsDelivered(id: number, at: string): Promise<void> {
    db.update(appUsers).set({ credentialsDeliveredAt: at }).where(eq(appUsers.id, id)).run();
  }
  async setAppUserPlan(id: number, plan: string): Promise<AppUser | undefined> {
    db.update(appUsers).set({ plan, updatedAt: new Date().toISOString() }).where(eq(appUsers.id, id)).run();
    return this.getAppUser(id);
  }

  // ----- user sessions (financial-client login) -----
  async createUserSession(appUserId: number, ttlMs = 1000 * 60 * 60 * 24 * 7): Promise<UserSession> {
    const token = crypto.randomBytes(32).toString("hex");
    const now = Date.now();
    return db.insert(userSessions).values({
      token,
      appUserId,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttlMs).toISOString(),
    }).returning().get();
  }
  async getUserSession(token: string): Promise<(UserSession & { user: AppUser }) | undefined> {
    const session = db.select().from(userSessions).where(eq(userSessions.token, token)).get();
    if (!session) return undefined;
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      db.delete(userSessions).where(eq(userSessions.id, session.id)).run();
      return undefined;
    }
    const user = await this.getAppUser(session.appUserId);
    if (!user) return undefined;
    return { ...session, user };
  }
  async deleteUserSession(token: string): Promise<void> {
    db.delete(userSessions).where(eq(userSessions.token, token)).run();
  }

  // ----- premium requests -----
  async listPremiumRequests(): Promise<PremiumRequest[]> {
    return db.select().from(premiumRequests).all().sort((a, b) => b.id - a.id);
  }
  async listPremiumRequestsForUser(appUserId: number): Promise<PremiumRequest[]> {
    return db.select().from(premiumRequests).where(eq(premiumRequests.appUserId, appUserId)).all().sort((a, b) => b.id - a.id);
  }
  async createPremiumRequest(appUserId: number, message: string): Promise<PremiumRequest> {
    const now = new Date().toISOString();
    return db.insert(premiumRequests).values({
      appUserId,
      message: message ?? "",
      status: "pending",
      adminNote: "",
      decidedAt: null,
      createdAt: now,
    }).returning().get();
  }
  async updatePremiumRequest(id: number, patch: { status?: string; adminNote?: string }): Promise<PremiumRequest | undefined> {
    const values: any = {};
    if (patch.status !== undefined) {
      values.status = patch.status;
      values.decidedAt = new Date().toISOString();
    }
    if (patch.adminNote !== undefined) values.adminNote = patch.adminNote;
    db.update(premiumRequests).set(values).where(eq(premiumRequests.id, id)).run();
    return db.select().from(premiumRequests).where(eq(premiumRequests.id, id)).get();
  }

  // ----- webhook log -----
  async listWebhookLog(limit = 200): Promise<WebhookLog[]> {
    return sqlite.prepare(`SELECT id, source, endpoint_url AS endpointUrl, related_kind AS relatedKind, related_id AS relatedId, payload_json AS payloadJson, status, http_status AS httpStatus, response_text AS responseText, attempts, last_attempt_at AS lastAttemptAt, next_retry_at AS nextRetryAt, created_at AS createdAt FROM webhook_log ORDER BY id DESC LIMIT ?`).all(limit) as WebhookLog[];
  }
  async createWebhookLog(input: Omit<WebhookLog, "id" | "createdAt" | "lastAttemptAt">): Promise<WebhookLog> {
    const now = new Date().toISOString();
    return db.insert(webhookLog).values({
      source: input.source,
      endpointUrl: input.endpointUrl,
      relatedKind: input.relatedKind ?? null,
      relatedId: input.relatedId ?? null,
      payloadJson: input.payloadJson,
      status: input.status ?? "pending",
      httpStatus: input.httpStatus ?? null,
      responseText: input.responseText ?? null,
      attempts: input.attempts ?? 0,
      lastAttemptAt: null,
      nextRetryAt: input.nextRetryAt ?? null,
      createdAt: now,
    }).returning().get();
  }
  async updateWebhookLog(id: number, patch: Partial<Omit<WebhookLog, "id" | "createdAt">>): Promise<WebhookLog | undefined> {
    const values: any = {};
    for (const k of ["status", "httpStatus", "responseText", "attempts", "lastAttemptAt", "nextRetryAt"] as const) {
      if ((patch as any)[k] !== undefined) values[k] = (patch as any)[k];
    }
    db.update(webhookLog).set(values).where(eq(webhookLog.id, id)).run();
    return db.select().from(webhookLog).where(eq(webhookLog.id, id)).get();
  }

  // ----- legal acceptances -----
  async createLegalAcceptance(input: Omit<LegalAcceptance, "id" | "acceptedAt"> & { acceptedAt?: string }): Promise<LegalAcceptance> {
    const acceptedAt = input.acceptedAt ?? new Date().toISOString();
    return db.insert(legalAcceptances).values({
      documentKey: input.documentKey,
      documentVersion: input.documentVersion,
      subjectKind: input.subjectKind,
      subjectId: input.subjectId ?? null,
      fullName: input.fullName ?? "",
      identifier: input.identifier ?? "",
      signatureMethod: input.signatureMethod ?? "checkbox",
      signatureValue: input.signatureValue ?? "",
      ipAddress: input.ipAddress ?? "",
      userAgent: input.userAgent ?? "",
      acceptedAt,
    }).returning().get();
  }
  async listLegalAcceptancesForSubject(kind: string, id: number): Promise<LegalAcceptance[]> {
    const rows = db.select().from(legalAcceptances).all();
    return rows.filter((r) => r.subjectKind === kind && r.subjectId === id);
  }

  // ----- delivery queue -----
  async listDeliveryMessages(): Promise<DeliveryMessage[]> {
    return db.select().from(deliveryQueue).all();
  }
  async getDeliveryMessage(id: number): Promise<DeliveryMessage | undefined> {
    return db.select().from(deliveryQueue).where(eq(deliveryQueue.id, id)).get();
  }
  async createDeliveryMessage(input: DeliveryMessageInput): Promise<DeliveryMessage> {
    const now = new Date().toISOString();
    return db.insert(deliveryQueue).values({
      channel: input.channel,
      recipientType: input.recipientType,
      recipientId: input.recipientId ?? null,
      recipientLabel: input.recipientLabel,
      toAddress: input.toAddress,
      subject: input.subject ?? "",
      body: input.body,
      callbackUrl: input.callbackUrl ?? "",
      status: "pending",
      statusDetail: "",
      attempts: 0,
      endpointUsed: "",
      responseText: "",
      scheduledAt: input.scheduledAt ?? "",
      sentAt: "",
      createdAt: now,
      createdBy: input.createdBy ?? "",
    }).returning().get();
  }
  async updateDeliveryMessage(id: number, patch: Partial<DeliveryMessage>): Promise<DeliveryMessage | undefined> {
    const existing = await this.getDeliveryMessage(id);
    if (!existing) return undefined;
    db.update(deliveryQueue).set(patch as any).where(eq(deliveryQueue.id, id)).run();
    return this.getDeliveryMessage(id);
  }
  async deleteDeliveryMessage(id: number): Promise<void> {
    db.delete(deliveryQueue).where(eq(deliveryQueue.id, id)).run();
  }

  // ----- automation configs -----
  async listAutomationConfigs(): Promise<AutomationConfig[]> {
    return db.select().from(automationConfigs).all();
  }
  async getAutomationConfig(key: string): Promise<AutomationConfig | undefined> {
    return db.select().from(automationConfigs).where(eq(automationConfigs.key, key)).get();
  }
  async updateAutomationConfig(key: string, input: AutomationConfigInput): Promise<AutomationConfig | undefined> {
    const existing = await this.getAutomationConfig(key);
    const now = new Date().toISOString();
    if (!existing) {
      // Upsert: missing rows (e.g. newly introduced keys, never seeded) must
      // still save instead of silently dropping the admin's edits.
      db.insert(automationConfigs).values({
        key,
        label: input.label ?? key,
        description: input.description ?? "",
        enabled: input.enabled ? 1 : 0,
        endpointUrl: input.endpointUrl ?? "",
        secretRef: input.secretRef ?? "",
        configJson: JSON.stringify(input.config ?? {}),
        lastStatus: "idle",
        lastTestedAt: null,
        lastResult: null,
        updatedAt: now,
      }).run();
      return this.getAutomationConfig(key);
    }
    const values: any = { updatedAt: now };
    if (input.enabled !== undefined) values.enabled = input.enabled ? 1 : 0;
    if (input.endpointUrl !== undefined) values.endpointUrl = input.endpointUrl;
    if (input.secretRef !== undefined) values.secretRef = input.secretRef;
    if (input.config !== undefined) values.configJson = JSON.stringify(input.config);
    if (input.description !== undefined) values.description = input.description;
    if (input.label !== undefined) values.label = input.label;
    db.update(automationConfigs).set(values).where(eq(automationConfigs.key, key)).run();
    return this.getAutomationConfig(key);
  }
  async recordAutomationTest(key: string, status: string, result: string): Promise<void> {
    db.update(automationConfigs).set({
      lastStatus: status,
      lastTestedAt: new Date().toISOString(),
      lastResult: result.slice(0, 2000),
      updatedAt: new Date().toISOString(),
    }).where(eq(automationConfigs.key, key)).run();
  }

  // ----- admin sessions -----
  async createAdminSession(identity: string, role = "admin", ttlMs = 1000 * 60 * 60 * 8): Promise<AdminSession> {
    const token = crypto.randomBytes(32).toString("hex");
    const now = Date.now();
    return db.insert(adminSessions).values({
      token,
      identity,
      role,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttlMs).toISOString(),
    }).returning().get();
  }
  async getAdminSession(token: string): Promise<AdminSession | undefined> {
    const row = db.select().from(adminSessions).where(eq(adminSessions.token, token)).get();
    if (!row) return undefined;
    if (new Date(row.expiresAt).getTime() < Date.now()) {
      db.delete(adminSessions).where(eq(adminSessions.id, row.id)).run();
      return undefined;
    }
    return row;
  }
  async deleteAdminSession(token: string): Promise<void> {
    db.delete(adminSessions).where(eq(adminSessions.token, token)).run();
  }
  async cleanupExpiredSessions(): Promise<void> {
    db.delete(adminSessions).where(lte(adminSessions.expiresAt, new Date().toISOString())).run();
  }

  // ----- inbound leads (public webhook) -----
  async createInboundLead(input: InboundLeadInput): Promise<InboundLead> {
    const now = new Date().toISOString();
    return db.insert(inboundLeads).values({
      sourceSite: input.sourceSite ?? null,
      sourcePage: input.sourcePage ?? null,
      origin: input.origin ?? null,
      category: input.category ?? null,
      topic: input.topic ?? null,
      requestType: input.requestType ?? null,
      selectedPath: input.selectedPath ?? null,
      potentialScore: input.potentialScore ?? null,
      potentialLevel: input.potentialLevel ?? null,
      contactFullName: input.contactFullName ?? null,
      contactPhone: input.contactPhone ?? null,
      contactEmail: input.contactEmail ?? null,
      contactIdNumber: input.contactIdNumber ?? null,
      answersJson: JSON.stringify(input.answers ?? {}),
      documentsJson: JSON.stringify(input.documents ?? []),
      notes: input.notes ?? null,
      legalAcceptedJson: JSON.stringify(input.legalAccepted ?? {}),
      utmSource: input.utmSource ?? null,
      utmMedium: input.utmMedium ?? null,
      utmCampaign: input.utmCampaign ?? null,
      utmTerm: input.utmTerm ?? null,
      utmContent: input.utmContent ?? null,
      referrer: input.referrer ?? null,
      externalId: input.externalId ?? null,
      leadKind: input.leadKind ?? "rights",
      rawPayloadJson: JSON.stringify(input.rawPayload ?? {}).slice(0, 200000),
      authStatus: input.authStatus ?? "unauthenticated",
      webhookStatus: "pending",
      webhookLogId: null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      status: "new",
      createdAt: now,
    }).returning().get();
  }
  async updateInboundLeadWebhook(id: number, status: string, webhookLogId: number | null): Promise<void> {
    db.update(inboundLeads).set({ webhookStatus: status, webhookLogId }).where(eq(inboundLeads.id, id)).run();
  }
  async listInboundLeads(limit = 200): Promise<InboundLead[]> {
    return db.select().from(inboundLeads).all().sort((a, b) => b.id - a.id).slice(0, limit);
  }
  async getInboundLead(id: number): Promise<InboundLead | undefined> {
    return db.select().from(inboundLeads).where(eq(inboundLeads.id, id)).get();
  }
}

// ---------------------------------------------------------------------------
// Reminder responses (always stored in local SQLite — small, append-only,
// never blocks the public flow if Supabase is offline). Admin reads the
// list from the same local DB. Public reminder route writes here.
// ---------------------------------------------------------------------------
export interface ReminderResponseInput {
  topicId: number;
  topicTitle?: string;
  response: "yes" | "not_yet" | "not_eligible";
  contactName?: string;
  contactPhone?: string;
  nextReminderDate?: string; // YYYY-MM-DD
  wantsService?: boolean;
  note?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ReminderResponseRow {
  id: number;
  topicId: number;
  topicTitle: string | null;
  response: string;
  contactName: string | null;
  contactPhone: string | null;
  nextReminderDate: string | null;
  wantsService: number;
  note: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export function insertReminderResponse(input: ReminderResponseInput): ReminderResponseRow {
  const now = new Date().toISOString();
  const stmt = sqlite.prepare(`
    INSERT INTO reminder_responses
      (topic_id, topic_title, response, contact_name, contact_phone,
       next_reminder_date, wants_service, note, ip_address, user_agent, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    input.topicId,
    input.topicTitle ?? null,
    input.response,
    input.contactName ?? null,
    input.contactPhone ?? null,
    input.nextReminderDate ?? null,
    input.wantsService ? 1 : 0,
    input.note ?? null,
    input.ipAddress ?? null,
    input.userAgent ?? null,
    now,
  );
  const id = Number(result.lastInsertRowid);
  return getReminderResponse(id) as ReminderResponseRow;
}

export function getReminderResponse(id: number): ReminderResponseRow | undefined {
  const row = sqlite.prepare(`
    SELECT id, topic_id AS topicId, topic_title AS topicTitle, response,
           contact_name AS contactName, contact_phone AS contactPhone,
           next_reminder_date AS nextReminderDate, wants_service AS wantsService,
           note, ip_address AS ipAddress, user_agent AS userAgent,
           created_at AS createdAt
    FROM reminder_responses WHERE id = ?
  `).get(id) as ReminderResponseRow | undefined;
  return row;
}

export function listReminderResponses(limit = 500): ReminderResponseRow[] {
  return sqlite.prepare(`
    SELECT id, topic_id AS topicId, topic_title AS topicTitle, response,
           contact_name AS contactName, contact_phone AS contactPhone,
           next_reminder_date AS nextReminderDate, wants_service AS wantsService,
           note, ip_address AS ipAddress, user_agent AS userAgent,
           created_at AS createdAt
    FROM reminder_responses
    ORDER BY id DESC
    LIMIT ?
  `).all(limit) as ReminderResponseRow[];
}

// ---------------------------------------------------------------------------
// Storage selection: Supabase when SUPABASE_URL + (SUPABASE_ANON_KEY |
// SUPABASE_PUBLISHABLE_KEY | SUPABASE_SERVICE_ROLE_KEY) are set; SQLite otherwise.
// ---------------------------------------------------------------------------
function pickStorage(): IStorage {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;
  if (url && key) {
    try {
      console.log(`[storage] Using Supabase backend at ${url}`);
      return new SupabaseStorage(url, key);
    } catch (err) {
      console.error("[storage] Failed to init Supabase backend, falling back to SQLite:", err);
    }
  } else {
    console.log("[storage] SUPABASE_URL / key not set — using SQLite at data.db");
  }
  return new DatabaseStorage();
}

export const storage: IStorage = pickStorage();
