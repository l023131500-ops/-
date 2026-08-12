// חולץ מחבילת ה-ESZIP הפרוסה של create-admin (פרויקט bieebmnmkffwbqlsfozh, 12/08).
// זהו index.ts המתומלל; ספריות הצד השלישי שצורפו לחבילה נחתכו. ראיה, לא מקור בונה.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return new Response(JSON.stringify({
        error: "Email and password required"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (error) {
      if (error.message?.includes("already")) {
        const { data: users } = await supabase.auth.admin.listUsers();
        const adminUser = users?.users?.find((u)=>u.email === email);
        if (adminUser) {
          await supabase.auth.admin.updateUserById(adminUser.id, {
            password
          });
          return new Response(JSON.stringify({
            success: true,
            message: "Password updated"
          }), {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }
      }
      return new Response(JSON.stringify({
        error: error.message
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    return new Response(JSON.stringify({
      success: true,
      user: data.user?.email
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({
      error: "Invalid request"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});