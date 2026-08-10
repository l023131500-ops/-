"use client";
import { useEffect, useMemo, useState } from "react";
import { PDFDocument } from "pdf-lib";

/**
 * PdfViewer — preview + in-site page selection for download / print.
 * Respects `hiddenPages` (admin-trimmed, e.g. a leading email page): those pages
 * never appear in the preview, the selectable grid, or any download/print output.
 */
export default function PdfViewer({
  fileUrl,
  title,
  hiddenPages = [],
}: {
  fileUrl: string;
  title: string;
  hiddenPages?: number[];
}) {
  const [buf, setBuf] = useState<ArrayBuffer | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [rangeText, setRangeText] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "busy">("loading");
  const [err, setErr] = useState("");

  const hiddenSet = useMemo(() => new Set(hiddenPages), [hiddenPages]);

  useEffect(() => {
    let alive = true;
    let url = "";
    (async () => {
      try {
        const res = await fetch(fileUrl);
        if (!res.ok) throw new Error("קובץ לא נטען");
        const ab = await res.arrayBuffer();
        const doc = await PDFDocument.load(ab, { ignoreEncryption: true });
        if (!alive) return;
        const count = doc.getPageCount();
        const visible = Array.from({ length: count }, (_, i) => i + 1).filter((p) => !hiddenSet.has(p));
        setBuf(ab);
        setPageCount(count);
        setSelected(new Set(visible));

        // Build the trimmed preview (visible pages only).
        const out = await PDFDocument.create();
        const pages = await out.copyPages(doc, visible.map((p) => p - 1));
        pages.forEach((pg) => out.addPage(pg));
        const bytes = await out.save();
        url = URL.createObjectURL(new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }));
        if (!alive) return;
        setPreviewUrl(url);
        setStatus("ready");
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "שגיאה בטעינת הקובץ");
        setStatus("error");
      }
    })();
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [fileUrl, hiddenSet]);

  const visiblePages = useMemo(
    () => Array.from({ length: pageCount }, (_, i) => i + 1).filter((p) => !hiddenSet.has(p)),
    [pageCount, hiddenSet]
  );
  const sortedSel = useMemo(() => Array.from(selected).sort((a, b) => a - b), [selected]);

  function toggle(p: number) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(p) ? n.delete(p) : n.add(p);
      return n;
    });
  }
  function selectAll() {
    setSelected(new Set(visiblePages));
  }
  function clearAll() {
    setSelected(new Set());
  }
  function applyRange() {
    const parsed = parseRange(rangeText, pageCount);
    // keep only visible pages
    setSelected(new Set(Array.from(parsed).filter((p) => !hiddenSet.has(p))));
  }

  async function buildSelectedPdf(): Promise<Blob | null> {
    if (!buf || !sortedSel.length) return null;
    const src = await PDFDocument.load(buf, { ignoreEncryption: true });
    const out = await PDFDocument.create();
    const pages = await out.copyPages(src, sortedSel.map((p) => p - 1));
    pages.forEach((pg) => out.addPage(pg));
    const bytes = await out.save();
    return new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  }

  async function download() {
    try {
      setStatus("busy");
      const blob = await buildSelectedPdf();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const base = (title || "מסמך").replace(/[\\/:*?"<>|]+/g, "").slice(0, 60);
      a.download = `${base} — עמודים ${rangeLabel(sortedSel)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } finally {
      setStatus("ready");
    }
  }

  async function print() {
    try {
      setStatus("busy");
      const blob = await buildSelectedPdf();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "-10000px";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.src = url;
      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            window.open(url, "_blank", "noopener");
          }
        }, 300);
      };
      document.body.appendChild(iframe);
      setTimeout(() => {
        iframe.remove();
        URL.revokeObjectURL(url);
      }, 60000);
    } finally {
      setStatus("ready");
    }
  }

  return (
    <>
      {/* Preview (trimmed) */}
      <div style={{ marginTop: 20, borderRadius: 14, overflow: "hidden", border: "1px solid #ebe7de", background: "#f4f2ec" }}>
        {status === "error" ? (
          <div style={{ padding: 24, textAlign: "center" }}>
            <p style={{ color: "#a03a5c" }}>לא ניתן להציג את הקובץ ({err}).</p>
            <a href={fileUrl} target="_blank" rel="noopener" className="btn btn-main" style={{ marginTop: 10 }}>פתיחת הקובץ</a>
          </div>
        ) : previewUrl ? (
          <object data={previewUrl} type="application/pdf" style={{ width: "100%", height: "82vh", display: "block" }}>
            <div style={{ padding: 24, textAlign: "center" }}>
              <p style={{ color: "#6d6f88" }}>הדפדפן אינו מציג PDF מוטמע.</p>
              <a href={previewUrl} target="_blank" rel="noopener" className="btn btn-main" style={{ marginTop: 10 }}>פתיחת הקובץ</a>
            </div>
          </object>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: "#6d6f88" }}>טוען תצוגה…</div>
        )}
      </div>

      {/* Page selection tool */}
      <div style={boxStyle}>
        {status === "loading" ? (
          <p style={{ color: "#6d6f88" }}>טוען עמודים…</p>
        ) : status === "error" ? (
          <a href={fileUrl} download className="btn btn-main" style={{ fontSize: 14 }}>הורדת הקובץ המלא</a>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <strong style={{ color: "#2b4a8b", fontSize: 15.5 }}>בחירת עמודים להורדה / הדפסה</strong>
              <span style={{ color: "#6d6f88", fontSize: 13 }}>
                {visiblePages.length} עמ׳{hiddenPages.length ? ` (הוסתרו ${hiddenPages.length})` : ""} · נבחרו {sortedSel.length}
              </span>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
              <input
                className="input"
                style={{ flex: "1 1 200px", fontSize: 14 }}
                placeholder="טווח עמודים, לדוגמה: 1-3,5,8-10"
                value={rangeText}
                onChange={(e) => setRangeText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyRange()}
              />
              <button onClick={applyRange} className="btn btn-ghost" style={{ fontSize: 13.5, padding: ".45rem .8rem" }}>החל טווח</button>
              <button onClick={selectAll} className="btn btn-ghost" style={{ fontSize: 13.5, padding: ".45rem .8rem" }}>בחר הכול</button>
              <button onClick={clearAll} className="btn btn-ghost" style={{ fontSize: 13.5, padding: ".45rem .8rem" }}>נקה</button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(46px,1fr))",
                gap: 6,
                marginTop: 12,
                maxHeight: 210,
                overflowY: "auto",
                paddingInlineEnd: 4,
              }}
            >
              {visiblePages.map((p) => {
                const on = selected.has(p);
                return (
                  <button
                    key={p}
                    onClick={() => toggle(p)}
                    title={`עמוד ${p}`}
                    style={{
                      cursor: "pointer",
                      border: on ? "1px solid #2b4a8b" : "1px solid #ddd8cc",
                      background: on ? "#2b4a8b" : "#fff",
                      color: on ? "#fff" : "#6d6f88",
                      borderRadius: 8,
                      padding: "8px 0",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <button onClick={download} disabled={!sortedSel.length || status === "busy"} className="btn btn-main" style={{ fontSize: 14.5, opacity: !sortedSel.length ? 0.5 : 1 }}>
                {status === "busy" ? "מכין…" : `הורדת ${sortedSel.length} עמודים (PDF)`}
              </button>
              <button onClick={print} disabled={!sortedSel.length || status === "busy"} className="btn btn-ghost" style={{ fontSize: 14.5, opacity: !sortedSel.length ? 0.5 : 1 }}>
                הדפסת העמודים הנבחרים
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

const boxStyle: React.CSSProperties = {
  marginTop: 16,
  padding: "16px 18px",
  borderRadius: 14,
  border: "1px solid #ebe7de",
  background: "#faf8f2",
};

function parseRange(text: string, max: number): Set<number> {
  const out = new Set<number>();
  for (const part of text.split(/[,\s]+/).filter(Boolean)) {
    const m = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) continue;
    let a = parseInt(m[1], 10);
    let b = m[2] ? parseInt(m[2], 10) : a;
    if (a > b) [a, b] = [b, a];
    for (let p = a; p <= b; p++) if (p >= 1 && p <= max) out.add(p);
  }
  return out;
}

function rangeLabel(pages: number[]): string {
  if (!pages.length) return "";
  const parts: string[] = [];
  let start = pages[0];
  let prev = pages[0];
  for (let i = 1; i <= pages.length; i++) {
    if (i < pages.length && pages[i] === prev + 1) {
      prev = pages[i];
      continue;
    }
    parts.push(start === prev ? `${start}` : `${start}-${prev}`);
    if (i < pages.length) {
      start = pages[i];
      prev = pages[i];
    }
  }
  return parts.join(",");
}
