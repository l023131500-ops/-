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
