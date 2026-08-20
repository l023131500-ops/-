// Direct-to-Supabase client for SMEL NDLN.
//
// The published site is fully static (served from S3) with no live backend
// process, so all data calls go straight to Supabase from the browser:
//   * research  -> Edge Function  nadlan-smart-research  (verify_jwt=false)
//   * questionnaire -> PostgREST   nadlan.questionnaire_templates
//   * lead insert   -> PostgREST   nadlan.research_leads  (anon INSERT via RLS)
//
// The publishable/anon key is safe to expose in the client (RLS enforced).

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  "https://csjekrvukbdznetsrodj.supabase.co";
const ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  "sb_publishable_Bv6ysG9LfUZ2lUPgZVZO6g_l1wEZIlX";

// ---- Fallback questionnaire (mirrors nadlan.questionnaire_templates) ----
export const FALLBACK_QUESTIONNAIRE = [
  {
    section: "מטרת הרכישה",
    items: [
      { key: "purpose", type: "single", label: "מהי מטרת הרכישה?", options: ["מגורים", "השקעה להשכרה", "השקעה להשבחה/מכירה", "דירה לילדים"] },
      { key: "horizon", type: "single", label: "אופק ההחזקה המתוכנן", options: ["עד 3 שנים", "3-7 שנים", "7+ שנים"] },
    ],
  },
  {
    section: "תקציב ומימון",
    items: [
      { key: "budget", type: "number", label: "תקציב כולל (₪)" },
      { key: "equity", type: "number", label: "הון עצמי זמין (₪)" },
      { key: "mortgage_approved", type: "single", label: "האם יש אישור עקרוני למשכנתא?", options: ["כן", "לא", "בתהליך"] },
      { key: "monthly_capacity", type: "number", label: "החזר חודשי אפשרי (₪)" },
    ],
  },
  {
    section: "מאפייני הנכס הרצוי",
    items: [
      { key: "rooms", type: "single", label: "מספר חדרים רצוי", options: ["2", "3", "4", "5+"] },
      { key: "size_sqm", type: "number", label: 'שטח רצוי (מ"ר)' },
      { key: "floor_pref", type: "single", label: "העדפת קומה", options: ["קרקע/גן", "אמצע", "גבוהה", "פנטהאוז"] },
      { key: "parking", type: "single", label: "חניה הכרחית?", options: ["כן", "רצוי", "לא"] },
      { key: "elevator", type: "single", label: "מעלית הכרחית?", options: ["כן", "לא"] },
      { key: "condition", type: "single", label: "מצב הנכס", options: ["חדש מקבלן", "משופץ", "דורש שיפוץ", "לא משנה"] },
    ],
  },
  {
    section: "שיקולי סביבה",
    items: [
      { key: "prox_transit", type: "scale", label: "חשיבות קרבה לתחבורה ציבורית", min: 1, max: 5 },
      { key: "prox_school", type: "scale", label: "חשיבות קרבה למוסדות חינוך", min: 1, max: 5 },
      { key: "prox_synagogue", type: "scale", label: "חשיבות קרבה לבית כנסת/מוסדות דת", min: 1, max: 5 },
      { key: "prox_center", type: "scale", label: "חשיבות קרבה למרכזי מסחר", min: 1, max: 5 },
      { key: "quiet_roads", type: "scale", label: "רגישות לרעש מכבישים ראשיים", min: 1, max: 5 },
      { key: "community", type: "single", label: "התאמת אופי הקהילה", options: ["חילוני", "דתי-לאומי", "חרדי", "מעורב", "לא משנה"] },
    ],
  },
  {
    section: "שיקולי השבחה וסיכון",
    items: [
      { key: "urban_renewal_interest", type: "single", label: "עניין בפינוי-בינוי/תמא 38", options: ["מחפש במיוחד", "יתרון", "לא רלוונטי", "חשש"] },
      { key: "risk_tolerance", type: "single", label: "רמת סיכון מקובלת", options: ["נמוכה", "בינונית", "גבוהה"] },
      { key: "yield_target", type: "number", label: "תשואת שכירות מטרה (%)" },
    ],
  },
  {
    section: "פרטי התקשרות",
    items: [
      { key: "contact_time", type: "single", label: "זמן מועדף ליצירת קשר", options: ["בוקר", "צהריים", "ערב"] },
      { key: "notes", type: "text", label: "הערות נוספות" },
    ],
  },
];

// ---- Research: call the Supabase Edge Function directly ----
export async function fetchResearch(address: string): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/nadlan-smart-research`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ address }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "שירות המחקר אינו זמין כרגע");
  }
  try {
    return await res.json();
  } catch {
    // A 200 OK with a body that isn't valid JSON (truncated response, proxy
    // error page, etc.) must still surface the same Hebrew message the toast
    // expects, not a raw "Unexpected token" SyntaxError.
    throw new Error("שירות המחקר אינו זמין כרגע");
  }
}

// ---- Questionnaire: active template from PostgREST, else fallback ----
export async function fetchQuestionnaire(): Promise<{ title: string; sections: any[] }> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/questionnaire_templates?active=eq.true&select=*`,
      {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
          "Accept-Profile": "nadlan",
        },
      },
    );
    if (res.ok) {
      const rows = await res.json();
      const tmpl = Array.isArray(rows) ? rows[0] : null;
      if (tmpl?.questions) {
        return {
          title: tmpl.title ?? "שאלון התאמה אישית",
          sections: tmpl.questions,
        };
      }
    }
  } catch {
    // fall through to fallback
  }
  return { title: "שאלון כדאיות רכישת דירה", sections: FALLBACK_QUESTIONNAIRE };
}

// ---- Lead: insert into nadlan.research_leads (anon INSERT via RLS) ----
export interface LeadPayload {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  profileId?: number | null;
  answers?: Record<string, any> | null;
}

export async function submitLead(payload: LeadPayload): Promise<{ ok: boolean }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/research_leads`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
      "Content-Profile": "nadlan",
      "Accept-Profile": "nadlan",
    },
    body: JSON.stringify({
      full_name: payload.fullName,
      phone: payload.phone,
      email: payload.email,
      query_address: payload.address,
      profile_id: payload.profileId ?? null,
      questionnaire: payload.answers ?? null,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "השליחה נכשלה");
  }
  return { ok: true };
}
