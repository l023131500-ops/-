// מדידת 0091 מעל HTTP — מסך הפנייה קורא את הנימוק שכבר נשמר.
//
// הקובץ רץ פעמיים — לפני החלת המיגרציה ואחריה — **מאותו קובץ בדיוק** (תקלת
// 0087: שתי גרסאות של probe הן שתי מדידות ולא אחת), על אותן ארבע פניות ובאותם
// גופי בקשה מילה במילה. שלא כמו 0090, אין כאן פיצול פניות: המיגרציה נוגעת
// בקורא בלבד — אין בו UPDATE ואין INSERT — ולכן קריאה חוזרת אינה משנה דבר,
// והריצה השנייה קוראת בדיוק את מה שקראה הראשונה. ההבדל היחיד הוא הפונקציה.
//
// לפני: המפתח note אינו קיים בשורות status_history כלל — has_key=false, היעדר
// ולא null. אחרי: הוא קיים בכל שורה, ונושא את מה שנשמר או null. ההבחנה בין
// «אין שדה» לבין «יש שדה שערכו null» היא כל המדידה, ולכן Object.hasOwn ולא
// בדיקת ערך: שדה חסר ושדה שנושא null נראים זהים בקריאה רגילה והם שני דברים
// הפוכים — «השרת אינו יודע» מול «המכריע לא נימק».
//
// ⚠️ שני מפתחות בשם note בתשובה אחת, ובמכוון (הכרעה (2) של 0091): case.note הוא
// מה שהאזרח כתב בטופס, ו-status_history[].note הוא מה שהמכריע כתב. שניהם נמדדים
// כאן בכל ריצה, זה לצד זה, כדי שההפרש יהיה מדוד ולא מוצהר.
//
// ⚠️ שני מפתחות בשם זהה באובייקט אחד — קוד ה-HTTP ומצב הפנייה — דרסו זה את זה
// בשקט במדידת 0087. השמות מופרדים כאן מלכתחילה.
import { readFileSync, writeFileSync } from "node:fs";

const root = "C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/";
const ANON = readFileSync(root + "index.html", "utf8").match(/ANON_KEY\s*=\s*"([^"]+)"/)[1];
const BASE = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-admin";
const seed = JSON.parse(readFileSync(new URL("./seed.json", import.meta.url), "utf8"));

const RUN = process.env.RUN ?? "run";
const ids = Object.fromEntries(Object.entries(seed.cases).map(([k, v]) => [k, v.case_id]));
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

const login = await post("/login", { email: "qa0091read@more30.test", password: "Qa0091-read-the-why!" });
log("login", { http_status: login.status, ok: login.body?.ok, admin: login.body?.admin });
const auth = { "x-admin-token": login.body?.token ?? "" };

// כל שורה נמדדת בשלושה מישורים: האם המפתח קיים, מה ערכו, וכמה תווים בו.
// אורך התווים ולא הערך עצמו בסיכום — 500 תווי עברית בכל שורת פלט הופכים את
// הראיה לבלתי-קריאה; הערך המלא יושב ב-http-*.json.
const rowOf = (x) => ({
  id: x.id, transition: `${x.from_status}->${x.to_status}`,
  admin_id: x.admin_id ?? null, admin_name: x.admin_name ?? null,
  has_note_key: has(x, "note"),
  note_is_null: has(x, "note") ? x.note === null : null,
  note_chars: typeof x.note === "string" ? x.note.length : null,
  note_head: typeof x.note === "string" ? x.note.slice(0, 40) : null,
});

const readCase = async (case_id) => {
  const r = await post("/case", { id: case_id }, auth);
  const h = r.body?.status_history ?? [];
  return {
    http_status: r.status, ok: r.body?.ok,
    top_level_keys: Object.keys(r.body ?? {}).sort(),
    case_key_count: Object.keys(r.body?.case ?? {}).length,
    case_status: r.body?.case?.status ?? null,
    // ⚠️ הנימוק של האזרח — הוא לא זז ולא ייגע. שתי העמודות נושאות שני כותבים.
    citizen_note_chars: (r.body?.case?.note ?? "").length,
    decided_by: r.body?.case?.decided_by ?? null,
    decided_by_name: r.body?.case?.decided_by_name ?? null,
    history_rows: h.length,
    history_all_have_note_key: h.length > 0 && h.every((x) => has(x, "note")),
    history_none_have_note_key: h.length > 0 && h.every((x) => !has(x, "note")),
    history_row_key_count: h.length > 0 ? Object.keys(h[0]).length : null,
    sequence: h.map((x) => `${x.from_status}->${x.to_status}#${x.admin_id ?? "—"}`).join(" | "),
    chain_is_whole: h.length < 2 || h.every((x, i) => i === 0 || h[i - 1].to_status === x.from_status),
    rows: h.map(rowOf),
    rights_count: (r.body?.rights ?? []).length,
    documents_count: (r.body?.documents ?? []).length,
    templates_count: (r.body?.templates ?? []).length,
  };
};

// ── A — שני מעברים, שני נימוקים ──────────────────────────────────────────────
// זו הכרעה (1) של 0090 שנקראת סוף-סוף: אילו הנימוק ישב על cases, השני היה דורס
// את הראשון בדיוק כמו decided_by. כאן נמדד שהם חוזרים **שניהם**, כל אחד על
// שורתו, ובסדר — «לקחתי לטיפול» לפני «נדחתה» ולא הפוך.
const A = await readCase(ids.A);
log("A — שני מעברים ושני נימוקים שונים", {
  case_id: ids.A, ...A,
  two_distinct_notes: A.rows.filter((x) => x.note_chars > 0).length === 2 &&
                      A.rows[0]?.note_head !== A.rows[1]?.note_head,
  notes_in_order: A.rows.map((x) => x.note_chars),
});

// ── B — מעבר בלי מפתח note בגוף כלל ──────────────────────────────────────────
// הכרעה (3): המפתח קיים והערך null. «המכריע לא נימק» חייב להיראות שונה מ«השרת
// אינו יודע לומר» — ואחרי המיגרציה שתי השורות האלה נבדלות זו מזו בתשובה עצמה.
const B = await readCase(ids.B);
log("B — מעבר שנכתב בלי נימוק", { case_id: ids.B, ...B });

// ── C — 500 תווים בדיוק ──────────────────────────────────────────────────────
// הכרעה (4): אין limit, אין חיתוך ואין «…». התקרה נאכפת בכתיבה (0090) ולא
// בקריאה; קורא שחותך היה מסתיר בשקט את סופו של נימוק ארוך — כלומר בדיוק את מה
// שנכתב בזהירות. 500 יוצאים 500.
const C = await readCase(ids.C);
log("C — נימוק במלוא התקרה", {
  case_id: ids.C, ...C,
  round_trip_whole: C.rows[0]?.note_chars === seed.notes.C_MAX_chars,
});

// ── D — הנימוק שורד את עזיבת העובד ───────────────────────────────────────────
// הכרעה (3) של 0088 בחומרה הגדולה מכולן. חשבון 92 דחה את הפנייה ואז נמחק
// בפקודה על admin_users עצמה. LEFT JOIN מחזיר שורה עם admin_id מלא ו-admin_name
// ריק — ועם הנימוק. INNER היה מוחק מההיסטוריה את הדחייה **ואת הסיבה לה** מפני
// שעובד התפטר: האזרח היה נשאר עם פנייה שנדחתה ובלי מי שיאמר למה.
const D = await readCase(ids.D);
log("D — המכריע עזב, והנימוק נשאר", {
  case_id: ids.D, ...D,
  row_survived: D.history_rows === 1,
  admin_id_kept: D.rows[0]?.admin_id === 92,
  admin_name_empty: !D.rows[0]?.admin_name,
  reason_survived: D.rows[0]?.note_chars === seed.notes.D_WHY_chars,
});

// ── רגרסיה: כל שער וכל שדה שהיה כאן לפני 0091 ────────────────────────────────
log("רגרסיה — השערים", {
  no_id:        await post("/case", {}, auth).then((r) => ({ http_status: r.status, error: r.body?.error })),
  case_not_found: await post("/case", { id: 999999999 }, auth).then((r) => ({ http_status: r.status, error: r.body?.error, case_id: r.body?.case_id })),
  no_token:     await post("/case", { id: ids.A }, {}).then((r) => ({ http_status: r.status, error: r.body?.error })),
});

log("ids", { ...ids, run: RUN });
writeFileSync(new URL(`./http-${RUN}.json`, import.meta.url), JSON.stringify(out, null, 2), "utf8");
