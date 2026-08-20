/**
 * Google OAuth admin login (configuration-ready).
 *
 * Behavior:
 *   - If GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_CALLBACK_URL are
 *     all set in env, the routes perform a real Google OAuth 2.0 flow,
 *     verify the returned id_token (without external deps — we hit Google's
 *     tokeninfo endpoint), and create an admin session for an allow-listed
 *     email.
 *   - If any of those env vars is missing, the routes return
 *     { ok: false, reason: "config_missing" } with HTTP 503. No fake login
 *     ever happens.
 *
 * Allow-list:
 *   GOOGLE_ALLOWED_ADMIN_EMAILS — comma-separated. Defaults to
 *   "l023131500@gmail.com" so the current owner can sign in once envs are
 *   configured. Emails are compared case-insensitively.
 *
 * Why no `passport-google-oauth20` dependency?
 *   Keeps the build small and avoids pulling another transitive tree. The
 *   only Google call we need is /oauth2/v3/tokeninfo to verify the id_token.
 */

import type { Express, Request, Response } from "express";
import crypto from "node:crypto";
import { storage } from "./storage";

const STATE_TTL_MS = 10 * 60 * 1000;
const stateStore = new Map<string, { createdAt: number; redirect?: string }>();

function googleConfig() {
  const clientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
  const callbackUrl = (process.env.GOOGLE_CALLBACK_URL || "").trim();
  // SECURITY: no hardcoded fallback identity — require explicit configuration.
  const allowedRaw = (process.env.GOOGLE_ALLOWED_ADMIN_EMAILS || "").trim();
  const allowedAdminEmails = allowedRaw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const configured = Boolean(clientId && clientSecret && callbackUrl);
  return { clientId, clientSecret, callbackUrl, allowedAdminEmails, configured };
}

export function getGoogleAuthStatus() {
  const c = googleConfig();
  return {
    configured: c.configured,
    callbackUrl: c.callbackUrl || null,
    allowedAdminEmails: c.allowedAdminEmails,
    missing: c.configured
      ? []
      : [
          !c.clientId ? "GOOGLE_CLIENT_ID" : null,
          !c.clientSecret ? "GOOGLE_CLIENT_SECRET" : null,
          !c.callbackUrl ? "GOOGLE_CALLBACK_URL" : null,
        ].filter(Boolean),
  };
}

function cleanupExpiredStates() {
  const now = Date.now();
  const expired: string[] = [];
  stateStore.forEach((v, k) => {
    if (now - v.createdAt > STATE_TTL_MS) expired.push(k);
  });
  for (const k of expired) stateStore.delete(k);
}

export function registerGoogleAuthRoutes(app: Express) {
  // Status endpoint — UI uses this to decide whether to enable the
  // "Sign in with Google" button.
  app.get("/api/admin/google/status", (_req: Request, res: Response) => {
    res.json({ ok: true, ...getGoogleAuthStatus() });
  });

  // Step 1: redirect to Google.
  app.get("/api/admin/google/start", (req: Request, res: Response) => {
    const cfg = googleConfig();
    if (!cfg.configured) {
      return res.status(503).json({
        ok: false,
        reason: "config_missing",
        missing: getGoogleAuthStatus().missing,
      });
    }
    cleanupExpiredStates();
    const state = crypto.randomBytes(24).toString("hex");
    const redirect = String(req.query.redirect || "");
    stateStore.set(state, { createdAt: Date.now(), redirect: redirect || undefined });
    const params = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: cfg.callbackUrl,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
      access_type: "online",
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  });

  // Step 2: Google redirects back with ?code & ?state.
  app.get("/api/admin/google/callback", async (req: Request, res: Response) => {
    const cfg = googleConfig();
    if (!cfg.configured) {
      return res.status(503).json({ ok: false, reason: "config_missing" });
    }
    const code = String(req.query.code || "");
    const state = String(req.query.state || "");
    if (!code || !state || !stateStore.has(state)) {
      return res.status(400).send("invalid state");
    }
    const stateEntry = stateStore.get(state)!;
    stateStore.delete(state);

    try {
      // Exchange code for tokens.
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: cfg.clientId,
          client_secret: cfg.clientSecret,
          redirect_uri: cfg.callbackUrl,
          grant_type: "authorization_code",
        }).toString(),
      });
      if (!tokenRes.ok) {
        const text = await tokenRes.text();
        return res.status(401).send(`google token exchange failed: ${text.slice(0, 400)}`);
      }
      const tokenJson = (await tokenRes.json()) as { id_token?: string; access_token?: string };
      const idToken = tokenJson.id_token;
      if (!idToken) {
        return res.status(401).send("no id_token in google response");
      }

      // Verify id_token via Google tokeninfo.
      const verifyRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
      );
      if (!verifyRes.ok) {
        return res.status(401).send("id_token verification failed");
      }
      const verified = (await verifyRes.json()) as {
        aud?: string;
        email?: string;
        email_verified?: string | boolean;
      };
      if (verified.aud !== cfg.clientId) {
        return res.status(401).send("id_token audience mismatch");
      }
      const email = String(verified.email || "").toLowerCase();
      const verifiedFlag = String(verified.email_verified ?? "").toLowerCase();
      if (!email || (verifiedFlag !== "true" && verifiedFlag !== "1")) {
        return res.status(401).send("email not verified by google");
      }
      if (!cfg.allowedAdminEmails.includes(email)) {
        return res
          .status(403)
          .send(`email ${email} is not on the admin allow-list`);
      }

      const session = await storage.createAdminSession(email, "admin");

      // Hand the admin token back to the SPA. The router uses hash routing
      // (wouter useHashLocation), so we land at /#/login?google_token=...
      // The admin-login page picks the token up on mount and hands it to
      // the AdminAuth provider, then strips the query and navigates home.
      const target = stateEntry.redirect && stateEntry.redirect.startsWith("/") && !stateEntry.redirect.startsWith("//")
        ? stateEntry.redirect
        : "/";
      const tokenQ = encodeURIComponent(session.token);
      const targetQ = encodeURIComponent(target);
      res.redirect(`/#/login?google_token=${tokenQ}&redirect=${targetQ}`);
    } catch (err: any) {
      res.status(500).send(`google callback error: ${err?.message ?? "unknown"}`);
    }
  });
}
