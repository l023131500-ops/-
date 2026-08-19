const PENDING_OAUTH_NEXT_KEY = "pending-oauth-next";
const AUTH_CALLBACK_PATH = "/auth/callback";

export function sanitizeAuthNextPath(nextPath?: string | null) {
  if (!nextPath) return null;
  return nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : null;
}

export function buildOAuthRedirectUrl(nextPath?: string) {
  const safeNext = sanitizeAuthNextPath(nextPath);

  if (typeof window !== "undefined") {
    if (safeNext) {
      window.sessionStorage.setItem(PENDING_OAUTH_NEXT_KEY, safeNext);
    } else {
      window.sessionStorage.removeItem(PENDING_OAUTH_NEXT_KEY);
    }
  }

  const redirectUrl = new URL(AUTH_CALLBACK_PATH, window.location.origin);
  if (safeNext) {
    redirectUrl.searchParams.set("next", safeNext);
  }

  return redirectUrl.toString();
}

export function consumeStoredOAuthNextPath() {
  if (typeof window === "undefined") return null;

  const storedNext = sanitizeAuthNextPath(window.sessionStorage.getItem(PENDING_OAUTH_NEXT_KEY));
  window.sessionStorage.removeItem(PENDING_OAUTH_NEXT_KEY);
  return storedNext;
}