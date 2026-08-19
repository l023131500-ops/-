// Nedarim Plus payment integration — reuses torah-platform credentials.
// Allowed webhook IP: 18.194.219.73
//
// 🚨 The ApiValid and ApiPassword for this Mosad used to sit here as literal
// `||` fallbacks, and a comment above repeated them in plain text. On 03/08 the
// whole apps/ tree was force-added to the monorepo — which is **public** — so
// they were published. They are set as environment variables on the
// `modaot-more30` Vercel project now, and they are gone from here.
//
// **Treat both as compromised and rotate them with Nedarim Plus.** Removing
// them from the working tree does not remove them from git history, and a
// public repository must be assumed to have been read. Logged in NEEDS_USER.
//
// A fallback is not a safe place for a credential — it is a worse one than a
// plain assignment, because it reads as though the value came from the
// environment. `scripts/qa/secret-scan.mjs` now looks for exactly this shape.

/** Fail loudly and at import time, rather than silently charging with a guess. */
function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `${name} is not set. Nedarim credentials come from the deployment secret ` +
        `store — never from a literal in this file.`,
    );
  }
  return v;
}

export const NEDARIM_CONFIG = {
  get mosad_id() {
    return required("NEDARIM_MOSAD_ID");
  },
  get api_valid() {
    return required("NEDARIM_API_VALID");
  },
  get api_password() {
    return required("NEDARIM_API_PASSWORD");
  },
  // Not a credential: the public iframe endpoint every Nedarim Plus site uses.
  endpoint:
    process.env.NEDARIM_ENDPOINT ||
    "https://matara.pro/nedarimplus/iframe?language=he",
};

export type CreatePaymentInput = {
  amount: number;
  description: string;
  payer_name?: string;
  payer_phone?: string;
  payer_email?: string;
  return_url: string;
  webhook_url: string;
  project_id: string;
};

// Returns an iframe URL the client should open in order to pay.
// Nedarim Plus iframe expects POST params; we expose a server-helper
// that returns the URL and the POST body the client must submit.
export function buildPaymentPayload(input: CreatePaymentInput) {
  return {
    iframe_url: NEDARIM_CONFIG.endpoint,
    fields: {
      Mosad: NEDARIM_CONFIG.mosad_id,
      ApiValid: NEDARIM_CONFIG.api_valid,
      Amount: String(input.amount),
      Tashlumim: "1",
      Currency: "1", // 1 = NIS
      Zeout: "",
      FirstName: input.payer_name || "",
      LastName: "",
      Street: "",
      City: "",
      Phone: input.payer_phone || "",
      Mail: input.payer_email || "",
      Comment: input.description.slice(0, 250),
      Param1: input.project_id,
      CallBack: input.webhook_url,
      ReturnUrl: input.return_url,
    },
  };
}

export function verifyWebhookIp(ip: string): boolean {
  return ip === "18.194.219.73" || process.env.NODE_ENV !== "production";
}
