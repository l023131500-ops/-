/**
 * @more30/secrets — the one place every system gets its keys from at runtime.
 *
 * Why zero dependencies and raw `fetch` rather than @supabase/supabase-js:
 * the 33 systems are separate Vercel projects in four different stacks with no
 * shared node_modules. A file that depends on nothing can be copied into any of
 * them — a Next route, an Express server inside a Vercel Function, a nitro
 * handler — and behave identically. Same reasoning as auth-button.js.
 *
 * SERVER SIDE ONLY. It refuses to run in a browser, because loading this in a
 * client bundle would ship the hub service-role key to every visitor.
 *
 * Bootstrap: two variables per deployment, and only two.
 *   MORE30_SECRETS_URL  — hub Supabase URL   (https://uhnrgujbdxhhmoxcjria.supabase.co)
 *   MORE30_SECRETS_KEY  — hub service_role key
 * Everything else lives in core.secrets and is fetched from there.
 */

export interface SecretsOptions {
  /** System slug, e.g. "nadlan". Scoped secrets override global ones. */
  scope?: string;
  /** Cache lifetime in ms for a warm lambda. Default 5 minutes. */
  ttlMs?: number;
  /** Skip the cache and re-fetch. */
  force?: boolean;
  /** Hub URL / key, if not supplied through the environment. */
  url?: string;
  key?: string;
}

export type SecretMap = Record<string, string>;

interface CacheEntry {
  at: number;
  secrets: SecretMap;
}

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 5 * 60 * 1000;

/** The hub project. Used to decide whether an existing service key is ours. */
const HUB_REF = "uhnrgujbdxhhmoxcjria";

function env(name: string): string | undefined {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.[name];
}

/**
 * Values written through a PowerShell pipe pick up a UTF-8 BOM, and a BOM inside
 * an API key makes header construction throw `ByteString ... 65279` at the point
 * of use — far from the cause. Strip it on the way in, once, for everything.
 */
function clean(value: string): string {
  return value.replace(/^﻿/, "").replace(/﻿/g, "").trim();
}

function assertServerSide(): void {
  const g = globalThis as { window?: unknown; document?: unknown };
  if (typeof g.window !== "undefined" && typeof g.document !== "undefined") {
    throw new Error(
      "@more30/secrets is server-only. Importing it into a browser bundle would ship the hub service-role key to every visitor.",
    );
  }
}

/**
 * Fetch the secrets for a scope: every `global` secret, with `scope`-specific
 * ones layered on top. Cached per scope for `ttlMs`.
 */
export async function loadSecrets(options: SecretsOptions = {}): Promise<SecretMap> {
  assertServerSide();

  const scope = options.scope ?? "global";
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;

  if (!options.force) {
    const hit = cache.get(scope);
    if (hit && Date.now() - hit.at < ttlMs) return hit.secrets;
  }

  const url = clean(options.url ?? env("MORE30_SECRETS_URL") ?? env("SUPABASE_URL") ?? "");

  // Several deployments already carry a hub service-role key under its older
  // name. Reuse it rather than asking for the same secret twice under a new one
  // — but only when the URL really is the hub, or we would be sending some other
  // project's key to a server that has no business seeing it.
  const isHub = url.includes(HUB_REF);
  const key = clean(
    options.key ??
      env("MORE30_SECRETS_KEY") ??
      (isHub ? env("SUPABASE_SERVICE_KEY") ?? env("SUPABASE_SERVICE_ROLE_KEY") : undefined) ??
      "",
  );

  if (!url || !key) {
    throw new Error(
      "Missing MORE30_SECRETS_URL / MORE30_SECRETS_KEY. These two are the only secrets a deployment needs; the rest come from core.secrets.",
    );
  }

  // core is not an exposed schema, so the store is read through an RPC in public
  // whose EXECUTE is granted to service_role alone.
  const response = await fetch(`${url}/rest/v1/rpc/more30_secrets_fetch`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_scope: scope === "global" ? null : scope }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`core.secrets fetch failed: ${response.status} ${detail.slice(0, 200)}`);
  }

  const rows = (await response.json()) as Array<{ name: string; scope: string; value: string }>;

  // The RPC returns global rows first, so a later scoped row overwrites it.
  const secrets: SecretMap = {};
  for (const row of rows) secrets[row.name] = clean(row.value);

  cache.set(scope, { at: Date.now(), secrets });
  return secrets;
}

/** One secret by name. Returns undefined when it is not in the store. */
export async function getSecret(
  name: string,
  options: SecretsOptions = {},
): Promise<string | undefined> {
  const secrets = await loadSecrets(options);
  return secrets[name];
}

/** One secret by name, throwing a message that names what to add and where. */
export async function requireSecret(
  name: string,
  options: SecretsOptions = {},
): Promise<string> {
  const value = await getSecret(name, options);
  if (!value) {
    throw new Error(
      `Secret "${name}" is not in core.secrets for scope "${options.scope ?? "global"}". Add it there — do not put it in code or in a per-project env var.`,
    );
  }
  return value;
}

/**
 * Copy the scope's secrets into process.env, for libraries that read
 * `process.env.OPENAI_API_KEY` at import time and cannot be handed a value.
 *
 * Existing process.env entries win by default: a deployment override stays an
 * override. Call with `{ overwrite: true }` when the store should be canonical.
 *
 * Note the ordering trap this exists to solve: a module that reads
 * `process.env.X` in a top-level const is evaluated before any handler body
 * runs, so this must be awaited in a module that is imported *first*.
 */
export async function hydrateEnv(
  options: SecretsOptions & { overwrite?: boolean } = {},
): Promise<SecretMap> {
  const secrets = await loadSecrets(options);
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  if (proc?.env) {
    for (const [name, value] of Object.entries(secrets)) {
      if (options.overwrite || !proc.env[name]) proc.env[name] = value;
    }
  }
  return secrets;
}

/** Drop the cache — for tests, or right after rotating a key. */
export function clearSecretsCache(): void {
  cache.clear();
}
