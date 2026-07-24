import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * @more30/db — the single Supabase API for the whole monorepo.
 *
 * There is ONE Supabase project for the account; systems are separated by schema,
 * not by project. This factory reads connection details from environment
 * variables by NAME only — no secret values ever live in the repo.
 *
 * Public (browser-safe) client uses the anon key. The service-role client is
 * server-only and must never be imported into browser bundles.
 */

export interface DbEnv {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

function readEnv(name: string): string | undefined {
  // Works in both Vite (import.meta.env) and Node (process.env) contexts.
  // Read `process` off globalThis so this stays browser-safe without @types/node.
  const viteEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return viteEnv?.[name] ?? proc?.env?.[name];
}

/** Browser-safe client. Reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. */
export function createBrowserClient(schema = "public"): SupabaseClient {
  const url = readEnv("VITE_SUPABASE_URL");
  const anonKey = readEnv("VITE_SUPABASE_ANON_KEY");
  if (!url || !anonKey) {
    throw new Error(
      "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Set them in the deployment secret store — never in git.",
    );
  }
  // Cast back to the default-schema client type: `schema` is a runtime string,
  // which widens the inferred SchemaName generic; the factory contract is opaque.
  return createClient(url, anonKey, { db: { schema } }) as SupabaseClient;
}

/**
 * Server-only client with the service-role key. NEVER call this from browser code.
 * Reads SUPABASE_URL (or VITE_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY.
 */
export function createServiceClient(schema = "public"): SupabaseClient {
  const url = readEnv("SUPABASE_URL") ?? readEnv("VITE_SUPABASE_URL");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Server-only; set in the deployment secret store.",
    );
  }
  return createClient(url, serviceRoleKey, {
    db: { schema },
    auth: { persistSession: false, autoRefreshToken: false },
  }) as SupabaseClient;
}

/** Convenience: a client bound to the shared `core` registry schema. */
export function createCoreClient(): SupabaseClient {
  return createBrowserClient("core");
}

export type { SupabaseClient };
