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

    let query = supabase.from("lessons").select("*").eq("is_approved", true);

    if (params.subject) query = query.ilike("subject", `%${params.subject}%`);
    if (params.city) query = query.ilike("city", `%${params.city}%`);
    if (params.language) query = query.eq("language", params.language);
    if (params.audience) query = query.contains("target_audience", [params.audience]);

    const { data, error } = await query.limit(10);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format for IVR text-to-speech
    const textResults = (data || []).map((l, i) => {
      const schedule = l.is_recurring && l.schedule_days?.length
        ? (l.schedule_days as any[]).map((d: any) => `${d.day} בשעה ${d.time}`).join(", ")
        : l.specific_date || "";
      return `שיעור ${i + 1}: ${l.subject}, מגיד השיעור ${l.rabbi_name}, ב${l.city}${l.synagogue_name ? ` בבית הכנסת ${l.synagogue_name}` : ""}${schedule ? `, ${schedule}` : ""}.`;
    }).join(" ");

    // Log the IVR query
    const { error: logError } = await supabase.from("ivr_submissions").insert({
      caller_phone: params.caller_phone || "",
      request_type: "search",
      input_text: JSON.stringify(params),
      response_text: textResults || "לא נמצאו שיעורים",
      params: params,
    });
    if (logError) console.error("ivr_submissions insert failed (search):", logError.message);

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
