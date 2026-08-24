import crypto from "node:crypto";
import type { Request, Response } from "express";
import { hitRateLimit, clientIp } from "./rate-limit";

// ---------------------------------------------------------------------------
// כניסת ניהול מבוססת עוגייה, אותה תבנית בדיוק כמו apps/28-kupot-health-funds
// (server/auth.ts). אין סוד חדש בקוד: הסיסמה נקראת מ-STD_ADMIN_USER/
// STD_ADMIN_PASSWORD (more30-priority.md §1ב, core.secrets scope=all) —
// אותם משתני סביבה שכל מערכת אחרת עם פאנל ניהול קוראת מהם. בלי שהם מוגדרים
// בסביבת Vercel של המערכת הזו, הכניסה מחזירה 503 ולא נכשלת בשקט/בברירת מחדל.
// ---------------------------------------------------------------------------

const COOKIE_NAME = "chizukim_admin_token";
const COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 שעות

// handleAdminLogin השווה עד כה סיסמה מול STD_ADMIN_PASSWORD ללא שום תקרת
// ניסיונות — בניגוד ל-28-kupot-health-funds/server/auth.ts שכבר מגן על אותו
// endpoint בדיוק (login) עם hitRateLimit. כתובת אחת יכלה לנחש סיסמה ללא הגבלה.
// אותו דפוס הגנה בדיוק, מוחל כאן.
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

function adminPassword(): string | null {
  const pw = (process.env.STD_ADMIN_PASSWORD || "").trim();
  return pw || null;
}

/** true אם הבקשה מוכרת כניהול — עוגיית כניסה תקפה מ-/api/admin/login. */
export function isAdminRequest(req: Request): boolean {
  const pw = adminPassword();
  if (!pw) return false;
  const cookieToken = readCookie(req, COOKIE_NAME);
  return !!cookieToken && timingSafeEqualStr(cookieToken, pw);
}

export function handleAdminLogin(req: Request, res: Response) {
  const pw = adminPassword();
  if (!pw) {
    return res.status(503).json({ error: "כניסת ניהול אינה מוגדרת בסביבה זו" });
  }
  const expectedUser = (process.env.STD_ADMIN_USER || "admin").trim();
  const user = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  if (!user || !timingSafeEqualStr(user, expectedUser) || !password || !timingSafeEqualStr(password, pw)) {
    if (hitRateLimit(`admin-login:${clientIp(req)}`, ADMIN_LOGIN_RATE_LIMIT_PER_HOUR)) {
      return res.status(429).json({ error: "יותר מדי ניסיונות התחברות. נא לנסות שוב בעוד שעה." });
    }
    return res.status(401).json({ error: "שם משתמש או סיסמה שגויים" });
  }
  res.cookie(COOKIE_NAME, pw, {
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
