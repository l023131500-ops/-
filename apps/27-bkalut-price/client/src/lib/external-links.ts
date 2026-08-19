// External site URLs used in the admin/dashboard UI. The financial
// management site lives outside this repo; when production env config exposes
// VITE_FINANCIAL_SITE_URL we use it, otherwise we fall back to the known
// marketing preview URL supplied by the product owner.
export const FINANCIAL_SITE_URL =
  (import.meta as any).env?.VITE_FINANCIAL_SITE_URL ||
  "https://www.perplexity.ai/computer/a/nyhvl-pynnsy-mbyt-bqlvt-Y73B1ngiSfyXJfakf9covw";
