import { createFileRoute } from "@tanstack/react-router";

// Yemot HaMashiach (ימות המשיח) IVR endpoint — flagship CRM spec item 8.
//
// A tenant configures an extension on their Yemot system with `type=api` and
// `api_link=<this url>?tenant=<tenant_id>&key=<voice.api_secret>`. Yemot then
// calls this URL on every step of the call (GET by default, POST form if
// `api_url_post=yes`), re-sending every value already read in the same call,
// so the whole flow is a stateless state machine over the accumulated params:
//
//   identify (caller phone / keyed ID number) → main menu →
//     1 record expense / 2 record income  → amount → category → ledger insert
//     3 hear this month's summary            (income / expense / balance)
//     4 hear budget status per category      (spent vs. monthly limit)
//
// Ledger rows are written to client_transactions with source='voice' — the
// exact slot the finance-ledger migration reserved for this extension — and
// every completed action is also logged as an inbound `voice` message on the
// client file (external_message_id doubles as the idempotency key, so a
// replayed Yemot request can never double-charge the ledger).
//
// Yemot response grammar (official API-module docs): plain text UTF-8;
// commands chained with `&`; announcement parts chained with `.` using
// t- (TTS) / n- (number) prefixes; digit input via
//   read=<parts>=<name>,<reuse>,<max>,<min>,<timeout>,<format>,<block *>,<allow 0>
// The delimiters = & . , are therefore reserved and stripped from all
// dynamic TTS text.

type VoiceSettings = {
  enabled?: boolean;
  api_secret?: string;
  yemot_phone?: string;
  yemot_extension?: string;
  id_method?: "phone" | "phone_id" | "id";
};

type ClientLite = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  imot_id: string | null;
  id_number: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CLIENT_COLS = "id, first_name, last_name, phone, imot_id, id_number";

// Voice menus deliberately use short TTS labels; keys match the ledger's
// category keys (finance.ts EXPENSE_CATEGORIES / INCOME_CATEGORIES).
const EXPENSE_VOICE: Record<string, { key: string; label: string }> = {
  "1": { key: "housing", label: "דיור" },
  "2": { key: "groceries", label: "מזון וסופר" },
  "3": { key: "utilities", label: "חשבונות" },
  "4": { key: "communication", label: "תקשורת" },
  "5": { key: "education", label: "חינוך" },
  "6": { key: "health", label: "בריאות" },
  "7": { key: "transport", label: "תחבורה" },
  "8": { key: "insurance", label: "ביטוחים" },
  "9": { key: "loans", label: "החזרי הלוואות" },
  "0": { key: "other_expense", label: "אחר" },
};
const INCOME_VOICE: Record<string, { key: string; label: string }> = {
  "1": { key: "salary", label: "משכורת" },
  "2": { key: "spouse_salary", label: "משכורת בן או בת זוג" },
  "3": { key: "business", label: "עסק" },
  "4": { key: "allowance", label: "קצבה" },
  "5": { key: "rental", label: "שכירות" },
  "6": { key: "support", label: "תמיכה" },
  "7": { key: "gift", label: "מתנה" },
  "0": { key: "other_income", label: "אחר" },
};
const VOICE_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  [...Object.values(EXPENSE_VOICE), ...Object.values(INCOME_VOICE)].map((c) => [c.key, c.label]),
);

// --- Yemot response builders -------------------------------------------------

/** Strip Yemot's reserved delimiters (= & . ,) out of dynamic TTS text. */
const tts = (s: string) => s.replace(/[=&.,]/g, " ").replace(/\s+/g, " ").trim();
const t = (s: string) => `t-${tts(s)}`;
const n = (v: number) => `n-${Math.round(Math.abs(v))}`;
const say = (...parts: string[]) => `id_list_message=${parts.join(".")}`;
const sayBye = (...parts: string[]) =>
  `${say(...parts, t("תודה ולהתראות"))}&go_to_folder=hangup`;
/** Digit input: no reuse of prior value, 30s timeout, * allowed, 0 allowed. */
const readDigits = (parts: string[], name: string, max: number, min = 1) =>
  `read=${parts.join(".")}=${name},no,${max},${min},30,,no,yes`;

const plain = (body: string) =>
  new Response(body, { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } });

// --- identifier normalization ------------------------------------------------

const digitsOnly = (v: string) => v.replace(/\D/g, "");
/** 9725x… → 05x…; keeps local numbers as-is. */
const normPhone = (v: string) => {
  const d = digitsOnly(v);
  return d.startsWith("972") ? `0${d.slice(3)}` : d;
};
/** ID numbers compare digits-only without leading zeros. */
const normTz = (v: string) => digitsOnly(v).replace(/^0+/, "");

async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const params = new URLSearchParams(url.search);
  if (request.method === "POST") {
    const body = await request.text().catch(() => "");
    for (const [k, v] of new URLSearchParams(body)) if (!params.has(k)) params.set(k, v);
  }
  const p = (k: string) => params.get(k)?.trim() ?? "";

  try {
    // Yemot pings the same URL with hangup=yes when the caller disconnects —
    // acknowledge and stop, nothing to roll back (writes happen atomically
    // right before our own hangup command).
    if (p("hangup") === "yes") return plain("ok");

    const tenantId = p("tenant");
    const key = p("key");
    if (!UUID_RE.test(tenantId) || !key)
      return plain(sayBye(t("שגיאת הגדרה בקישור השלוחה")));

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tenant, error: tenantErr } = await supabaseAdmin
      .from("tenants").select("id, name, settings").eq("id", tenantId).maybeSingle();
    if (tenantErr) throw tenantErr;
    const voice = ((tenant?.settings as Record<string, unknown> | null)?.voice ?? {}) as VoiceSettings;
    if (!tenant || voice.enabled !== true || !voice.api_secret || voice.api_secret !== key)
      return plain(sayBye(t("השירות הקולי אינו פעיל")));

    const idMethod =
      voice.id_method === "phone" || voice.id_method === "id" ? voice.id_method : "phone_id";
    const callerPhone = normPhone(p("ApiPhone"));

    // --- identify the client -------------------------------------------------
    let phoneMatches: ClientLite[] = [];
    if (idMethod !== "id" && callerPhone.length >= 7) {
      const last7 = callerPhone.slice(-7);
      const { data, error } = await supabaseAdmin
        .from("clients").select(CLIENT_COLS)
        .eq("tenant_id", tenantId)
        .or(`phone.ilike.*${last7},imot_id.ilike.*${last7}`);
      if (error) throw error;
      phoneMatches = (data ?? []).filter(
        (c) => normPhone(c.phone ?? "") === callerPhone || normPhone(c.imot_id ?? "") === callerPhone,
      );
    }

    let client: ClientLite | null = null;
    if (idMethod === "phone" && phoneMatches.length === 1) client = phoneMatches[0];

    if (!client) {
      const findByTz = async (tz: string): Promise<ClientLite | null> => {
        if (tz.length < 5) return null;
        // Prefer the caller's own phone matches (e.g. spouses sharing a file
        // phone), then fall back to a tenant-wide ID lookup so a client can
        // still identify from an unregistered phone.
        const local = phoneMatches.find((c) => normTz(c.id_number ?? "") === tz);
        if (local) return local;
        const { data, error } = await supabaseAdmin
          .from("clients").select(CLIENT_COLS)
          .eq("tenant_id", tenantId)
          .ilike("id_number", `%${tz.slice(-5)}%`)
          .limit(50);
        if (error) throw error;
        return (data ?? []).find((c) => normTz(c.id_number ?? "") === tz) ?? null;
      };

      const zehut = p("zehut");
      if (!zehut)
        return plain(readDigits([
          t(`שלום וברוכים הבאים למערכת של ${tenant.name ?? ""}`),
          t("לזיהוי אנא הקש את מספר תעודת הזהות ולסיום הקש סולמית"),
        ], "zehut", 9, 5));
      client = await findByTz(normTz(p("zehut_retry") || zehut));
      if (!client && !p("zehut_retry"))
        return plain(readDigits([
          t("מספר הזהות שהוקש לא נמצא במערכת"),
          t("אנא הקש שוב את מספר תעודת הזהות ולסיום הקש סולמית"),
        ], "zehut_retry", 9, 5));
      if (!client)
        return plain(sayBye(t("לא הצלחנו לזהות אותך"), t("אנא פנה למשרד בשעות הפעילות")));
    }

    // --- main menu -----------------------------------------------------------
    const MENU_PARTS = [
      t("לרישום הוצאה הקש 1"),
      t("לרישום הכנסה הקש 2"),
      t("לשמיעת סיכום החודש הקש 3"),
      t("לשמיעת מצב התקציב הקש 4"),
    ];
    if (!p("menu"))
      return plain(readDigits([t(`שלום ${client.first_name} ${client.last_name}`), ...MENU_PARTS], "menu", 1, 1));
    const menu = p("menu_retry") || p("menu");

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const pad = (x: number) => String(x).padStart(2, "0");
    const monthFrom = `${y}-${pad(m)}-01`;
    const monthTo = m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1)}-01`;

    if (menu === "3" || menu === "4") {
      const { data: txs, error } = await supabaseAdmin
        .from("client_transactions").select("kind, category, amount")
        .eq("client_id", client.id).gte("occurred_on", monthFrom).lt("occurred_on", monthTo);
      if (error) throw error;
      let income = 0;
      let expense = 0;
      const spentByCategory: Record<string, number> = {};
      for (const tx of txs ?? []) {
        const amount = Number(tx.amount) || 0;
        if (tx.kind === "income") income += amount;
        else {
          expense += amount;
          spentByCategory[tx.category] = (spentByCategory[tx.category] ?? 0) + amount;
        }
      }

      if (menu === "3") {
        const net = income - expense;
        return plain(sayBye(
          t("סיכום החודש הנוכחי"),
          t("סך ההכנסות"), n(income), t("שקלים"),
          t("סך ההוצאות"), n(expense), t("שקלים"),
          ...(net >= 0
            ? [t("היתרה החודשית היא"), n(net), t("שקלים")]
            : [t("הגירעון החודשי הוא"), n(-net), t("שקלים")]),
        ));
      }

      const { data: limits, error: limitsErr } = await supabaseAdmin
        .from("client_budget_limits").select("category, monthly_limit")
        .eq("client_id", client.id).order("category");
      if (limitsErr) throw limitsErr;
      if (!limits?.length)
        return plain(sayBye(t("עדיין לא הוגדרו תקרות תקציב בתיק שלך"), t("ניתן להגדיר אותן באזור האישי")));
      const parts = [t("מצב התקציב לחודש הנוכחי")];
      for (const limit of limits.slice(0, 6)) {
        parts.push(
          t(`בקטגוריה ${VOICE_CATEGORY_LABELS[limit.category] ?? "אחר"} נוצלו`),
          n(spentByCategory[limit.category] ?? 0),
          t("מתוך"), n(Number(limit.monthly_limit)), t("שקלים"),
        );
      }
      if (limits.length > 6) parts.push(t("קיימות קטגוריות נוספות באזור האישי"));
      return plain(sayBye(...parts));
    }

    if (menu === "1" || menu === "2") {
      const kind = menu === "1" ? "expense" : "income";
      const catMap = menu === "1" ? EXPENSE_VOICE : INCOME_VOICE;
      const kindWord = menu === "1" ? "ההוצאה" : "ההכנסה";

      if (!p("amount"))
        return plain(readDigits([t(`הקש את סכום ${kindWord} בשקלים ולסיום הקש סולמית`)], "amount", 7, 1));
      const amount = parseInt(digitsOnly(p("amount_retry") || p("amount")), 10);
      if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
        if (!p("amount_retry"))
          return plain(readDigits([
            t("הסכום שהוקש אינו תקין"),
            t("אנא הקש שוב את הסכום בשקלים ולסיום הקש סולמית"),
          ], "amount_retry", 7, 1));
        return plain(sayBye(t("הסכום שהוקש אינו תקין")));
      }

      if (!p("cat")) {
        const catText = Object.entries(catMap).map(([digit, c]) => `ל${c.label} הקש ${digit}`).join(" ");
        return plain(readDigits([t(`לבחירת קטגוריה ${catText}`)], "cat", 1, 1));
      }
      const chosen = catMap[p("cat")] ?? catMap["0"];

      // One ledger write per call: Yemot's ApiCallId is unique per call and is
      // stored on the timeline message — a replayed/duplicated request hits
      // this guard instead of the ledger.
      const apiCallId = p("ApiCallId");
      if (apiCallId) {
        const { data: existing, error } = await supabaseAdmin
          .from("messages").select("id")
          .eq("tenant_id", tenantId).eq("external_message_id", `yemot:${apiCallId}`)
          .maybeSingle();
        if (error) throw error;
        if (existing) return plain(sayBye(t("הפעולה כבר נרשמה")));
      }

      const { error: insertErr } = await supabaseAdmin.from("client_transactions").insert({
        tenant_id: tenantId,
        client_id: client.id,
        kind,
        category: chosen.key,
        amount,
        description: "הוזן טלפונית בשלוחת ימות המשיח",
        source: "voice",
      });
      if (insertErr) throw insertErr;

      // Timeline + idempotency record; the ledger row is already safe, so a
      // failure here only costs the dedupe guard — log and keep the call OK.
      const { error: msgErr } = await supabaseAdmin.from("messages").insert({
        tenant_id: tenantId,
        client_id: client.id,
        channel: "voice",
        direction: "inbound",
        status: "received",
        external_message_id: apiCallId ? `yemot:${apiCallId}` : null,
        content:
          `רישום קולי (ימות המשיח): ${kind === "expense" ? "הוצאה" : "הכנסה"} בסך ${amount} ₪ ` +
          `בקטגוריה ${chosen.label}${callerPhone ? `, משיחה מהמספר ${callerPhone}` : ""}`,
      });
      if (msgErr) console.error("[yemot-ivr] message log failed", msgErr);

      return plain(sayBye(
        kind === "expense" ? t("נרשמה הוצאה בסך") : t("נרשמה הכנסה בסך"),
        n(amount),
        t(`שקלים בקטגוריה ${chosen.label}`),
      ));
    }

    // Unrecognized menu digit — one retry, then goodbye.
    if (!p("menu_retry"))
      return plain(readDigits([t("בחירה לא תקינה"), ...MENU_PARTS], "menu_retry", 1, 1));
    return plain(sayBye(t("בחירה לא תקינה")));
  } catch (e) {
    console.error("[yemot-ivr]", e);
    return plain(`${say(t("אירעה שגיאה זמנית"), t("אנא נסה שוב מאוחר יותר"))}&go_to_folder=hangup`);
  }
}

export const Route = createFileRoute("/api/public/yemot-ivr")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
