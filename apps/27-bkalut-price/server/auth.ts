import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { storage } from "./storage";
import type { AdminSession } from "@shared/schema";

/**
 * Admin authentication for the bkalut backend.
 *
 * Credentials are env-driven so secrets are never committed to source:
 *   BKALUT_ADMIN_EMAIL     primary identity (default: l023131500@gmail.com)
 *   BKALUT_ADMIN_PHONE     optional secondary identity (default: 023131500)
 *   BKALUT_ADMIN_PASSWORD  plain password — preview only (default: eueu1234)
 *   BKALUT_ADMIN_PASSWORD_SHA256  preferred for production: hex SHA-256 digest
 *
 * If BKALUT_ADMIN_PASSWORD_SHA256 is set it takes precedence and the plain
 * BKALUT_ADMIN_PASSWORD env var is ignored. Production deployments should set
 * only the SHA-256 digest.
 */
// SECURITY: no hardcoded default identity/password. Both must be supplied via
// environment variables. If they are not set, admin login is disabled rather
// than falling back to a publicly-known default (previously "eueu1234").
const ADMIN_EMAIL = (process.env.BKALUT_ADMIN_EMAIL || "").trim().toLowerCase();
const ADMIN_PHONE = normalizePhone(process.env.BKALUT_ADMIN_PHONE || "");

const ADMIN_PASSWORD_PLAIN = process.env.BKALUT_ADMIN_PASSWORD ?? "";
const ADMIN_PASSWORD_HASH = (process.env.BKALUT_ADMIN_PASSWORD_SHA256 || "").trim().toLowerCase();

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function verifyPassword(submitted: string): boolean {
  if (!submitted) return false;
  const submittedHash = sha256Hex(submitted);
  if (ADMIN_PASSWORD_HASH) {
    return timingSafeEqualHex(submittedHash, ADMIN_PASSWORD_HASH);
  }
  if (!ADMIN_PASSWORD_PLAIN) return false;
  return timingSafeEqualHex(submittedHash, sha256Hex(ADMIN_PASSWORD_PLAIN));
}

export interface AuthedRequest extends Request {
  adminSession?: AdminSession;
}

export function normalizePhone(raw: string): string {
  return String(raw || "").replace(/[^\d]/g, "");
}

/**
 * Verify admin credentials. `password` is the plain password from the login
 * form. The wire-level parameter name is kept as `code` for backwards
 * compatibility with existing clients.
 */
export async function loginAdmin(identityRaw: string, password: string) {
  // SECURITY: if no admin identity/credential has been configured via env
  // vars, refuse all logins instead of falling back to a hardcoded default.
  if (!ADMIN_EMAIL || (!ADMIN_PASSWORD_HASH && !ADMIN_PASSWORD_PLAIN)) {
    return { ok: false as const, reason: "התחברות אדמין אינה מוגדרת בסביבה זו" };
  }
  const identity = String(identityRaw || "").trim();
  const lowered = identity.toLowerCase();
  const normPhone = normalizePhone(identity);
  const identityMatches =
    lowered === ADMIN_EMAIL ||
    (ADMIN_PHONE.length > 0 && normPhone === ADMIN_PHONE);
  if (!identityMatches) {
    return { ok: false as const, reason: "פרטי כניסה לא מוכרים" };
  }
  if (!verifyPassword(String(password || ""))) {
    return { ok: false as const, reason: "סיסמה שגויה" };
  }
  const display = lowered === ADMIN_EMAIL ? ADMIN_EMAIL : ADMIN_PHONE;
  const session = await storage.createAdminSession(display, "admin");
  return { ok: true as const, session };
}

export async function getSessionFromRequest(req: Request) {
  const header = req.header("authorization");
  if (!header) return undefined;
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return undefined;
  return storage.getAdminSession(match[1]);
}

export async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    res.status(401).json({ message: "נדרשת התחברות אדמין" });
    return;
  }
  req.adminSession = session;
  next();
}

// SECURITY: this object is served by a public, unauthenticated endpoint
// (`/api/admin/login-hints`). It must never leak the actual configured
// admin email/phone/identity — only generic instructional copy.
export const ADMIN_LOGIN_HINTS = {
  // Generic copy — never expose the actual password or hash.
  codeHint:
    "התחברות עם דוא\"ל וסיסמה שהוגדרו במשתני הסביבה BKALUT_ADMIN_EMAIL / BKALUT_ADMIN_PASSWORD. בייצור מומלץ להפעיל גם MFA.",
};
