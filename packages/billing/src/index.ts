/**
 * @more30/billing — Nedarim Plus integration (Mosad 7016674).
 *
 * ⛔ PROTECTED: the existing n8n webhook `NEDARIM3873` and schema `zr_*` must NOT
 * be modified. This module only *reads* configuration by env-var NAME and builds
 * request payloads; it does not re-point or replace any live payment wiring.
 *
 * No secret values live here. NEDARIM_API_KEY / NEDARIM_WEBHOOK_SECRET come from
 * the deployment secret store at runtime.
 */

/** The single Mosad (institution) id used across the platform. Not a secret. */
export const NEDARIM_MOSAD_ID = "7016674" as const;

export interface NedarimConfig {
  mosadId: string;
  apiKey: string;
  webhookSecret: string;
}

function req(name: string): string {
  const v = typeof process !== "undefined" ? process.env[name] : undefined;
  if (!v) throw new Error(`Missing ${name} — set it in the deployment secret store, never in git.`);
  return v;
}

/** Load Nedarim config from env (server-only). */
export function loadNedarimConfig(): NedarimConfig {
  return {
    mosadId: process.env.NEDARIM_MOSAD_ID ?? NEDARIM_MOSAD_ID,
    apiKey: req("NEDARIM_API_KEY"),
    webhookSecret: req("NEDARIM_WEBHOOK_SECRET"),
  };
}

export interface DonationRequest {
  amountAgorot: number;
  description: string;
  payerName?: string;
  /** Which system/tenant this donation belongs to (for core.projects attribution). */
  projectNumber: string;
}

/**
 * Build a Nedarim Plus charge payload. Transport (n8n `NEDARIM3873`) is owned
 * elsewhere and is protected — this only shapes the payload.
 */
export function buildDonationPayload(cfg: NedarimConfig, r: DonationRequest) {
  return {
    MosadId: cfg.mosadId,
    Amount: r.amountAgorot,
    Description: r.description,
    PayerName: r.payerName ?? "",
    Reference: `more30:${r.projectNumber}`,
  };
}
