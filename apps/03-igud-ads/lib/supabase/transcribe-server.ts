import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from "./env";

const ANON_KEY = SUPABASE_ANON_KEY;

// SSR client על schema=transcribe
export function createTranscribeServer() {
  const cookieStore = cookies();
  return createServerClient(SUPABASE_URL, ANON_KEY, {
    cookies: {
      get(name: string) { return cookieStore.get(name)?.value; },
      set(name: string, value: string, options: CookieOptions) {
        try { cookieStore.set({ name, value, ...options }); } catch {}
      },
      remove(name: string, options: CookieOptions) {
        try { cookieStore.set({ name, value: "", ...options }); } catch {}
      }
    },
    // schema 'transcribe' is now exposed via public views (coupon_codes, uploads, etc.)
  });
}

// Service-role על public views של transcribe (bypass RLS)
export function createTranscribeService() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    // schema 'transcribe' is now exposed via public views (coupon_codes, uploads, etc.)
  });
}

// Service-role raw (ללא schema lock) — לקריאה ל-auth.users, storage, או schemas אחרים
export function createSupabaseServiceRaw() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
