import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { lead_id, trigger, channels } = body; // trigger: "auto" | "manual", channels: string[]

    if (!lead_id) {
      return new Response(JSON.stringify({ error: 'lead_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get webhook URL from settings
    const { data: setting } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'n8n_webhook_url')
      .single();

    if (!setting?.value) {
      return new Response(JSON.stringify({ error: 'לא הוגדרה כתובת Webhook של n8n בהגדרות' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch lead
    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .select('*')
      .eq('id', lead_id)
      .single();

    if (leadErr || !lead) {
      return new Response(JSON.stringify({ error: 'Lead not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch matched right if selected
    let rightData = null;
    if (lead.selected_right) {
      const { data: right } = await supabase
        .from('rights_reference')
        .select('*')
        .eq('topic_name', lead.selected_right)
        .single();
      rightData = right;
    }

    // Build enriched payload
    const payload = {
      trigger: trigger || 'manual',
      channels: channels || ['whatsapp', 'email', 'voice', 'fax'],
      timestamp: new Date().toISOString(),
      lead: {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        id_number: lead.id_number,
        date_of_birth: lead.date_of_birth,
        gender: lead.gender,
        marital_status: lead.marital_status,
        children_count: lead.children_count,
        children_ages: lead.children_ages,
        children_health_details: lead.children_health_details,
        health_status: lead.health_status,
        disability_percentage: lead.disability_percentage,
        economic_status: lead.economic_status,
        employment_status: lead.employment_status,
        housing_status: lead.housing_status,
        eligibility_score: lead.eligibility_score,
        category: lead.category,
        selected_right: lead.selected_right,
        service_type: lead.service_type,
        source: lead.source,
        status: lead.status,
        details: lead.details,
        admin_notes: lead.admin_notes,
        handled_description: lead.handled_description,
        document_urls: lead.document_urls,
        created_at: lead.created_at,
        // Spouse info
        spouse_name: lead.spouse_name,
        spouse_id_number: lead.spouse_id_number,
        spouse_health: lead.spouse_health,
        spouse_employment: lead.spouse_employment,
      },
      right: rightData ? {
        topic_name: rightData.topic_name,
        category: rightData.category,
        plain_description: rightData.plain_description,
        economic_necessity: rightData.economic_necessity,
        financial_potential: rightData.financial_potential,
        eligibility_criteria: rightData.eligibility_criteria,
        required_documents: rightData.required_documents,
        how_to_apply: rightData.how_to_apply,
        accompanying_benefit: rightData.accompanying_benefit,
        bureaucratic_pitfalls: rightData.bureaucratic_pitfalls,
        service_link: rightData.service_link,
        handling_body: rightData.handling_body,
        target_audience: rightData.target_audience,
      } : null,
    };

    // Send to n8n
    const webhookResponse = await fetch(setting.value, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return new Response(JSON.stringify({
      success: webhookResponse.ok,
      status: webhookResponse.status,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
