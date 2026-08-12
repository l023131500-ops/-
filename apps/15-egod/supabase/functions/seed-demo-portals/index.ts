import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const demos = [
  {
    email: "rabbi.cohen@igud-shiurim.org",
    password: "Cohen2026!",
    full_name: "הרב יעקב כהן",
    phone: "0501234567",
    portal_type: "rabbi",
    organization_name: null,
    city: "ירושלים",
    neighborhood: "גאולה",
    subjects: ["גמרא עיון", "הלכה"],
    bio: "מגיד שיעור גמרא ותיק, מלמד למעלה מ-20 שנה.",
    lesson: { subject: "גמרא מסכת ברכות", days: ["ראשון", "שלישי"], time: "20:00" },
  },
  {
    email: "rabbi.levi@igud-shiurim.org",
    password: "Levi2026!",
    full_name: "הרב משה לוי",
    phone: "0527654321",
    portal_type: "synagogue",
    organization_name: "בית כנסת אהל יעקב",
    city: "בני ברק",
    neighborhood: "רמת אלחנן",
    subjects: ["דף יומי", "עין יעקב"],
    bio: "רב בית הכנסת אהל יעקב, שיעורים יומיים.",
    lesson: { subject: "דף היומי", days: ["יומי"], time: "06:15" },
  },
  {
    email: "admin@torathaim.org",
    password: "Torah2026!",
    full_name: "ארגון תורת חיים",
    phone: "037778899",
    portal_type: "organization",
    organization_name: "ארגון תורת חיים",
    city: "תל אביב",
    neighborhood: "מרכז",
    subjects: ["חושן משפט", "עמוד יומי"],
    bio: "ארגון להפצת שיעורי תורה ברחבי הארץ.",
    lesson: { subject: "חושן משפט", days: ["חמישי"], time: "21:00" },
  },
];

const jr = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // ── שער ─────────────────────────────────────────────────────────────────
  // הפונקציה רצה עם SERVICE_ROLE ויוצרת משתמשים מאושרים עם סיסמאות קבועות.
  // verify_jwt לבדו אינו הגנה — מפתח ה-anon הוא JWT תקין שנשלח לכל דפדפן.
  // לכן: POST + SEED_SECRET בלבד, ובלי הסוד המוגדר בסביבה הפונקציה מתה.
  // אף מסך באפליקציה אינו קורא לה (רק Invite.tsx קורא ל-activate-invite).
  const seedSecret = Deno.env.get("SEED_SECRET");
  if (!seedSecret) return jr({ ok: false, error: "seeding disabled" }, 403);
  if (req.method !== "POST") return jr({ ok: false, error: "method not allowed" }, 405);
  if (req.headers.get("x-seed-secret") !== seedSecret)
    return jr({ ok: false, error: "forbidden" }, 403);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const results: any[] = [];

  for (const d of demos) {
    try {
      // Create or fetch existing auth user
      let userId: string | null = null;
      const { data: created, error: cErr } = await supabase.auth.admin.createUser({
        email: d.email,
        password: d.password,
        email_confirm: true,
        user_metadata: { full_name: d.full_name },
      });

      if (cErr && !String(cErr.message).toLowerCase().includes("already")) {
        results.push({ email: d.email, error: cErr.message });
        continue;
      }
      userId = created?.user?.id ?? null;
      if (!userId) {
        const { data: list } = await supabase.auth.admin.listUsers();
        userId = list?.users?.find((u: any) => u.email?.toLowerCase() === d.email.toLowerCase())?.id ?? null;
      }
      if (!userId) {
        results.push({ email: d.email, error: "no user id" });
        continue;
      }

      // Upsert profile
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      let profileId = existing?.id;
      if (!profileId) {
        const { data: ins, error: pErr } = await supabase
          .from("profiles")
          .insert({
            user_id: userId,
            full_name: d.full_name,
            email: d.email,
            phone: d.phone,
            portal_type: d.portal_type,
            organization_name: d.organization_name,
            city: d.city,
            neighborhood: d.neighborhood,
            subjects: d.subjects,
            bio: d.bio,
            is_approved: true,
          })
          .select("id")
          .single();
        if (pErr) {
          results.push({ email: d.email, error: pErr.message });
          continue;
        }
        profileId = ins.id;
      } else {
        await supabase
          .from("profiles")
          .update({
            full_name: d.full_name,
            phone: d.phone,
            portal_type: d.portal_type,
            organization_name: d.organization_name,
            city: d.city,
            neighborhood: d.neighborhood,
            subjects: d.subjects,
            bio: d.bio,
            is_approved: true,
          })
          .eq("id", profileId);
      }

      // Sample lesson
      const { data: existingLesson } = await supabase
        .from("lessons")
        .select("id")
        .eq("teacher_id", profileId)
        .maybeSingle();

      if (!existingLesson) {
        await supabase.from("lessons").insert({
          teacher_id: profileId,
          subject: d.lesson.subject,
          city: d.city,
          neighborhood: d.neighborhood,
          schedule_days: d.lesson.days,
          schedule_time: d.lesson.time,
          is_active: true,
          language: "עברית",
        });
      }

      results.push({ email: d.email, profileId, ok: true });
    } catch (e: any) {
      results.push({ email: d.email, error: e.message });
    }
  }

  // Sample lead
  const { data: leadExists } = await supabase
    .from("leads")
    .select("id")
    .eq("phone", "0541112222")
    .maybeSingle();
  if (!leadExists) {
    await supabase.from("leads").insert({
      full_name: "דוד ישראלי",
      phone: "0541112222",
      area: "ירושלים",
      preferred_subject: "גמרא עיון",
      preferred_times: "ערב",
      status: "new",
    });
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});