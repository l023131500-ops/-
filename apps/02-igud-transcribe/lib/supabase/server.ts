import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// SSR client — לקריאת session ועבודה כמשתמש המחובר
export function createSupabaseServer() {
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
    db: { schema: "transcribe" }
  });
}

// Service-role client — bypass RLS, לעבודה בשרת בלבד
import { createClient } from "@supabase/supabase-js";
export function createSupabaseService() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: "transcribe" }
  });
}

// Service client על schema אחר (לדוגמה Storage או auth.users)
export function createSupabaseServiceRaw() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
