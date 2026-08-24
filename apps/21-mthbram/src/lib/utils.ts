import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// האפליקציה מוגשת תחת more30.com/mthbram (BrowserRouter basename="/mthbram"
// ב-App.tsx). window.location.origin לבדו מחזיר more30.com בלי הקידומת, ולכן
// כל קישור ציבורי/העתקה שנבנה ישירות ממנו נחת על נתיב שלא קיים. משתמש כאן
// באותו BASE_URL שה-fix ל-#201 כבר השתמש בו ב-AdminLogin.
export function getPublicOrigin(): string {
  const base = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${window.location.origin}${base}`.replace(/\/$/, "");
}

const HEBREW_MONTHS = [
  "בינואר", "בפברואר", "במרץ", "באפריל", "במאי", "ביוני",
  "ביולי", "באוגוסט", "בספטמבר", "באוקטובר", "בנובמבר", "בדצמבר",
];

// Admin-editable link fields (donation_link, lesson_download_url) are stored
// as free text with no server-side scheme validation, then rendered directly
// as a public href -- a compromised admin session could set one to
// `javascript:...` and any visitor clicking it would execute it. Same fix
// pattern as 19-igud-shiurim-portal/20-igud-portal (round 506): allow only
// http(s), render nothing for anything else.
export function safeUrl(url: string | null | undefined): string | undefined {
  return url && /^https?:\/\//i.test(url) ? url : undefined;
}

export function formatHebrewDate(dateStr: string, includeTime = false): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const month = HEBREW_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  let result = `${day} ${month} ${year}`;
  if (includeTime) {
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    result += `, ${hours}:${minutes}`;
  }
  return result;
}
