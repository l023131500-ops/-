import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client bound to the app's dedicated `chatzor` schema on the shared
 * hub project. Returns `null` when env vars are absent (e.g. local Phase-1
 * preview) so the UI can fall back to seed content instead of crashing.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const schema = (import.meta.env.VITE_SUPABASE_SCHEMA as string | undefined) ?? "chatzor";

export const supabase =
  url && anonKey ? createClient(url, anonKey, { db: { schema } }) : null;

export const isSupabaseConfigured = supabase !== null;
