import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-webhook-secret, x-api-key, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Gate — this function inserts transactions and chat messages on the service
  // role for whatever user_id the body names. Its callers are machines
  // (WhatsApp / voice / email relays), so it fails closed: with no
  // INBOUND_WEBHOOK_SECRET set the endpoint is off entirely.
  {
    const expected = Deno.env.get("INBOUND_WEBHOOK_SECRET");
    if (!expected) {
      return new Response(
        JSON.stringify({ error: "inbound-webhook disabled: INBOUND_WEBHOOK_SECRET is not configured" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const provided = req.headers.get("x-webhook-secret") || req.headers.get("x-api-key");
    if (provided !== expected) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid webhook secret" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  try {
    const body = await req.json();
    const { type, user_id, ...payload } = body;

    if (!user_id || !type) {
      return new Response(JSON.stringify({ error: "Missing user_id or type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let result: any = { processed: false };

    if (type === "WHATSAPP_POST" || type === "TEXT_INPUT") {
      // Parse natural language text into a transaction
      const text = payload.text || "";
      const amountMatch = text.match(/(\d[\d,.]*)/);
      const amount = amountMatch ? parseFloat(amountMatch[1].replace(",", "")) : 0;

      if (amount > 0) {
        const categoryMap: Record<string, string> = {
          "סופר": "food", "אוכל": "food", "מסעדה": "food",
          "דלק": "car", "רכב": "car", "חניה": "car",
          "רופא": "health", "תרופות": "health", "בריאות": "health",
          "שכירות": "housing", "ארנונה": "housing", "חשמל": "housing", "מים": "housing", "גז": "housing",
        };
        let category = "other";
        for (const [keyword, cat] of Object.entries(categoryMap)) {
          if (text.includes(keyword)) { category = cat; break; }
        }

        const { data, error } = await supabase.from("transactions").insert({
          user_id, type: "expense", amount, category,
          description: text, date: new Date().toISOString().split("T")[0],
          is_recurring: false, is_installment: false,
        }).select().single();

        result = { processed: true, transaction: data, error: error?.message };
      } else {
        result = { processed: false, reason: "No amount detected in text" };
      }
    } else if (type === "VOICE_PHONE_POST") {
      // Store the transcript as a chat message for now
      const { error } = await supabase.from("chat_messages").insert({
        user_id, role: "user",
        content: `[הודעה קולית ${payload.duration || ""}]: ${payload.audio_transcript || ""}`,
      });
      result = { processed: true, type: "voice_logged", error: error?.message };
    } else if (type === "EMAIL_POST") {
      const { error } = await supabase.from("chat_messages").insert({
        user_id, role: "user",
        content: `[אימייל] נושא: ${payload.subject || ""}\n${payload.body || ""}`,
      });
      result = { processed: true, type: "email_logged", error: error?.message };
    } else if (type === "STRUCTURED_DATA") {
      // Direct structured transaction insert
      const { data, error } = await supabase.from("transactions").insert({
        user_id,
        type: payload.transaction_type || "expense",
        amount: payload.amount || 0,
        category: payload.category || "other",
        description: payload.description || "",
        date: payload.date || new Date().toISOString().split("T")[0],
        is_recurring: payload.is_recurring || false,
        is_installment: payload.is_installment || false,
        installment_details: payload.installment_details || null,
      }).select().single();
      result = { processed: true, transaction: data, error: error?.message };
    }

    return new Response(JSON.stringify(result), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
