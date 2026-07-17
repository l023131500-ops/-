import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * @more30/auth — single sign-in for the whole platform.
 *
 * All systems authenticate against the SAME Supabase Auth (one project), so a
 * session obtained in one app is valid across the portal and every app that
 * shares this domain/cookie scope. This module is a thin, connection-preserving
 * wrapper — it does not create new auth providers or keys.
 */

export interface SessionUser {
  id: string;
  email: string | null;
  roles: string[];
}

/** Current signed-in user (or null). Roles are read from user metadata. */
export async function getSessionUser(client: SupabaseClient): Promise<SessionUser | null> {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  const meta = (data.user.app_metadata ?? {}) as { roles?: string[] };
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    roles: meta.roles ?? [],
  };
}

export async function signInWithEmail(client: SupabaseClient, email: string, password: string) {
  return client.auth.signInWithPassword({ email, password });
}

export async function signOut(client: SupabaseClient) {
  return client.auth.signOut();
}

export function hasRole(user: SessionUser | null, role: string): boolean {
  return !!user && user.roles.includes(role);
}

/** Admin gate — used by admin/ to guard the registry views. */
export function isPlatformAdmin(user: SessionUser | null): boolean {
  return hasRole(user, "platform_admin") || hasRole(user, "super_admin");
}
