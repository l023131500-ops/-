import { NextResponse } from "next/server";
import { createSupabaseService } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST /api/notifications/send-email
// body: { to, subject, body, type? }
// Uses Resend if RESEND_API_KEY is set, else falls back to logging only.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.to || !body?.subject) {
    return NextResponse.json({ error: "missing to/subject" }, { status: 400 });
  }

  const RESEND_KEY = process.env.RESEND_API_KEY;
  // Default to Resend's verified domain so emails work out-of-the-box without domain setup.
  // Override via NOTIFICATIONS_FROM env var once igud-hashiurim.co.il is verified on Resend.
  const FROM = process.env.NOTIFICATIONS_FROM || "Igud HaShiurim <onboarding@resend.dev>";

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"><title>${escapeHtml(body.subject)}</title></head>
<body style="font-family: Arial, sans-serif; background:#f7f7f7; padding:20px;">
  <div style="max-width:600px; margin:0 auto; background:white; padding:24px; border-radius:8px;">
    <h2 style="color:#1e3a5f; margin-top:0;">${escapeHtml(body.subject)}</h2>
    <div style="line-height:1.6; color:#333; white-space:pre-wrap;">${escapeHtml(body.body || "")}</div>
    <hr style="border:none; border-top:1px solid #eee; margin:24px 0;">
    <p style="font-size:12px; color:#888;">איגוד השיעורים — מערכת מודעות AI ותמלולים</p>
  </div>
</body>
</html>`;

  let sent = false;
  let providerError: string | null = null;

  if (RESEND_KEY) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM,
          to: [body.to],
          subject: body.subject,
          html,
        }),
      });
      sent = r.ok;
      if (!r.ok) {
        providerError = await r.text().catch(() => `${r.status}`);
      }
    } catch (e) {
      providerError = String(e);
    }
  }

  // Log all email attempts
  try {
    const svc = createSupabaseService();
    await svc.from("ad_audit_log").insert({
      action: "email_sent",
      entity_type: "notification",
      entity_id: null,
      actor_email: body.to,
      details: { subject: body.subject, type: body.type || null, sent, provider_error: providerError },
    });
  } catch {}

  return NextResponse.json({ ok: sent, error: providerError });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
