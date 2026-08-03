// ============================================================================
// tenant.ts — זיהוי טננט מה-URL הנוכחי.
// סדר עדיפויות:
//   1. Custom domain (host !== production hosts) → lookup tenants.custom_domain
//   2. Path prefix /t/<slug> או /portal/<slug>
//   3. Subdomain (mc-galil.torah-platform.com)
//   4. ברירת מחדל — איגוד השיעורים (slug = 'igud')
// ============================================================================

import { supabase } from "@/integrations/supabase/client";

export interface TenantResolution {
  slug: string;
  source: "custom_domain" | "path" | "subdomain" | "default";
  pathPrefix: string; // לדוגמה: "/t/mc-galil" או ""
}

const MAIN_HOSTS = new Set([
  "torah-platform.com",
  "www.torah-platform.com",
  "more30.com",
  "www.more30.com",
  "egod.lovable.app",
  "localhost",
]);

/** The path the app is mounted at, without the trailing slash: "" at the site
 *  root, "/torah" when it is served from more30.com/torah. Vite substitutes
 *  BASE_URL at build time from the --base flag. */
const BASE = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");

/** window.location.pathname with the mount path removed, so the route patterns
 *  below stay written from the app's own root. */
function appPath(): string {
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  if (BASE && (path === BASE || path.startsWith(BASE + "/"))) return path.slice(BASE.length) || "/";
  return path;
}

export function resolveTenantFromUrl(): TenantResolution {
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const path = appPath();

  // 1. Custom domain — but preview hosts fall back to the default tenant.
  const isPreviewHost =
    host.endsWith(".vercel.app") ||
    host.endsWith(".pplx.app") ||
    host.endsWith(".lovable.app") ||
    host.endsWith(".lovable.dev");
  if (host && !MAIN_HOSTS.has(host) && !isPreviewHost) {
    return { slug: "__custom_domain__", source: "custom_domain", pathPrefix: "" };
  }

  // 2. Path prefix /t/<slug>, relative to wherever the app is mounted.
  const m = path.match(/^\/t\/([a-z0-9-]+)/i);
  if (m) return { slug: m[1], source: "path", pathPrefix: `${BASE}/t/${m[1]}` };

  // 3. Subdomain (mc-galil.torah-platform.com)
  if (host) {
    const parts = host.split(".");
    if (parts.length >= 3 && (host.endsWith(".torah-platform.com") || host.endsWith(".lovable.app"))) {
      return { slug: parts[0], source: "subdomain", pathPrefix: "" };
    }
  }

  return { slug: "igud", source: "default", pathPrefix: "" };
}

/** The tenant every page falls back to when nothing more specific applies. */
export const DEFAULT_TENANT_SLUG = "igud";

export interface TenantData {
  id: string;
  slug: string;
  type: string;
  name: string;
  display_name: string | null;
  status: string;
  custom_domain: string | null;
  branding: TenantBranding | null;
  features: TenantFeatures | null;
}

export interface TenantBranding {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  font_heading: string;
  font_body: string;
  background_style: string;
  background_image_url: string | null;
  animations_enabled: boolean;
  logo_url: string | null;
  favicon_url: string | null;
  hero_image_url: string | null;
  site_name: string | null;
  site_tagline: string | null;
  footer_text: string;
  show_union_footer: boolean;
  social_links: Record<string, string>;
}

export interface TenantFeatures {
  public_site: boolean;
  member_portal: boolean;
  forums: boolean;
  leads_inbox: boolean;
  lessons: boolean;
  study_schedule: boolean;
  prayer_times: boolean;
  zmanim: boolean;
  halacha_daily: boolean;
  ask_rabbi: boolean;
  kashrut: boolean;
  mourning_guide: boolean;
  mikvaot: boolean;
  community_services: boolean;
  newsletter: boolean;
  ad_banners: boolean;
  participants: boolean;
  materials_upload: boolean;
  png_export: boolean;
  matching_available: boolean;
  bulk_lesson_upload: boolean;
  ivr_builder: boolean;
  lesson_directory: boolean;
  donations: boolean;
  recurring_donations: boolean;
  shop: boolean;
  dedications: boolean;
  ai_matching: boolean;
  [key: string]: any;
}

async function fetchTenant(by: "custom_domain" | "slug", value: string) {
  const { data, error } = await supabase
    .from("tenants")
    .select(`
      id, slug, type, name, display_name, status, custom_domain,
      tenant_branding ( * ),
      tenant_features ( * )
    `)
    .eq(by, value)
    .maybeSingle();
  return error ? null : data;
}

export async function loadTenant(resolution: TenantResolution): Promise<TenantData | null> {
  let data =
    resolution.source === "custom_domain"
      ? await fetchTenant("custom_domain", window.location.hostname)
      : await fetchTenant("slug", resolution.slug);

  // An unrecognised host used to leave `tenant` null, and because every page
  // gates its queries on `tenant?.id`, the whole site rendered empty with only
  // a "טננט לא נמצא" string to go on. A host we have no row for is far more
  // likely to be a new address for the union itself than a broken deployment,
  // so fall back to the union rather than serving nothing.
  if (!data && resolution.slug !== DEFAULT_TENANT_SLUG) {
    data = await fetchTenant("slug", DEFAULT_TENANT_SLUG);
  }
  if (!data) return null;

  return normalizeTenant(data);
}

/**
 * Turn a raw `tenants` row into the shape the app consumes.
 *
 * Exported because the build-time prerender seeds this object into the HTML
 * (scripts/prerender-spa.mjs --seed-url), and it fetches the row straight from
 * PostgREST rather than going through `loadTenant`. Sharing the normaliser is
 * what guarantees the seeded value and a live load are byte-identical — if they
 * diverged, React would see a hydration mismatch and throw away the prerendered
 * DOM, which is the entire thing the seed exists to prevent.
 *
 * The embedded relations arrive as an array from PostgREST and as an object
 * from the JS client depending on the query, hence the Array check on both.
 */
export function normalizeTenant(data: any): TenantData {
  return {
    id: data.id,
    slug: data.slug,
    type: data.type,
    name: data.name,
    display_name: data.display_name,
    status: data.status,
    custom_domain: data.custom_domain,
    branding: Array.isArray(data.tenant_branding) ? data.tenant_branding[0] : data.tenant_branding,
    features: Array.isArray(data.tenant_features) ? data.tenant_features[0] : data.tenant_features,
  };
}
