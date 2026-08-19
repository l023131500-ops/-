// ============================================================================
// site.ts — מבטיח שכל קישור ציבורי משתמש בדומיין הציבורי הנכון,
// לא ב-preview/lovable.dev. גם תומך ב-Tenant Custom Domains.
// ============================================================================

const PRODUCTION_HOSTS = new Set([
  "torah-platform.com",
  "www.torah-platform.com",
  "egod.lovable.app",
]);

const INTERNAL_PATTERNS = [/\.lovable\.app$/, /\.lovable\.dev$/, /^localhost$/, /^127\.0\.0\.1$/];

export function isInternalHost(host: string): boolean {
  return INTERNAL_PATTERNS.some((re) => re.test(host));
}

export function siteOrigin(): string {
  if (typeof window === "undefined") return import.meta.env.VITE_SITE_URL || "https://torah-platform.com";
  const { protocol, host } = window.location;
  if (PRODUCTION_HOSTS.has(host)) return `${protocol}//${host}`;
  // Custom tenant domain
  if (!isInternalHost(host)) return `${protocol}//${host}`;
  return import.meta.env.VITE_SITE_URL || `${protocol}//${host}`;
}

export function buildPublicUrl(path: string): string {
  const origin = siteOrigin();
  return `${origin}${path.startsWith("/") ? path : "/" + path}`;
}

export function sanitizePublicUrl(url: string): string {
  try {
    const u = new URL(url);
    if (isInternalHost(u.host) && import.meta.env.VITE_SITE_URL) {
      const site = new URL(import.meta.env.VITE_SITE_URL);
      u.host = site.host;
      u.protocol = site.protocol;
    }
    return u.toString();
  } catch {
    return url;
  }
}

/** Build a tenant-aware public URL.
 *  - If `customDomain` exists, the path is relative to that.
 *  - Otherwise it's prefixed with /t/<slug>.
 */
export function tenantPublicUrl(opts: { slug: string; customDomain?: string | null; path?: string }): string {
  const path = opts.path || "/";
  if (opts.customDomain) {
    return `https://${opts.customDomain}${path}`;
  }
  return buildPublicUrl(`/t/${opts.slug}${path === "/" ? "" : path}`);
}

// ---------------------------------------------------------------------------
// Guru-Portal-Expansion helpers
// ---------------------------------------------------------------------------
export const buildRabbiUrl = (token: string): string =>
  `${siteOrigin()}/rabbi/${token}`;

export const buildInviteUrl = (code?: string, email?: string): string => {
  const base = `${siteOrigin()}/invite`;
  if (!code && !email) return base;
  const params = new URLSearchParams();
  if (code) params.set("code", code);
  if (email) params.set("email", email);
  return `${base}?${params.toString()}`;
};

export const sanitizePublicUrls = (text: string): string => text;

// Compatibility export for Guru-Portal-Expansion pages
// Used to build shareable links. The vercel.app fallback produced addresses the
// audience's content filter blocks; the site's real public address is under
// more30.com. VITE_SITE_URL still wins when set.
export const PUBLIC_SITE_URL = import.meta.env.VITE_SITE_URL || "https://more30.com/torah";
