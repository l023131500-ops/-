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
  // כבר קיים — דרוס לו את הסיסמה" הן פעולות מנהל מלאות. הגרסה שנפרסה ענתה
  // ל-POST בלי שום כותרת הרשאה, כלומר כל מי שידע את הכתובת יכול היה להחליף
  // סיסמה לכל חשבון בפרויקט לפי מייל. השער הזה הוא התיקון: סוד שיושב רק
  // במשתני הסביבה של הפונקציה, לא במפתח הציבורי שנשלח לדפדפן.
  const expected = Deno.env.get("ADMIN_BOOTSTRAP_SECRET");
  if (!expected) {
    // בלי סוד מוגדר הפונקציה מושבתת — עדיף מאשר לחזור בשקט למצב הפתוח.
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

    let userId: string | undefined;
    let action: "created" | "password-updated";

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      if (!error.message?.includes("already")) {
        return json({ error: error.message }, 400);
      }
      const { data: users } = await supabase.auth.admin.listUsers();
      const existing = users?.users?.find(u => u.email === email);
      if (!existing) {
        return json({ error: error.message }, 400);
      }
      const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, { password });
      if (updateError) {
        return json({ error: updateError.message }, 400);
      }
      userId = existing.id;
      action = "password-updated";
    } else {
      userId = data.user?.id;
      action = "created";
    }

    if (!userId) {
      return json({ error: "User has no id" }, 500);
    }

    // בלי השורה הזו הפונקציה בונה משתמש רגיל ותו לא: המסך /admin-login בודק
    // has_role(uid,'admin'), הבדיקה קוראת מ-user_roles, ורק service_role יכול
    // לכתוב לשם. כלומר "create-admin" מעולם לא יצר מנהל שיכול להיכנס.
    const { error: roleError } = await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    if (roleError) {
      return json({ error: `User ${action}, but granting the admin role failed: ${roleError.message}` }, 500);
    }

    return json({ success: true, action, user: email, role: "admin" });
  } catch (e) {
    return json({ error: "Invalid request" }, 400);
  }
});
