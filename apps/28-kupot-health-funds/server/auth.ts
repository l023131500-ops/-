import crypto from "node:crypto";
import type { Request, Response } from "express";
import { hitRateLimit, clientIp } from "./rate-limit";

// ---------------------------------------------------------------------------
// כניסת ניהול ל-/api/switch-leads מבוססת עוגייה, בנוסף (לא במקום) לכותרת
// x-admin-token הקיימת. אין סוד חדש: אותו ADMIN_TOKEN הקיים משמש גם כסיסמת
// הכניסה וגם כערך העוגייה — כך שהמשתמש מקליד אותו פעם אחת ולא צריך curl/Postman.
// ---------------------------------------------------------------------------

const COOKIE_NAME = "kupot_admin_token";
const COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 שעות

// עד כה handleAdminLogin השווה סיסמה מול ADMIN_TOKEN ללא שום תקרת ניסיונות —
// בניגוד ל-/api/agent שכבר מוגן ב-hitRateLimit (ר' rate-limit.ts). כתובת אחת
// יכולה הייתה לנחש ללא הגבלה. אותו דפוס הגנה בדיוק, מוחל כאן על ניסיונות כושלים.
const ADMIN_LOGIN_RATE_LIMIT_PER_HOUR = 20;

function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function readCookie(req: Request, name: string): string | undefined {
  const raw = req.header("cookie");
  if (!raw) return undefined;
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return undefined;
}

/** true אם הבקשה מוכרת כניהול — דרך הדר x-admin-token (כפי שהיה) או עוגיית כניסה חדשה. */
export function isAdminRequest(req: Request): boolean {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return false;
  const headerToken = req.header("x-admin-token");
  if (headerToken && timingSafeEqualStr(headerToken, adminToken)) return true;
  const cookieToken = readCookie(req, COOKIE_NAME);
  if (cookieToken && timingSafeEqualStr(cookieToken, adminToken)) return true;
  return false;
}

export function handleAdminLogin(req: Request, res: Response) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    return res.status(503).json({ error: "כניסת ניהול אינה מוגדרת בסביבה זו" });
  }
  const password = String(req.body?.password || "");
  if (!password || !timingSafeEqualStr(password, adminToken)) {
    if (hitRateLimit(`admin-login:${clientIp(req)}`, ADMIN_LOGIN_RATE_LIMIT_PER_HOUR)) {
      return res.status(429).json({ error: "יותר מדי ניסיונות התחברות. נא לנסות שוב בעוד שעה." });
    }
    return res.status(401).json({ error: "סיסמה שגויה" });
  }
  res.cookie(COOKIE_NAME, adminToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: COOKIE_MAX_AGE_MS,
    path: "/",
  });
  res.json({ ok: true });
}

export function handleAdminLogout(_req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ ok: true });
}
