// מדידת 0090 מעל HTTP — המכריע כותב למה הכריע, והיומן שומר את זה.
//
// הקובץ רץ פעמיים — לפני החלת המיגרציה ואחריה — מאותו קובץ בדיוק (תקלת 0087:
// שתי גרסאות של probe הן שתי מדידות ולא אחת), עם אותם גופי בקשה מילה במילה,
// על ארבע פניות משלה לכל ריצה. ההבדל היחיד בין הריצות הוא הפונקציה שרצה בצד
// השני.
//
// לפני: המפתח note אינו קיים בתשובה כלל (has_key=false) — לא null, אלא היעדר;
// והנימוק שנשלח בגוף נופל בשקט, בדיוק כמו כל מפתח מיותר. אחרי: הוא חוזר עם
// הערך שנשמר. ההבחנה בין «אין שדה» לבין «null» היא כל המדידה.
//
// ⚠️ הכל עובר דרך הכתובת החיה של bkalot-clone-admin כפי שהיא פרוסה (v8), בלי
// שורת קוד אחת בשער ובלי פריסה — זו הכרעה (2) של 0090 כמדידה ולא כהבטחה:
// הנימוק נוסע בתוך הגוף, והשער מעביר אותו כפי שהוא.
//
// ⚠️ שני מפתחות בשם זהה באובייקט אחד — קוד ה-HTTP ומצב הפנייה — דרסו זה את זה
// בשקט במדידת 0087, והקוד לא נמדד כלל. השמות מופרדים כאן מלכתחילה.
import { readFileSync, writeFileSync } from "node:fs";

const root = "C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/";
const ANON = readFileSync(root + "index.html", "utf8").match(/ANON_KEY\s*=\s*"([^"]+)"/)[1];
const BASE = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-admin";
const seed = JSON.parse(readFileSync(new URL("./seed.json", import.meta.url), "utf8"));

const RUN = process.env.RUN ?? "run";
const ids = Object.fromEntries(Object.entries(seed.runs[RUN]).map(([k, v]) => [k, v.case_id]));
const out = [];
const log = (label, value) => {
  out.push({ label, value });
  console.log("-- " + label + "\n" + JSON.stringify(value, null, 2));
};
const has = (o, k) => Object.prototype.hasOwnProperty.call(o ?? {}, k);

async function post(path, body, extra = {}) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON, authorization: "Bearer " + ANON, ...extra },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const login = await post("/login", { email: "qa0090why@more30.test", password: "Qa0090-why-not-what!" });
log("login", { http_status: login.status, ok: login.body?.ok, admin: login.body?.admin });
const auth = { "x-admin-token": login.body?.token ?? "" };

// הנימוק נשלח בתוך הגוף ליד case_id ו-status, ולא כארגומנט — הכרעה (2).
const setStatus = async (case_id, status, note) => {
  const body = note === undefined ? { case_id: String(case_id), status }
                                  : { case_id: String(case_id), status, note };
  const r = await post("/set-status", body, auth);
  return {
    sent_note_chars: note === undefined ? null : note.length,
    sent_body_bytes: new TextEncoder().encode(JSON.stringify(body)).byteLength,
    http_status: r.status, ok: r.body?.ok, error: r.body?.error ?? null,
    previous: r.body?.previous ?? null, case_status: r.body?.status ?? null,
    changed: r.body?.changed ?? null, log_id: r.body?.log_id ?? null,
    has_note_key: has(r.body ?? {}, "note"),
    note: r.body?.note ?? null,
    note_chars: typeof r.body?.note === "string" ? r.body.note.length : null,
    max_chars: r.body?.max_chars ?? null, chars: r.body?.chars ?? null,
    decided_by: r.body?.decided_by ?? null,
  };
};

const readCase = async (case_id) => {
  const r = await post("/case", { id: case_id }, auth);
  const h = r.body?.status_history ?? [];
  return {
    case_status: r.body?.case?.status ?? null,
    citizen_note_chars: (r.body?.case?.note ?? "").length,
    history_rows: h.length,
    // ⚠️ 0088 אינה מחזירה את note ולא תחזיר אותו כאן — זו הלבנה הבאה, ונמדד
    //    ולא מוצהר: המפתח חסר בכל שורה גם אחרי המיגרציה.
    history_has_note_key: h.length > 0 && h.every((x) => has(x, "note")),
    sequence: h.map((x) => `${x.from_status}->${x.to_status}#${x.admin_id ?? "—"}`).join(" | "),
  };
};

// ── A — שני מעברים, שני נימוקים ──────────────────────────────────────────────
// זו הכרעה (1) כמדידה: אילו הנימוק ישב על cases, השני היה דורס את הראשון בדיוק
// כמו ש-decided_by נדרס — והסיבה לדחייה הייתה נמחקת ברגע שמישהו מחזיר לטיפול.
const A_ONE = "לקחתי לטיפול — חסרים תלושי שכר, ביקשתי מהפונה בטלפון";
const A_TWO = "נדחתה — ההכנסה מעל התקרה שנקבעה לשנת 2026, לא לפי שיקול דעת";
log("A — שני מעברים ושני נימוקים שונים", {
  case_id: ids.A,
  transition_1: await setStatus(ids.A, "in_progress", A_ONE),
  transition_2: await setStatus(ids.A, "rejected", A_TWO),
  after: await readCase(ids.A),
});

// ── B — רווחים בלבד ──────────────────────────────────────────────────────────
// הכרעה (4): '' ו-' ' אינם «נימוק ריק» אלא היעדר נימוק. אחרי המיגרציה note
// חוזר null ולא מחרוזת; ה-null הזה נמדד גם בצד ה-SQL, מפני שמחרוזת ריקה
// ו-null נראים זהים בכל מסך ומתנהגים שונה בכל שאילתה.
log("B — נימוק שכולו רווחים", {
  case_id: ids.B,
  transition: await setStatus(ids.B, "in_progress", "     "),
  after: await readCase(ids.B),
});

// ── C — לחיצה חוזרת עם נימוק אחר ─────────────────────────────────────────────
// הכרעה (6): נימוק בלי מעבר אינו נשמר. אילו נשמר, «שלוש שורות» ביומן היה מפסיק
// להיות מספר המעברים, ו-0089 הייתה סופרת לחיצות.
log("C — לחיצה חוזרת, נימוק שני שאינו אמור להישמר", {
  case_id: ids.C,
  transition_1: await setStatus(ids.C, "in_progress", "ראשונה — נלקחה לטיפול"),
  transition_2_same_status: await setStatus(ids.C, "in_progress", "שנייה — אין כאן מעבר ולכן אין נימוק"),
  after: await readCase(ids.C),
});

// ── D — התקרה משני צדדיה ─────────────────────────────────────────────────────
// הכרעה (5): נדחה ואינו נחתך, ולפני שהסטטוס משתנה. 501 תווי עברית הם ~1002
// בייט — הרבה מתחת ל-MAX_BODY=4096 של פונקציית הקצה — ולכן הדחייה שמגיעה
// ללקוח היא של המסד ועם שמה המדויק, ולא body_too_large. שתי התקרות מוצהרות
// ואינן מתחזות זו לזו, וגודל הגוף נמדד ולא מונח.
const TOO_LONG = "נ".repeat(501);
const EXACTLY  = "מ".repeat(500);
const d_reject = await setStatus(ids.D, "in_progress", TOO_LONG);
const d_state  = await readCase(ids.D);
log("D — 501 תווים נדחים, והסטטוס אינו זז", {
  case_id: ids.D, rejected: d_reject, state_after_rejection: d_state,
  status_is_still_new: d_state.case_status === "new",
});
log("D — 500 תווים בדיוק מתקבלים", {
  case_id: ids.D,
  accepted: await setStatus(ids.D, "in_progress", EXACTLY),
  after: await readCase(ids.D),
});

// ── רגרסיה: כל שער קלט שהיה כאן לפני 0090 ────────────────────────────────────
// הנימוק נוסף אחרי שער הסטטוס ולפני חיפוש הפנייה, ולכן הסדר של כל השאר חייב
// להישאר בדיוק כפי שהיה — כולל מה שקורה כשגם המזהה שגוי וגם הנימוק ארוך.
log("רגרסיה — שערי הקלט", {
  no_case_id:        await post("/set-status", { status: "closed" }, auth).then((r) => ({ http_status: r.status, error: r.body?.error })),
  no_status:         await post("/set-status", { case_id: String(ids.A) }, auth).then((r) => ({ http_status: r.status, error: r.body?.error })),
  status_unknown:    await post("/set-status", { case_id: String(ids.A), status: "nope" }, auth).then((r) => ({ http_status: r.status, error: r.body?.error })),
  status_not_settable: await post("/set-status", { case_id: String(ids.A), status: "sent" }, auth).then((r) => ({ http_status: r.status, error: r.body?.error, settable: r.body?.settable })),
  case_not_found:    await post("/set-status", { case_id: "999999999", status: "closed", note: "פנייה שאינה קיימת" }, auth).then((r) => ({ http_status: r.status, error: r.body?.error })),
  long_note_beats_missing_case: await post("/set-status", { case_id: "999999999", status: "closed", note: TOO_LONG }, auth).then((r) => ({ http_status: r.status, error: r.body?.error })),
  no_token:          await post("/set-status", { case_id: String(ids.A), status: "closed" }, {}).then((r) => ({ http_status: r.status, error: r.body?.error })),
});

log("ids", { ...ids, run: RUN });
writeFileSync(new URL(`./http-${RUN}.json`, import.meta.url), JSON.stringify(out, null, 2), "utf8");
