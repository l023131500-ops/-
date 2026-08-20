/**
 * Returns the canonical public site URL for sharing/invite links.
 * Avoids using the Lovable editor origin (lovable.dev) which would break
 * invite links by redirecting to the Lovable login page.
 */
export const PUBLIC_SITE_URL = "https://egod.lovable.app";

const isInternalHost = (host: string) =>
  host.includes("lovable.dev") ||
  host.endsWith(".lovableproject.com") ||
  host.startsWith("id-preview--") ||
  host.startsWith("preview--") ||
  host.includes("sandbox.lovable.dev") ||
  host === "localhost" ||
  host.startsWith("127.0.0.1") ||
  host.startsWith("192.168.");

export const getPublicSiteUrl = (): string => {
  if (typeof window === "undefined") return PUBLIC_SITE_URL;
  const host = window.location.hostname;
  // Only use the current origin when running on the actual published site
  // (or a connected custom domain). Otherwise force the canonical public URL.
  if (isInternalHost(host)) return PUBLIC_SITE_URL;
  return window.location.origin || PUBLIC_SITE_URL;
};

// Same as getPublicSiteUrl(), but includes the app's mount path (e.g. "/egod"
// when served from more30.com/egod). Routes are registered relative to that
// basename (see App.tsx's BrowserRouter), so links generated for the current
// custom-domain deployment need the prefix or they resolve to a different app
// entirely at the site root.
export const getPublicAppUrl = (): string =>
  `${getPublicSiteUrl()}${import.meta.env.BASE_URL.replace(/\/+$/, "")}`;

export const buildInviteUrl = (code?: string, email?: string): string => {
  const base = `${getPublicAppUrl()}/invite`;
  if (!code && !email) return base;
  const params = new URLSearchParams();
  if (code) params.set("code", code);
  if (email) params.set("email", email);
  return `${base}?${params.toString()}`;
};

export const buildRabbiUrl = (token: string): string =>
  `${getPublicAppUrl()}/rabbi/${token}`;

/**
 * Replace any preview/internal Lovable host inside an arbitrary text block
 * (e.g. an invite message about to be copied to clipboard) with the canonical
 * public site URL. Safe to call on any string.
 */
export const sanitizePublicUrls = (text: string): string => {
  return text
    .replace(/https?:\/\/[a-z0-9-]*id-preview--[^\s"')]+/gi, (m) => {
      try {
        const u = new URL(m);
        return `${PUBLIC_SITE_URL}${u.pathname}${u.search}${u.hash}`;
      } catch { return PUBLIC_SITE_URL; }
    })
    .replace(/https?:\/\/[a-z0-9-]*preview--[^\s"')]+/gi, (m) => {
      try {
        const u = new URL(m);
        return `${PUBLIC_SITE_URL}${u.pathname}${u.search}${u.hash}`;
      } catch { return PUBLIC_SITE_URL; }
    })
    .replace(/https?:\/\/[^\s"')]*\.lovableproject\.com[^\s"')]*/gi, (m) => {
      try {
        const u = new URL(m);
        return `${PUBLIC_SITE_URL}${u.pathname}${u.search}${u.hash}`;
      } catch { return PUBLIC_SITE_URL; }
    });
};