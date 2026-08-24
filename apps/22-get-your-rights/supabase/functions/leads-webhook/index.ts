import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// site_settings.webhook_url / n8n_webhook_url are admin-configured and can point
// to any host; without a timeout a dead/slow endpoint hangs this invocation
// until the platform kills it, instead of failing fast like a normal delivery error.
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const record = payload.record;

    if (!record) {
      return new Response(JSON.stringify({ error: 'No record in payload' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const results: Record<string, any> = {};

    // 1. Send to legacy webhook URL if configured
    const { data: webhookSetting } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'webhook_url')
      .single();

    if (webhookSetting?.value) {
      try {
        const webhookResponse = await fetchWithTimeout(webhookSetting.value, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'new_lead',
            timestamp: new Date().toISOString(),
            lead: record,
          }),
        });
        results.webhook = { success: webhookResponse.ok, status: webhookResponse.status };
      } catch (e) {
        results.webhook = { success: false, error: String(e) };
      }
    }

    // 2. Trigger n8n-notify for enriched data
    const { data: n8nSetting } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'n8n_webhook_url')
      .single();

    if (n8nSetting?.value) {
      try {
        // Call n8n-notify edge function internally
        const n8nResponse = await fetchWithTimeout(`${supabaseUrl}/functions/v1/n8n-notify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({ lead_id: record.id, trigger: 'auto' }),
        });
        results.n8n = { success: n8nResponse.ok, status: n8nResponse.status };
      } catch (e) {
        results.n8n = { success: false, error: String(e) };
      }
    }

    return new Response(JSON.stringify(results), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
