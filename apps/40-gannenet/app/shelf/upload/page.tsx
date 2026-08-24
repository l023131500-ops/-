"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CATEGORY_ORDER } from "@/lib/catalog";
import { withBase } from "@/lib/base";
import { sessionToken, authLinks } from "@/lib/session";
import {
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
  isAcceptedType,
  formatSize,
  TOO_LARGE_MSG,
  BAD_TYPE_MSG,
} from "@/lib/upload-limits";

/**
 * An error on this route does not always come from the route. A file over the
 * platform's request-body limit is refused by the edge, which answers HTML, and
 * `res.json()` on that throws a SyntaxError — so the teacher was shown
 * "Unexpected token '<'" where a sentence belongs. Read the body once as text
 * and only then try to parse it.
 */
async function readError(res: Response): Promise<string> {
  const body = await res.text().catch(() => "");
  try {
    const data = JSON.parse(body);
    if (data && typeof data.error === "string" && data.error) return data.error;
  } catch {
    /* not JSON — the edge answered, not us */
  }
  if (res.status === 413) return TOO_LARGE_MSG;
  if (res.status === 503) return "אחסון הענן אינו מוגדר בסביבה הזו.";
  if (res.status >= 500) return "השרת לא זמין כרגע. נסו שוב בעוד רגע.";
  return `שגיאה בהעלאה (${res.status}).`;
}

export default function UploadPage() {
  const [ready, setReady] = useState<boolean | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [loginHref, setLoginHref] = useState("https://more30.com/login");
  const [signupHref, setSignupHref] = useState("https://more30.com/login?mode=signup");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORY_ORDER[0]);
  const [sender, setSender] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetch(withBase("/api/catalog"))
      .then((r) => r.json())
      .then((d) => setReady(Boolean(d.ready)))
      .catch(() => setReady(false));
    setSignedIn(Boolean(sessionToken()));
    const links = authLinks();
    setLoginHref(links.login);
    setSignupHref(links.signup);
  }, []);

  // Checked here and not only on the server: a file over the limit used to be
  // uploaded in full over the teacher's connection before anything refused it,
  // and past 4.5MB nothing refused it with a message she could read.
  function reject(f: File): string | null {
    if (!isAcceptedType(f.type)) return BAD_TYPE_MSG;
    if (f.size > MAX_UPLOAD_BYTES) return `${TOO_LARGE_MSG} הקובץ שנבחר: ${formatSize(f.size)}.`;
    return null;
  }

  function pick(f: File | null) {
    setMsg(null);
    if (!f) return setFile(null);
    const bad = reject(f);
    if (bad) {
      setFile(null);
      (document.getElementById("file-input") as HTMLInputElement).value = "";
      return setMsg({ type: "err", text: bad });
    }
    setFile(f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setMsg(null);
    if (!file) return setMsg({ type: "err", text: "יש לבחור קובץ." });
    if (!title.trim()) return setMsg({ type: "err", text: "יש להזין כותרת." });
    const bad = reject(file);
    if (bad) return setMsg({ type: "err", text: bad });
    const token = sessionToken();
    if (!token) {
      setSignedIn(false);
      return setMsg({ type: "err", text: "יש להתחבר לחשבון more30 כדי להוסיף חומר למדף." });
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("category", category);
      fd.append("sender", sender.trim());
      fd.append("file", file);
      const res = await fetch(withBase("/api/catalog"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      // סשן שפג תוקפו בין טעינת העמוד לשליחה נראה כאן בדיוק כמו מי שלא התחבר
      // מעולם, ולכן המסך חוזר למצב "צריך להתחבר" ולא רק מציג שגיאה.
      if (res.status === 401) setSignedIn(false);
      if (!res.ok) throw new Error(await readError(res));
      setMsg({ type: "ok", text: "החומר נוסף למדף בהצלחה!" });
      setTitle("");
      setSender("");
      setFile(null);
      (document.getElementById("file-input") as HTMLInputElement).value = "";
    } catch (err: any) {
      // A failed fetch reports "Failed to fetch"; the teacher gets a sentence.
      const text = err instanceof TypeError ? "החיבור נכשל. בדקו את החיבור לאינטרנט ונסו שוב." : err?.message;
      setMsg({ type: "err", text: text || "שגיאה בהעלאה." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-r" style={{ padding: "34px 20px 60px", maxWidth: 640 }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Link href="/shelf" style={{ color: "#2b4a8b", fontWeight: 600 }}>→ חזרה למדף הגננת</Link>
        <Link href="/shelf/mine" style={{ color: "#2b4a8b", fontWeight: 600 }}>החומרים שלי</Link>
      </div>
      <h1 style={{ fontSize: 30, fontWeight: 800, marginTop: 14 }}>הוספת חומר למדף</h1>
      <p style={{ color: "#6d6f88", marginTop: 6, lineHeight: 1.7 }}>
        העלו דף עבודה, דף צביעה, יצירה או חומר חג (PDF או תמונה, עד {MAX_UPLOAD_LABEL}). החומר יתווסף למדף לצפייה והורדה.
      </p>

      {ready === false && (
        <div className="card" style={{ padding: 16, marginTop: 18, background: "#f7efd8", borderColor: "#e6d199", color: "#8a6a1c" }}>
          אחסון הענן להעלאות עדיין לא הופעל בסביבה הזו. המדף עם החומרים הקיימים פעיל לצפייה והורדה;
          העלאת חומרים חדשים תיפתח מיד עם הגדרת משתני הסביבה של האחסון.
        </div>
      )}

      {signedIn === false && (
        <div className="card" style={{ padding: 18, marginTop: 18, background: "#eef2fb", borderColor: "#c8d4ee" }}>
          <b style={{ display: "block", fontSize: 16, color: "#2b4a8b" }}>הוספת חומר דורשת חשבון</b>
          <p style={{ color: "#4a4c63", marginTop: 6, lineHeight: 1.7, fontSize: 14.5 }}>
            המדף פתוח לצפייה ולהורדה לכולם, בלי הרשמה. כדי להוסיף חומר משלכן יש להתחבר —
            חשבון אחד לכל מערכות more30, וההתחברות מחזירה אתכן בדיוק לעמוד הזה.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <a className="btn btn-main" href={loginHref}>כניסה לחשבון</a>
            <a className="btn btn-ghost" href={signupHref}>פתיחת חשבון — פחות מדקה</a>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="card" style={{ padding: 22, marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <label style={{ fontWeight: 600, fontSize: 14 }}>
          כותרת החומר
          <input className="input" style={{ marginTop: 6 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="למשל: דף עבודה — פירות הארץ" />
        </label>
        <label style={{ fontWeight: 600, fontSize: 14 }}>
          קטגוריה
          <select className="input" style={{ marginTop: 6 }} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label style={{ fontWeight: 600, fontSize: 14 }}>
          מקור / קרדיט (רשות)
          <input className="input" style={{ marginTop: 6 }} value={sender} onChange={(e) => setSender(e.target.value)} placeholder="למשל: קהילת גן" />
        </label>
        <label style={{ fontWeight: 600, fontSize: 14 }}>
          קובץ (PDF או תמונה, עד {MAX_UPLOAD_LABEL})
          <input id="file-input" className="input" style={{ marginTop: 6 }} type="file" accept="application/pdf,image/*" onChange={(e) => pick(e.target.files?.[0] || null)} />
          {file && (
            <span style={{ display: "block", marginTop: 6, fontWeight: 400, fontSize: 13, color: "#6d6f88" }}>
              {file.name} · {formatSize(file.size)}
            </span>
          )}
        </label>

        {msg && (
          <div style={{ padding: "10px 14px", borderRadius: 10, fontSize: 14, background: msg.type === "ok" ? "#e2f3f0" : "#f8e8ee", color: msg.type === "ok" ? "#1f6a62" : "#a03a5c" }}>
            {msg.text}
            {msg.type === "ok" && (
              <>
                {" "}
                <Link href="/shelf/mine" style={{ color: "#1f6a62", fontWeight: 700, textDecoration: "underline" }}>
                  לחומרים שלי
                </Link>
              </>
            )}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-main"
          disabled={busy || ready === false || signedIn === false}
          style={{ justifyContent: "center", opacity: busy || ready === false || signedIn === false ? 0.6 : 1 }}
        >
          {busy ? "מעלה…" : signedIn === false ? "יש להתחבר כדי להוסיף" : "הוספה למדף"}
        </button>
      </form>
    </div>
  );
}
