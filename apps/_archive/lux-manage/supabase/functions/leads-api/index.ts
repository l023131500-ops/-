import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const url = new URL(req.url);

  // Reader gate. GET returns every column of every lead (name, email, phone,
  // message) and PUT bulk-inserts, so both are machine-to-machine only and are
  // gated on a shared secret. POST is deliberately left open: it is the public
  // contact form (ContactSection.tsx / PublicConciergeBot.tsx) and only writes.
  // Fails closed — with no LEADS_API_KEY in the environment the reader is off,
  // which is the correct resting state for a service_role endpoint.
  const readerGate = (): Response | null => {
    if (req.method !== "GET" && req.method !== "PUT") return null;
    const expected = Deno.env.get("LEADS_API_KEY");
    if (!expected) {
      return new Response(JSON.stringify({ error: "leads-api reader disabled: LEADS_API_KEY is not configured" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const presented = req.headers.get("x-api-key") ?? "";
    if (presented !== expected) {
      return new Response(JSON.stringify({ error: "Missing or invalid API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return null;
  };

  const denied = readerGate();
  if (denied) return denied;

  try {
    // GET — list leads (x-api-key required, see readerGate above)
    if (req.method === "GET") {
      const limit = parseInt(url.searchParams.get("limit") || "100");
      const offset = parseInt(url.searchParams.get("offset") || "0");
      const source = url.searchParams.get("source");
      const since = url.searchParams.get("since"); // ISO date

      let query = supabase
        .from("leads")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (source) query = query.eq("source", source);
      if (since) query = query.gte("created_at", since);

      const { data, error, count } = await query;

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ leads: data, total: count, limit, offset }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST — create a new lead from external system
    if (req.method === "POST") {
      const body = await req.json();
      const { name, email, phone, message, source } = body;

      if (!name && !email && !phone) {
        return new Response(JSON.stringify({ error: "At least one of name, email, or phone is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase.from("leads").insert({
        name: name || "",
        email: email || "",
        phone: phone || "",
        message: message || "",
        source: source || "external_api",
      }).select().single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, lead: data }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST batch — multiple leads at once via PUT
    if (req.method === "PUT") {
      const body = await req.json();
      const { leads } = body;

      if (!Array.isArray(leads) || leads.length === 0) {
        return new Response(JSON.stringify({ error: "leads array is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const rows = leads.map((l: any) => ({
        name: l.name || "",
        email: l.email || "",
        phone: l.phone || "",
        message: l.message || "",
        source: l.source || "external_api_batch",
      }));

      const { data, error } = await supabase.from("leads").insert(rows).select();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, inserted: data?.length || 0, leads: data }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
