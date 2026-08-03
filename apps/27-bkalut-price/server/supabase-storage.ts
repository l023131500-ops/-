/**
 * SupabaseStorage — alternative IStorage implementation backed by Supabase Postgres.
 *
 * Activated when SUPABASE_URL + (SUPABASE_SERVICE_ROLE_KEY |
 * SUPABASE_ANON_KEY | SUPABASE_PUBLISHABLE_KEY) are present in env.
 *
 * The schema mirrors the SQLite tables in shared/schema.ts (snake_case columns)
 * and is created by deliverables/supabase_bkalut_schema.sql.
 *
 * No fields are stored as Postgres arrays — JSON payloads stay as text so the
 * application code (which currently parses with JSON.parse) keeps working.
 */
import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function sha256HexLocal(input: string): string {
  return crypto.createHash("sha256").update(String(input ?? ""), "utf8").digest("hex");
}
import WebSocketImpl from "ws";
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
  InboundLead,
} from "@shared/schema";
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

// ---------- row <-> object mappers ----------

type ClientRow = {
  id: number;
  full_name: string;
  phone: string;
  email: string | null;
  id_number: string | null;
  birth_date: string | null;
  city: string | null;
  family_status: string | null;
  created_at: string;
  updated_at: string;
};

function mapClient(row: ClientRow): Client {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email ?? null,
    idNumber: row.id_number ?? null,
    birthDate: row.birth_date ?? null,
    city: row.city ?? null,
    familyStatus: row.family_status ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as Client;
}

type ServiceSubmissionDbRow = {
  id: number;
  client_id: number;
  right_id: number;
  topic: string;
  category: string;
  request_type: string;
  potential_percent: number;
  potential_level: string;
  answers_json: string;
  details_json: string;
  documents_json: string;
  additional_topics_json: string;
  terms_accepted: number;
  webhook_status: string;
  webhook_response: string | null;
  webhook_sent_at: string | null;
  created_at: string;
};

function mapSubmission(row: ServiceSubmissionDbRow): ServiceSubmission {
  return {
    id: row.id,
    clientId: row.client_id,
    rightId: row.right_id,
    topic: row.topic,
    category: row.category,
    requestType: row.request_type,
    potentialPercent: row.potential_percent,
    potentialLevel: row.potential_level,
    answersJson: row.answers_json,
    detailsJson: row.details_json,
    documentsJson: row.documents_json,
    additionalTopicsJson: row.additional_topics_json,
    termsAccepted: row.terms_accepted,
    webhookStatus: row.webhook_status,
    webhookResponse: row.webhook_response ?? null,
    webhookSentAt: row.webhook_sent_at ?? null,
    createdAt: row.created_at,
  } as ServiceSubmission;
}

type AppUserRow = {
  id: number;
  full_name: string;
  email: string | null;
  username: string | null;
  phone: string | null;
  password_hash: string | null;
  password_plain: string | null;
  role: string;
  status: string;
  product_access_json: string;
  plan: string;
  fin_client_id: number | null;
  notes: string | null;
  last_login_at: string | null;
  credentials_delivered_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapAppUser(row: AppUserRow): AppUser {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email ?? null,
    username: row.username ?? null,
    phone: row.phone ?? null,
    passwordHash: row.password_hash ?? null,
    passwordPlain: row.password_plain ?? null,
    role: row.role,
    status: row.status,
    productAccessJson: row.product_access_json,
    plan: row.plan ?? "basic",
    finClientId: row.fin_client_id ?? null,
    notes: row.notes ?? null,
    lastLoginAt: row.last_login_at ?? null,
    credentialsDeliveredAt: row.credentials_delivered_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as AppUser;
}

type DeliveryRow = {
  id: number;
  channel: string;
  recipient_type: string;
  recipient_id: number | null;
  recipient_label: string;
  to_address: string;
  subject: string | null;
  body: string;
  callback_url: string | null;
  status: string;
  status_detail: string | null;
  attempts: number;
  endpoint_used: string | null;
  response_text: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  created_by: string | null;
};

function mapDelivery(row: DeliveryRow): DeliveryMessage {
  return {
    id: row.id,
    channel: row.channel,
    recipientType: row.recipient_type,
    recipientId: row.recipient_id ?? null,
    recipientLabel: row.recipient_label,
    toAddress: row.to_address,
    subject: row.subject ?? null,
    body: row.body,
    callbackUrl: row.callback_url ?? null,
    status: row.status,
    statusDetail: row.status_detail ?? null,
    attempts: row.attempts,
    endpointUsed: row.endpoint_used ?? null,
    responseText: row.response_text ?? null,
    scheduledAt: row.scheduled_at ?? null,
    sentAt: row.sent_at ?? null,
    createdAt: row.created_at,
    createdBy: row.created_by ?? null,
  } as DeliveryMessage;
}

type AutomationRow = {
  id: number;
  key: string;
  label: string;
  description: string | null;
  enabled: number;
  endpoint_url: string | null;
  secret_ref: string | null;
  config_json: string;
  last_status: string | null;
  last_tested_at: string | null;
  last_result: string | null;
  updated_at: string;
};

function mapAutomation(row: AutomationRow): AutomationConfig {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    description: row.description ?? null,
    enabled: row.enabled,
    endpointUrl: row.endpoint_url ?? null,
    secretRef: row.secret_ref ?? null,
    configJson: row.config_json,
    lastStatus: row.last_status ?? null,
    lastTestedAt: row.last_tested_at ?? null,
    lastResult: row.last_result ?? null,
    updatedAt: row.updated_at,
  } as AutomationConfig;
}

type AdminSessionRow = {
  id: number;
  token: string;
  identity: string;
  role: string;
  created_at: string;
  expires_at: string;
};

function mapAdminSession(row: AdminSessionRow): AdminSession {
  return {
    id: row.id,
    token: row.token,
    identity: row.identity,
    role: row.role,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  } as AdminSession;
}

type UserRow = { id: number; username: string; password: string };

function mapUser(row: UserRow): User {
  return { id: row.id, username: row.username, password: row.password } as User;
}

const AUTOMATION_DEFAULTS_PG: Array<Omit<AutomationRow, "id" | "updated_at">> = [
  { key: "email", label: "מייל יוצא", description: "שליחה לכתובת דוא\"ל ללקוח. ניתן לחבר לספק SMTP/SendGrid או n8n.", enabled: 0, endpoint_url: "", secret_ref: "EMAIL_PROVIDER_TOKEN", config_json: '{"from":"שירות בקלות <service@bklot.example>"}', last_status: "idle", last_tested_at: null, last_result: null },
  { key: "whatsapp", label: "WhatsApp", description: "שליחה ב-WhatsApp דרך ספק עסקי או n8n. דרושה הסכמת לקוח.", enabled: 0, endpoint_url: "", secret_ref: "WHATSAPP_PROVIDER_TOKEN", config_json: '{"sender":"02-3131500"}', last_status: "idle", last_tested_at: null, last_result: null },
  { key: "voice", label: "מערכת קולית", description: "מערכת קולית טלפונית. שלוחה ראשית 02-3131500.", enabled: 0, endpoint_url: "", secret_ref: "VOICE_API_TOKEN", config_json: '{"mainNumber":"02-3131500","extension":"7"}', last_status: "idle", last_tested_at: null, last_result: null },
  { key: "n8n", label: "n8n Webhook", description: "Webhook מרכזי לתזמור. שליחת השירות הציבורית (טופס שירות) מתבצעת ל-NEDARIM3873. שליחה מנהלית דרך התור מתבצעת רק כשהקונקטור מופעל.", enabled: 0, endpoint_url: "https://n8n.l023131500.work/webhook/NEDARIM3873", secret_ref: "BKALUT_N8N_TOKEN", config_json: "{}", last_status: "idle", last_tested_at: null, last_result: null },
  { key: "github", label: "GitHub ייצוא", description: "מאגר קוד וסנכרון Push. ניהול דרך .git ושירות חיצוני.", enabled: 0, endpoint_url: "https://github.com", secret_ref: "GITHUB_TOKEN", config_json: '{"defaultBranch":"main"}', last_status: "idle", last_tested_at: null, last_result: null },
  { key: "supabase", label: "Supabase", description: "בסיס נתונים בענן לשני המוצרים. סנכרון אוטומטי כאשר משתני סביבה מוגדרים.", enabled: 1, endpoint_url: "https://supabase.com", secret_ref: "SUPABASE_SERVICE_ROLE_KEY", config_json: '{"projectRef":"bieebmnmkffwbqlsfozh"}', last_status: "ok", last_tested_at: null, last_result: null },
  { key: "google_drive", label: "Google Drive", description: "עדכון מאגר הזכויות מ-XLSX. נדרשת הרשאה דרך Connectors.", enabled: 0, endpoint_url: "https://drive.google.com", secret_ref: "GOOGLE_DRIVE_TOKEN", config_json: '{"folderId":""}', last_status: "idle", last_tested_at: null, last_result: null },
  { key: "monthly_refresh", label: "רענון חודשי", description: "תזמון אוטומטי שמושך עדכונים מ-kolzchut/btl/gov.il. 1 בכל חודש 09:00.", enabled: 0, endpoint_url: "", secret_ref: "", config_json: '{"cron":"0 9 1 * *","timezone":"Asia/Jerusalem"}', last_status: "idle", last_tested_at: null, last_result: null },
  { key: "rights_api", label: "Rights API פנימי", description: "חשיפת מאגר הזכויות לשירותים אחרים (כולל מערכת פיננסית) עם טוקן.", enabled: 0, endpoint_url: "/api/v1/rights", secret_ref: "RIGHTS_API_TOKEN", config_json: "{}", last_status: "idle", last_tested_at: null, last_result: null },
  { key: "general_inquiry_reply", label: "תבנית — מייל לפנייה כללית", description: "תבנית טקסט עברית לתשובה אוטומטית לפנייה כללית. ניתן לערוך כאן את הנושא, גוף הטקסט וברירות מחדל. השליחה בפועל מתבצעת דרך אוטומציית המייל/הוובהוקים, ומתועדת ב-webhook_log.", enabled: 1, endpoint_url: "", secret_ref: "", config_json: JSON.stringify({ subject: "תודה שפניתם לארגון בקלות", body: "שלום וברכה {{fullName}},\n\nאנחנו שמחים שפניתם לארגון בקלות.\nכדי שנוכל להחזיר לכם תשובה ממוקדת ומהירה, נשמח שתעדכנו אותנו באיזה תחום מדובר: זכויות והטבות, ניהול פיננסי, סיוע לחיוב חודשי או נושא אחר.\n\nניתן לבדוק התאמה ראשונית ולמלא פנייה ישירות בעמוד הזכאות שלנו:\n{{publicEligibilityUrl}}\n\nאם נוח לכם, אפשר לחזור אלינו גם בטלפון 02-3131500 או במייל l023131500@gmail.com.\nפרטי הקשר שמסרתם: טלפון {{phone}}, מייל {{email}}.\n\nבברכה,\nצוות ארגון בקלות", channels: ["email"], defaultPublicEligibilityUrl: "/#/" }), last_status: "idle", last_tested_at: null, last_result: null },
  { key: "potential_scanner", label: "סורק פוטנציאל זכויות (שאלון פרופיל)", description: "שאלון פרופיל אישי ציבורי שמציע אילו זכויות שווה לבדוק. ניתן להפעיל/לכבות, לערוך סעיפים, אפשרויות וכללי מיפוי, ולהפיק קישורים מותאמים אישית.", enabled: 1, endpoint_url: "", secret_ref: "", config_json: JSON.stringify({ enabled: true }), last_status: "idle", last_tested_at: null, last_result: null },
  { key: "public_chatbot", label: "צ׳אטבוט באתר הציבורי", description: "בוט צף בפינת האתר הציבורי. שני נתיבים: שאלות על זכויות והטבות, או בקשת סיוע מארגון בקלות.", enabled: 0, endpoint_url: "", secret_ref: "", config_json: JSON.stringify({ intro: "שלום! אני העוזר של ארגון בקלות. איך אפשר לעזור?", instructions: "ענה בעברית, בקצרה (1-3 משפטים), בלשון מכבדת. אל תחשוף את כל פרטי הזכות, התסריטים הפנימיים או הגוף המטפל.", contact: { phone: "02-3131500", email: "l023131500@gmail.com", whatsapp: "https://wa.me/972237131500" }, ctaText: "רוצה לקבל את פרטי הנושא? אפשר לבדוק זכאות מלאה בקליק.", closingText: "שמחנו שפנית אלינו! צוות בקלות תמיד כאן עבורך." }), last_status: "idle", last_tested_at: null, last_result: null },
];

export class SupabaseStorage implements IStorage {
  private client: SupabaseClient;
  private seedPromise: Promise<void> | null = null;

  constructor(url: string, key: string) {
    this.client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      // Disable Realtime: we only use Postgres REST. The realtime client
      // requires a global WebSocket constructor which Node < 22 lacks, so we
      // point it at a never-connecting URL and disable reconnect.
      // Provide a Node-compatible WebSocket constructor so realtime-js init
      // doesn't crash on Node 20. We never actually subscribe to realtime
      // channels — only Postgres REST endpoints — so this socket is unused.
      realtime: { transport: WebSocketImpl as unknown as never },
      global: { headers: { "x-bkalut-app": "bkalut-server" } },
    });
    // Best-effort: seed defaults in background. Failures are logged, not fatal.
    this.seedPromise = this.seedAutomationDefaults().catch((err) => {
      console.warn("[supabase] automation seed skipped:", err?.message || err);
    });
  }

  private async seedAutomationDefaults() {
    const { data, error } = await this.client
      .from("automation_configs")
      .select("key");
    if (error) throw error;
    const existing = new Set((data ?? []).map((r) => r.key));
    const now = new Date().toISOString();
    const toInsert = AUTOMATION_DEFAULTS_PG.filter((d) => !existing.has(d.key))
      .map((d) => ({ ...d, updated_at: now }));
    if (toInsert.length === 0) return;
    const { error: insErr } = await this.client.from("automation_configs").insert(toInsert);
    if (insErr) throw insErr;
  }

  // ---------- legacy users ----------
  async getUser(id: number): Promise<User | undefined> {
    const { data, error } = await this.client.from("users").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? mapUser(data as UserRow) : undefined;
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data, error } = await this.client.from("users").select("*").eq("username", username).maybeSingle();
    if (error) throw error;
    return data ? mapUser(data as UserRow) : undefined;
  }
  async createUser(insertUser: InsertUser): Promise<User> {
    const { data, error } = await this.client.from("users").insert({
      username: insertUser.username,
      password: insertUser.password,
    }).select().single();
    if (error) throw error;
    return mapUser(data as UserRow);
  }

  // ---------- clients ----------
  async getClientByPhone(phone: string): Promise<Client | undefined> {
    const { data, error } = await this.client.from("clients").select("*").eq("phone", phone).maybeSingle();
    if (error) throw error;
    return data ? mapClient(data as ClientRow) : undefined;
  }
  async getClient(id: number): Promise<Client | undefined> {
    const { data, error } = await this.client.from("clients").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? mapClient(data as ClientRow) : undefined;
  }
  async listClients(): Promise<Client[]> {
    const { data, error } = await this.client.from("clients").select("*").order("id", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => mapClient(r as ClientRow));
  }
  async upsertClient(input: ClientInput): Promise<Client> {
    const now = new Date().toISOString();
    const existing = await this.getClientByPhone(input.phone);
    const values = {
      full_name: input.fullName || existing?.fullName || "לקוח ללא שם",
      phone: input.phone,
      email: input.email || existing?.email || "",
      id_number: input.idNumber || existing?.idNumber || "",
      birth_date: input.birthDate || existing?.birthDate || "",
      city: input.city || existing?.city || "",
      family_status: input.familyStatus || existing?.familyStatus || "",
      updated_at: now,
    };
    if (existing) {
      const { data, error } = await this.client.from("clients").update(values).eq("id", existing.id).select().single();
      if (error) throw error;
      return mapClient(data as ClientRow);
    }
    const { data, error } = await this.client.from("clients").insert({ ...values, created_at: now }).select().single();
    if (error) throw error;
    return mapClient(data as ClientRow);
  }

  // ---------- service submissions ----------
  async createServiceSubmission(input: ServiceSubmissionInput): Promise<ServiceSubmission> {
    const client = await this.upsertClient(input.client);
    const { data, error } = await this.client.from("service_submissions").insert({
      client_id: client.id,
      right_id: input.rightId,
      topic: input.topic,
      category: input.category,
      request_type: input.requestType,
      potential_percent: input.potentialPercent,
      potential_level: input.potentialLevel,
      answers_json: JSON.stringify(input.answers ?? {}),
      details_json: JSON.stringify(input.details ?? {}),
      documents_json: JSON.stringify(input.documents ?? {}),
      additional_topics_json: JSON.stringify(input.additionalTopics ?? []),
      terms_accepted: input.termsAccepted ? 1 : 0,
      webhook_status: "pending",
      webhook_response: "",
      webhook_sent_at: "",
      created_at: new Date().toISOString(),
    }).select().single();
    if (error) throw error;
    return mapSubmission(data as ServiceSubmissionDbRow);
  }
  async updateServiceSubmissionWebhook(id: number, status: string, response: string): Promise<void> {
    const { error } = await this.client.from("service_submissions").update({
      webhook_status: status,
      webhook_response: response.slice(0, 2000),
      webhook_sent_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) throw error;
  }
  async listServiceSubmissions(): Promise<ServiceSubmission[]> {
    const { data, error } = await this.client.from("service_submissions").select("*").order("id", { ascending: false }).limit(500);
    if (error) throw error;
    return (data ?? []).map((r) => mapSubmission(r as ServiceSubmissionDbRow));
  }
  async listServiceSubmissionRows(): Promise<ServiceSubmissionRow[]> {
    // Use a Postgres view (service_submission_rows) created in migration SQL.
    const { data, error } = await this.client
      .from("service_submission_rows")
      .select("*")
      .order("id", { ascending: false })
      .limit(500);
    if (error) throw error;
    // The view already uses camelCase aliases.
    return (data ?? []) as unknown as ServiceSubmissionRow[];
  }

  // ---------- app_users ----------
  async listAppUsers(): Promise<AppUser[]> {
    const { data, error } = await this.client.from("app_users").select("*").order("id", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => mapAppUser(r as AppUserRow));
  }
  async getAppUser(id: number): Promise<AppUser | undefined> {
    const { data, error } = await this.client.from("app_users").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? mapAppUser(data as AppUserRow) : undefined;
  }
  async createAppUser(input: AppUserInput): Promise<AppUser> {
    const now = new Date().toISOString();
    const passwordHash = input.password ? sha256HexLocal(input.password) : null;
    const { data, error } = await this.client.from("app_users").insert({
      full_name: input.fullName,
      email: input.email ?? "",
      username: input.username ?? null,
      phone: input.phone ?? "",
      password_hash: passwordHash,
      password_plain: input.password ?? null,
      role: input.role ?? "user",
      status: input.status ?? "active",
      product_access_json: JSON.stringify(input.productAccess ?? []),
      plan: input.plan ?? "basic",
      fin_client_id: input.finClientId ?? null,
      notes: input.notes ?? "",
      created_at: now,
      updated_at: now,
    }).select().single();
    if (error) throw error;
    return mapAppUser(data as AppUserRow);
  }
  async updateAppUser(id: number, input: Partial<AppUserInput>): Promise<AppUser | undefined> {
    const existing = await this.getAppUser(id);
    if (!existing) return undefined;
    const values: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.fullName !== undefined) values.full_name = input.fullName;
    if (input.email !== undefined) values.email = input.email;
    if (input.username !== undefined) values.username = input.username || null;
    if (input.phone !== undefined) values.phone = input.phone;
    if (input.role !== undefined) values.role = input.role;
    if (input.status !== undefined) values.status = input.status;
    if (input.productAccess !== undefined) values.product_access_json = JSON.stringify(input.productAccess);
    if (input.plan !== undefined) values.plan = input.plan;
    if (input.finClientId !== undefined) values.fin_client_id = input.finClientId;
    if (input.notes !== undefined) values.notes = input.notes;
    if (input.password !== undefined && input.password) {
      values.password_hash = sha256HexLocal(input.password);
      values.password_plain = input.password;
      values.credentials_delivered_at = null;
    }
    const { error } = await this.client.from("app_users").update(values).eq("id", id);
    if (error) throw error;
    return this.getAppUser(id);
  }
  async deleteAppUser(id: number): Promise<void> {
    const { error } = await this.client.from("app_users").delete().eq("id", id);
    if (error) throw error;
  }

  // ---------- delivery queue ----------
  async listDeliveryMessages(): Promise<DeliveryMessage[]> {
    const { data, error } = await this.client.from("delivery_queue").select("*").order("id", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => mapDelivery(r as DeliveryRow));
  }
  async getDeliveryMessage(id: number): Promise<DeliveryMessage | undefined> {
    const { data, error } = await this.client.from("delivery_queue").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? mapDelivery(data as DeliveryRow) : undefined;
  }
  async createDeliveryMessage(input: DeliveryMessageInput): Promise<DeliveryMessage> {
    const now = new Date().toISOString();
    const { data, error } = await this.client.from("delivery_queue").insert({
      channel: input.channel,
      recipient_type: input.recipientType,
      recipient_id: input.recipientId ?? null,
      recipient_label: input.recipientLabel,
      to_address: input.toAddress,
      subject: input.subject ?? "",
      body: input.body,
      callback_url: input.callbackUrl ?? "",
      status: "pending",
      status_detail: "",
      attempts: 0,
      endpoint_used: "",
      response_text: "",
      scheduled_at: input.scheduledAt ?? "",
      sent_at: "",
      created_at: now,
      created_by: input.createdBy ?? "",
    }).select().single();
    if (error) throw error;
    return mapDelivery(data as DeliveryRow);
  }
  async updateDeliveryMessage(id: number, patch: Partial<DeliveryMessage>): Promise<DeliveryMessage | undefined> {
    const existing = await this.getDeliveryMessage(id);
    if (!existing) return undefined;
    const values: Record<string, unknown> = {};
    const keymap: Record<string, string> = {
      channel: "channel",
      recipientType: "recipient_type",
      recipientId: "recipient_id",
      recipientLabel: "recipient_label",
      toAddress: "to_address",
      subject: "subject",
      body: "body",
      callbackUrl: "callback_url",
      status: "status",
      statusDetail: "status_detail",
      attempts: "attempts",
      endpointUsed: "endpoint_used",
      responseText: "response_text",
      scheduledAt: "scheduled_at",
      sentAt: "sent_at",
      createdBy: "created_by",
    };
    for (const [k, v] of Object.entries(patch)) {
      if (k in keymap) values[keymap[k]] = v as unknown;
    }
    if (Object.keys(values).length === 0) return existing;
    const { error } = await this.client.from("delivery_queue").update(values).eq("id", id);
    if (error) throw error;
    return this.getDeliveryMessage(id);
  }
  async deleteDeliveryMessage(id: number): Promise<void> {
    const { error } = await this.client.from("delivery_queue").delete().eq("id", id);
    if (error) throw error;
  }

  // ---------- automation configs ----------
  async listAutomationConfigs(): Promise<AutomationConfig[]> {
    if (this.seedPromise) await this.seedPromise.catch(() => {});
    const { data, error } = await this.client.from("automation_configs").select("*").order("id");
    if (error) throw error;
    return (data ?? []).map((r) => mapAutomation(r as AutomationRow));
  }
  async getAutomationConfig(key: string): Promise<AutomationConfig | undefined> {
    const { data, error } = await this.client.from("automation_configs").select("*").eq("key", key).maybeSingle();
    if (error) throw error;
    return data ? mapAutomation(data as AutomationRow) : undefined;
  }
  async updateAutomationConfig(key: string, input: AutomationConfigInput): Promise<AutomationConfig | undefined> {
    const existing = await this.getAutomationConfig(key);
    const now = new Date().toISOString();
    if (!existing) {
      const row: Record<string, unknown> = {
        key,
        label: input.label ?? key,
        description: input.description ?? "",
        enabled: input.enabled ? 1 : 0,
        endpoint_url: input.endpointUrl ?? "",
        secret_ref: input.secretRef ?? "",
        config_json: JSON.stringify(input.config ?? {}),
        last_status: "idle",
        last_tested_at: null,
        last_result: null,
        updated_at: now,
      };
      const { error: insErr } = await this.client.from("automation_configs").insert(row);
      if (insErr) throw insErr;
      return this.getAutomationConfig(key);
    }
    const values: Record<string, unknown> = { updated_at: now };
    if (input.enabled !== undefined) values.enabled = input.enabled ? 1 : 0;
    if (input.endpointUrl !== undefined) values.endpoint_url = input.endpointUrl;
    if (input.secretRef !== undefined) values.secret_ref = input.secretRef;
    if (input.config !== undefined) values.config_json = JSON.stringify(input.config);
    if (input.description !== undefined) values.description = input.description;
    if (input.label !== undefined) values.label = input.label;
    const { error } = await this.client.from("automation_configs").update(values).eq("key", key);
    if (error) throw error;
    return this.getAutomationConfig(key);
  }
  async recordAutomationTest(key: string, status: string, result: string): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await this.client.from("automation_configs").update({
      last_status: status,
      last_tested_at: now,
      last_result: result.slice(0, 2000),
      updated_at: now,
    }).eq("key", key);
    if (error) throw error;
  }

  // ---------- admin sessions ----------
  async createAdminSession(identity: string, role = "admin", ttlMs = 1000 * 60 * 60 * 8): Promise<AdminSession> {
    const token = crypto.randomBytes(32).toString("hex");
    const now = Date.now();
    const { data, error } = await this.client.from("admin_sessions").insert({
      token,
      identity,
      role,
      created_at: new Date(now).toISOString(),
      expires_at: new Date(now + ttlMs).toISOString(),
    }).select().single();
    if (error) throw error;
    return mapAdminSession(data as AdminSessionRow);
  }
  async getAdminSession(token: string): Promise<AdminSession | undefined> {
    const { data, error } = await this.client.from("admin_sessions").select("*").eq("token", token).maybeSingle();
    if (error) throw error;
    if (!data) return undefined;
    const row = mapAdminSession(data as AdminSessionRow);
    if (new Date(row.expiresAt).getTime() < Date.now()) {
      await this.deleteAdminSession(token);
      return undefined;
    }
    return row;
  }
  async deleteAdminSession(token: string): Promise<void> {
    const { error } = await this.client.from("admin_sessions").delete().eq("token", token);
    if (error) throw error;
  }
  async cleanupExpiredSessions(): Promise<void> {
    const { error } = await this.client.from("admin_sessions").delete().lte("expires_at", new Date().toISOString());
    if (error) throw error;
  }

  // ---------- app_users login lookup ----------
  async getAppUserByLogin(identifier: string): Promise<AppUser | undefined> {
    const ident = String(identifier || "").trim();
    if (!ident) return undefined;
    // Try username first, then email, then phone (digit-stripped).
    const { data: byUsername } = await this.client.from("app_users").select("*").eq("username", ident).maybeSingle();
    if (byUsername) return mapAppUser(byUsername as AppUserRow);
    const { data: byEmail } = await this.client.from("app_users").select("*").ilike("email", ident).maybeSingle();
    if (byEmail) return mapAppUser(byEmail as AppUserRow);
    const phoneDigits = ident.replace(/[^\d]/g, "");
    if (phoneDigits) {
      const { data } = await this.client.from("app_users").select("*");
      const match = (data ?? []).find((u: any) => (u.phone || "").replace(/[^\d]/g, "") === phoneDigits);
      if (match) return mapAppUser(match as AppUserRow);
    }
    return undefined;
  }
  async clearAppUserPlainPassword(id: number): Promise<void> {
    const { error } = await this.client.from("app_users").update({ password_plain: null }).eq("id", id);
    if (error) throw error;
  }
  async markCredentialsDelivered(id: number, at: string): Promise<void> {
    const { error } = await this.client.from("app_users").update({ credentials_delivered_at: at }).eq("id", id);
    if (error) throw error;
  }
  async setAppUserPlan(id: number, plan: string): Promise<AppUser | undefined> {
    const { error } = await this.client.from("app_users").update({ plan, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
    return this.getAppUser(id);
  }

  // ---------- user_sessions ----------
  async createUserSession(appUserId: number, ttlMs = 1000 * 60 * 60 * 24 * 7): Promise<UserSession> {
    const token = crypto.randomBytes(32).toString("hex");
    const now = Date.now();
    const { data, error } = await this.client.from("user_sessions").insert({
      token,
      app_user_id: appUserId,
      created_at: new Date(now).toISOString(),
      expires_at: new Date(now + ttlMs).toISOString(),
    }).select().single();
    if (error) throw error;
    return {
      id: (data as any).id,
      token: (data as any).token,
      appUserId: (data as any).app_user_id,
      createdAt: (data as any).created_at,
      expiresAt: (data as any).expires_at,
    } as UserSession;
  }
  async getUserSession(token: string): Promise<(UserSession & { user: AppUser }) | undefined> {
    const { data, error } = await this.client.from("user_sessions").select("*").eq("token", token).maybeSingle();
    if (error) throw error;
    if (!data) return undefined;
    const session: UserSession = {
      id: (data as any).id,
      token: (data as any).token,
      appUserId: (data as any).app_user_id,
      createdAt: (data as any).created_at,
      expiresAt: (data as any).expires_at,
    } as UserSession;
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      await this.deleteUserSession(token);
      return undefined;
    }
    const user = await this.getAppUser(session.appUserId);
    if (!user) return undefined;
    return { ...session, user };
  }
  async deleteUserSession(token: string): Promise<void> {
    const { error } = await this.client.from("user_sessions").delete().eq("token", token);
    if (error) throw error;
  }

  // ---------- premium_requests ----------
  private mapPremium(r: any): PremiumRequest {
    return {
      id: r.id,
      appUserId: r.app_user_id,
      message: r.message ?? null,
      status: r.status,
      adminNote: r.admin_note ?? null,
      decidedAt: r.decided_at ?? null,
      createdAt: r.created_at,
    } as PremiumRequest;
  }
  async listPremiumRequests(): Promise<PremiumRequest[]> {
    const { data, error } = await this.client.from("premium_requests").select("*").order("id", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => this.mapPremium(r));
  }
  async listPremiumRequestsForUser(appUserId: number): Promise<PremiumRequest[]> {
    const { data, error } = await this.client.from("premium_requests").select("*").eq("app_user_id", appUserId).order("id", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => this.mapPremium(r));
  }
  async createPremiumRequest(appUserId: number, message: string): Promise<PremiumRequest> {
    const now = new Date().toISOString();
    const { data, error } = await this.client.from("premium_requests").insert({
      app_user_id: appUserId,
      message: message ?? "",
      status: "pending",
      admin_note: "",
      decided_at: null,
      created_at: now,
    }).select().single();
    if (error) throw error;
    return this.mapPremium(data);
  }
  async updatePremiumRequest(id: number, patch: { status?: string; adminNote?: string }): Promise<PremiumRequest | undefined> {
    const values: Record<string, unknown> = {};
    if (patch.status !== undefined) {
      values.status = patch.status;
      values.decided_at = new Date().toISOString();
    }
    if (patch.adminNote !== undefined) values.admin_note = patch.adminNote;
    const { error } = await this.client.from("premium_requests").update(values).eq("id", id);
    if (error) throw error;
    const { data } = await this.client.from("premium_requests").select("*").eq("id", id).maybeSingle();
    return data ? this.mapPremium(data) : undefined;
  }

  // ---------- webhook_log ----------
  private mapWebhookLog(r: any): WebhookLog {
    return {
      id: r.id,
      source: r.source,
      endpointUrl: r.endpoint_url,
      relatedKind: r.related_kind ?? null,
      relatedId: r.related_id ?? null,
      payloadJson: r.payload_json,
      status: r.status,
      httpStatus: r.http_status ?? null,
      responseText: r.response_text ?? null,
      attempts: r.attempts ?? 0,
      lastAttemptAt: r.last_attempt_at ?? null,
      nextRetryAt: r.next_retry_at ?? null,
      createdAt: r.created_at,
    } as WebhookLog;
  }
  async listWebhookLog(limit = 200): Promise<WebhookLog[]> {
    const { data, error } = await this.client.from("webhook_log").select("*").order("id", { ascending: false }).limit(limit);
    if (error) throw error;
    return (data ?? []).map((r) => this.mapWebhookLog(r));
  }
  async createWebhookLog(input: Omit<WebhookLog, "id" | "createdAt" | "lastAttemptAt">): Promise<WebhookLog> {
    const now = new Date().toISOString();
    const { data, error } = await this.client.from("webhook_log").insert({
      source: input.source,
      endpoint_url: input.endpointUrl,
      related_kind: input.relatedKind ?? null,
      related_id: input.relatedId ?? null,
      payload_json: input.payloadJson,
      status: input.status ?? "pending",
      http_status: input.httpStatus ?? null,
      response_text: input.responseText ?? null,
      attempts: input.attempts ?? 0,
      last_attempt_at: null,
      next_retry_at: input.nextRetryAt ?? null,
      created_at: now,
    }).select().single();
    if (error) throw error;
    return this.mapWebhookLog(data);
  }
  async updateWebhookLog(id: number, patch: Partial<Omit<WebhookLog, "id" | "createdAt">>): Promise<WebhookLog | undefined> {
    const keymap: Record<string, string> = {
      status: "status",
      httpStatus: "http_status",
      responseText: "response_text",
      attempts: "attempts",
      lastAttemptAt: "last_attempt_at",
      nextRetryAt: "next_retry_at",
    };
    const values: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (k in keymap) values[keymap[k]] = v;
    }
    if (Object.keys(values).length === 0) {
      const { data } = await this.client.from("webhook_log").select("*").eq("id", id).maybeSingle();
      return data ? this.mapWebhookLog(data) : undefined;
    }
    const { error } = await this.client.from("webhook_log").update(values).eq("id", id);
    if (error) throw error;
    const { data } = await this.client.from("webhook_log").select("*").eq("id", id).maybeSingle();
    return data ? this.mapWebhookLog(data) : undefined;
  }

  // ---------- legal_acceptances ----------
  async createLegalAcceptance(input: Omit<LegalAcceptance, "id" | "acceptedAt"> & { acceptedAt?: string }): Promise<LegalAcceptance> {
    const acceptedAt = input.acceptedAt ?? new Date().toISOString();
    const { data, error } = await this.client.from("legal_acceptances").insert({
      document_key: input.documentKey,
      document_version: input.documentVersion,
      subject_kind: input.subjectKind,
      subject_id: input.subjectId ?? null,
      full_name: input.fullName ?? "",
      identifier: input.identifier ?? "",
      signature_method: input.signatureMethod ?? "checkbox",
      signature_value: input.signatureValue ?? "",
      ip_address: input.ipAddress ?? "",
      user_agent: input.userAgent ?? "",
      accepted_at: acceptedAt,
    }).select().single();
    if (error) throw error;
    const r: any = data;
    return {
      id: r.id,
      documentKey: r.document_key,
      documentVersion: r.document_version,
      subjectKind: r.subject_kind,
      subjectId: r.subject_id ?? null,
      fullName: r.full_name ?? null,
      identifier: r.identifier ?? null,
      signatureMethod: r.signature_method,
      signatureValue: r.signature_value ?? null,
      ipAddress: r.ip_address ?? null,
      userAgent: r.user_agent ?? null,
      acceptedAt: r.accepted_at,
    } as LegalAcceptance;
  }
  async listLegalAcceptancesForSubject(kind: string, id: number): Promise<LegalAcceptance[]> {
    const { data, error } = await this.client.from("legal_acceptances").select("*").eq("subject_kind", kind).eq("subject_id", id);
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id,
      documentKey: r.document_key,
      documentVersion: r.document_version,
      subjectKind: r.subject_kind,
      subjectId: r.subject_id ?? null,
      fullName: r.full_name ?? null,
      identifier: r.identifier ?? null,
      signatureMethod: r.signature_method,
      signatureValue: r.signature_value ?? null,
      ipAddress: r.ip_address ?? null,
      userAgent: r.user_agent ?? null,
      acceptedAt: r.accepted_at,
    } as LegalAcceptance));
  }

  // ---------- inbound_leads ----------
  private mapInboundLead(r: any): InboundLead {
    return {
      id: r.id,
      sourceSite: r.source_site ?? null,
      sourcePage: r.source_page ?? null,
      origin: r.origin ?? null,
      category: r.category ?? null,
      topic: r.topic ?? null,
      requestType: r.request_type ?? null,
      selectedPath: r.selected_path ?? null,
      potentialScore: r.potential_score ?? null,
      potentialLevel: r.potential_level ?? null,
      contactFullName: r.contact_full_name ?? null,
      contactPhone: r.contact_phone ?? null,
      contactEmail: r.contact_email ?? null,
      contactIdNumber: r.contact_id_number ?? null,
      answersJson: r.answers_json ?? "{}",
      documentsJson: r.documents_json ?? "[]",
      notes: r.notes ?? null,
      legalAcceptedJson: r.legal_accepted_json ?? "{}",
      utmSource: r.utm_source ?? null,
      utmMedium: r.utm_medium ?? null,
      utmCampaign: r.utm_campaign ?? null,
      utmTerm: r.utm_term ?? null,
      utmContent: r.utm_content ?? null,
      referrer: r.referrer ?? null,
      externalId: r.external_id ?? null,
      leadKind: r.lead_kind ?? "rights",
      rawPayloadJson: r.raw_payload_json ?? "{}",
      authStatus: r.auth_status ?? "unauthenticated",
      webhookStatus: r.webhook_status ?? "pending",
      webhookLogId: r.webhook_log_id ?? null,
      ipAddress: r.ip_address ?? null,
      userAgent: r.user_agent ?? null,
      status: r.status ?? "new",
      createdAt: r.created_at,
    } as InboundLead;
  }
  async createInboundLead(input: InboundLeadInput): Promise<InboundLead> {
    const now = new Date().toISOString();
    const { data, error } = await this.client.from("inbound_leads").insert({
      source_site: input.sourceSite ?? null,
      source_page: input.sourcePage ?? null,
      origin: input.origin ?? null,
      category: input.category ?? null,
      topic: input.topic ?? null,
      request_type: input.requestType ?? null,
      selected_path: input.selectedPath ?? null,
      potential_score: input.potentialScore ?? null,
      potential_level: input.potentialLevel ?? null,
      contact_full_name: input.contactFullName ?? null,
      contact_phone: input.contactPhone ?? null,
      contact_email: input.contactEmail ?? null,
      contact_id_number: input.contactIdNumber ?? null,
      answers_json: JSON.stringify(input.answers ?? {}),
      documents_json: JSON.stringify(input.documents ?? []),
      notes: input.notes ?? null,
      legal_accepted_json: JSON.stringify(input.legalAccepted ?? {}),
      utm_source: input.utmSource ?? null,
      utm_medium: input.utmMedium ?? null,
      utm_campaign: input.utmCampaign ?? null,
      utm_term: input.utmTerm ?? null,
      utm_content: input.utmContent ?? null,
      referrer: input.referrer ?? null,
      external_id: input.externalId ?? null,
      lead_kind: input.leadKind ?? "rights",
      raw_payload_json: JSON.stringify(input.rawPayload ?? {}).slice(0, 200000),
      auth_status: input.authStatus ?? "unauthenticated",
      webhook_status: "pending",
      webhook_log_id: null,
      ip_address: input.ipAddress ?? null,
      user_agent: input.userAgent ?? null,
      status: "new",
      created_at: now,
    }).select().single();
    if (error) throw error;
    return this.mapInboundLead(data);
  }
  async updateInboundLeadWebhook(id: number, status: string, webhookLogId: number | null): Promise<void> {
    const { error } = await this.client.from("inbound_leads").update({
      webhook_status: status,
      webhook_log_id: webhookLogId,
    }).eq("id", id);
    if (error) throw error;
  }
  async listInboundLeads(limit = 200): Promise<InboundLead[]> {
    const { data, error } = await this.client.from("inbound_leads").select("*").order("id", { ascending: false }).limit(limit);
    if (error) throw error;
    return (data ?? []).map((r) => this.mapInboundLead(r));
  }
  async getInboundLead(id: number): Promise<InboundLead | undefined> {
    const { data, error } = await this.client.from("inbound_leads").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? this.mapInboundLead(data) : undefined;
  }

  /**
   * Probe Supabase for table readiness — returns a list of {table, ok, error?}.
   * Used by the admin /api/admin/db-status endpoint.
   */
  async probeTables(tables: string[]): Promise<Array<{ table: string; ok: boolean; error?: string }>> {
    const results: Array<{ table: string; ok: boolean; error?: string }> = [];
    for (const t of tables) {
      const { error } = await this.client.from(t).select("*", { count: "exact", head: true });
      if (error) {
        results.push({ table: t, ok: false, error: error.message });
      } else {
        results.push({ table: t, ok: true });
      }
    }
    return results;
  }
}
