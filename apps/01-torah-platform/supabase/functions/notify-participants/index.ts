// ============================================================================
// Edge Function: notify-participants
// שולח הודעה (מייל/וואטסאפ) לכל המשתתפים הפעילים של שיעור נתון.
// README (torah-platform) כבר תיעד את הפונקציה הזו בעץ הקבצים המתוכנן, אבל
// היא מעולם לא נבנתה בפועל — audit_gaps #01: "התראות למשתתפים (מייל/ווטסאפ)
// — הערך שמצדיק תשלום חודשי".
//
// אימות: מפעיל קליינט Supabase עם ה-JWT של הקורא עצמו (לא service role) כך
// ש-RLS הרגיל של lessons/participants/notifications_log חל בדיוק כמו בכל
// שאילתה אחרת מהפורטל — אין כאן לוגיקת-הרשאות כפולה.
//
// מצב טסט: אם RESEND_API_KEY לא מוגדר כ-secret (המצב היום — core.missing_tokens),
// כל הודעת מייל נרשמת ב-notifications_log בסטטוס 'simulated' ולא נשלחת בפועל.
// וואטסאפ אין לו API מחובר בכלל — כל הודעת וואטסאפ תמיד 'simulated' ומייצרת
// קישור wa.me מוכן ללחיצה עבור מנהל הטננט (שליחה ידנית אמיתית, לא מדומה).
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jr = (b: any, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const RESEND_API = "https://api.resend.com/emails";

// Israeli-style local numbers ("050-1234567") -> E.164-ish digits for wa.me.
// Already-international numbers (start with a non-0 country code) pass through.
function waLink(rawPhone: string, text: string) {
  const digits = rawPhone.replace(/\D/g, "");
  const intl = digits.startsWith("0") ? "972" + digits.slice(1) : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jr({ ok: false, error: "method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jr({ ok: false, error: "אין הרשאה" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userResp } = await supabase.auth.getUser();
    if (!userResp?.user) return jr({ ok: false, error: "טוקן לא תקף" }, 401);

    const body = await req.json();
    const { lesson_id, subject, message, channel } = body;
    if (!lesson_id || !message?.trim()) return jr({ ok: false, error: "חסר lesson_id או תוכן הודעה" }, 400);

    const wantEmail = channel === "email" || channel === "both" || !channel;
    const wantWhatsapp = channel === "whatsapp" || channel === "both";
    if (!wantEmail && !wantWhatsapp) return jr({ ok: false, error: "ערוץ לא תקין" }, 400);

    // RLS-scoped: only resolves if the caller can actually read this lesson
    // (tenant member / super admin) — same gate as the portal UI itself.
    const { data: lesson, error: lessonErr } = await supabase
      .from("lessons").select("id, title, tenant_id").eq("id", lesson_id).maybeSingle();
    if (lessonErr || !lesson) return jr({ ok: false, error: "השיעור לא נמצא או שאין הרשאה" }, 404);

    const { data: participants, error: partErr } = await supabase
      .from("participants")
      .select("id, full_name, email, whatsapp")
      .eq("lesson_id", lesson_id)
      .eq("is_active", true);
    if (partErr) return jr({ ok: false, error: partErr.message }, 500);

    const targets = (participants ?? []).filter((p: any) =>
      (wantEmail && p.email) || (wantWhatsapp && p.whatsapp)
    );
    if (targets.length === 0) {
      return jr({ ok: false, error: "אין משתתפים פעילים עם פרטי קשר מתאימים לשיעור זה" }, 400);
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const emailSubject = (subject?.trim() || lesson.title || "עדכון שיעור");
    const results: any[] = [];
    let sent = 0, simulated = 0, failed = 0;

    for (const p of targets) {
      if (wantEmail && p.email) {
        let status: "sent" | "simulated" | "failed" = "simulated";
        let error: string | null = null;
        if (resendKey) {
          try {
            const r = await fetch(RESEND_API, {
              method: "POST",
              headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                from: "התראות איגוד שיעורים <onboarding@resend.dev>",
                to: [p.email],
                subject: emailSubject,
                text: message,
              }),
            });
            if (r.ok) { status = "sent"; sent++; } else { status = "failed"; error = await r.text(); failed++; }
          } catch (e) {
            status = "failed"; error = String(e); failed++;
          }
        } else {
          simulated++;
        }
        results.push({ participant_id: p.id, full_name: p.full_name, channel: "email", recipient: p.email, status });
        await supabase.from("notifications_log").insert({
          tenant_id: lesson.tenant_id, lesson_id, participant_id: p.id,
          channel: "email", recipient: p.email, subject: emailSubject, message,
          status, error, sent_by: userResp.user.id,
        });
      }

      if (wantWhatsapp && p.whatsapp) {
        const link = waLink(p.whatsapp, message);
        simulated++;
        results.push({ participant_id: p.id, full_name: p.full_name, channel: "whatsapp", recipient: p.whatsapp, status: "simulated", wa_link: link });
        await supabase.from("notifications_log").insert({
          tenant_id: lesson.tenant_id, lesson_id, participant_id: p.id,
          channel: "whatsapp", recipient: p.whatsapp, subject: emailSubject, message,
          status: "simulated", meta: { wa_link: link }, sent_by: userResp.user.id,
        });
      }
    }

    return jr({ ok: true, sent, simulated, failed, results });
  } catch (e) {
    console.error("notify-participants error:", e);
    return jr({ ok: false, error: String(e) }, 500);
  }
});
