// חולץ מחבילת ה-ESZIP הפרוסה של api (פרויקט bieebmnmkffwbqlsfozh, 12/08).
// זהו index.ts המתומלל; ספריות הצד השלישי שצורפו לחבילה נחתכו. ראיה, לא מקור בונה.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\/?/, "").replace(/^functions\/v1\/api\/?/, "");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const method = req.method;
    const json = (data, status = 200)=>new Response(JSON.stringify(data), {
        status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    if ((path === "lessons" || path === "") && method === "GET") {
      const limit = parseInt(url.searchParams.get("limit") || "100");
      const offset = parseInt(url.searchParams.get("offset") || "0");
      let q = supabase.from("lessons").select("*", {
        count: "exact"
      }).eq("is_approved", true).order("created_at", {
        ascending: false
      }).range(offset, offset + limit - 1);
      const city = url.searchParams.get("city");
      if (city) q = q.eq("city", city);
      const subject = url.searchParams.get("subject");
      if (subject) q = q.eq("subject", subject);
      const rabbi = url.searchParams.get("rabbi");
      if (rabbi) q = q.ilike("rabbi_name", `%${rabbi}%`);
      const { data, count, error } = await q;
      if (error) return json({
        error: error.message
      }, 500);
      return json({
        data,
        total: count,
        limit,
        offset
      });
    }
    if (path === "stats" && method === "GET") {
      const lessons = await supabase.from("lessons").select("id", {
        count: "exact",
        head: true
      });
      return json({
        lessons: lessons.count
      });
    }
    if (path === "search" && method === "GET") {
      const qstr = url.searchParams.get("q") || "";
      if (!qstr) return json({
        error: "missing q"
      }, 400);
      const { data, error } = await supabase.from("lessons").select("*").eq("is_approved", true).or(`rabbi_name.ilike.%${qstr}%,subject.ilike.%${qstr}%,city.ilike.%${qstr}%`).limit(20);
      if (error) return json({
        error: error.message
      }, 500);
      return json({
        data,
        query: qstr
      });
    }
    return json({
      error: "Endpoint not found",
      available: [
        "/lessons",
        "/search?q=...",
        "/stats"
      ]
    }, 404);
  } catch (e) {
    return new Response(JSON.stringify({
      error: e?.message || "Unknown"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});