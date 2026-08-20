import { supabase } from "@/integrations/supabase/client";

// Attaches the current session's bearer token to a plain fetch() call, matching
// the pattern auth-attacher.ts already uses for TanStack serverFn RPCs — needed
// separately here because /api/public/* is called via raw fetch(), not a serverFn.
export async function authedFetch(input: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers);
  if (token) headers.set("authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
