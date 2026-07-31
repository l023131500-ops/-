import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client bound to the app's dedicated `chatzor` schema on the shared
 * hub project. Returns `null` when env vars are absent (e.g. local Phase-1
 * preview) so the UI can fall back to seed content instead of crashing.
 *
 * `storageKey` is the platform-wide key on purpose. All 33 more30 systems are
 * served from more30.com — one origin — so a single key means signing in once
 * at more30.com/login signs you in here too. With the supabase-js default
 * (derived from the project ref) this app kept a session of its own, and a
 * signed-in visitor still landed on this app's own login form.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const schema = (import.meta.env.VITE_SUPABASE_SCHEMA as string | undefined) ?? "chatzor";

const authOptions = {
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
  storageKey: "more30-auth",
} as const;

export const supabase =
  url && anonKey ? createClient(url, anonKey, { db: { schema }, auth: authOptions }) : null;

/**
 * Same session, `public` schema — that is where the platform-wide permission
 * RPC lives (`more30_app_access`). PostgREST exposes one schema per client,
 * so the gate needs its own handle rather than a second sign-in.
 */
export const hub =
  url && anonKey ? createClient(url, anonKey, { db: { schema: "public" }, auth: authOptions }) : null;

export const isSupabaseConfigured = supabase !== null;

/** The key this system is known by across the platform (core.projects.path). */
export const APP_KEY = "chatzor";
