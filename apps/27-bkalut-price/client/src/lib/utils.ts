import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Returns the origin of the public-facing site.
// When called from the admin subdomain (admin.*), strips the "admin." prefix
// so that public links point to the correct domain.
export function getPublicOrigin(): string {
  if (typeof window === "undefined") return "";
  const { protocol, hostname, port } = window.location;
  const publicHost = hostname.startsWith("admin.")
    ? hostname.slice("admin.".length)
    : hostname;
  return `${protocol}//${publicHost}${port ? `:${port}` : ""}`;
}
