const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { emails = [], phones = [], debug = false } = await req.json();
    const url = Deno.env.get("LUX_PREMIUM_STATUS_URL") || "";
    const token = Deno.env.get("LUX_PREMIUM_SYNC_TOKEN") || "";
    if (!url || !token) throw new Error("Premium status endpoint not configured");

    const phoneEmails = (phones as string[])
      .filter(Boolean)
      .map((p) => `${String(p).replace(/\D/g, "")}@luxmanage.app`);
    const allEmails = Array.from(new Set([
      ...((emails as string[]) || []).filter(Boolean).map((e) => e.toLowerCase()),
      ...phoneEmails,
    ]));

    const matched: { email: string }[] = [];
    const checks: any[] = [];

    await Promise.all(allEmails.map(async (email) => {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-sync-token": token,
          },
          body: JSON.stringify({ email }),
        });
        const txt = await res.text();
        let json: any = {};
        try { json = JSON.parse(txt); } catch {}
        if (debug) checks.push({ email, status: res.status, json });
        if (res.ok && json?.premium === true) {
          matched.push({ email });
        }
      } catch (err) {
        if (debug) checks.push({ email, error: String(err) });
      }
    }));

    return new Response(JSON.stringify({
      premium: matched,
      ...(debug ? { checks, queriedEmails: allEmails } : {}),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-premium-client error", e);
    return new Response(JSON.stringify({ error: String((e as any)?.message || e), premium: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
