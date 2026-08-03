// ============================================================================
// nadlan-smart-research — Edge Function
// מנוע "מחקר חכם לנדל"ן": מקבל כתובת, מחשב פרמטרים קובעי-מחיר ממקורות
// ממשלתיים חינמיים + העשרת OpenStreetMap, מחזיר ציון כדאיות, ושומר ב-nadlan.location_profiles.
// verify_jwt=false — הפונקציה פתוחה לקריאה מהאתר (הפרמטרים הבסיסיים חינמיים לכל משתמש).
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildSmartProfile } from "./engine.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);

  let address = "";
  try {
    const body = await req.json();
    address = String(body?.address ?? "").trim();
  } catch {
    return json({ ok: false, error: "invalid JSON body; expected {\"address\":\"...\"}" }, 400);
  }
  if (!address) return json({ ok: false, error: "חסרה כתובת (address)" }, 400);

  // חישוב הפרופיל
  let profile;
  try {
    profile = await buildSmartProfile(address);
  } catch (e) {
    return json({ ok: false, error: "שגיאה בחישוב הפרופיל", detail: String(e) }, 500);
  }

  if (!profile.ok) return json(profile, 200);

  // שמירה ל-nadlan.location_profiles (service_role — עוקף RLS)
  let profileId: number | null = null;
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (url && key) {
      const supabase = createClient(url, key, { db: { schema: "nadlan" } });
      const m = profile.metrics ?? {};
      const row = {
        query_address: profile.query_address,
        lat: profile.lat ?? null,
        lon: profile.lon ?? null,
        locality_code: profile.locality_code ?? null,
        locality_name: profile.locality_name ?? null,
        stat_area_id: profile.stat_area ?? null,
        neighborhood_id: profile.neighborhood_id ?? null,
        settlement_id: profile.settlement_id ?? null,
        socioeconomic_cluster: m.socioeconomic_cluster ?? null,
        pop_density: m.pop_density ?? null,
        age_median: m.age_median ?? null,
        religiosity: m.religiosity ?? null,
        dominant_religion: m.dominant_religion ?? null,
        own_pcnt: m.own_pcnt ?? null,
        acadm_cert_pcnt: m.acadm_cert_pcnt ?? null,
        med_wage: m.med_wage ?? null,
        crime_per_1000: m.crime_per_1000 ?? null,
        dist_transit_m: m.dist_transit_m ?? null,
        dist_train_m: m.dist_train_m ?? null,
        dist_school_m: m.dist_school_m ?? null,
        dist_synagogue_m: m.dist_synagogue_m ?? null,
        election_bloc_shares: extractBlocs(profile),
        avg_price: m.avg_price ?? null,
        index_yield: m.index_yield ?? null,
        opportunity_score: profile.opportunity_score ?? null,
        score_breakdown: profile.score_breakdown ?? null,
        parameters_full: profile.parameters ?? null,
        is_deep_report: false,
        computed_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("location_profiles")
        .insert(row)
        .select("profile_id")
        .single();
      if (!error && data) profileId = (data as any).profile_id ?? null;
    }
  } catch (_e) {
    // שמירה נכשלה — עדיין מחזירים את הפרופיל למשתמש
  }

  return json({ ...profile, profile_id: profileId }, 200);
});

// חילוץ הרכב הגושים מתוך פרמטר הבחירות לשדה jsonb
function extractBlocs(profile: any): unknown {
  const p = (profile.parameters ?? []).find((x: any) => x.key === "election_blocs");
  if (!p || typeof p.value !== "string") return null;
  const out: Record<string, number> = {};
  for (const part of p.value.split(",")) {
    const m = /(.+?)\s+([\d.]+)%/.exec(part.trim());
    if (m) out[m[1].trim()] = Number(m[2]);
  }
  return Object.keys(out).length ? out : null;
}
