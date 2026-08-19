/**
 * Shared types for storage implementations. Extracted to avoid circular
 * imports between storage.ts (which selects the implementation) and
 * supabase-storage.ts (which depends on these types).
 */
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

export interface ClientInput {
  fullName: string;
  phone: string;
  email?: string;
  idNumber?: string;
  birthDate?: string;
  city?: string;
  familyStatus?: string;
}

export interface ServiceSubmissionInput {
  client: ClientInput;
  rightId: number;
  topic: string;
  category: string;
  requestType: string;
  potentialPercent: number;
  potentialLevel: string;
  answers: unknown;
  details: unknown;
  documents: unknown;
  additionalTopics: unknown;
  termsAccepted: boolean;
}

export interface ServiceSubmissionRow {
  id: number;
  createdAt: string;
  clientId: number;
  fullName: string;
  phone: string;
  email: string;
  idNumber: string;
  birthDate: string;
  familyStatus: string;
  city: string;
  rightId: number;
  topic: string;
  category: string;
  requestType: string;
  potentialPercent: number;
  potentialLevel: string;
  answersJson: string;
  detailsJson: string;
  documentsJson: string;
  additionalTopicsJson: string;
  webhookStatus: string;
  webhookResponse: string;
  webhookSentAt: string;
}

export interface AppUserInput {
  fullName: string;
  email?: string;
  username?: string;
  phone?: string;
  password?: string;          // plain, will be hashed and optionally stored ephemerally for first delivery
  role?: string;
  status?: string;
  productAccess?: string[];
  plan?: string;              // basic | premium
  finClientId?: number | null;
  notes?: string;
}

export interface DeliveryMessageInput {
  channel: string;
  recipientType: string;
  recipientId?: number | null;
  recipientLabel: string;
  toAddress: string;
  subject?: string;
  body: string;
  callbackUrl?: string;
  scheduledAt?: string;
  createdBy?: string;
}

export interface InboundLeadInput {
  sourceSite?: string;
  sourcePage?: string;
  origin?: string;
  category?: string;
  topic?: string;
  requestType?: string;
  selectedPath?: string;
  potentialScore?: number;
  potentialLevel?: string;
  contactFullName?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactIdNumber?: string;
  answers?: unknown;
  documents?: unknown;
  notes?: string;
  legalAccepted?: unknown;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  referrer?: string;
  externalId?: string;
  leadKind?: string;
  rawPayload?: unknown;
  authStatus?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AutomationConfigInput {
  enabled?: boolean;
  endpointUrl?: string;
  secretRef?: string;
  config?: Record<string, unknown>;
  description?: string;
  label?: string;
}

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;

  getClientByPhone(phone: string): Promise<Client | undefined>;
  getClient(id: number): Promise<Client | undefined>;
  listClients(): Promise<Client[]>;
  upsertClient(input: ClientInput): Promise<Client>;

  createServiceSubmission(input: ServiceSubmissionInput): Promise<ServiceSubmission>;
  updateServiceSubmissionWebhook(id: number, status: string, response: string): Promise<void>;
  listServiceSubmissions(): Promise<ServiceSubmission[]>;
  listServiceSubmissionRows(): Promise<ServiceSubmissionRow[]>;

  listAppUsers(): Promise<AppUser[]>;
  getAppUser(id: number): Promise<AppUser | undefined>;
  getAppUserByLogin(identifier: string): Promise<AppUser | undefined>;
  createAppUser(input: AppUserInput): Promise<AppUser>;
  updateAppUser(id: number, input: Partial<AppUserInput>): Promise<AppUser | undefined>;
  deleteAppUser(id: number): Promise<void>;
  clearAppUserPlainPassword(id: number): Promise<void>;
  markCredentialsDelivered(id: number, at: string): Promise<void>;
  setAppUserPlan(id: number, plan: string): Promise<AppUser | undefined>;

  // user (financial-client) sessions
  createUserSession(appUserId: number, ttlMs?: number): Promise<UserSession>;
  getUserSession(token: string): Promise<(UserSession & { user: AppUser }) | undefined>;
  deleteUserSession(token: string): Promise<void>;

  // premium requests
  listPremiumRequests(): Promise<PremiumRequest[]>;
  listPremiumRequestsForUser(appUserId: number): Promise<PremiumRequest[]>;
  createPremiumRequest(appUserId: number, message: string): Promise<PremiumRequest>;
  updatePremiumRequest(id: number, patch: { status?: string; adminNote?: string }): Promise<PremiumRequest | undefined>;

  // webhook log
  listWebhookLog(limit?: number): Promise<WebhookLog[]>;
  createWebhookLog(input: Omit<WebhookLog, "id" | "createdAt" | "lastAttemptAt">): Promise<WebhookLog>;
  updateWebhookLog(id: number, patch: Partial<Omit<WebhookLog, "id" | "createdAt">>): Promise<WebhookLog | undefined>;

  // legal acceptance log
  createLegalAcceptance(input: Omit<LegalAcceptance, "id" | "acceptedAt"> & { acceptedAt?: string }): Promise<LegalAcceptance>;
  listLegalAcceptancesForSubject(kind: string, id: number): Promise<LegalAcceptance[]>;

  // inbound leads (public webhook from external sites)
  createInboundLead(input: InboundLeadInput): Promise<InboundLead>;
  updateInboundLeadWebhook(id: number, status: string, webhookLogId: number | null): Promise<void>;
  listInboundLeads(limit?: number): Promise<InboundLead[]>;
  getInboundLead(id: number): Promise<InboundLead | undefined>;

  listDeliveryMessages(): Promise<DeliveryMessage[]>;
  getDeliveryMessage(id: number): Promise<DeliveryMessage | undefined>;
  createDeliveryMessage(input: DeliveryMessageInput): Promise<DeliveryMessage>;
  updateDeliveryMessage(id: number, patch: Partial<DeliveryMessage>): Promise<DeliveryMessage | undefined>;
  deleteDeliveryMessage(id: number): Promise<void>;

  listAutomationConfigs(): Promise<AutomationConfig[]>;
  getAutomationConfig(key: string): Promise<AutomationConfig | undefined>;
  updateAutomationConfig(key: string, input: AutomationConfigInput): Promise<AutomationConfig | undefined>;
  recordAutomationTest(key: string, status: string, result: string): Promise<void>;

  createAdminSession(identity: string, role?: string, ttlMs?: number): Promise<AdminSession>;
  getAdminSession(token: string): Promise<AdminSession | undefined>;
  deleteAdminSession(token: string): Promise<void>;
  cleanupExpiredSessions(): Promise<void>;
}
