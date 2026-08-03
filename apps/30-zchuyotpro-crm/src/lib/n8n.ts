import { toast } from "sonner";

export const N8N_BASE_URL = "https://bkalot.app.n8n.cloud";

export type N8nWebhookPath =
  | "send-message"
  | "analyze-document"
  | "partner-referral"
  | "analyze-entitlements";

/**
 * Fire-and-forget n8n webhook trigger.
 * Never throws — failures show a toast and log to console.
 * The caller's main action (e.g. Supabase write) must always complete
 * regardless of n8n availability.
 */
export async function triggerN8nWebhook(
  path: N8nWebhookPath | string,
  payload: Record<string, unknown>,
): Promise<unknown | null> {
  try {
    const response = await fetch(`${N8N_BASE_URL}/webhook/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`n8n webhook ${path} failed: ${response.status}`);
    }
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch (error) {
    console.error(`[n8n] webhook "${path}" failed`, error);
    toast.error("האוטומציה לא הגיעה, נסה שוב");
    return null;
  }
}
