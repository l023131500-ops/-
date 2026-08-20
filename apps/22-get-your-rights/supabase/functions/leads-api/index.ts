import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

// All lead fields exposed individually
const LEAD_FIELDS = `
  id, created_at, source, service_type,
  name, phone, id_number, date_of_birth, gender, marital_status,
  children, children_count, children_ages, children_health_details,
  spouse_name, spouse_id_number, spouse_health, spouse_employment,
  health_status, disability_percentage, economic_status,
  employment_status, housing_status,
  category, selected_right, eligibility_score,
  description, details, document_urls, admin_notes,
  age_exact, status, handled_description, closed_at
`.replace(/\n/g, '').trim();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = req.headers.get('x-api-key');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing API key' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Validate API key
  const { data: keyData } = await supabase
    .from('api_keys')
    .select('id, is_active')
    .eq('key_hash', await hashKey(apiKey))
    .eq('is_active', true)
    .single();

  if (!keyData) {
    return new Response(JSON.stringify({ error: 'Invalid API key' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Update last_used
  const { error: lastUsedError } = await supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyData.id);
  if (lastUsedError) console.error('api_keys last_used_at update failed:', lastUsedError.message);

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const source = url.searchParams.get('source');
  const service_type = url.searchParams.get('service_type');
  const eligibility = url.searchParams.get('eligibility_score');
  const name = url.searchParams.get('name');
  const phone = url.searchParams.get('phone');
  const id_number = url.searchParams.get('id_number');
  const category = url.searchParams.get('category');
  const selected_right = url.searchParams.get('selected_right');
  const status = url.searchParams.get('status');

  let query = supabase.from('leads').select(LEAD_FIELDS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (source) query = query.eq('source', source);
  if (service_type) query = query.eq('service_type', service_type);
  if (eligibility) query = query.eq('eligibility_score', eligibility);
  if (name) query = query.ilike('name', `%${name}%`);
  if (phone) query = query.eq('phone', phone);
  if (id_number) query = query.eq('id_number', id_number);
  if (category) query = query.eq('category', category);
  if (selected_right) query = query.ilike('selected_right', `%${selected_right}%`);
  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    leads: data,
    total: count,
    limit,
    offset,
    fields: LEAD_FIELDS.split(',').map(f => f.trim()),
  }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
