// Nedarim Plus payment integration — reuses torah-platform credentials.
// Tenant: igud — MosadId 7016674, ApiValid LU/Aw5hcm1, ApiPassword nc334
// Allowed webhook IP: 18.194.219.73

export const NEDARIM_CONFIG = {
  mosad_id: process.env.NEDARIM_MOSAD_ID || "7016674",
  api_valid: process.env.NEDARIM_API_VALID || "LU/Aw5hcm1",
  api_password: process.env.NEDARIM_API_PASSWORD || "nc334",
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
