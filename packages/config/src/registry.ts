import type { ProjectEntry } from "./types.js";

/**
 * The more30 project registry.
 *
 * Numbering 01–07 and the protected pair 08/09 are owner-approved. 10–14 follow
 * the master plan; 15+ are additional active repos discovered in the
 * l023131500-ops account. `supabaseSchema` is `null` where it has NOT yet been
 * verified by reading the system's repo (those repos are not in this session's
 * GitHub scope). See CONNECTIONS.md for the full status matrix.
 *
 * All systems share ONE Supabase project (uhnrgujbdxhhmoxcjria); they are
 * separated by schema, not by project.
 */
export const REGISTRY: ProjectEntry[] = [
  { number: "01", slug: "torah-platform", repo: "torah-platform", name: "Torah Platform (HUB, +egod)", category: "hub", stage: "live", live: true, supabaseProject: "uhnrgujbdxhhmoxcjria", supabaseSchema: "public", deployTarget: "lovable", protected: false, note: "Hub DB (inferred). Billing via Nedarim. Visual polish stays in Lovable." },
  { number: "02", slug: "igud-transcribe", repo: "igud-transcribe", name: "Igud Transcribe", category: "transcription", stage: "beta", live: true, supabaseProject: "bieebmnmkffwbqlsfozh", supabaseSchema: "public", deployTarget: "vercel", protected: false, note: "VERIFIED: Next.js 14 + OpenAI Whisper-1/GPT-4 on its OWN Supabase project. MISSING token = OPENAI_API_KEY." },
  { number: "03", slug: "igud-ads", repo: "igud-ads", name: "Igud Ads", category: "advertising", stage: "live", live: true, supabaseProject: "bieebmnmkffwbqlsfozh", supabaseSchema: "public", deployTarget: "vercel", protected: false, note: "VERIFIED: Next.js on Vercel (ads.igud-shiurim.org). SHARES Supabase project bieebmnmkffwbqlsfozh with #02. Uses OPENAI_API_KEY. Revenue system." },
  { number: "04", slug: "imud-torani", repo: "imud-torani", name: "Imud Torani", category: "torah", stage: "beta", live: true, supabaseSchema: null, deployTarget: "railway", protected: false, note: "Known bug: X-Visitor-Id header." },
  { number: "05", slug: "financial-marketing-site", repo: "03-financial-marketing-site", name: "Financial Marketing Site", category: "finance", stage: "wip", live: false, supabaseSchema: null, deployTarget: "unknown", protected: false },
  { number: "06", slug: "kupot-holim", repo: "kupot-holim", name: "Kupot Holim", category: "health", stage: "wip", live: false, supabaseSchema: null, deployTarget: "unknown", protected: false },
  { number: "07", slug: "zol", repo: "zol", name: "Zol", category: "commerce", stage: "wip", live: false, supabaseSchema: null, deployTarget: "unknown", protected: false },
  { number: "08", slug: "bkalut-app", repo: "bkalut-app", name: "Bkalut App", category: "commerce", stage: "protected", live: true, supabaseSchema: null, deployTarget: "unknown", protected: true, note: "🔒 PROTECTED — do not touch." },
  { number: "09", slug: "bkalot-admin", repo: "bkalot-admin", name: "Bkalot Admin", category: "commerce", stage: "protected", live: true, supabaseSchema: null, deployTarget: "unknown", protected: true, note: "🔒 PROTECTED — do not touch." },
  { number: "10", slug: "bkalot-rights", repo: "bkalot-rights", name: "Bkalot Rights", category: "rights", stage: "wip", live: false, supabaseSchema: null, deployTarget: "unknown", protected: false },
  { number: "11", slug: "bkalut-marketing2", repo: "bkalut-marketing2", name: "Bkalut Marketing 2", category: "marketing", stage: "wip", live: false, supabaseSchema: null, deployTarget: "unknown", protected: false },
  { number: "12", slug: "smel-ndln", repo: "smel-ndln", name: "Smel Ndln", category: "other", stage: "wip", live: false, supabaseSchema: null, deployTarget: "unknown", protected: false },
  { number: "13", slug: "property-identity", repo: "property-identity", name: "Property Identity", category: "realestate", stage: "wip", live: false, supabaseSchema: null, deployTarget: "unknown", protected: false },
  { number: "14", slug: "bsmachot-plus", repo: "bsmachot-plus", name: "Bsmachot Plus", category: "events", stage: "wip", live: false, supabaseSchema: null, deployTarget: "unknown", protected: false },
  { number: "15", slug: "egod", repo: "egod", name: "egod (HUB pair with 01)", category: "hub", stage: "live", live: true, supabaseProject: "uhnrgujbdxhhmoxcjria", supabaseSchema: "public", deployTarget: "lovable", protected: false, note: "Born in Lovable; shares Supabase with torah-platform (inferred)." },
  { number: "16", slug: "chatzor-connect", repo: "chatzor-connect", name: "Chatzor Connect", category: "other", stage: "wip", live: false, supabaseSchema: null, deployTarget: "unknown", protected: false },
  { number: "17", slug: "chizukim-transcribe", repo: "chizukim-transcribe", name: "Chizukim Transcribe", category: "transcription", stage: "beta", live: true, supabaseProject: "csjekrvukbdznetsrodj", supabaseSchema: "public", deployTarget: "vercel", protected: false, note: "VERIFIED: Vite+Express on Vercel; OWN Supabase project (bucket recordings-audio, table recordings). Transcription via RunPod/ivrit.ai (whisper-large-v3-turbo-ct2) — NOT OpenAI. Required token: CUSTOM_CRED_API_RUNPOD_AI_TOKEN." },
  { number: "18", slug: "torah-editor-mvp", repo: "torah-editor-mvp", name: "Torah Editor MVP", category: "torah", stage: "wip", live: false, supabaseSchema: null, deployTarget: "unknown", protected: false },
  { number: "19", slug: "igud-shiurim-portal", repo: "igud-shiurim-portal", name: "Igud Shiurim Portal", category: "torah", stage: "wip", live: false, supabaseSchema: null, deployTarget: "unknown", protected: false },
  { number: "20", slug: "igud-portal", repo: "igud-portal", name: "Igud Portal", category: "torah", stage: "wip", live: false, supabaseSchema: null, deployTarget: "unknown", protected: false },
  { number: "21", slug: "mthbram", repo: "mthbram", name: "Mthbram", category: "other", stage: "wip", live: false, supabaseSchema: null, deployTarget: "unknown", protected: false },
  { number: "22", slug: "get-your-rights", repo: "get-your-rights", name: "Get Your Rights", category: "rights", stage: "wip", live: false, supabaseSchema: null, deployTarget: "unknown", protected: false },
  { number: "23", slug: "haorech-torani", repo: "haorech-torani", name: "Haorech Torani", category: "torah", stage: "wip", live: false, supabaseSchema: null, deployTarget: "unknown", protected: false },
  { number: "24", slug: "galilee-connect-hub", repo: "galilee-connect-hub", name: "Galilee Connect Hub", category: "other", stage: "wip", live: false, supabaseSchema: null, deployTarget: "unknown", protected: false },
  { number: "25", slug: "mor1-main-site", repo: "mor1-main-site", name: "Mor1 Main Site", category: "marketing", stage: "wip", live: false, supabaseSchema: null, deployTarget: "unknown", protected: false },
  { number: "26", slug: "modaot-studio", repo: "modaot-studio", name: "Modaot Studio", category: "advertising", stage: "wip", live: false, supabaseSchema: null, deployTarget: "unknown", protected: false },
  { number: "27", slug: "bkalut-price", repo: "bkalut-price", name: "Bkalut Price", category: "commerce", stage: "wip", live: false, supabaseSchema: null, deployTarget: "unknown", protected: false },
  { number: "28", slug: "kupot-health-funds", repo: "kupot-health-funds", name: "Kupot Health Funds", category: "health", stage: "wip", live: false, supabaseSchema: null, deployTarget: "unknown", protected: false },
  { number: "29", slug: "bkalot-design", repo: "bkalot-design", name: "Bkalot Design", category: "marketing", stage: "wip", live: false, supabaseSchema: null, deployTarget: "unknown", protected: false },
  { number: "30", slug: "zchuyotpro-crm", repo: "zchuyotpro-crm", name: "ZchuyotPro CRM", category: "crm", stage: "wip", live: false, supabaseSchema: null, deployTarget: "unknown", protected: false },
  { number: "31", slug: "hebrew-bridge-crm", repo: "hebrew-bridge-crm", name: "Hebrew Bridge CRM", category: "crm", stage: "wip", live: false, supabaseSchema: null, deployTarget: "unknown", protected: false },
];

/** Repos to archive/clean only — never treated as active apps. */
export const ARCHIVE_REPOS: string[] = [
  "luxe-balance-hub-81",
  "luxe-balance-hub-81-2495305b",
  "luxe-balance-hub-81-18cf8aef",
  "luxe-balance-hub-81-906f08da",
  "luxe-balance-hub-81-8c019fba",
  "luxe-ledger-hub",
  "lux-manage",
  "bklotm",
  "pixel-perfect",
];

export function getByNumber(n: string): ProjectEntry | undefined {
  return REGISTRY.find((p) => p.number === n);
}

export function activeProjects(): ProjectEntry[] {
  return REGISTRY.filter((p) => !p.protected && p.stage !== "archived");
}
