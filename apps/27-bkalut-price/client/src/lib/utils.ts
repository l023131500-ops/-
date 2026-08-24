import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Only allow http(s) URLs through to an href/src attribute. Blocks
// javascript:/data:/vbscript: URIs that could be typed into an
// admin-editable free-text URL field and rendered on a page.
export function safeUrl(url: string | null | undefined): string | undefined {
  return url && /^https?:\/\//i.test(url) ? url : undefined;
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

// Formats a Date as YYYY-MM-DD in the browser's local timezone. Unlike
// d.toISOString().slice(0, 10) (which converts to UTC first), this doesn't
// roll the date back a day for users east of UTC (e.g. Israel, UTC+2/+3)
// during the early-morning hours when local and UTC dates differ.
export function localDateStr(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
