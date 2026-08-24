import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-bootstrap-secret',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// אין השוואה תלוית-זמן על מחרוזת סוד.
const secretMatches = (given: string, expected: string) => {
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // הפונקציה רצה עם SERVICE_ROLE, ולכן "צור משתמש עם הסיסמה הזו" ו-"אם המייל
  // כבר קיים — דרוס לו את הסיסמה" הן פעולות מנהל מלאות. השער היחיד שהיה לה
  // בפרויקט הזה הוא verify_jwt, ומפתח ה-anon הוא JWT תקין שנשלח לכל דפדפן —
  // כלומר כל מי שהחזיק את המפתח הציבורי יכול היה להחליף סיסמה לכל חשבון
  // בפרויקט לפי מייל. זה אותו חור בדיוק שנסגר ב-21 מתחברים (#160), ואותו
  // תיקון: סוד שיושב רק במשתני הסביבה של הפונקציה.
  const expected = Deno.env.get("ADMIN_BOOTSTRAP_SECRET");
  if (!expected) {
    // בלי סוד מוגדר הפונקציה מושבתת — עדיף מאשר לחזור בשקט למצב הפתוח.
    // אין באפליקציה שום מסך שקורא לנתיב הזה, ולכן מושבת הוא מצב המנוחה הנכון.
    return json({ error: "Admin bootstrap is disabled" }, 503);
  }
  const given = req.headers.get("x-admin-bootstrap-secret") ?? "";
  if (!secretMatches(given, expected)) {
    // 404 ולא 403: אין סיבה לאשר למי שמנחש שהנתיב קיים.
    return json({ error: "Not found" }, 404);
  }

  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return json({ error: "Email and password required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      if (error.message?.includes("already")) {
        // listUsers() paginates (default 50/page), so page through until found or
        // exhausted - otherwise an email on page 2+ is missed and this falls through
        // to the generic error below instead of updating the existing user's password.
        let adminUser: { id: string } | undefined;
        for (let page = 1; !adminUser; page++) {
          const { data: users } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
          adminUser = users?.users?.find(u => u.email === email);
          if (!users?.users || users.users.length < 1000) break;
        }
        if (adminUser) {
          const { error: updateError } = await supabase.auth.admin.updateUserById(adminUser.id, { password });
          if (updateError) {
            return json({ error: updateError.message }, 400);
          }
          return json({ success: true, message: "Password updated" });
        }
      }
      return json({ error: error.message }, 400);
    }

    return json({ success: true, user: data.user?.email });
  } catch (e) {
    return json({ error: "Invalid request" }, 400);
  }
});
