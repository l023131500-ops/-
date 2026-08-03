import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { resolveTenantFromUrl, loadTenant, normalizeTenant, TenantData } from "@/lib/tenant";

interface TenantContextValue {
  tenant: TenantData | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  loading: true,
  error: null,
  reload: async () => {},
});

/**
 * The tenant, if it was baked into the HTML at build time by
 * scripts/prerender-spa.mjs.
 *
 * Every visible string above the fold — the site name in the h1, the tagline,
 * the nav — comes from this one object, and until it arrived the whole public
 * site rendered a spinner. That put the LCP element behind a network round trip
 * for every first-time visitor, which is the single reason /torah could not
 * clear Lighthouse 90.
 *
 * Serialising just this object (not the whole react-query cache) is what lets
 * the prerendered markup and the client's first render agree, so React can
 * hydrate the DOM that already painted instead of rebuilding it. Everything
 * else on the page still loads normally.
 *
 * It is read once, synchronously, during the first render — not in an effect —
 * because an effect runs after the first paint and would be too late to matter.
 */
function seededTenant(): TenantData | null {
  if (typeof window === "undefined") return null;
  const seed = (window as unknown as { __TENANT__?: unknown }).__TENANT__;
  if (!seed || typeof seed !== "object") return null;
  // The seed is a raw `tenants` row, straight from PostgREST. Normalising it
  // through the same function `loadTenant` uses is what keeps the seeded render
  // and a live load identical — anything else reintroduces the mismatch.
  try {
    return normalizeTenant(seed);
  } catch {
    return null;
  }
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const seed = seededTenant();
  const [tenant, setTenant] = useState<TenantData | null>(seed);
  // A seeded tenant means nothing is being waited for on the first paint.
  const [loading, setLoading] = useState(!seed);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    // Don't flip back to `loading` when a seed is already on screen: that would
    // replace real content with a spinner and undo the point of seeding.
    if (!seededTenant()) setLoading(true);
    setError(null);
    try {
      const res = resolveTenantFromUrl();
      const t = await loadTenant(res);
      if (!t) setError(`טננט לא נמצא (${res.slug})`);
      setTenant(t);
    } catch (e: any) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Apply branding CSS variables
  useEffect(() => {
    if (!tenant?.branding) return;
    const root = document.documentElement;
    const b = tenant.branding;

    const toHsl = (hex: string): string => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const bl = parseInt(hex.slice(5, 7), 16) / 255;
      const max = Math.max(r, g, bl), min = Math.min(r, g, bl);
      let h = 0, s = 0; const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - bl) / d + (g < bl ? 6 : 0); break;
          case g: h = (bl - r) / d + 2; break;
          case bl: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    if (b.primary_color) root.style.setProperty("--primary", toHsl(b.primary_color));
    if (b.secondary_color) root.style.setProperty("--secondary", toHsl(b.secondary_color));
    if (b.accent_color) root.style.setProperty("--accent", toHsl(b.accent_color));
    if (b.font_heading) root.style.setProperty("--font-heading", `"${b.font_heading}", serif`);
    if (b.font_body) root.style.setProperty("--font-body", `"${b.font_body}", sans-serif`);

    // Site title + favicon
    if (b.site_name) document.title = b.site_name;
    if (b.favicon_url) {
      let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
      if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
      link.href = b.favicon_url;
    }
  }, [tenant]);

  return <TenantContext.Provider value={{ tenant, loading, error, reload: load }}>{children}</TenantContext.Provider>;
}

export const useTenant = () => useContext(TenantContext);

export function useTenantFeature(feature: string): boolean {
  const { tenant } = useTenant();
  return Boolean(tenant?.features?.[feature]);
}
