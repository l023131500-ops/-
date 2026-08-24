import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\/?/, "").replace(/^functions\/v1\/api\/?/, "");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const method = req.method;

    const json = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    // הפונקציה רצה עם SERVICE_ROLE ו-verify_jwt=false, כלומר RLS לא מגן על כלום כאן.
    // הקריאות הציבוריות (שיעורים מאושרים, סטטיסטיקות, ערים, נושאים) והטפסים ב-POST
    // נשארות פתוחות — זה המוצר. אבל רשימות הלידים הן פרטי אנשים (שם, טלפון, מייל),
    // ולכן כל endpoint שמחזיר אותן חייב לעבור כאן קודם.
    // הבדיקה היא על ה-JWT של המשתמש עצמו: מפתח anon הוא JWT תקין ומשודר בכל דף,
    // ולכן אינו הרשאה — רק משתמש מחובר עם תפקיד admin ב-user_roles עובר.
    const requireAdmin = async (): Promise<Response | null> => {
      const header = req.headers.get("Authorization") || "";
      const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
      if (!token) return json({ error: "נדרשת הרשאת ניהול" }, 401);

      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      const user = userData?.user;
      if (userError || !user) return json({ error: "נדרשת הרשאת ניהול" }, 401);

      const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      // נכשל סגור: שגיאה בבדיקת התפקיד אינה מזכה בגישה.
      if (roleError || isAdmin !== true) return json({ error: "נדרשת הרשאת ניהול" }, 403);
      return null;
    };

    // מגביל limit/offset לטווח סביר: קלט לא-מספרי (NaN) גורר range(offset, NaN)
    // שנכשל ב-500, וללא תקרה עליונה בקשה כמו limit=999999999 מכריחה סריקה מלאה.
    const clampInt = (raw: string | null, fallback: number, min: number, max: number) => {
      const n = Number.parseInt(raw ?? "", 10);
      if (!Number.isFinite(n)) return fallback;
      return Math.min(Math.max(n, min), max);
    };

    // ─── GET /api/lessons — approved lessons with filters ───
    if ((path === "lessons" || path === "") && method === "GET") {
      const limit = clampInt(url.searchParams.get("limit"), 100, 1, 200);
      const offset = clampInt(url.searchParams.get("offset"), 0, 0, 100000);
      const city = url.searchParams.get("city");
      const subject = url.searchParams.get("subject");
      const language = url.searchParams.get("language");
      const audience = url.searchParams.get("audience");
      const rabbi = url.searchParams.get("rabbi");

      let query = supabase
        .from("lessons")
        .select("*", { count: "exact" })
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (city) query = query.eq("city", city);
      if (subject) query = query.eq("subject", subject);
      if (language) query = query.eq("language", language);
      if (audience) query = query.contains("target_audience", [audience]);
      if (rabbi) query = query.ilike("rabbi_name", `%${rabbi}%`);

      const { data, count, error } = await query;
      if (error) return json({ error: error.message }, 500);
      return json({ data, total: count, limit, offset });
    }

    // ─── POST /api/lessons — submit a new lesson ───
    if (path === "lessons" && method === "POST") {
      const body = await req.json();
      const required = ["rabbi_name", "subject", "city"];
      for (const field of required) {
        if (!body[field]) return json({ error: `שדה חובה חסר: ${field}` }, 400);
      }
      const row = {
        rabbi_name: body.rabbi_name,
        subject: body.subject,
        city: body.city,
        neighborhood: body.neighborhood || "",
        street: body.street || "",
        street_number: body.street_number || "",
        synagogue_name: body.synagogue_name || "",
        language: body.language || "עברית",
        target_audience: body.target_audience || [],
        audience_type: body.audience_type || [],
        lesson_style: body.lesson_style || "",
        rabbi_role: body.rabbi_role || "",
        rabbi_phone: body.rabbi_phone || "",
        contact_name: body.contact_name || "",
        contact_phone: body.contact_phone || "",
        contact_email: body.contact_email || "",
        donation_link: body.donation_link || "",
        logo_url: body.logo_url || "",
        schedule_days: body.schedule_days || [],
        schedule_notes: body.schedule_notes || "",
        specific_date: body.specific_date || null,
        is_recurring: body.is_recurring || false,
        is_recorded: body.is_recorded || false,
        is_live_stream: body.is_live_stream || false,
        recording_location: body.recording_location || "",
        submitter_notes: body.submitter_notes || "",
        status: "pending",
        is_approved: false,
      };
      const { data, error } = await supabase.from("lessons").insert(row).select().single();
      if (error) return json({ error: error.message }, 500);
      return json({ data, message: "השיעור נשלח בהצלחה וממתין לאישור" }, 201);
    }

    // ─── GET /api/lesson/:id ───
    if (path.startsWith("lesson/") && method === "GET") {
      const id = path.replace("lesson/", "");
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", id)
        .eq("is_approved", true)
        .single();
      if (error) return json({ error: "שיעור לא נמצא" }, 404);
      return json({ data });
    }

    // ─── GET /api/stats ───
    if (path === "stats" && method === "GET") {
      const [lessons, teachers, seekers, contacts] = await Promise.all([
        supabase.from("lessons").select("id", { count: "exact", head: true }),
        supabase.from("teacher_leads").select("id", { count: "exact", head: true }),
        supabase.from("seeker_leads").select("id", { count: "exact", head: true }),
        supabase.from("contact_messages").select("id", { count: "exact", head: true }),
      ]);
      const approved = await supabase
        .from("lessons")
        .select("id", { count: "exact", head: true })
        .eq("is_approved", true);
      return json({
        lessons: { total: lessons.count, approved: approved.count },
        teacher_leads: teachers.count,
        seeker_leads: seekers.count,
        contact_messages: contacts.count,
      });
    }

    // ─── GET /api/teachers — לידים, ניהול בלבד ───
    if (path === "teachers" && method === "GET") {
      const denied = await requireAdmin();
      if (denied) return denied;
      const { data, error } = await supabase
        .from("teacher_leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);
      return json({ data });
    }

    // ─── POST /api/teachers — submit teacher lead ───
    if (path === "teachers" && method === "POST") {
      const body = await req.json();
      if (!body.full_name) return json({ error: "שדה חובה חסר: full_name" }, 400);
      const row = {
        full_name: body.full_name,
        phone: body.phone || "",
        email: body.email || "",
        city: body.city || "",
        subjects: body.subjects || [],
        experience: body.experience || "",
        notes: body.notes || "",
        status: "new",
      };
      const { data, error } = await supabase.from("teacher_leads").insert(row).select().single();
      if (error) return json({ error: error.message }, 500);
      return json({ data, message: "הפנייה נשלחה בהצלחה" }, 201);
    }

    // ─── GET /api/seekers — לידים, ניהול בלבד ───
    if (path === "seekers" && method === "GET") {
      const denied = await requireAdmin();
      if (denied) return denied;
      const { data, error } = await supabase
        .from("seeker_leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);
      return json({ data });
    }

    // ─── POST /api/seekers — submit seeker lead ───
    if (path === "seekers" && method === "POST") {
      const body = await req.json();
      if (!body.contact_name) return json({ error: "שדה חובה חסר: contact_name" }, 400);
      const row = {
        contact_name: body.contact_name,
        phone: body.phone || "",
        email: body.email || "",
        city: body.city || "",
        subject: body.subject || "",
        lesson_type: body.lesson_type || "",
        audience_type: body.audience_type || "",
        preferred_time: body.preferred_time || "",
        notes: body.notes || "",
        status: "new",
      };
      const { data, error } = await supabase.from("seeker_leads").insert(row).select().single();
      if (error) return json({ error: error.message }, 500);
      return json({ data, message: "הבקשה נשלחה בהצלחה" }, 201);
    }

    // ─── GET /api/contacts — פניות, ניהול בלבד ───
    if (path === "contacts" && method === "GET") {
      const denied = await requireAdmin();
      if (denied) return denied;
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);
      return json({ data });
    }

    // ─── POST /api/contacts — submit contact message ───
    if (path === "contacts" && method === "POST") {
      const body = await req.json();
      if (!body.name) return json({ error: "שדה חובה חסר: name" }, 400);
      const row = {
        name: body.name,
        phone: body.phone || "",
        email: body.email || "",
        role: body.role || "",
        subject: body.subject || "",
        message: body.message || "",
        status: "new",
      };
      const { data, error } = await supabase.from("contact_messages").insert(row).select().single();
      if (error) return json({ error: error.message }, 500);
      return json({ data, message: "ההודעה נשלחה בהצלחה" }, 201);
    }

    // ─── GET /api/cities ───
    if (path === "cities" && method === "GET") {
      const { data } = await supabase.from("lessons").select("city").eq("is_approved", true);
      const cities = [...new Set((data || []).map((r: any) => r.city).filter(Boolean))];
      return json({ data: cities });
    }

    // ─── GET /api/subjects ───
    if (path === "subjects" && method === "GET") {
      const { data } = await supabase.from("lessons").select("subject").eq("is_approved", true);
      const subjects = [...new Set((data || []).map((r: any) => r.subject).filter(Boolean))];
      return json({ data: subjects });
    }

    // ─── GET /api/search — free text search across lessons ───
    if (path === "search" && method === "GET") {
      const q = url.searchParams.get("q") || "";
      const limit = clampInt(url.searchParams.get("limit"), 20, 1, 100);
      if (!q) return json({ error: "חסר פרמטר חיפוש q" }, 400);

      // PostgREST מפרש פסיק/סוגריים ב-.or() כמפרידי-תנאים/קבוצות — בלי בריחה,
      // חיפוש כמו q="a,is_approved.eq.false" יכול לצרף תנאי-מסנן משלו לשאילתה.
      const escaped = q.replace(/[,()]/g, "\\$&");

      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("is_approved", true)
        .or(`rabbi_name.ilike.%${escaped}%,subject.ilike.%${escaped}%,city.ilike.%${escaped}%,neighborhood.ilike.%${escaped}%,synagogue_name.ilike.%${escaped}%`)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) return json({ error: error.message }, 500);
      return json({ data, query: q, count: data?.length || 0 });
    }

    return json({
      error: "Endpoint not found",
      available_endpoints: {
        GET: ["/lessons", "/lesson/:id", "/search?q=...", "/stats", "/cities", "/subjects"],
        GET_admin_only: ["/teachers", "/seekers", "/contacts"],
        POST: ["/lessons", "/teachers", "/seekers", "/contacts"],
      },
    }, 404);
  } catch (e) {
    console.error("API error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
