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

    const params = req.method === "GET"
      ? Object.fromEntries(new URL(req.url).searchParams)
      : await req.json();

    // Columns below match the live `lessons` table (public.lessons has no
    // subject/target_audience/synagogue_name/is_recurring/schedule_days/
    // specific_date -- those were carried over from a stale recovered bundle.
    // subject.ilike threw 42703 whenever params.subject was set, and even
    // without it every result's spoken text read "שיעור 1: undefined" because
    // l.subject/l.is_recurring/l.schedule_days/l.specific_date/l.synagogue_name
    // are all undefined on the real row shape. topic_free_text/title, audience
    // (a plain text column, not an array), day_of_week/time_hhmm/date_specific
    // are the real equivalents. is_active is also required here -- lessons_
    // tenant_read only gates on the tenant being active, not the lesson, so a
    // deactivated lesson (is_active=false) was still being read aloud to phone
    // callers even though every public web page requires is_active=true too.
    let query = supabase.from("lessons").select("*").eq("is_approved", true).eq("is_active", true);

    if (params.subject) {
      query = query.or(`topic_free_text.ilike.%${params.subject}%,title.ilike.%${params.subject}%`);
    }
    if (params.city) query = query.ilike("city", `%${params.city}%`);
    if (params.language) query = query.eq("language", params.language);
    if (params.audience) query = query.ilike("audience", `%${params.audience}%`);

    const { data, error } = await query.limit(10);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const textResults = (data || []).map((l, i) => {
      const subject = l.topic_free_text || l.title || "שיעור תורה";
      const schedule = l.date_specific
        ? l.date_specific
        : (l.day_of_week != null && l.time_hhmm)
          ? `יום ${l.day_of_week} בשעה ${l.time_hhmm}`
          : "";
      return `שיעור ${i + 1}: ${subject}, מגיד השיעור ${l.rabbi_name}, ב${l.city}${schedule ? `, ${schedule}` : ""}.`;
    }).join(" ");

    await supabase.from("ivr_submissions").insert({
      caller_phone: params.caller_phone || "",
      request_type: "search",
      input_text: JSON.stringify(params),
      response_text: textResults || "לא נמצאו שיעורים",
      params: params,
    });

    return new Response(JSON.stringify({
      success: true,
      count: data?.length || 0,
      results: data,
      text_for_speech: textResults || "לא נמצאו שיעורים מתאימים. נסו לחפש בנושא או עיר אחרת.",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
