import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_MENU = {
  id: "root",
  text: "שלום וברוכים הבאים לאיגוד השיעורים, הארגון העולמי של שיעורי התורה.",
  options: [
    { key: "1", label: "חיפוש שיעור", action: "goto", target: "search_language" },
    { key: "2", label: "עדכון שיעור קיים", action: "goto", target: "update_lesson" },
    { key: "3", label: "הקמת שיעור חדש", action: "goto", target: "request_lesson" },
    { key: "4", label: "הצטרפות כמגיד שיעור", action: "goto", target: "register_teacher" },
    { key: "0", label: "שיחה עם נציג", action: "transfer", target: "0231330600" },
  ],
  children: {
    search_language: {
      id: "search_language",
      text: "באיזו שפה אתם מחפשים שיעור?",
      options: [
        { key: "1", label: "עברית", action: "set_param", param: "language", value: "עברית", next: "search_subject" },
        { key: "2", label: "אידיש", action: "set_param", param: "language", value: "אידיש", next: "search_subject" },
        { key: "3", label: "אנגלית", action: "set_param", param: "language", value: "אנגלית", next: "search_subject" },
        { key: "9", label: "חזרה", action: "goto", target: "root" },
      ],
    },
    search_subject: {
      id: "search_subject",
      text: "באיזה נושא אתם מתעניינים?",
      options: [
        { key: "1", label: "גמרא", action: "set_param", param: "subject", value: "גמרא", next: "search_city" },
        { key: "2", label: "הלכה", action: "set_param", param: "subject", value: "הלכה", next: "search_city" },
        { key: "3", label: "פרשת שבוע", action: "set_param", param: "subject", value: "פרשת שבוע", next: "search_city" },
        { key: "4", label: "מוסר וחסידות", action: "set_param", param: "subject", value: "מוסר", next: "search_city" },
        { key: "5", label: "דף יומי", action: "set_param", param: "subject", value: "דף יומי", next: "search_city" },
        { key: "9", label: "חזרה", action: "goto", target: "search_language" },
      ],
    },
    search_city: {
      id: "search_city",
      text: "אנא הקישו את שם העיר או הקישו כוכבית לכל הערים.",
      options: [
        { key: "*", label: "כל הערים", action: "search", params: {} },
      ],
    },
    update_lesson: {
      id: "update_lesson",
      text: "כדי לעדכן שיעור קיים, אנא השאירו הודעה עם שם הרב ופרטי השיעור לאחר הצפצוף.",
      options: [
        { key: "*", label: "הקלטת הודעה", action: "record", type: "update_lesson" },
        { key: "9", label: "חזרה", action: "goto", target: "root" },
      ],
    },
    request_lesson: {
      id: "request_lesson",
      text: "רוצים שנמצא לכם מגיד שיעור? השאירו הודעה עם פרטי הבקשה.",
      options: [
        { key: "*", label: "הקלטת הודעה", action: "record", type: "request_lesson" },
        { key: "9", label: "חזרה", action: "goto", target: "root" },
      ],
    },
    register_teacher: {
      id: "register_teacher",
      text: "מעוניינים להצטרף כמגידי שיעור? השאירו פרטים ונחזור אליכם.",
      options: [
        { key: "*", label: "הקלטת הודעה", action: "record", type: "register_teacher" },
        { key: "9", label: "חזרה", action: "goto", target: "root" },
      ],
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data } = await supabase
      .from("ivr_menu_config")
      .select("menu_tree")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    const menu = data?.menu_tree || DEFAULT_MENU;

    return new Response(JSON.stringify({ success: true, menu }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ success: true, menu: DEFAULT_MENU }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
