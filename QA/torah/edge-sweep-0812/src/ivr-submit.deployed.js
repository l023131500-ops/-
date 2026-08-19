// חולץ מחבילת ה-ESZIP הפרוסה של ivr-submit (פרויקט bieebmnmkffwbqlsfozh, 12/08).
// זהו index.ts המתומלל; ספריות הצד השלישי שצורפו לחבילה נחתכו. ראיה, לא מקור בונה.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const body = await req.json();
    const { caller_phone, request_type, message, params } = body;
    const { error: ivrError } = await supabase.from("ivr_submissions").insert({
      caller_phone: caller_phone || "",
      request_type: request_type || "message",
      input_text: message || "",
      params: params || {},
      status: "new"
    });
    if (request_type === "request_lesson") {
      await supabase.from("seeker_leads").insert({
        contact_name: body.name || `מתקשר: ${caller_phone}`,
        phone: caller_phone || "",
        subject: body.subject || "",
        city: body.city || "",
        notes: `פנייה ממערכת קולית (ימות המשיח). ${message || ""}`,
        status: "new"
      });
    }
    if (request_type === "register_teacher") {
      await supabase.from("teacher_leads").insert({
        full_name: body.name || `מתקשר: ${caller_phone}`,
        phone: caller_phone || "",
        subjects: body.subjects || [],
        city: body.city || "",
        notes: `הרשמה ממערכת קולית (ימות המשיח). ${message || ""}`,
        status: "new"
      });
    }
    if (ivrError) {
      return new Response(JSON.stringify({
        error: ivrError.message
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    return new Response(JSON.stringify({
      success: true,
      message: "הפנייה נקלטה בהצלחה. נציג יחזור אליכם בהקדם.",
      text_for_speech: "תודה רבה. הפנייה שלכם נקלטה במערכת ונציג יחזור אליכם בהקדם."
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch  {
    return new Response(JSON.stringify({
      error: "Invalid request"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});