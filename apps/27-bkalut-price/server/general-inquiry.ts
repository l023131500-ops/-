/**
 * General-inquiry reply template + send helper.
 *
 * Template lives in automation_configs under key="general_inquiry_reply".
 * configJson contains: { subject, body, channels[], defaultPublicEligibilityUrl }.
 *
 * Rendering supports the placeholders:
 *   {{fullName}}, {{phone}}, {{email}}, {{publicEligibilityUrl}}
 * Unknown placeholders are left as empty strings.
 *
 * Sending is performed through the unified webhook bus
 * (`webhook_email_automation` config key) so we never falsely claim "email
 * sent" — only "delivered to webhook" when the endpoint returned 2xx.
 */
import type { AutomationConfig } from "@shared/schema";
import { storage } from "./storage";
import { dispatchWebhook } from "./webhook-bus";

const TEMPLATE_KEY = "general_inquiry_reply";
const DELIVERY_CONFIG_KEY = "webhook_email_automation";

export interface InquiryTemplate {
  subject: string;
  body: string;
  channels: string[];
  defaultPublicEligibilityUrl: string;
}

const FALLBACK_TEMPLATE: InquiryTemplate = {
  subject: "תודה שפניתם לארגון בקלות",
  body:
    "שלום וברכה {{fullName}},\n\n" +
    "אנחנו שמחים שפניתם לארגון בקלות.\n" +
    "כדי שנוכל להחזיר לכם תשובה ממוקדת ומהירה, נשמח שתעדכנו אותנו באיזה תחום מדובר: זכויות והטבות, ניהול פיננסי, סיוע לחיוב חודשי או נושא אחר.\n\n" +
    "ניתן לבדוק התאמה ראשונית ולמלא פנייה ישירות בעמוד הזכאות שלנו:\n{{publicEligibilityUrl}}\n\n" +
    "אם נוח לכם, אפשר לחזור אלינו גם בטלפון 02-3131500 או במייל l023131500@gmail.com.\n" +
    "פרטי הקשר שמסרתם: טלפון {{phone}}, מייל {{email}}.\n\n" +
    "בברכה,\nצוות ארגון בקלות",
  channels: ["email"],
  defaultPublicEligibilityUrl: "/#/",
};

function parseTemplate(cfg: AutomationConfig | undefined): InquiryTemplate {
  if (!cfg || !cfg.configJson) return { ...FALLBACK_TEMPLATE };
  try {
    const obj = JSON.parse(cfg.configJson) as Partial<InquiryTemplate>;
    return {
      subject: typeof obj.subject === "string" && obj.subject.trim() ? obj.subject : FALLBACK_TEMPLATE.subject,
      body: typeof obj.body === "string" && obj.body.trim() ? obj.body : FALLBACK_TEMPLATE.body,
      channels: Array.isArray(obj.channels) && obj.channels.length ? obj.channels.map(String) : FALLBACK_TEMPLATE.channels,
      defaultPublicEligibilityUrl: typeof obj.defaultPublicEligibilityUrl === "string" && obj.defaultPublicEligibilityUrl
        ? obj.defaultPublicEligibilityUrl
        : FALLBACK_TEMPLATE.defaultPublicEligibilityUrl,
    };
  } catch {
    return { ...FALLBACK_TEMPLATE };
  }
}

export async function getInquiryTemplate(): Promise<{ config: AutomationConfig | undefined; template: InquiryTemplate }> {
  const config = await storage.getAutomationConfig(TEMPLATE_KEY);
  const template = parseTemplate(config);
  return { config, template };
}

export async function saveInquiryTemplate(patch: Partial<InquiryTemplate> & { enabled?: boolean }) {
  const { template, config } = await getInquiryTemplate();
  const next: InquiryTemplate = {
    subject: typeof patch.subject === "string" && patch.subject.trim() ? patch.subject : template.subject,
    body: typeof patch.body === "string" && patch.body.trim() ? patch.body : template.body,
    channels: Array.isArray(patch.channels) && patch.channels.length ? patch.channels.map(String) : template.channels,
    defaultPublicEligibilityUrl:
      typeof patch.defaultPublicEligibilityUrl === "string" && patch.defaultPublicEligibilityUrl
        ? patch.defaultPublicEligibilityUrl
        : template.defaultPublicEligibilityUrl,
  };
  // Ensure the row exists. If not seeded yet, create a sensible default first.
  if (!config) {
    // We don't have an upsert API; rely on the seeder to create the row, then
    // patch. If still missing, return the merged value without persisting.
    const re = await storage.getAutomationConfig(TEMPLATE_KEY);
    if (!re) return next;
  }
  await storage.updateAutomationConfig(TEMPLATE_KEY, {
    enabled: patch.enabled,
    config: next as unknown as Record<string, unknown>,
  });
  return next;
}

export interface RenderInputs {
  fullName?: string;
  phone?: string;
  email?: string;
  publicEligibilityUrl?: string;
  [key: string]: string | undefined;
}

export function renderInquiryReply(template: InquiryTemplate, inputs: RenderInputs) {
  const vars: Record<string, string> = {
    fullName: inputs.fullName || "פונה יקר/ה",
    phone: inputs.phone || "",
    email: inputs.email || "",
    publicEligibilityUrl: inputs.publicEligibilityUrl || template.defaultPublicEligibilityUrl,
  };
  for (const [k, v] of Object.entries(inputs)) {
    if (typeof v === "string" && !(k in vars)) vars[k] = v;
  }
  function fill(text: string) {
    return text.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_, key) => vars[key] ?? "");
  }
  return {
    subject: fill(template.subject),
    body: fill(template.body),
    vars,
  };
}

export interface SendInquiryOptions {
  fullName?: string;
  phone?: string;
  email?: string;
  publicEligibilityUrl?: string;
  leadId?: number | null;
  relatedKind?: string;
  source?: string;
  channels?: string[];
}

/**
 * Render + send the general inquiry reply via the unified webhook bus.
 * Returns the dispatch result. Never falsely claims "email sent" — the caller
 * should report only that the request was delivered to the configured webhook.
 */
export async function sendInquiryReply(opts: SendInquiryOptions) {
  const { template } = await getInquiryTemplate();
  const rendered = renderInquiryReply(template, {
    fullName: opts.fullName,
    phone: opts.phone,
    email: opts.email,
    publicEligibilityUrl: opts.publicEligibilityUrl,
  });
  const channels = opts.channels && opts.channels.length ? opts.channels : template.channels;

  const payload = {
    templateKey: TEMPLATE_KEY,
    kind: "general_inquiry_reply",
    channels,
    to: {
      email: opts.email || "",
      phone: opts.phone || "",
      fullName: opts.fullName || "",
    },
    subject: rendered.subject,
    body: rendered.body,
    vars: rendered.vars,
    lead: opts.leadId ? { id: opts.leadId, kind: opts.relatedKind ?? "lead" } : null,
    issuedAt: new Date().toISOString(),
  };

  const dispatch = await dispatchWebhook({
    source: opts.source ?? "general_inquiry_reply",
    configKey: DELIVERY_CONFIG_KEY,
    relatedKind: opts.relatedKind ?? undefined,
    relatedId: opts.leadId ?? null,
    payload,
  });

  return { dispatch, rendered, channels };
}
