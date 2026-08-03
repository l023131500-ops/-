// ---------------------------------------------------------------------------
// חיבור אופציונלי ל-Supabase (סופאבייס נפרד לנתוני הקופות)
// אם SUPABASE_URL + SUPABASE_ANON_KEY מוגדרים — פניות "מעבר קופה" נכתבות
// לסכמת kupot ב-Supabase (מאגר עצמאי, נגיש גם לניהול של בקלות).
// אם לא מוגדר — נופלים בחזרה ל-SQLite המקומי בלבד.
// חשיפה ציבורית: הכנסת ליד בלבד (insert). אין קריאה ציבורית של פניות.
// ---------------------------------------------------------------------------
import type {
  InsertSwitchLead,
  HfTopic,
  FundAvailable,
} from "@shared/schema";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
// ה-PostgREST של פרויקט ה-hub חושף רק public/graphql_public/nadlan, ולכן
// בפריסה תחת more30.com הטבלאות (hf_topics / hf_switch_leads) יושבות ב-public.
// ברירת המחדל נשמרת כדי שהמאגר העצמאי המקורי (סכמת kupot) ימשיך לעבוד.
const SCHEMA = process.env.SUPABASE_SCHEMA || "kupot";

export function supabaseEnabled(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

// בסביבת פרודקשן סרברלס (Vercel) קוראים נושאים מ-Supabase במקום SQLite.
export function useSupabaseStore(): boolean {
  return process.env.DATA_STORE === "supabase" && supabaseEnabled();
}

function mapTopicRow(r: any): HfTopic {
  let funds: FundAvailable[] = [];
  const raw = r.funds_available;
  if (Array.isArray(raw)) funds = raw as FundAvailable[];
  else if (typeof raw === "string") {
    try {
      funds = JSON.parse(raw) as FundAvailable[];
    } catch {
      funds = [];
    }
  }
  return {
    id: r.id,
    catalogNo: r.catalog_no ?? null,
    kind: r.kind ?? "fund",
    category: r.category ?? "",
    subCategory: r.sub_category ?? "",
    topic: r.topic ?? "",
    audience: r.audience ?? "",
    benefitSummary: r.benefit_summary ?? "",
    rangeText: r.range_text ?? "",
    bestFund: r.best_fund ?? "",
    publicSiteText: r.public_site_text ?? "",
    sourceName: r.source_name ?? "",
    serviceUrl: r.service_url ?? "",
    fundsAvailable: funds,
  };
}

const readHeaders = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Accept-Profile": SCHEMA,
};

export async function fetchTopicsFromSupabase(): Promise<HfTopic[]> {
  const url = `${SUPABASE_URL}/rest/v1/hf_topics?select=*&order=catalog_no.asc&limit=2000`;
  const resp = await fetch(url, { headers: readHeaders });
  if (!resp.ok) throw new Error(`supabase topics ${resp.status}`);
  const rows = (await resp.json()) as any[];
  return rows.map(mapTopicRow);
}

export async function fetchTopicFromSupabase(
  id: number
): Promise<HfTopic | undefined> {
  const url = `${SUPABASE_URL}/rest/v1/hf_topics?select=*&id=eq.${id}&limit=1`;
  const resp = await fetch(url, { headers: readHeaders });
  if (!resp.ok) throw new Error(`supabase topic ${resp.status}`);
  const rows = (await resp.json()) as any[];
  return rows.length ? mapTopicRow(rows[0]) : undefined;
}

// כתיבת ליד ל-Supabase. מחזיר true בהצלחה, אחרת false (בלי לזרוק).
export async function insertLeadToSupabase(
  lead: InsertSwitchLead
): Promise<boolean> {
  if (!supabaseEnabled()) return false;
  try {
    const row = {
      topic_id: lead.topicId ?? null,
      topic: lead.topic ?? "",
      full_name: lead.fullName,
      phone: lead.phone,
      email: lead.email ?? "",
      id_number: lead.idNumber ?? "",
      city: lead.city ?? "",
      current_fund: lead.currentFund ?? "",
      current_supplemental: lead.currentSupplemental ?? "",
      target_fund: lead.targetFund ?? "",
      people_count: lead.peopleCount ?? "",
      note: lead.note ?? "",
      status: "new",
    };
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/hf_switch_leads`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        "Content-Profile": SCHEMA,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });
    if (!resp.ok) {
      // eslint-disable-next-line no-console
      console.error("[supabase] lead insert failed", resp.status, await resp.text());
      return false;
    }
    return true;
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("[supabase] lead insert error", err?.message || err);
    return false;
  }
}
