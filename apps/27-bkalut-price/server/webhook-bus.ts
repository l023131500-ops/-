/**
 * Unified outbound webhook bus.
 *
 * Per user spec: every customer inquiry — rights AND financial — must be
 * persisted in the local DB AND POSTed to the n8n endpoint
 * (default https://n8n.l023131500.work/webhook/NEDARIM3873). Every outbound
 * attempt is logged to the `webhook_log` table so the admin can see delivery
 * status, retries and failures.
 *
 * Use `dispatchWebhook` for any new event source.
 */
import { storage } from "./storage";

export const DEFAULT_LEAD_WEBHOOK_URL = "https://n8n.l023131500.work/webhook/NEDARIM3873";

export interface DispatchInput {
  source: string;                 // e.g. "bkalut_service_form", "financial_lead", "credentials_delivery", "premium_decision"
  configKey?: string;             // automation_configs.key to resolve the endpoint and per-channel settings
  payload: Record<string, unknown>;
  relatedKind?: string;           // e.g. "submission" | "lead" | "app_user" | "premium_request"
  relatedId?: number | null;
  timeoutMs?: number;
}

export interface DispatchResult {
  ok: boolean;
  status: number;
  responseText: string;
  endpointUrl: string;
  logId: number;
}

async function postWithTimeout(url: string, payload: unknown, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "bkalut-bus/1.0" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await r.text();
    return { ok: r.ok, status: r.status, responseText: text.slice(0, 2000) };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      responseText: err instanceof Error ? err.message : "request failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Dispatch a webhook with a record in webhook_log. Always tries to send (so the
 * NEDARIM3873 endpoint receives the inquiry) and records the result.
 */
export async function dispatchWebhook(input: DispatchInput): Promise<DispatchResult> {
  // Resolve endpoint
  let endpointUrl = DEFAULT_LEAD_WEBHOOK_URL;
  let timeoutMs = input.timeoutMs ?? 8000;
  if (input.configKey) {
    try {
      const cfg = await storage.getAutomationConfig(input.configKey);
      if (cfg && cfg.endpointUrl) endpointUrl = cfg.endpointUrl;
      if (cfg && cfg.configJson) {
        try {
          const j = JSON.parse(cfg.configJson);
          if (typeof j?.timeoutMs === "number") timeoutMs = j.timeoutMs;
        } catch {}
      }
    } catch {}
  }

  // 1) Persist a pending log row
  let log;
  try {
    log = await storage.createWebhookLog({
      source: input.source,
      endpointUrl,
      relatedKind: input.relatedKind ?? null,
      relatedId: input.relatedId ?? null,
      payloadJson: JSON.stringify(input.payload).slice(0, 200000),
      status: "pending",
      httpStatus: null,
      responseText: null,
      attempts: 0,
      nextRetryAt: null,
    } as any);
  } catch (err) {
    // Non-fatal: still attempt to post.
    log = { id: 0 } as any;
  }

  // 2) Post
  const result = await postWithTimeout(endpointUrl, input.payload, timeoutMs);

  // 3) Update log
  try {
    if (log?.id) {
      await storage.updateWebhookLog(log.id, {
        status: result.ok ? "sent" : "failed",
        httpStatus: result.status,
        responseText: result.responseText,
        attempts: 1,
        lastAttemptAt: new Date().toISOString(),
        nextRetryAt: result.ok ? null : new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      } as any);
    }
  } catch {}

  return {
    ok: result.ok,
    status: result.status,
    responseText: result.responseText,
    endpointUrl,
    logId: log?.id ?? 0,
  };
}

/**
 * Retry a single failed log row by id. Returns updated row or undefined.
 */
export async function retryWebhookLog(id: number) {
  const all = await storage.listWebhookLog(500);
  const row = all.find((r) => r.id === id);
  if (!row) return undefined;
  let payload: unknown = {};
  try {
    payload = JSON.parse(row.payloadJson);
  } catch {
    payload = { raw: row.payloadJson };
  }
  const result = await postWithTimeout(row.endpointUrl, payload, 8000);
  await storage.updateWebhookLog(id, {
    status: result.ok ? "sent" : "failed",
    httpStatus: result.status,
    responseText: result.responseText,
    attempts: (row.attempts ?? 0) + 1,
    lastAttemptAt: new Date().toISOString(),
    nextRetryAt: result.ok ? null : new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  } as any);
  const list = await storage.listWebhookLog(500);
  return list.find((r) => r.id === id);
}
