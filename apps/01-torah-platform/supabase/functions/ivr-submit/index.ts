import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { caller_phone, request_type, message, params } = body;

    // Best-effort call log (public.ivr_submissions) — must never gate the
    // caller-facing response; ivr-search/ivr-agent already treat it the same
    // way (fire-and-forget, error only logged server-side).
    const { error: ivrError } = await supabase.from("ivr_submissions").insert({
      caller_phone: caller_phone || "",
      request_type: request_type || "message",
      input_text: message || "",
      params: params || {},
      status: "new",
    });
    if (ivrError) console.error("ivr_submissions insert failed:", ivrError.message);

    // The actionable record: public.leads (unified lead table — leads has
    // `kind`/`raw_data`, not the legacy seeker_leads/teacher_leads tables,
    // which don't exist; same fix already applied to TeachersLanding.tsx/
    // FindLesson.tsx/JoinTeacher.tsx/RequestLesson.tsx). "lesson_request" and
    // "teacher_offer" are the same `kind` values LeadsGuru.tsx/MatchingGuru.tsx
    // already filter for, so these submissions surface in the existing admin
    // screens with zero further wiring.
    let leadError: { message: string } | null = null;
    if (request_type === "request_lesson") {
      const { error } = await supabase.from("leads").insert({
        kind: "lesson_request",
        full_name: body.name || `מתקשר: ${caller_phone || ""}`,
        phone: caller_phone || "",
        preferred_subject: body.subject || "",
        area: body.city || "",
        message: `פנייה ממערכת קולית (ימות המשיח). ${message || ""}`,
        source: "ivr",
      });
      leadError = error;
    } else if (request_type === "register_teacher") {
      const { error } = await supabase.from("leads").insert({
        kind: "teacher_offer",
        full_name: body.name || `מתקשר: ${caller_phone || ""}`,
        phone: caller_phone || "",
        preferred_subject: Array.isArray(body.subjects) ? body.subjects.join(", ") : (body.subjects || ""),
        area: body.city || "",
        message: `הרשמה ממערכת קולית (ימות המשיח). ${message || ""}`,
        source: "ivr",
      });
      leadError = error;
    }

    if (leadError) {
      return new Response(JSON.stringify({ error: leadError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "הפנייה נקלטה בהצלחה. נציג יחזור אליכם בהקדם.",
      text_for_speech: "תודה רבה. הפנייה שלכם נקלטה במערכת ונציג יחזור אליכם בהקדם.",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
