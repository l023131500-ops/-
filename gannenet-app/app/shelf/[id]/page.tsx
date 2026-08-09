import Link from "next/link";
import { seedItems, type ShelfItem } from "@/lib/catalog";
import { getUploaded } from "@/lib/supabase";

export function generateStaticParams() {
  return seedItems.map((i) => ({ id: i.id }));
}
export const dynamicParams = true;

function fmtDate(d: string) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return day && m && y ? `${day}/${m}/${y}` : d;
}

async function resolveItem(id: string): Promise<ShelfItem | null> {
  const seed = seedItems.find((i) => i.id === id);
  if (seed) return seed;
  return await getUploaded(id);
}

export default async function ShelfItemPage({ params }: { params: { id: string } }) {
  const item = await resolveItem(params.id);

  if (!item) {
    return (
      <div className="container-r" style={{ padding: 40 }}>
        <p>
          החומר לא נמצא. <Link href="/shelf" style={{ color: "#2b4a8b" }}>חזרה למדף</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="container-r" style={{ padding: "28px 20px 50px", maxWidth: 980 }}>
      <Link href="/shelf" style={{ color: "#2b4a8b", fontWeight: 600 }}>→ חזרה למדף הגננת</Link>

      <div className="card" style={{ padding: "22px 26px", marginTop: 14 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          <span className="chip" style={{ background: "#e2f3f0", color: "#1f6a62" }}>{item.category}</span>
          <span className="chip" style={{ background: item.kind === "pdf" ? "#f8e8ee" : "#f7efd8", color: item.kind === "pdf" ? "#a03a5c" : "#a2781f" }}>
            {item.kind === "pdf" ? "PDF" : "תמונה"}
          </span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#2b4a8b", lineHeight: 1.5 }}>{item.title}</h1>
        <p style={{ color: "#6d6f88", marginTop: 6, fontSize: 14 }}>
          {item.sender}{item.sender && item.date ? " · " : ""}{fmtDate(item.date)}{item.sizeKB ? ` · ${item.sizeKB}KB` : ""}
        </p>

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <a href={item.file} download target="_blank" rel="noopener" className="btn btn-main" style={{ fontSize: 14.5 }}>
            הורדת הקובץ
          </a>
          <a href={item.file} target="_blank" rel="noopener" className="btn btn-ghost" style={{ fontSize: 14.5 }}>
            פתיחה בכרטיסייה חדשה
          </a>
        </div>

        <div style={{ marginTop: 20, borderRadius: 14, overflow: "hidden", border: "1px solid #ebe7de", background: "#f4f2ec" }}>
          {item.kind === "pdf" ? (
            <object data={item.file} type="application/pdf" style={{ width: "100%", height: "82vh", display: "block" }}>
              <div style={{ padding: 24, textAlign: "center" }}>
                <p style={{ color: "#6d6f88" }}>הדפדפן אינו מציג PDF מוטמע.</p>
                <a href={item.file} target="_blank" rel="noopener" className="btn btn-main" style={{ marginTop: 10 }}>פתיחת הקובץ</a>
              </div>
            </object>
          ) : (
            <img src={item.file} alt={item.title} style={{ width: "100%", height: "auto", display: "block" }} />
          )}
        </div>

        <p style={{ marginTop: 14, fontSize: 12.5, color: "#9a9cb0" }}>
          טיפ להורדת טווח עמודים: בתוך התצוגה — Ctrl+P, בחירת טווח עמודים, ושמירה כ-PDF.
        </p>
      </div>
    </div>
  );
}
