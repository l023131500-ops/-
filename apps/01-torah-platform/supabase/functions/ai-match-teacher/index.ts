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

// Requests per hour, per caller IP. FindLesson.tsx calls this once per search
// from a public page, so a real visitor never approaches this — but it is far
// below what draining the AI credit would take.
const RATE_LIMIT_PER_HOUR = 20;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { lead_id } = await req.json();
    if (!lead_id) return jr({ ok: false, error: "missing lead_id" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Cap per caller IP. This function spends LOVABLE_API_KEY credit and its only
    // gate is verify_jwt — which the anon key satisfies, and that key is shipped to
    // every browser. Runs before the lead lookup, so a blocked request costs nothing.
    // cf-connecting-ip is set by Cloudflare's edge from the real TCP connection
    // and can't be spoofed by the caller. The first entry of x-forwarded-for
    // CAN be spoofed -- Supabase appends the real IP after whatever the caller
    // sent rather than replacing it -- so a caller could mint a fresh fake IP
    // per request and get a fresh rate-limit bucket every time, defeating this
    // cap entirely and draining LOVABLE_API_KEY credit for free.
    const ip = (req.headers.get("cf-connecting-ip") ?? "").trim() ||
      (req.headers.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean).pop() ||
      "unknown";
    const windowStart = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000).toISOString();
    const { data: gate, error: gateError } = await supabase.rpc("ai_rate_limit_hit", {
      p_bucket: `ai-match-teacher:${ip}`,
      p_window_start: windowStart,
      p_limit: RATE_LIMIT_PER_HOUR,
    });
    if (gateError) {
      // Fail open: a counter problem must not take the live search down.
      console.error("rate limit check failed:", gateError.message);
    } else if (gate?.[0]?.allowed === false) {
      console.warn(`rate limited ${ip}: ${gate[0].hits} hits this hour`);
      return jr({ ok: false, error: "יותר מדי בקשות מהכתובת הזו. נסו שוב בעוד שעה." }, 429);
    }

    const { data: lead } = await supabase
      .from("leads")
      .select("id, kind, area, city, preferred_subject, message, full_name")
      .eq("id", lead_id)
      .maybeSingle();

    if (!lead) return jr({ ok: false, error: "lead not found" }, 404);

    // Fetch available maggidim. memberships.user_id references auth.users, not
    // public.profiles directly, so a single embedded select (memberships ->
    // tenants -> profiles) has no FK path PostgREST can resolve and always
    // fails with PGRST200 — fetch profiles separately and merge in JS.
    const { data: memberships } = await supabase
      .from("memberships")
      .select("user_id, tenant_id, tenants(name, city, region, type)")
      .eq("role", "tenant_admin")
      .limit(50);

    const maggidMemberships = (memberships ?? []).filter((m: any) => m.tenants?.type === "maggid");
    const userIds = maggidMemberships.map((m: any) => m.user_id);
    const { data: teacherProfiles } = userIds.length
      ? await supabase.from("profiles").select("id, full_name, phone, city, bio, meta").in("id", userIds)
      : { data: [] as any[] };
    const profileById = new Map((teacherProfiles ?? []).map((p: any) => [p.id, p]));

    // architecture.md §5.2 מגיד: self-service "פנוי למסירת שיעורים נוספים"
    // switch (profiles.meta.available_for_matching, set from PortalSettings.tsx).
    // Missing key = available, so existing maggidim keep matching unchanged.
    const teacherList = maggidMemberships
      .filter((m: any) => (profileById.get(m.user_id)?.meta ?? {}).available_for_matching !== false)
      .map((m: any) => {
        const p = profileById.get(m.user_id);
        return {
          user_id: m.user_id,
          name: p?.full_name || m.tenants?.name,
          city: p?.city || m.tenants?.city,
          region: m.tenants?.region,
          bio: p?.bio,
        };
      });

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
