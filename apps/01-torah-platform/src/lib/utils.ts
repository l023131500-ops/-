import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatILS(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);
}

export function formatHebrewDate(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
}

// Returns the browser's local calendar date (YYYY-MM-DD), not UTC.
// `new Date().toISOString()` is always UTC, so in timezones ahead of UTC
// (e.g. Israel, UTC+2/+3) it returns *yesterday's* date for the first
// hours of every local day — any "today" comparison/bucketing built on it
// silently lands on the wrong date during that window.
export function localDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
