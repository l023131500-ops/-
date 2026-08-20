"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  seedItems,
  sortItems,
  orderedCategories,
  allSenders,
  type ShelfItem,
} from "@/lib/catalog";
import { withBase } from "@/lib/base";

function fmtDate(d: string) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return day && m && y ? `${day}/${m}/${y}` : d;
}

function kindLabel(k: ShelfItem["kind"]) {
  switch (k) {
    case "pdf": return "PDF";
    case "image": return "תמונה";
    case "media": return "מדיה";
    case "gapp": return "Google";
    default: return "מסמך";
  }
}
function kindColor(k: ShelfItem["kind"]) {
  switch (k) {
    case "pdf": return { bg: "#f8e8ee", fg: "#a03a5c" };
    case "image": return { bg: "#f7efd8", fg: "#a2781f" };
    case "media": return { bg: "#e6eefb", fg: "#2b4a8b" };
    case "gapp": return { bg: "#e2f3f0", fg: "#1f6a62" };
    default: return { bg: "#efe9f6", fg: "#6b4aa0" };
  }
}

const PAGE = 48;

export default function ShelfPage() {
  const [drive, setDrive] = useState<ShelfItem[]>([]);
  const [uploads, setUploads] = useState<ShelfItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("");
  const [sender, setSender] = useState("");
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [prefetch, setPrefetch] = useState<{ on: boolean; done: number; total: number }>({ on: false, done: 0, total: 0 });

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(withBase("/api/drive-catalog")).then((r) => (r.ok ? r.json() : { items: [] })).catch(() => ({ items: [] })),
      fetch(withBase("/api/catalog")).then((r) => (r.ok ? r.json() : { items: [] })).catch(() => ({ items: [] })),
    ]).then(([d, u]) => {
      if (!alive) return;
      if (Array.isArray(d.items)) setDrive(d.items as ShelfItem[]);
      if (Array.isArray(u.items)) setUploads(u.items as ShelfItem[]);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Read cat/q from the URL once on mount — links from the calendar page
  // ("נושאים מומלצים") and elsewhere land here pre-filtered. Read via
  // window.location rather than next/navigation's useSearchParams so this
  // client page doesn't need a Suspense boundary to build.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const urlCat = sp.get("cat");
    const urlQ = sp.get("q");
    if (urlCat) setCat(urlCat);
    if (urlQ) setQ(urlQ);
  }, []);

  // Merge sources; seed (in-repo) wins over drive for the same id; uploads added last.
  const all = useMemo(() => {
    const map = new Map<string, ShelfItem>();
    for (const i of drive) map.set(i.id, i);
    for (const i of seedItems) map.set(i.id, i); // override drive with local hosted asset
    for (const i of uploads) if (!map.has(i.id)) map.set(i.id, i);
    return sortItems(Array.from(map.values()));
  }, [drive, uploads]);

  const cats = useMemo(() => orderedCategories(all), [all]);
  const senders = useMemo(() => allSenders(all), [all]);

  const filtered = useMemo(
    () =>
      all.filter(
        (i) =>
          (!cat || i.category === cat) &&
          (!sender || i.sender === sender) &&
          (!kind || i.kind === kind) &&
          (!q || (i.title + i.category + i.sender).toLowerCase().includes(q.toLowerCase()))
      ),
    [all, cat, sender, kind, q]
  );

  // reset visible count whenever the filter changes
  useEffect(() => setLimit(PAGE), [cat, sender, kind, q]);

  // Offline pre-cache progress messages from the service worker.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMsg = (e: MessageEvent) => {
      const d: any = e.data || {};
      if (d.type === "PREFETCH_PROGRESS") setPrefetch({ on: true, done: d.done, total: d.total });
      if (d.type === "PREFETCH_DONE") setPrefetch({ on: false, done: d.total, total: d.total });
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
  }, []);

  function saveOffline() {
    // Same-origin files only (Drive proxy + in-repo assets); cross-origin uploads are skipped.
    const urls = filtered.filter((i) => i.file.startsWith("/")).slice(0, 500).map((i) => withBase(i.file));
    if (!urls.length) return;
    if (urls.length > 50 && !confirm(`לשמור ${urls.length} קבצים לצפייה ללא אינטרנט? זה עשוי לקחת זמן ולתפוס מקום במכשיר.`)) return;
    const sw = navigator.serviceWorker?.controller;
    if (!sw) {
      alert("האחסון לאופליין עדיין נטען — נסו שוב בעוד רגע (רעננו את הדף פעם אחת).");
      return;
    }
    setPrefetch({ on: true, done: 0, total: urls.length });
    sw.postMessage({ type: "PREFETCH", urls });
  }

  const visible = filtered.slice(0, limit);

  return (
    <div className="container-r" style={{ padding: "34px 20px 60px" }}>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <span className="chip" style={{ background: "#f7efd8", color: "#a2781f" }}>
          מדף הגננת · ארכיון חומרים
        </span>
        <h1 style={{ fontSize: 34, fontWeight: 800, marginTop: 12 }}>מדף הגננת</h1>
        <p style={{ color: "#6d6f88", marginTop: 6, maxWidth: 640, marginInline: "auto", lineHeight: 1.7 }}>
          כל אוסף החומרים — דפי עבודה, דפי צביעה, יצירה וחומרי חג — מסודרים לפי סדר השנה.
          צפייה, בחירת עמודים, הורדה והדפסה — הכול בקליק.
        </p>
        <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/shelf/upload" className="btn btn-main" style={{ fontSize: 14.5 }}>
            הוספת חומר למדף
          </Link>
          <button onClick={saveOffline} disabled={prefetch.on || loading} className="btn btn-ghost" style={{ fontSize: 14.5 }}>
            {prefetch.on ? `שומר לאופליין… ${prefetch.done}/${prefetch.total}` : "שמירת התצוגה לאופליין"}
          </button>
          <span style={{ alignSelf: "center", color: "#6d6f88", fontSize: 14 }}>
            {loading ? "טוען…" : `${all.length.toLocaleString("he")} פריטים · ${cats.length} קטגוריות`}
          </span>
        </div>
        {prefetch.total > 0 && !prefetch.on && (
          <p style={{ color: "#1f6a62", fontSize: 12.5, marginTop: 8 }}>
            ✓ {prefetch.total.toLocaleString("he")} קבצים זמינים כעת גם ללא אינטרנט
          </p>
        )}
      </div>

      {/* Category quick chips (ordered) */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", margin: "18px 0 14px" }}>
        <button onClick={() => setCat("")} className="chip" style={{ cursor: "pointer", border: "none", background: cat === "" ? "#2b4a8b" : "#eef2fb", color: cat === "" ? "#fff" : "#2b4a8b" }}>
          הכול
        </button>
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)} className="chip" style={{ cursor: "pointer", border: "none", background: cat === c ? "#2b4a8b" : "#eef2fb", color: cat === c ? "#fff" : "#2b4a8b" }}>
            {c}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 14, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <input className="input" style={{ flex: "1 1 220px" }} placeholder="חיפוש חומר…" aria-label="חיפוש חומר" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" style={{ flex: "0 0 190px" }} aria-label="סינון לפי מקור" value={sender} onChange={(e) => setSender(e.target.value)}>
          <option value="">כל המקורות</option>
          {senders.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input" style={{ flex: "0 0 150px" }} aria-label="סינון לפי סוג קובץ" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">כל הסוגים</option>
          <option value="pdf">מסמכי PDF</option>
          <option value="image">תמונות</option>
          <option value="doc">מסמכים (Word/PPT)</option>
          <option value="media">אודיו / וידאו</option>
          <option value="gapp">Google Docs</option>
        </select>
      </div>

      <p style={{ textAlign: "center", color: "#9a9cb0", fontSize: 13, marginBottom: 18 }}>
        {loading ? "" : `מוצגים ${Math.min(limit, filtered.length)} מתוך ${filtered.length.toLocaleString("he")}`}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 16 }}>
        {visible.map((i) => {
          const kc = kindColor(i.kind);
          return (
            <div key={i.id} className="card" style={{ padding: 18, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                <span className="chip" style={{ background: "#e2f3f0", color: "#1f6a62" }}>{i.category}</span>
                <span className="chip" style={{ background: kc.bg, color: kc.fg }}>{kindLabel(i.kind)}</span>
              </div>
              <h3 style={{ fontSize: 15.5, fontWeight: 700, color: "#2b4a8b", lineHeight: 1.5, minHeight: 46 }}>{i.title}</h3>
              <p style={{ fontSize: 12.5, color: "#6d6f88", marginTop: 8 }}>
                {i.sender}{i.sender && i.date ? " · " : ""}{fmtDate(i.date)}{i.sizeKB ? ` · ${i.sizeKB}KB` : ""}
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <Link href={`/shelf/${i.id}`} className="btn btn-main" style={{ flex: 1, justifyContent: "center", padding: ".5rem", fontSize: 14 }}>
                  פתיחה וצפייה
                </Link>
                <a href={i.source === "drive" ? `${withBase(i.file)}?dl=1` : withBase(i.file)} className="btn btn-ghost" style={{ padding: ".5rem .7rem", fontSize: 14 }}>
                  הורדה
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && filtered.length === 0 && (
        <p style={{ textAlign: "center", color: "#6d6f88", marginTop: 40 }}>לא נמצאו חומרים לסינון הזה.</p>
      )}

      {limit < filtered.length && (
        <div style={{ textAlign: "center", marginTop: 26 }}>
          <button onClick={() => setLimit((l) => l + PAGE)} className="btn btn-main" style={{ fontSize: 14.5, padding: ".6rem 1.6rem" }}>
            טעינת עוד ({(filtered.length - limit).toLocaleString("he")} נוספים)
          </button>
        </div>
      )}
    </div>
  );
}
