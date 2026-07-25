import { REGISTRY } from "./registry.js";
import { TOPIC_ROUTES } from "./registry.js";

/**
 * Routing lives under more30.com/<topic>/… — e.g. /nadlan for the real-estate app,
 * /torah for the hub. The topic is the single public identifier; the underlying
 * *.vercel.app URL is proxied and never exposed (NetFree blocks vercel.app).
 * basePath is derived from the registry so there is a single source of truth.
 */
export function basePathFor(slug: string): string {
  const entry = REGISTRY.find((p) => p.slug === slug);
  if (!entry) throw new Error(`Unknown app slug: ${slug}`);
  const topic = TOPIC_ROUTES[entry.number];
  if (!topic) throw new Error(`No public topic route for app: ${slug} (${entry.number})`);
  return `/${topic}`;
}

/** Resolve the registry slug that owns a given URL path (e.g. "/nadlan/x" → "nadlan-berega"). */
export function resolvePath(pathname: string): string | undefined {
  const seg = pathname.replace(/^\/+/, "").split("/")[0];
  const num = Object.keys(TOPIC_ROUTES).find((n) => TOPIC_ROUTES[n] === seg);
  return num ? REGISTRY.find((p) => p.number === num)?.slug : undefined;
}
