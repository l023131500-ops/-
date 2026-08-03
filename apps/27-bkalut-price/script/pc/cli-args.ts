/**
 * Pure, side-effect-free CLI helpers for the price-comparison importer.
 *
 * Kept in its own module (not in pc-daily-import.ts) so unit tests can import
 * the parsing/filtering logic WITHOUT triggering the entrypoint's top-level TLS
 * re-exec and main() run.
 */

export interface Args {
  dryRun: boolean;
  offline: boolean;
  feedId: number | null;
  maxFiles: number | null;
  includeUnverified: boolean;
  regulatoryOnly: boolean;
  concurrency: number;
  forceReimport: boolean;
  // Restrict the run to feeds whose effective adapter (adapter ?? source_type)
  // is in this list. Used to import only the geo-blocked chains from the Israeli
  // VPS (e.g. --adapters=matrix,web,laibcatalog) while GitHub Actions keeps
  // importing everything else. null = no adapter filter (import all).
  adapters: string[] | null;
}

/** Parse a comma-separated adapter list into a lowercased, de-duped array. */
export function parseAdapterList(raw: string | undefined | null): string[] | null {
  if (!raw) return null;
  const list = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
  return list.length ? Array.from(new Set(list)) : null;
}

/** The effective adapter for a feed: explicit adapter, else source_type, else "url". */
export function effectiveAdapter(feed: { adapter?: string | null; source_type?: string | null }): string {
  return (feed.adapter || feed.source_type || "url").toLowerCase();
}

/** Keep only feeds whose effective adapter is in `adapters` (null/empty = keep all). */
export function filterFeedsByAdapter<T extends { adapter?: string | null; source_type?: string | null }>(
  feeds: T[],
  adapters: string[] | null,
): T[] {
  if (!adapters || adapters.length === 0) return feeds;
  const want = new Set(adapters.map((a) => a.toLowerCase()));
  return feeds.filter((f) => want.has(effectiveAdapter(f)));
}

export function parseArgs(argv: string[], env: NodeJS.ProcessEnv = process.env): Args {
  const get = (k: string) => {
    const hit = argv.find((a) => a === `--${k}` || a.startsWith(`--${k}=`));
    if (!hit) return undefined;
    const eq = hit.indexOf("=");
    return eq >= 0 ? hit.slice(eq + 1) : "true";
  };
  // A bare `--adapters` (no value) parses as "true"; treat that as "not given".
  const flagValue = (k: string) => {
    const v = get(k);
    return v === undefined || v === "true" ? undefined : v;
  };
  return {
    dryRun: get("dry-run") === "true",
    offline: get("offline") === "true",
    feedId: get("feed") ? Number(get("feed")) : null,
    maxFiles: get("max-files") ? Number(get("max-files")) : (env.PC_MAX_FILES_PER_RUN ? Number(env.PC_MAX_FILES_PER_RUN) : null),
    includeUnverified: get("include-unverified") === "true",
    // Daily automated import covers ONLY chains legally obligated to report to
    // the regulator (source_kind='regulatory'). Voluntary store submissions
    // arrive via the ingest API, never via this crawler.
    regulatoryOnly: get("regulatory-only") === "true" || env.PC_REGULATORY_ONLY === "1",
    // Run feeds in parallel (bounded) to fit the Actions window. Default 3.
    concurrency: get("concurrency") ? Math.max(1, Number(get("concurrency"))) : (env.PC_CONCURRENCY ? Math.max(1, Number(env.PC_CONCURRENCY)) : 3),
    // Bypass the hash-dedup and re-parse discovered files even if their bytes
    // were imported before. Used by a one-off dispatch to self-heal existing
    // rows after a parsing fix (e.g. the cerberus city correction).
    forceReimport: get("force-reimport") === "true" || env.PC_FORCE_REIMPORT === "1",
    // Adapter allow-list. Accepts --adapters=matrix,web or --adapter=matrix, or
    // the PC_ADAPTERS env var (same comma-separated form). Used by the VPS import
    // step to run ONLY the geo-blocked chains from an Israeli IP.
    adapters: parseAdapterList(flagValue("adapters") ?? flagValue("adapter") ?? env.PC_ADAPTERS),
  };
}
