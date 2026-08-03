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

    // Map request_type to Hebrew label
    const REQUEST_TYPE_LABELS: Record<string, string> = {
      info: 'מידע מפורט',
      reminder: 'תזכורת',
      treatment: 'טיפול מלא',
      full_service: 'טיפול מלא',
      detailed_info: 'מידע מפורט',
      another_topic: 'נושא נוסף',
      intake: 'מילוי טופס לזכות',
    };
    const CHANNEL_LABELS: Record<string, string> = {
      email: 'מייל',
      whatsapp: 'וואטסאפ',
      sms: 'SMS',
      voice: 'הודעה קולית',
      fax: 'פקס',
    };

    const chosenChannels: string[] = channels || lead.delivery_channels || [];

    // Build enriched, well-organized payload
    const payload = {
      event: 'new_lead',
      trigger: trigger || 'auto',
      timestamp: new Date().toISOString(),

      // === Request summary (top-level for easy n8n routing) ===
      request: {
        type: lead.request_type || null,
        type_label: lead.request_type ? (REQUEST_TYPE_LABELS[lead.request_type] || lead.request_type) : null,
        service_type: lead.service_type || null,
        source: lead.source || null,
        selected_right: lead.selected_right || null,
        category: lead.category || null,
      },

      // === Delivery channels the user chose ===
      delivery: {
        channels: chosenChannels,
        channel_labels: chosenChannels.map((c: string) => CHANNEL_LABELS[c] || c),
        wants_email: chosenChannels.includes('email'),
        wants_whatsapp: chosenChannels.includes('whatsapp'),
        wants_sms: chosenChannels.includes('sms'),
        wants_voice: chosenChannels.includes('voice'),
      },

      // === Contact info ===
      contact: {
        name: lead.name || null,
        phone: lead.phone || null,
        email: lead.email || null,
        id_number: lead.id_number || null,
        date_of_birth: lead.date_of_birth || null,
        gender: lead.gender || null,
        marital_status: lead.marital_status || null,
      },

      // === Family ===
      family: {
        spouse_name: lead.spouse_name || null,
        spouse_id_number: lead.spouse_id_number || null,
        spouse_health: lead.spouse_health || null,
        spouse_employment: lead.spouse_employment || null,
        children_count: lead.children_count || null,
        children_ages: lead.children_ages || null,
        children_health_details: lead.children_health_details || null,
      },

      // === Status & financial profile ===
      profile: {
        health_status: lead.health_status || null,
        disability_percentage: lead.disability_percentage || null,
        economic_status: lead.economic_status || null,
        employment_status: lead.employment_status || null,
        housing_status: lead.housing_status || null,
        eligibility_score: lead.eligibility_score || null,
        community_data: lead.community_data || null,
      },

      // === Free-text & docs ===
      message: {
        details: lead.details || null,
        admin_notes: lead.admin_notes || null,
        handled_description: lead.handled_description || null,
        document_urls: lead.document_urls || [],
      },

      // === Lead metadata ===
      lead: {
        id: lead.id,
        status: lead.status,
        created_at: lead.created_at,
      },

      // === Right info ===
      right: rightData ? {
        topic_name: rightData.topic_name,
        category: rightData.category,
        subcategory: rightData.subcategory,
        target_audience: rightData.target_audience,
        eligibility_criteria: rightData.eligibility_criteria,
        plain_description: rightData.plain_description,
        financial_potential: rightData.financial_potential,
        economic_necessity: rightData.economic_necessity,
        accompanying_benefit: rightData.accompanying_benefit,
        bureaucratic_pitfalls: rightData.bureaucratic_pitfalls,
        required_documents: rightData.required_documents,
        how_to_apply: rightData.how_to_apply,
        service_cost: rightData.service_cost,
        service_link: rightData.service_link,
        handling_body: rightData.handling_body,
        client_email_template: rightData.client_email_template,
        client_message_template: rightData.client_message_template,
        voice_message_text: rightData.voice_message_text,
        voice_short: rightData.voice_short,
        podcast_text: rightData.podcast_text,
        media_url: rightData.media_url,
        video_url: rightData.video_url,
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
