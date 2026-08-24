import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** window.location.origin has no path prefix; this app is served under the
 * "/galil" base (see vite.config.ts `base` + App.tsx `BrowserRouter
 * basename="/galil"`), so share/portal links built from origin alone land
 * on a 404. Same fix as 21-mthbram (round 429) / 27-bkalut-price (round 428). */
export function getPublicOrigin(): string {
  const base = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${window.location.origin}${base}`.replace(/\/$/, "");
}

// donation_link is admin-editable free text with no server-side scheme
// validation, rendered directly as a public href -- a compromised admin
// session could set it to `javascript:...` and any visitor clicking it
// would execute it. Same fix pattern as 19-igud-shiurim-portal/20-igud-portal
// (round 506) / 21-mthbram (round 507): allow only http(s).
export function safeUrl(url: string | null | undefined): string | undefined {
  return url && /^https?:\/\//i.test(url) ? url : undefined;
}
