import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Returns the origin of the public-facing site, including any path-mount
// prefix (e.g. "/mechiron" when deployed at more30.com/mechiron). Plain
// window.location.origin never carries that prefix, so links built from it
// alone land on the wrong app at the bare domain root once the hash after
// "#" is stripped by the browser on click.
// When called from the admin subdomain (admin.*), strips the "admin." prefix
// so that public links point to the correct domain.
export function getPublicOrigin(): string {
  if (typeof window === "undefined") return "";
  const { protocol, hostname, port, pathname } = window.location;
  const publicHost = hostname.startsWith("admin.")
    ? hostname.slice("admin.".length)
    : hostname;
  const basePath = pathname.replace(/\/$/, "");
  return `${protocol}//${publicHost}${port ? `:${port}` : ""}${basePath}`;
}
