import { useMemo, useState } from "react";
import { createBrowserClient } from "@more30/db";

/**
 * מערכת 33 — השאלון החכם.
 *
 * "חכם" כאן משמעו שהשאלון אינו רשימה קבועה: בוחרים מסלול, וממנו נגזרות
 * השאלות; שאלות נוספות נפתחות רק כשתשובה קודמת הופכת אותן לרלוונטיות
 * (למשל "כמה גיוס צריך" נפתח רק למי שאמר שהוא מחפש השקעה). כך אף אחד לא
 * ממלא שדות שלא נוגעים לו, ומצד שני מי שיש לו מה לספר — נשאל לעומק.
 *
 * התוצאה נשמרת ב-core.spec_submissions דרך ה-RPC `submit_spec`, יחד עם נוסח
 * השאלות שהוצגו בפועל — כדי שהניתוח בניהול יקרא את התשובות בהקשר הנכון.
 */

const supa = (() => {
  try {
    return createBrowserClient("public");
  } catch {
    return null;
  }
})();

type Kind = "text" | "area" | "select" | "tags";

interface Q {
  key: string;
  label: string;
  hint?: string;
  kind: Kind;
  opts?: string[];
  /** השאלה מוצגת רק אם הפונקציה מחזירה true — זה מה שהופך את השאלון לדינמי. */
  when?: (a: Ans) => boolean;
}
interface Step {
  key: string;
  title: string;
  sub: string;
  qs: Q[];
}
type Ans = Record<string, string | string[]>;

const TRACKS = [
  { key: "new", title: "רעיון חדש", sub: "יש לי רעיון ואני רוצה שיהפוך למערכת עובדת" },
  { key: "upgrade", title: "מערכת קיימת", sub: "יש לי מערכת או אתר, ואני רוצה לשדרג / להרחיב" },
  { key: "automation", title: "אוטומציה ותהליכים", sub: "יש לי עבודה ידנית חוזרת שצריך לחסוך" },
  { key: "brand", title: "אתר ומיתוג", sub: "צריך נוכחות דיגיטלית, עיצוב ומיתוג" },
  { key: "unsure", title: "עוד לא בטוח", sub: "יש לי כיוון, בואו נחשוב יחד" },
];

const SERVICE_OPTIONS = [
  "בניית מערכת",
  "עיצוב ומיתוג",
  "שיווק ופרסום",
  "ליווי עסקי",
  "גיוס השקעה",
  "אוטומציות",
  "תמיכה טכנית",
];

const s = (a: Ans, k: string) => (typeof a[k] === "string" ? (a[k] as string) : "");

/** בונה את השאלון בפועל לפי המסלול והתשובות שכבר ניתנו. */
function buildSteps(track: string, a: Ans): Step[] {
  const you: Step = {
    key: "you",
    title: "נעים להכיר",
    sub: "רק כדי שנדע למי לחזור. שם מלא זה השדה היחיד שחייב להיות.",
    qs: [
      { key: "full_name", label: "שם מלא *", kind: "text" },
      { key: "phone", label: "טלפון", kind: "text" },
      { key: "email", label: "אימייל", kind: "text" },
      { key: "city", label: "עיר", kind: "text" },
    ],
  };

  const core: Step =
    track === "automation"
      ? {
          key: "core",
          title: "התהליך שרוצים לחסוך",
          sub: "כמה שיותר קונקרטי — כך נדע איפה החיסכון האמיתי.",
          qs: [
            { key: "project_name", label: "איך נקרא לזה?", kind: "text" },
            { key: "process_today", label: "איך התהליך עובד היום?", hint: "מי עושה מה, באיזה כלים", kind: "area" },
            { key: "pain", label: "מה הכי מעצבן בו?", kind: "area" },
            {
              key: "volume",
              label: "כמה פעמים זה קורה?",
              kind: "select",
              opts: ["כמה פעמים ביום", "כמה פעמים בשבוע", "כמה פעמים בחודש", "לא קבוע"],
            },
            { key: "tools_today", label: "באילו כלים אתם עובדים היום?", hint: "אקסל, וואטסאפ, מייל, מערכת קיימת…", kind: "text" },
          ],
        }
      : track === "upgrade"
      ? {
          key: "core",
          title: "המערכת הקיימת",
          sub: "מה יש עכשיו, ומה חסר.",
          qs: [
            { key: "project_name", label: "שם המערכת / האתר", kind: "text" },
            { key: "current_url", label: "כתובת (אם יש)", kind: "text" },
            { key: "works_well", label: "מה עובד טוב ולא נוגעים בו?", kind: "area" },
            { key: "pain", label: "מה שבור או חסר?", kind: "area" },
            { key: "users_today", label: "כמה משתמשים יש היום?", kind: "text" },
          ],
        }
      : track === "brand"
      ? {
          key: "core",
          title: "העסק והמיתוג",
          sub: "מי אתם, ולמי אתם מדברים.",
          qs: [
            { key: "project_name", label: "שם העסק / המותג", kind: "text" },
            { key: "short_description", label: "במשפט אחד — מה אתם עושים?", kind: "text" },
            { key: "target_customer", label: "מי הלקוח שלכם?", kind: "text" },
            { key: "brand_feel", label: "איזה רושם אתם רוצים לעשות?", hint: "מקצועי, חם, יוקרתי, צעיר…", kind: "text" },
            { key: "has_brand_assets", label: "יש לוגו וצבעים קיימים?", kind: "select", opts: ["לא", "יש לוגו", "יש מיתוג מלא"] },
          ],
        }
      : {
          key: "core",
          title: track === "unsure" ? "מה מסתובב לכם בראש" : "הרעיון שלכם",
          sub: track === "unsure" ? "גם כיוון לא מגובש זה מקום טוב להתחיל בו." : "ספרו לנו על מה מדובר.",
          qs: [
            { key: "project_name", label: "שם הרעיון / הפרויקט", kind: "text" },
            { key: "short_description", label: "במשפט אחד — מה זה?", kind: "text" },
            { key: "problem", label: "איזו בעיה זה פותר?", hint: "ולמי היא כואבת", kind: "area" },
            { key: "solution", label: "מה הפתרון שאתם מדמיינים?", kind: "area" },
            {
              key: "why_now",
              label: "למה דווקא עכשיו?",
              kind: "text",
              // רק למי שיש כבר תמונה ברורה — לא נטריד את מי שעוד מגבש.
              when: (x) => track !== "unsure" && s(x, "solution").trim().length > 0,
            },
          ],
        };

  const market: Step = {
    key: "market",
    title: "השוק והכסף",
    sub: "מי משלם, על מה, ומול מי אתם מתמודדים.",
    qs: [
      { key: "target_customer", label: "מי הלקוח המשלם?", kind: "text", when: () => track !== "brand" },
      {
        key: "revenue_model",
        label: "איך זה מרוויח?",
        kind: "select",
        opts: ["מנוי חודשי", "תשלום חד-פעמי", "עמלה מעסקה", "פרסום", "חינם — עדיין לא יודע", "אחר"],
      },
      { key: "pricing_notes", label: "מחיר שאתם חושבים עליו?", kind: "text", when: (x) => s(x, "revenue_model") !== "" && s(x, "revenue_model") !== "חינם — עדיין לא יודע" },
      { key: "competitors", label: "מי המתחרים או התחליפים?", hint: "גם 'אקסל' הוא מתחרה", kind: "text" },
      { key: "differentiation", label: "במה אתם שונים מהם?", kind: "area", when: (x) => s(x, "competitors").trim().length > 0 },
      { key: "demand_validation", label: "יש כבר סימן שיש ביקוש?", hint: "לקוחות שאמרו כן, המתנה, מכירות", kind: "text" },
    ],
  };

  const status: Step = {
    key: "status",
    title: "איפה אתם עומדים",
    sub: "כדי שנדע מאיפה מתחילים ולא נמציא את הגלגל.",
    qs: [
      { key: "stage", label: "באיזה שלב?", kind: "select", opts: ["רעיון בלבד", "אפיון על הנייר", "אבטיפוס", "מוצר חי", "צומח עם לקוחות"] },
      { key: "team_notes", label: "מי בצוות?", hint: "שותפים, מפתחים, אנשי שיווק", kind: "text" },
      { key: "needs_partners", label: "מחפשים שותפים?", kind: "select", opts: ["לא", "כן"] },
      { key: "tech_notes", label: "מה בנוי עד עכשיו מבחינה טכנית?", kind: "area", when: (x) => ["אבטיפוס", "מוצר חי", "צומח עם לקוחות"].includes(s(x, "stage")) },
      { key: "launch_timeline", label: "מתי תרצו לצאת לאוויר?", kind: "select", opts: ["דחוף — תוך חודש", "2-3 חודשים", "חצי שנה", "אין דדליין"] },
      { key: "budget_range", label: "טווח תקציב שנוח לכם?", hint: "עוזר לנו להציע משהו מציאותי", kind: "select", opts: ["עדיין לא יודע", "עד 10 אלף ₪", "10-30 אלף ₪", "30-80 אלף ₪", "מעל 80 אלף ₪"] },
      { key: "seeking_investment", label: "מחפשים השקעה?", kind: "select", opts: ["לא", "כן"] },
      { key: "funding_needed", label: "כמה גיוס צריך?", kind: "text", when: (x) => s(x, "seeking_investment") === "כן" },
      { key: "raised_so_far", label: "גויס עד היום?", kind: "text", when: (x) => s(x, "seeking_investment") === "כן" },
    ],
  };

  const wrap: Step = {
    key: "wrap",
    title: "מה תרצו מאיתנו",
    sub: "ומה שחשוב לכם שנדע ולא שאלנו.",
    qs: [
      { key: "services_wanted", label: "אילו שירותים?", kind: "tags", opts: SERVICE_OPTIONS },
      { key: "goals_next_year", label: "איך נראית הצלחה בעוד שנה?", kind: "area" },
      { key: "dream_free_text", label: "משהו נוסף שחשוב שנדע (חופשי)", kind: "area" },
    ],
  };

  const steps = [you, core];
  if (track !== "brand") steps.push(market);
  else steps.push({ ...market, title: "השוק", sub: "מול מי אתם מתמודדים." });
  steps.push(status, wrap);
  return steps;
}

/** מסננת את השאלות שרלוונטיות כרגע — הליבה של ה"חכם". */
const visible = (st: Step, a: Ans) => st.qs.filter((q) => !q.when || q.when(a));

export function SpecWizard() {
  const [track, setTrack] = useState<string>("");
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Ans>({});
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [err, setErr] = useState("");
  const [stars, setStars] = useState<number[]>([]);

  const steps = useMemo(() => (track ? buildSteps(track, a) : []), [track, a]);
  const total = steps.length;
  // מספר השלבים קבוע לכל מסלול, אבל clamp מגן מפני מצב ביניים אחרי החלפת מסלול.
  const cur: Step | undefined = steps[Math.min(step, Math.max(total - 1, 0))];

  const set = (k: string, v: string | string[]) => setA((prev) => ({ ...prev, [k]: v }));
  const answeredCount = Object.values(a).filter((v) => (Array.isArray(v) ? v.length : String(v).trim())).length;
  const pct = state === "done" ? 100 : track ? Math.round(((step + 1) / total) * 100) : 0;

  function next() {
    if (cur?.key === "you" && !s(a, "full_name").trim()) {
      setErr("רק נדע איך קוראים לכם.");
      return;
    }
    setErr("");
    setStep((x) => Math.min(x + 1, total - 1));
  }

  async function submit() {
    if (!s(a, "full_name").trim()) {
      setErr("שם מלא הוא שדה חובה.");
      setStep(0);
      return;
    }
    if (!supa) {
      setErr("החיבור לשרת אינו זמין כרגע.");
      return;
    }
    setState("sending");
    setErr("");

    // שולחים גם את נוסח השאלות שהוצגו בפועל — השאלון דינמי, ובלי זה לא ניתן
    // לקרוא את התשובות בהקשר הנכון בניהול או בניתוח ה-AI.
    const asked: { key: string; label: string; step: string }[] = [];
    const answers: Record<string, unknown> = {};
    for (const st of steps) {
      for (const q of visible(st, a)) {
        const v = a[q.key];
        if (v === undefined || (Array.isArray(v) ? v.length === 0 : !String(v).trim())) continue;
        if (["full_name", "phone", "email", "city", "project_name", "services_wanted"].includes(q.key)) continue;
        asked.push({ key: q.key, label: q.label.replace(" *", ""), step: st.title });
        answers[q.key] = v;
      }
    }

    try {
      const { error } = await supa.rpc("submit_spec", {
        payload: {
          full_name: s(a, "full_name"),
          phone: s(a, "phone"),
          email: s(a, "email"),
          city: s(a, "city"),
          project_name: s(a, "project_name"),
          track: TRACKS.find((t) => t.key === track)?.title ?? track,
          answers,
          questions: asked,
          services_wanted: Array.isArray(a.services_wanted) ? a.services_wanted : [],
          source: "portal",
        },
      });

      if (error) {
        setState("error");
        setErr(error.message);
        return;
      }
      setStars(Array.from({ length: 22 }, (_, i) => i));
      setState("done");
      setTimeout(() => setStars([]), 1800);
    } catch (e) {
      // supa.rpc() rejects (network/timeout) instead of resolving {error} on a
      // failed fetch — without this catch the submit button stayed stuck on
      // "שולח…" forever with no way to retry.
      setState("error");
      setErr(e instanceof Error ? e.message : "אירעה שגיאה בשליחה. נסו שוב.");
    }
  }

  if (state === "done")
    return (
      <div className="wiz">
        {stars.length > 0 && (
          <div className="starfield">
            {stars.map((i) => (
              <span
                className="star"
                key={i}
                style={{ left: `${(i * 4.5 + 6) % 100}%`, bottom: "40%", animationDelay: `${(i % 6) * 0.08}s` }}
              >
                {["✦", "✧", "✶", "·"][i % 4]}
              </span>
            ))}
          </div>
        )}
        <div className="thanks">
          <div className="checkmark">✓</div>
          <div className="big">קיבלנו, {s(a, "full_name").split(" ")[0] || "תודה"}.</div>
          <p>
            האפיון שלכם נחת אצלנו — {answeredCount} תשובות. נעבור עליו, נריץ עליו ניתוח, ונחזור אליכם.
            <br />
            בינתיים — מוזמנים לטייל בין המערכות שכבר חיות.
          </p>
          <a className="btn btn-primary" href="#systems" style={{ marginTop: 22 }}>
            לגלות את המערכות
          </a>
        </div>
      </div>
    );

  // שלב 0: בחירת מסלול. ממנו נגזר כל שאר השאלון.
  if (!track)
    return (
      <div className="wiz reveal">
        <div className="wiz-step-title">מה מביא אתכם?</div>
        <div className="wiz-step-sub">בחרו מסלול — נשאל רק את מה שרלוונטי לו.</div>
        <div className="track-grid">
          {TRACKS.map((t) => (
            <button
              className="track"
              key={t.key}
              onClick={() => {
                setTrack(t.key);
                setStep(0);
              }}
            >
              <span className="track-t">{t.title}</span>
              <span className="track-s">{t.sub}</span>
            </button>
          ))}
        </div>
      </div>
    );

  if (!cur) return null;
  const qs = visible(cur, a);

  return (
    <div className="wiz reveal">
      <div className="wiz-prog">
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="wiz-steps">
        {steps.map((st, i) => (
          <div className={`s ${i === step ? "active" : ""} ${i < step ? "done" : ""}`} key={st.key}>
            <div className="num">{i < step ? "✓" : i + 1}</div>
            {st.title}
          </div>
        ))}
      </div>

      <div className="wiz-step-title">{cur.title}</div>
      <div className="wiz-step-sub">{cur.sub}</div>

      <div className="wiz-fields" key={`${track}-${step}-${qs.length}`}>
        {qs.map((q) =>
          q.kind === "tags" ? (
            <div key={q.key}>
              <span className="lbl">{q.label}</span>
              <div className="tags">
                {(q.opts ?? []).map((o) => {
                  const on = Array.isArray(a[q.key]) && (a[q.key] as string[]).includes(o);
                  return (
                    <span
                      key={o}
                      className={`tagsel ${on ? "on" : ""}`}
                      onClick={() => {
                        const cu = Array.isArray(a[q.key]) ? (a[q.key] as string[]) : [];
                        set(q.key, on ? cu.filter((x) => x !== o) : [...cu, o]);
                      }}
                    >
                      {o}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="field" key={q.key}>
              <label>
                {q.label}
                {q.hint && <em className="hint"> · {q.hint}</em>}
              </label>
              {q.kind === "area" ? (
                <textarea className="inp" rows={2} value={s(a, q.key)} onChange={(e) => set(q.key, e.target.value)} />
              ) : q.kind === "select" ? (
                <select className="inp" value={s(a, q.key)} onChange={(e) => set(q.key, e.target.value)}>
                  <option value="" />
                  {(q.opts ?? []).map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input className="inp" value={s(a, q.key)} onChange={(e) => set(q.key, e.target.value)} />
              )}
            </div>
          ),
        )}
      </div>

      {err && <div className="err" style={{ marginTop: 14 }}>{err}</div>}

      <div className="wiz-nav">
        {step > 0 ? (
          <button
            className="btn btn-light"
            disabled={state === "sending"}
            onClick={() => { setErr(""); setStep((x) => x - 1); }}
          >
            → חזרה
          </button>
        ) : (
          <button
            className="btn btn-light"
            disabled={state === "sending"}
            onClick={() => { setTrack(""); setErr(""); }}
          >
            → מסלול אחר
          </button>
        )}
        {step < total - 1 ? (
          <button className="btn btn-primary" onClick={next}>
            המשך ←
          </button>
        ) : (
          <button className="btn btn-primary" onClick={submit} disabled={state === "sending"}>
            {state === "sending" ? "שולח…" : "שליחת האפיון"}
          </button>
        )}
      </div>
    </div>
  );
}
