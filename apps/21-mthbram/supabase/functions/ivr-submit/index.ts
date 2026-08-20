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

    // Save IVR submission
    const { error: ivrError } = await supabase.from("ivr_submissions").insert({
      caller_phone: caller_phone || "",
      request_type: request_type || "message",
      input_text: message || "",
      params: params || {},
      status: "new",
    });

    // If it's a lesson request, also create a seeker lead
    let leadError = null;
    if (request_type === "request_lesson") {
      const { error } = await supabase.from("seeker_leads").insert({
        contact_name: body.name || `מתקשר: ${caller_phone}`,
        phone: caller_phone || "",
        subject: body.subject || "",
        city: body.city || "",
        notes: `פנייה ממערכת קולית (ימות המשיח). ${message || ""}`,
        status: "new",
      });
      leadError = error;
    }

    // If it's a teacher registration
    if (request_type === "register_teacher") {
      const { error } = await supabase.from("teacher_leads").insert({
        full_name: body.name || `מתקשר: ${caller_phone}`,
        phone: caller_phone || "",
        subjects: body.subjects || [],
        city: body.city || "",
        notes: `הרשמה ממערכת קולית (ימות המשיח). ${message || ""}`,
        status: "new",
      });
      leadError = error;
    }

    if (ivrError || leadError) {
      return new Response(JSON.stringify({ error: (ivrError || leadError)!.message }), {
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
