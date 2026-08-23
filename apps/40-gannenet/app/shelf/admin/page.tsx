"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { withBase } from "@/lib/base";

type Row = {
  id: string;
  title: string;
  category: string;
  sender: string;
  kind: string;
  sizeKB: number;
  source?: "seed" | "upload" | "drive";
  hidden: boolean;
  hiddenPages: number[];
};

type Usage = {
  date: string;
  capAll: number;
  usedAll: number;
  remainingAll: number;
  capUser: number;
  accounts: number;
  top: { userId: string; count: number }[];
};

const PAGE = 40;

function parsePages(text: string): number[] {
  const out = new Set<number>();
  for (const part of text.split(/[,\s]+/).filter(Boolean)) {
    const m = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) continue;
    let a = parseInt(m[1], 10);
    let b = m[2] ? parseInt(m[2], 10) : a;
    if (a > b) [a, b] = [b, a];
    for (let p = a; p <= b; p++) if (p >= 1) out.add(p);
  }
  return Array.from(out).sort((x, y) => x - y);
}

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  // rows = what storage holds; drafts/hiddenDrafts = what the admin typed and
  // has not saved yet. Keeping them apart is what lets a failed save leave the
  // screen honest about which state is actually live.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [hiddenDrafts, setHiddenDrafts] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string>("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [onlyEdited, setOnlyEdited] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  // `undefined` = עוד לא נטען, `null` = הספירה נכשלה. שני מצבים שונים, ושניהם
  // אינם "0 מתוך 200" — אותה הבחנה שהשרת עושה.
  const [usage, setUsage] = useState<Usage | null | undefined>(undefined);

  useEffect(() => {
    const saved = sessionStorage.getItem("gannenet_admin_key");
    if (saved) {
      setKey(saved);
      login(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(k: string) {
    if (loggingIn) return;
    setLoggingIn(true);
    setErr("");
    try {
      const res = await fetch(withBase("/api/admin/list"), { method: "POST", headers: { "x-admin-key": k } });
      if (res.status === 401) {
        setErr("סיסמה שגויה.");
        setAuthed(false);
        return;
      }
      if (!res.ok) {
        setErr("שגיאה בטעינה.");
        return;
      }
      const data = await res.json();
      setRows(data.items as Row[]);
      const d: Record<string, string> = {};
      for (const r of data.items as Row[]) d[r.id] = (r.hiddenPages || []).join(",");
      setDrafts(d);
      setHiddenDrafts({});
      setAuthed(true);
      sessionStorage.setItem("gannenet_admin_key", k);
      loadUsage(k);
    } catch {
      setErr("שגיאת רשת.");
    } finally {
      setLoggingIn(false);
    }
  }

  // בקשה נפרדת ולא חלק מ-/api/admin/list בכוונה: הקטלוג הוא 2,977 שורות שנטענות
  // פעם אחת, והמכסה משתנה תוך כדי היום וצריכה רענון בלי לטעון אותו שוב. כישלון
  // כאן לא מפיל את מסך הניהול — הוא רק מסתיר את השורה.
  async function loadUsage(k: string) {
    try {
      const res = await fetch(withBase("/api/admin/usage"), { method: "POST", headers: { "x-admin-key": k } });
      if (!res.ok) {
        setUsage(null);
        return;
      }
      const data = await res.json();
      setUsage(data.usage as Usage);
    } catch {
      setUsage(null);
    }
  }

  async function save(r: Row, hidden: boolean, pagesText: string) {
    setSaving(r.id);
    setMsg("");
    try {
      const hiddenPages = parsePages(pagesText);
      const res = await fetch(withBase("/api/admin/override"), {
        method: "POST",
        headers: { "x-admin-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: r.id, hidden, hiddenPages }),
      });
      // The route only answers ok after the object reached storage, so anything
      // else means the change is not live — say so instead of showing "נשמר".
      if (!res.ok) {
        const reason = await res
          .json()
          .then((d: any) => (typeof d?.error === "string" ? d.error : ""))
          .catch(() => "");
        setErr(reason || `שמירה נכשלה (${res.status}). השינוי לא נשמר.`);
        return;
      }
      setErr("");
      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, hidden, hiddenPages } : x)));
      // Drop the pending marks and show storage's own normalised page list.
      setHiddenDrafts((d) => {
        const { [r.id]: _drop, ...rest } = d;
        return rest;
      });
      setDrafts((d) => ({ ...d, [r.id]: hiddenPages.join(",") }));
      setMsg(`נשמר: ${r.title.slice(0, 40)}`);
      setTimeout(() => setMsg(""), 2500);
    } catch {
      setErr("שגיאת רשת — השינוי לא נשמר.");
    } finally {
      setSaving("");
    }
  }

  // Only offered on `source === "upload"` rows. Hiding leaves the bytes in the
  // bucket for ever; this is the one action that removes them, so it asks first
  // and says what it is — "הסתר" is reversible, this is not.
  async function remove(r: Row) {
    if (!window.confirm(`למחוק לצמיתות את "${r.title}"?\nהקובץ יימחק מהאחסון ולא ניתן לשחזר אותו.`)) return;
    setSaving(r.id);
    setMsg("");
    try {
      const res = await fetch(withBase("/api/admin/delete"), {
        method: "POST",
        headers: { "x-admin-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: r.id }),
      });
      if (!res.ok) {
        const reason = await res
          .json()
          .then((d: any) => (typeof d?.error === "string" ? d.error : ""))
          .catch(() => "");
        setErr(reason || `מחיקה נכשלה (${res.status}).`);
        return;
      }
      setErr("");
      setRows((prev) => prev.filter((x) => x.id !== r.id));
      setMsg(`נמחק לצמיתות: ${r.title.slice(0, 40)}`);
      setTimeout(() => setMsg(""), 2500);
    } catch {
      setErr("שגיאת רשת — לא נמחק.");
    } finally {
      setSaving("");
    }
  }

  const cats = useMemo(() => Array.from(new Set(rows.map((r) => r.category))).sort(), [rows]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!cat || r.category === cat) &&
          (!q || (r.title + r.category + r.sender).toLowerCase().includes(q.toLowerCase())) &&
          (!onlyEdited || r.hidden || (r.hiddenPages && r.hiddenPages.length > 0))
      ),
    [rows, cat, q, onlyEdited]
  );
  useEffect(() => setLimit(PAGE), [q, cat, onlyEdited]);
  const visible = filtered.slice(0, limit);

  if (!authed) {
    return (
      <div className="container-r" style={{ padding: "60px 20px", maxWidth: 420 }}>
        <div className="card" style={{ padding: 26 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#2b4a8b" }}>ניהול המדף</h1>
          <p style={{ color: "#6d6f88", fontSize: 14, marginTop: 6 }}>הזינו סיסמת ניהול כדי להסתיר קבצים או למחוק עמודים.</p>
          {/* §1א — הצג סיסמה. The eye sits at the inline-end (the left, in RTL)
              and the field reserves room for it, so a long key never runs under
              the button. No password rule is shown here on purpose: this is the
              shared admin key from ADMIN_PASSWORD, and the server compares it
              whole — there is no length or character requirement to state. */}
          <div style={{ position: "relative", marginTop: 14 }}>
            <input
              className="input"
              type={showKey ? "text" : "password"}
              placeholder="סיסמת ניהול"
              aria-label="סיסמת ניהול"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loggingIn && login(key)}
              autoComplete="off"
              style={{ width: "100%", paddingInlineEnd: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              aria-pressed={showKey}
              aria-label={showKey ? "הסתר סיסמה" : "הצג סיסמה"}
              title={showKey ? "הסתר סיסמה" : "הצג סיסמה"}
              style={{
                position: "absolute",
                insetInlineEnd: 6,
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                border: 0,
                borderRadius: 8,
                background: "transparent",
                color: "#6d6f88",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {showKey ? (
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <path d="M6.61 6.61A18.15 18.15 0 0 0 2 12s3 8 10 8a9.12 9.12 0 0 0 5.39-1.61" />
                  <line x1="2" y1="2" x2="22" y2="22" />
                </svg>
              ) : (
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          <button onClick={() => login(key)} disabled={loggingIn} className="btn btn-main" style={{ marginTop: 12, width: "100%" }}>
            {loggingIn ? "מתחבר…" : "כניסה"}
          </button>
          {err && <p style={{ color: "#a03a5c", fontSize: 13.5, marginTop: 10 }}>{err}</p>}
          <Link href="/shelf" style={{ display: "block", marginTop: 16, color: "#2b4a8b", fontSize: 13.5 }}>→ חזרה למדף</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-r" style={{ padding: "28px 20px 60px", maxWidth: 1040 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#2b4a8b" }}>ניהול המדף</h1>
        <Link href="/shelf" style={{ color: "#2b4a8b", fontWeight: 600 }}>→ חזרה למדף</Link>
      </div>
      <p style={{ color: "#6d6f88", fontSize: 13.5, marginTop: 6, lineHeight: 1.7 }}>
        <b>הסתרת קובץ</b> — מסירה אותו מהאתר לגמרי. <b>מחיקת עמודים</b> — הקלידו מספרי עמודים להסתרה (למשל <code>1</code> לעמוד המייל, או <code>1-2</code>). העמודים לא יופיעו בצפייה, בהורדה או בהדפסה.
      </p>

      {/* מחולל דפי המשימה — התקרה היומית של כלל המערכת. זו התקרה היחידה כאן
          שחוסמת גננת בגלל שימוש של אחרות, ועד עכשיו לא היה מקום לראות אותה
          מתמלאת. אחוז ולא רק מספר, כי "148" לבדו לא אומר אם זה קרוב. */}
      {usage && (() => {
        const pct = usage.capAll > 0 ? Math.min(100, Math.round((usage.usedAll / usage.capAll) * 100)) : 0;
        const full = usage.remainingAll <= 0;
        const near = !full && pct >= 75;
        const tone = full ? "#a03a5c" : near ? "#8a5a1f" : "#2b4a8b";
        return (
          <div className="card" style={{ padding: 14, marginTop: 14, borderInlineStartWidth: 4, borderInlineStartStyle: "solid", borderInlineStartColor: tone }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <b style={{ fontSize: 14.5, color: "#2b4a8b" }}>מחולל דפי המשימה — שימוש היום</b>
              <button onClick={() => loadUsage(key)} className="btn btn-ghost" style={{ fontSize: 12.5, padding: ".3rem .6rem" }}>
                רענון
              </button>
            </div>
            <div style={{ fontSize: 14, color: tone, fontWeight: 700, marginTop: 8 }}>
              {usage.usedAll.toLocaleString("he")} מתוך {usage.capAll.toLocaleString("he")} דפים ({pct}%)
              {full && " — המכסה מוצתה, המחולל חסום לכולן עד מחר"}
              {near && " — מתקרב לתקרה"}
            </div>
            <div
              role="img"
              aria-label={`נוצלו ${pct} אחוזים מהמכסה היומית של המערכת`}
              style={{ height: 8, borderRadius: 99, background: "#e9ebf5", marginTop: 8, overflow: "hidden" }}
            >
              <div style={{ width: `${pct}%`, height: "100%", background: tone }} />
            </div>
            <div style={{ fontSize: 12.5, color: "#6d6f88", marginTop: 8, lineHeight: 1.7 }}>
              {usage.accounts.toLocaleString("he")} חשבונות יצרו היום · תקרה אישית {usage.capUser} דפים לחשבון · המכסה מתאפסת בחצות UTC (03:00 בישראל) · תאריך הספירה {usage.date}
            </div>
            {usage.top.length > 0 && (
              <details style={{ marginTop: 8 }}>
                <summary style={{ fontSize: 12.5, color: "#2b4a8b", cursor: "pointer" }}>פילוח לפי חשבון</summary>
                <ul style={{ fontSize: 12.5, color: "#6d6f88", marginTop: 6, paddingInlineStart: 18, lineHeight: 1.8 }}>
                  {usage.top.map((t) => (
                    <li key={t.userId}>
                      <code>{t.userId.slice(0, 8)}…</code> — {t.count} מתוך {usage.capUser}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        );
      })()}
      {usage === null && (
        <p style={{ color: "#9a9cb0", fontSize: 12.5, marginTop: 14 }}>
          לא ניתן לקרוא כרגע את שימוש המחולל.{" "}
          <button onClick={() => loadUsage(key)} className="btn btn-ghost" style={{ fontSize: 12, padding: ".2rem .5rem" }}>
            נסו שוב
          </button>
        </p>
      )}

      <div className="card" style={{ padding: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 14 }}>
        <input className="input" style={{ flex: "1 1 220px" }} placeholder="חיפוש…" aria-label="חיפוש" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" style={{ flex: "0 0 200px" }} aria-label="סינון לפי קטגוריה" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">כל הקטגוריות</option>
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label style={{ fontSize: 13.5, color: "#6d6f88", display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={onlyEdited} onChange={(e) => setOnlyEdited(e.target.checked)} />
          רק ערוכים
        </label>
      </div>

      {msg && <p style={{ color: "#1f6a62", fontSize: 13.5, marginTop: 10 }}>{msg}</p>}
      {err && <p style={{ color: "#a03a5c", fontSize: 13.5, marginTop: 10 }}>{err}</p>}
      <p style={{ color: "#9a9cb0", fontSize: 12.5, margin: "12px 0" }}>מוצגים {visible.length} מתוך {filtered.length.toLocaleString("he")}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {visible.map((r) => {
          const pendingHidden = hiddenDrafts[r.id] ?? r.hidden;
          const dirty =
            pendingHidden !== r.hidden ||
            (drafts[r.id] ?? "") !== (r.hiddenPages || []).join(",");
          return (
          <div key={r.id} className="card" style={{ padding: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", opacity: r.hidden ? 0.6 : 1 }}>
            <div style={{ flex: "1 1 280px", minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: "#2b4a8b", lineHeight: 1.4 }}>{r.title}</div>
              <div style={{ fontSize: 12, color: "#9a9cb0", marginTop: 3 }}>
                {r.category} · {r.kind.toUpperCase()} · {r.sizeKB}KB
                {r.source === "upload" && (
                  <span style={{ color: "#1f6a62", fontWeight: 700 }}> · הועלה כאן</span>
                )}
                {dirty && <span style={{ color: "#a03a5c", fontWeight: 700 }}> · לא נשמר</span>}
              </div>
            </div>
            {r.kind === "pdf" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span id={`pages-del-label-${r.id}`} style={{ fontSize: 12.5, color: "#6d6f88" }}>עמודים למחיקה:</span>
                <input
                  className="input"
                  style={{ width: 92, fontSize: 13, padding: ".4rem .5rem" }}
                  placeholder="1 / 1-2"
                  aria-labelledby={`pages-del-label-${r.id}`}
                  value={drafts[r.id] ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                />
              </div>
            )}
            <label style={{ fontSize: 12.5, color: pendingHidden ? "#a03a5c" : "#6d6f88", display: "flex", gap: 5, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={pendingHidden}
                onChange={(e) => setHiddenDrafts((d) => ({ ...d, [r.id]: e.target.checked }))}
              />
              הסתר קובץ
            </label>
            <Link href={`/shelf/${r.id}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: 13, padding: ".4rem .7rem" }}>צפייה</Link>
            <button
              onClick={() => save(r, pendingHidden, drafts[r.id] ?? "")}
              disabled={saving === r.id}
              className="btn btn-main"
              style={{ fontSize: 13.5, padding: ".45rem .9rem" }}
            >
              {saving === r.id ? "שומר…" : "שמירה"}
            </button>
            {r.source === "upload" && (
              <button
                onClick={() => remove(r)}
                disabled={saving === r.id}
                className="btn btn-ghost"
                style={{ fontSize: 13, padding: ".4rem .7rem", color: "#a03a5c", borderColor: "#a03a5c" }}
              >
                מחיקה לצמיתות
              </button>
            )}
          </div>
          );
        })}
      </div>

      {limit < filtered.length && (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button onClick={() => setLimit((l) => l + PAGE)} className="btn btn-main" style={{ fontSize: 14 }}>
            טעינת עוד
          </button>
        </div>
      )}
    </div>
  );
}
