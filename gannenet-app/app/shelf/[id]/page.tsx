import Link from "next/link";
import { seedItems, type ShelfItem } from "@/lib/catalog";
import { getDriveItem } from "@/lib/drive-catalog";
import { getUploaded } from "@/lib/supabase";
import PageTool from "@/components/PageTool";

export function generateStaticParams() {
  return seedItems.map((i) => ({ id: i.id }));
}
export const dynamicParams = true;

function fmtDate(d: string) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return day && m && y ? `${day}/${m}/${y}` : d;
}

function kindChip(kind: ShelfItem["kind"]) {
  switch (kind) {
    case "pdf": return { label: "PDF", bg: "#f8e8ee", fg: "#a03a5c" };
    case "image": return { label: "תמונה", bg: "#f7efd8", fg: "#a2781f" };
    case "media": return { label: "מדיה", bg: "#e6eefb", fg: "#2b4a8b" };
    case "gapp": return { label: "Google", bg: "#e2f3f0", fg: "#1f6a62" };
    default: return { label: "מסמך", bg: "#efe9f6", fg: "#6b4aa0" };
  }
}

// Drive-streamed files force attachment via ?dl=1; local assets download directly.
function downloadUrl(item: ShelfItem) {
  return item.source === "drive" ? `${item.file}?dl=1` : item.file;
}

async function resolveItem(id: string): Promise<ShelfItem | null> {
  const seed = seedItems.find((i) => i.id === id);
  if (seed) return seed; // in-repo hosted asset (fastest)
  const drive = getDriveItem(id);
  if (drive) return drive; // streamed from Drive via /api/drive/{id}
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
          <span className="chip" style={{ background: kindChip(item.kind).bg, color: kindChip(item.kind).fg }}>
            {kindChip(item.kind).label}
          </span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#2b4a8b", lineHeight: 1.5 }}>{item.title}</h1>
        <p style={{ color: "#6d6f88", marginTop: 6, fontSize: 14 }}>
          {item.sender}{item.sender && item.date ? " · " : ""}{fmtDate(item.date)}{item.sizeKB ? ` · ${item.sizeKB}KB` : ""}
        </p>

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <a href={downloadUrl(item)} className="btn btn-main" style={{ fontSize: 14.5 }}>
            הורדת הקובץ
          </a>
          <a href={item.file} target="_blank" rel="noopener" className="btn btn-ghost" style={{ fontSize: 14.5 }}>
            פתיחה בכרטיסייה חדשה
          </a>
          {item.viewUrl && (
            <a href={item.viewUrl} target="_blank" rel="noopener" className="btn btn-ghost" style={{ fontSize: 14.5 }}>
              צפייה ב-Google Drive
            </a>
          )}
        </div>

        <div style={{ marginTop: 20, borderRadius: 14, overflow: "hidden", border: "1px solid #ebe7de", background: "#f4f2ec" }}>
          {item.kind === "pdf" ? (
            <object data={item.file} type="application/pdf" style={{ width: "100%", height: "82vh", display: "block" }}>
              <div style={{ padding: 24, textAlign: "center" }}>
                <p style={{ color: "#6d6f88" }}>הדפדפן אינו מציג PDF מוטמע.</p>
                <a href={item.file} target="_blank" rel="noopener" className="btn btn-main" style={{ marginTop: 10 }}>פתיחת הקובץ</a>
              </div>
            </object>
          ) : item.kind === "image" ? (
            <img src={item.file} alt={item.title} style={{ width: "100%", height: "auto", display: "block" }} />
          ) : item.kind === "media" ? (
            <div style={{ padding: 24 }}>
              {item.mime.startsWith("video/") ? (
                <video src={item.file} controls style={{ width: "100%", borderRadius: 10 }} />
              ) : (
                <audio src={item.file} controls style={{ width: "100%" }} />
              )}
            </div>
          ) : (
            <div style={{ padding: 30, textAlign: "center" }}>
              <p style={{ color: "#6d6f88", lineHeight: 1.7 }}>
                סוג הקובץ ({item.mime.split("/").pop()}) אינו מוצג בתצוגה מוטמעת.<br />
                אפשר להוריד אותו, או לפתוח ב-Google Drive.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 14, flexWrap: "wrap" }}>
                <a href={downloadUrl(item)} className="btn btn-main" style={{ fontSize: 14 }}>הורדת הקובץ</a>
                {item.viewUrl && (
                  <a href={item.viewUrl} target="_blank" rel="noopener" className="btn btn-ghost" style={{ fontSize: 14 }}>פתיחה ב-Drive</a>
                )}
              </div>
            </div>
          )}
        </div>

        {item.kind === "pdf" && <PageTool fileUrl={item.file} title={item.title} />}
      </div>
    </div>
  );
}
