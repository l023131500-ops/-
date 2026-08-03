import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Legacy users table from template (kept for compatibility)
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ============ Domain tables ============

export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  idNumber: text("id_number"),
  birthDate: text("birth_date"),
  city: text("city"),
  familyStatus: text("family_status"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const serviceSubmissions = sqliteTable("service_submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  rightId: integer("right_id").notNull(),
  topic: text("topic").notNull(),
  category: text("category").notNull(),
  requestType: text("request_type").notNull(),
  potentialPercent: integer("potential_percent").notNull(),
  potentialLevel: text("potential_level").notNull(),
  answersJson: text("answers_json").notNull(),
  detailsJson: text("details_json").notNull(),
  documentsJson: text("documents_json").notNull(),
  additionalTopicsJson: text("additional_topics_json").notNull(),
  termsAccepted: integer("terms_accepted").notNull(),
  webhookStatus: text("webhook_status").notNull().default("pending"),
  webhookResponse: text("webhook_response"),
  webhookSentAt: text("webhook_sent_at"),
  createdAt: text("created_at").notNull(),
});

export type Client = typeof clients.$inferSelect;
export type ServiceSubmission = typeof serviceSubmissions.$inferSelect;

// Internal application users (managed via admin UI). Different from `clients` (leads / consumers).
// Real login users for the financial system. Admin creates them with username/email/password.
export const appUsers = sqliteTable("app_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fullName: text("full_name").notNull(),
  email: text("email"),
  username: text("username").unique(),
  phone: text("phone"),
  passwordHash: text("password_hash"), // sha256 of password — never store plain
  passwordPlain: text("password_plain"), // ephemeral, cleared after first delivery
  role: text("role").notNull().default("user"), // user | admin | coach
  status: text("status").notNull().default("active"), // active | pending | disabled
  productAccessJson: text("product_access_json").notNull().default("[]"), // ["bkalut","financial"]
  plan: text("plan").notNull().default("basic"), // basic | premium
  finClientId: integer("fin_client_id"), // FK to fin_clients — this is THE financial client this user is
  notes: text("notes"),
  lastLoginAt: text("last_login_at"),
  credentialsDeliveredAt: text("credentials_delivered_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export type AppUser = typeof appUsers.$inferSelect;

// User-side sessions (financial system clients log in here, separate from admin sessions).
export const userSessions = sqliteTable("user_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  token: text("token").notNull().unique(),
  appUserId: integer("app_user_id").notNull(),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull(),
});
export type UserSession = typeof userSessions.$inferSelect;

// Premium upgrade requests — user requests, admin approves.
export const premiumRequests = sqliteTable("premium_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  appUserId: integer("app_user_id").notNull(),
  message: text("message"),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  adminNote: text("admin_note"),
  decidedAt: text("decided_at"),
  createdAt: text("created_at").notNull(),
});
export type PremiumRequest = typeof premiumRequests.$inferSelect;

// Webhook delivery log — every outbound webhook attempt for full admin visibility.
export const webhookLog = sqliteTable("webhook_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  source: text("source").notNull(), // bkalut_service_form | financial_lead | credentials_delivery | premium_decision | manual
  endpointUrl: text("endpoint_url").notNull(),
  relatedKind: text("related_kind"), // submission | lead | app_user | premium_request | delivery
  relatedId: integer("related_id"),
  payloadJson: text("payload_json").notNull(),
  status: text("status").notNull().default("pending"), // pending | sent | failed
  httpStatus: integer("http_status"),
  responseText: text("response_text"),
  attempts: integer("attempts").notNull().default(0),
  lastAttemptAt: text("last_attempt_at"),
  nextRetryAt: text("next_retry_at"),
  createdAt: text("created_at").notNull(),
});
export type WebhookLog = typeof webhookLog.$inferSelect;

// Outbound message delivery queue. Each row represents a single planned/sent outbound message.
export const deliveryQueue = sqliteTable("delivery_queue", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  channel: text("channel").notNull(), // email | whatsapp | voice | n8n
  recipientType: text("recipient_type").notNull(), // lead | user | manual
  recipientId: integer("recipient_id"), // FK into clients or app_users (channel-dependent)
  recipientLabel: text("recipient_label").notNull(),
  toAddress: text("to_address").notNull(), // email, phone, or callback URL
  subject: text("subject"),
  body: text("body").notNull(),
  callbackUrl: text("callback_url"),
  status: text("status").notNull().default("pending"), // pending | sent | failed | skipped
  statusDetail: text("status_detail"),
  attempts: integer("attempts").notNull().default(0),
  endpointUsed: text("endpoint_used"),
  responseText: text("response_text"),
  scheduledAt: text("scheduled_at"),
  sentAt: text("sent_at"),
  createdAt: text("created_at").notNull(),
  createdBy: text("created_by"),
});

export type DeliveryMessage = typeof deliveryQueue.$inferSelect;

// Automation connector configuration. Stored centrally so admins can wire endpoints without editing code.
export const automationConfigs = sqliteTable("automation_configs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(), // email | whatsapp | voice | n8n | github | supabase | google_drive | monthly_refresh | rights_api
  label: text("label").notNull(),
  description: text("description"),
  enabled: integer("enabled").notNull().default(0),
  endpointUrl: text("endpoint_url"),
  secretRef: text("secret_ref"), // name of env var or vault key, never the secret itself
  configJson: text("config_json").notNull().default("{}"),
  lastStatus: text("last_status"), // idle | ok | error
  lastTestedAt: text("last_tested_at"),
  lastResult: text("last_result"),
  updatedAt: text("updated_at").notNull(),
});

export type AutomationConfig = typeof automationConfigs.$inferSelect;

// Admin sessions — server-side. Token is opaque random string, sent via Authorization header from
// React in-memory state (no localStorage / cookies).
export const adminSessions = sqliteTable("admin_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  token: text("token").notNull().unique(),
  identity: text("identity").notNull(), // email or phone used to log in
  role: text("role").notNull().default("admin"),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull(),
});

export type AdminSession = typeof adminSessions.$inferSelect;

// ============ Financial Management Domain ============

/** A financial-app client (household/business). Distinct from rights leads. */
export const finClients = sqliteTable("fin_clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  email: text("email"),
  mode: text("mode").notNull().default("household"), // household | business
  familySize: integer("family_size"),
  city: text("city"),
  monthlyIncome: integer("monthly_income"), // ILS, nullable
  coachId: integer("coach_id"), // FK to app_users (role='coach'), nullable
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export type FinClient = typeof finClients.$inferSelect;

export const finCategories = sqliteTable("fin_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id"), // nullable = global default
  name: text("name").notNull(),
  kind: text("kind").notNull().default("expense"), // income | expense
  color: text("color"),
  icon: text("icon"),
  isSystem: integer("is_system").notNull().default(0),
  createdAt: text("created_at").notNull(),
});
export type FinCategory = typeof finCategories.$inferSelect;

export const finBudgets = sqliteTable("fin_budgets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  categoryId: integer("category_id").notNull(),
  monthlyLimit: integer("monthly_limit").notNull(), // ILS
  note: text("note"),
  createdAt: text("created_at").notNull(),
});
export type FinBudget = typeof finBudgets.$inferSelect;

export const finTransactions = sqliteTable("fin_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  categoryId: integer("category_id"),
  kind: text("kind").notNull().default("expense"), // income | expense
  amount: integer("amount").notNull(), // ILS, positive integer
  description: text("description"),
  occurredOn: text("occurred_on").notNull(), // YYYY-MM-DD
  source: text("source"), // manual | recurring | import
  createdAt: text("created_at").notNull(),
});
export type FinTransaction = typeof finTransactions.$inferSelect;

export const finRecurring = sqliteTable("fin_recurring", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  title: text("title").notNull(),
  amount: integer("amount"), // ILS, optional
  kind: text("kind").notNull().default("reminder"), // reminder | bill | task | tax
  categoryId: integer("category_id"),
  cadence: text("cadence").notNull().default("monthly"), // monthly | bimonthly | quarterly | yearly | once
  nextDate: text("next_date").notNull(), // YYYY-MM-DD
  active: integer("active").notNull().default(1),
  description: text("description"),
  createdAt: text("created_at").notNull(),
});
export type FinRecurring = typeof finRecurring.$inferSelect;

export const finOpportunities = sqliteTable("fin_opportunities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id"),
  title: text("title").notNull(),
  topic: text("topic"),
  category: text("category"),
  rightId: integer("right_id"),
  estimatedYearlyValue: integer("estimated_yearly_value"),
  status: text("status").notNull().default("new"), // new | in_progress | done | dismissed
  recommendation: text("recommendation"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export type FinOpportunity = typeof finOpportunities.$inferSelect;

/** Leads coming from the financial marketing site. */
export const finLeads = sqliteTable("fin_leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  mode: text("mode"), // household | business
  message: text("message"),
  source: text("source"), // financial_marketing | rights_marketing | other
  status: text("status").notNull().default("new"), // new | contacted | converted | discarded
  webhookStatus: text("webhook_status").notNull().default("pending"),
  webhookResponse: text("webhook_response"),
  webhookSentAt: text("webhook_sent_at"),
  createdAt: text("created_at").notNull(),
});
export type FinLead = typeof finLeads.$inferSelect;

/** Debts / liabilities tracked per client. */
export const finDebts = sqliteTable("fin_debts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  creditor: text("creditor").notNull(),
  kind: text("kind").notNull().default("loan"), // loan | mortgage | credit_card | overdraft | tax | private | other
  originalAmount: integer("original_amount"),
  currentBalance: integer("current_balance").notNull(),
  monthlyPayment: integer("monthly_payment"),
  interestRate: integer("interest_rate"), // basis points (e.g. 525 = 5.25%)
  startDate: text("start_date"),
  endDate: text("end_date"),
  status: text("status").notNull().default("active"), // active | closed | restructuring
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export type FinDebt = typeof finDebts.$inferSelect;

/** Savings / financial goals. */
export const finGoals = sqliteTable("fin_goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  title: text("title").notNull(),
  targetAmount: integer("target_amount").notNull(),
  savedAmount: integer("saved_amount").notNull().default(0),
  targetDate: text("target_date"),
  monthlyContribution: integer("monthly_contribution"),
  category: text("category"), // emergency | education | wedding | home | retirement | other
  status: text("status").notNull().default("active"), // active | reached | paused
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export type FinGoal = typeof finGoals.$inferSelect;

/** Alerts surfaced to user/admin (over-budget, debt due, missing income, etc). */
export const finAlerts = sqliteTable("fin_alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  level: text("level").notNull().default("info"), // info | warning | critical
  title: text("title").notNull(),
  body: text("body"),
  source: text("source"), // budget_overrun | debt_due | recurring_due | rights_opportunity | manual
  acknowledged: integer("acknowledged").notNull().default(0),
  createdAt: text("created_at").notNull(),
});
export type FinAlert = typeof finAlerts.$inferSelect;

/** Admin-authored financial plans for specific clients. */
export const finPlans = sqliteTable("fin_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  title: text("title").notNull(),
  summary: text("summary"),
  stepsJson: text("steps_json").notNull().default("[]"), // [{step, due, done}]
  status: text("status").notNull().default("active"), // active | done | paused
  premium: integer("premium").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export type FinPlan = typeof finPlans.$inferSelect;

/** User-specific notes (admin -> client, or client self-notes). */
export const finNotes = sqliteTable("fin_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  authorRole: text("author_role").notNull().default("admin"), // admin | user
  title: text("title"),
  body: text("body").notNull(),
  visibility: text("visibility").notNull().default("both"), // both | admin_only | user_only
  createdAt: text("created_at").notNull(),
});
export type FinNote = typeof finNotes.$inferSelect;

/** Legal-document acceptance log (terms, POA, privacy, etc). */
export const legalAcceptances = sqliteTable("legal_acceptances", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  documentKey: text("document_key").notNull(), // terms | privacy | poa | confidentiality | fin_disclaimer | fee_agreement
  documentVersion: text("document_version").notNull(),
  subjectKind: text("subject_kind").notNull(), // submission | lead | app_user
  subjectId: integer("subject_id"),
  fullName: text("full_name"),
  identifier: text("identifier"), // phone, email, or id number
  signatureMethod: text("signature_method").notNull().default("checkbox"), // checkbox | typed_name | drawn
  signatureValue: text("signature_value"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  acceptedAt: text("accepted_at").notNull(),
});
export type LegalAcceptance = typeof legalAcceptances.$inferSelect;

/**
 * Inbound leads coming from external websites via POST /api/inbound/leads.
 * Both rights and financial leads are persisted here, then fanned out to the
 * configured n8n endpoint (NEDARIM3873 by default).
 */
export const inboundLeads = sqliteTable("inbound_leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceSite: text("source_site"),
  sourcePage: text("source_page"),
  origin: text("origin"),
  category: text("category"),
  topic: text("topic"),
  requestType: text("request_type"),
  selectedPath: text("selected_path"),
  potentialScore: integer("potential_score"),
  potentialLevel: text("potential_level"),
  contactFullName: text("contact_full_name"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  contactIdNumber: text("contact_id_number"),
  answersJson: text("answers_json").notNull().default("{}"),
  documentsJson: text("documents_json").notNull().default("[]"),
  notes: text("notes"),
  legalAcceptedJson: text("legal_accepted_json").notNull().default("{}"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmTerm: text("utm_term"),
  utmContent: text("utm_content"),
  referrer: text("referrer"),
  externalId: text("external_id"),
  leadKind: text("lead_kind").notNull().default("rights"), // rights | financial | other
  rawPayloadJson: text("raw_payload_json").notNull().default("{}"),
  authStatus: text("auth_status").notNull().default("unauthenticated"),
  webhookStatus: text("webhook_status").notNull().default("pending"),
  webhookLogId: integer("webhook_log_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  status: text("status").notNull().default("new"),
  createdAt: text("created_at").notNull(),
});
export type InboundLead = typeof inboundLeads.$inferSelect;

/** Reminder responses from public /#/r/:topicId flow (yes / not_yet / not_eligible). */
export const reminderResponses = sqliteTable("reminder_responses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  topicId: integer("topic_id").notNull(),
  topicTitle: text("topic_title"),
  response: text("response").notNull(), // yes | not_yet | not_eligible
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  nextReminderDate: text("next_reminder_date"), // YYYY-MM-DD when response = not_yet
  wantsService: integer("wants_service").notNull().default(0),
  note: text("note"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: text("created_at").notNull(),
});
export type ReminderResponse = typeof reminderResponses.$inferSelect;

/** CRM tasks per financial client (assigned to coach/admin). */
export const finTasks = sqliteTable("fin_tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: text("due_date"), // YYYY-MM-DD
  status: text("status").notNull().default("open"), // open | in_progress | done | cancelled
  priority: text("priority").notNull().default("normal"), // low | normal | high
  assigneeId: integer("assignee_id"), // FK to app_users (coach or admin)
  createdBy: text("created_by"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export type FinTask = typeof finTasks.$inferSelect;

/** Threaded messages between client / coach / admin. */
export const finMessages = sqliteTable("fin_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  senderRole: text("sender_role").notNull(), // admin | coach | client
  senderName: text("sender_name"),
  body: text("body").notNull(),
  channel: text("channel"), // app | email | whatsapp | sms
  readAt: text("read_at"),
  createdAt: text("created_at").notNull(),
});
export type FinMessage = typeof finMessages.$inferSelect;

/** Per-client documents (consent, POA, IDs, scans, etc.). */
export const finDocuments = sqliteTable("fin_documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  title: text("title").notNull(),
  docType: text("doc_type").notNull().default("other"), // consent | poa | id | bank | invoice | report | other
  status: text("status").notNull().default("pending"), // pending | received | reviewed | rejected
  url: text("url"),
  storageKey: text("storage_key"),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  notes: text("notes"),
  uploadedBy: text("uploaded_by"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export type FinDocument = typeof finDocuments.$inferSelect;

/** Per-client activity log for timeline aggregation. */
export const finActivityLog = sqliteTable("fin_activity_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  kind: text("kind").notNull(), // task | message | document | note | plan | reminder | report | lead
  refId: integer("ref_id"),
  title: text("title").notNull(),
  detail: text("detail"),
  actorRole: text("actor_role"), // admin | coach | client | system
  actorName: text("actor_name"),
  createdAt: text("created_at").notNull(),
});
export type FinActivityLog = typeof finActivityLog.$inferSelect;

/** CRM reminders (for tasks / plan steps / follow-ups). */
export const finReminders = sqliteTable("fin_reminders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  relatedKind: text("related_kind"), // task | plan | document | manual
  relatedId: integer("related_id"),
  title: text("title").notNull(),
  body: text("body"),
  dueAt: text("due_at").notNull(), // ISO datetime
  channel: text("channel").notNull().default("internal"), // internal | email | whatsapp | sms
  status: text("status").notNull().default("pending"), // pending | sent | cancelled
  sentAt: text("sent_at"),
  createdAt: text("created_at").notNull(),
});
export type FinReminder = typeof finReminders.$inferSelect;

/** Monthly per-client report records (summary fields, status). */
export const finReports = sqliteTable("fin_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  periodMonth: text("period_month").notNull(), // YYYY-MM
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"), // draft | sent | archived
  summary: text("summary"),
  metricsJson: text("metrics_json").notNull().default("{}"),
  sentAt: text("sent_at"),
  url: text("url"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export type FinReport = typeof finReports.$inferSelect;

/** Lightweight financial tips/articles surfaced in client view and dashboard. */
export const finTips = sqliteTable("fin_tips", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  tag: text("tag"), // saving | tax | rights | business | budget | family
  active: integer("active").notNull().default(1),
  createdAt: text("created_at").notNull(),
});
export type FinTip = typeof finTips.$inferSelect;

// ============ Bkalut Domain Types ============

/** Row from the main rights/benefits sheet ("מאגר לפי נושאים") */
export interface RightRow {
  id: number;
  priority: number | null;
  category: string;
  subCategory: string;
  topic: string;
  treatingBody: string;
  audience: string;
  whatReceived: string;
  eligibility: string;
  qualifyingCases: string;
  preparation: string;
  documents: string;
  howToApply: string;
  officialLinks: string;
  bkalutCost: string;
  publicSiteText: string;
  faq: string;
  goldTip: string;
  eligibilityJson: string;
  intakeJson: string;
  documentsJson: string;
  podcastScript: string;
  voiceShort: string;
  emailScript: string;
  aiSearch: string;
  aiExtra: string;
  haredi: string;
  serviceUrl: string;
}

/** Row from the organizations sheet ("עמותות וארגונים") */
export interface OrgRow {
  id: number;
  order: number | null;
  category: string;
  name: string;
  bodyType: string;
  audience: string;
  helpProvided: string;
  conditions: string;
  preparation: string;
  requirements: string;
  howToContact: string;
  phoneEmail: string;
  sourceLink: string;
  haredi: string;
  internalNotes: string;
}

/**
 * Sanitized public view of a right. Only fields safe to display to the
 * general public — matches the content of the branded image/Word export.
 * The full RightRow (with internal fields like eligibilityJson, scripts,
 * gold tip, treating-body info, etc.) is never sent to public pages.
 */
export interface PublicRightRow {
  id: number;
  category: string;
  subCategory: string;
  topic: string;
  audience: string;
  whatReceived: string;
  publicSiteText: string;
  serviceUrl: string;
}

export interface MetaResponse {
  rightsCount: number;
  orgsCount: number;
  categoriesCount: number;
  sensitiveCount: number;
  rightsCategories: string[];
  rightsSubCategories: string[];
  treatingBodies: string[];
  haredi: string[];
  orgCategories: string[];
  orgBodyTypes: string[];
  orgHaredi: string[];
}
