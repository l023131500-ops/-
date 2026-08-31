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

    const { text, caller_phone } = await req.json();

    if (!text) {
      return new Response(JSON.stringify({ error: "Missing text field" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const keywords = text.split(/\s+/).filter((w: string) => w.length > 2);

    let results: any[] = [];
    for (const keyword of keywords.slice(0, 3)) {
      const { data } = await supabase
        .from("lessons")
        .select("*")
        .eq("is_approved", true)
        .or(`subject.ilike.%${keyword}%,city.ilike.%${keyword}%,rabbi_name.ilike.%${keyword}%`)
        .limit(5);
      if (data) results.push(...data);
    }

    const unique = [...new Map(results.map(r => [r.id, r])).values()].slice(0, 5);

    const responseText = unique.length > 0
      ? `מצאנו ${unique.length} שיעורים. ` + unique.map((l, i) =>
          `שיעור ${i + 1}: ${l.subject} עם ${l.rabbi_name} ב${l.city}.`
        ).join(" ")
      : "לא מצאנו שיעורים מתאימים לחיפוש שלכם. נסו לחפש בנושא אחר, או השאירו הודעה ונחזור אליכם.";

    await supabase.from("ivr_submissions").insert({
      caller_phone: caller_phone || "",
      request_type: "agent",
      input_text: text,
      response_text: responseText,
      status: "processed",
    });

    return new Response(JSON.stringify({
      success: true,
      text_for_speech: responseText,
      results: unique,
      count: unique.length,
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
