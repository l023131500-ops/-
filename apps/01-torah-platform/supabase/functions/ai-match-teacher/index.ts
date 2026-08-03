// ============================================================================
// Edge Function: ai-match-teacher
// התאמת מגיד שיעור לבקשת ליד באמצעות Lovable AI Gateway (Gemini 2.5 Flash).
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API = "https://ai.gateway.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { lead_id } = await req.json();
    if (!lead_id) return jr({ ok: false, error: "missing lead_id" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: lead } = await supabase
      .from("leads")
      .select("id, kind, area, city, preferred_subject, message, full_name")
      .eq("id", lead_id)
      .maybeSingle();

    if (!lead) return jr({ ok: false, error: "lead not found" }, 404);

    // Fetch available maggidim
    const { data: teachers } = await supabase
      .from("memberships")
      .select("user_id, tenant_id, tenants(name, city, region, type), profiles(full_name, phone, city, bio)")
      .eq("role", "tenant_admin")
      .limit(50);

    const teacherList = (teachers ?? [])
      .filter((t: any) => t.tenants?.type === "maggid")
      .map((t: any) => ({
        user_id: t.user_id,
        name: t.profiles?.full_name || t.tenants?.name,
        city: t.profiles?.city || t.tenants?.city,
        region: t.tenants?.region,
        bio: t.profiles?.bio,
      }));

    const prompt = `אתה עוזר התאמה במערכת איגוד השיעורים. בקשת ליד:
- שם: ${lead.full_name}
- אזור: ${lead.area || lead.city || "לא צויין"}
- נושא מבוקש: ${lead.preferred_subject || "לא צויין"}
- הודעה: ${lead.message || ""}

רשימת מגידי שיעור זמינים (JSON):
${JSON.stringify(teacherList, null, 2)}

החזר JSON עם שדה matches שמכיל עד 3 התאמות מומלצות, כל אחת עם user_id, score (0-100), ו-reason (משפט אחד בעברית).`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const aiRes = await fetch(LOVABLE_API, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a Hebrew matching assistant. Respond with JSON only." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { matches: [], raw: content }; }

    return jr({ ok: true, lead_id, ...parsed });
  } catch (err) {
    console.error(err);
    return jr({ ok: false, error: String(err) }, 500);
  }
});

function jr(p: unknown, s = 200) {
  return new Response(JSON.stringify(p), { status: s, headers: { ...corsHeaders, "content-type": "application/json" } });
}
