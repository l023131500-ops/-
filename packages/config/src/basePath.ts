import { REGISTRY } from "./registry.js";

/**
 * Routing lives under more30.com/<number>/… — e.g. /01 for the hub.
 * basePath is derived from the registry so there is a single source of truth.
 */
export function basePathFor(slug: string): string {
  const entry = REGISTRY.find((p) => p.slug === slug);
  if (!entry) throw new Error(`Unknown app slug: ${slug}`);
  return `/${entry.number}`;
}

/** Resolve the registry entry that owns a given URL path. */
export function resolvePath(pathname: string): string | undefined {
  const seg = pathname.replace(/^\/+/, "").split("/")[0];
  return REGISTRY.find((p) => p.number === seg)?.slug;
}
