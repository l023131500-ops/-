// fetch() with a total-request timeout via AbortController. The HTR pipeline
// (Kraken/Transkribus/DictaLM self-hosted endpoints, OpenAI vision fallback,
// Storage image download) previously called raw fetch() with no bound — a
// hung endpoint would leave the Vercel invocation running until the platform
// itself killed it. Same pattern as fetchWithTimeout in
// apps/22-get-your-rights/supabase/functions/n8n-notify/index.ts.
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
