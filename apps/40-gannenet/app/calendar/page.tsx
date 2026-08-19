import { HDate, HebrewCalendar, Location, Sedra } from "@hebcal/core";
import Link from "next/link";
import { weekTopics, inDaysLabel } from "@/lib/season";

export const dynamic = "force-dynamic";

export default function CalendarPage() {
  const now = new HDate(new Date());
  const year = now.getFullYear();
  let parasha = "";
  try {
    const sedra = new Sedra(year, false);
    // find this week's Shabbat parasha
    const todayAbs = now.abs();
    const satAbs = todayAbs + ((6 - (todayAbs % 7)) % 7);
    const p = sedra.getString(new HDate(satAbs) as any, "he" as any);
    parasha = p || "";
  } catch { parasha = ""; }

  let holidays: string[] = [];
  try {
    const events = HebrewCalendar.calendar({ year: now.getFullYear(), isHebrewYear: true, locale: "he" });
    const m = now.getMonth();
    holidays = events
      .filter((e: any) => { const d = e.getDate(); return d.getMonth() === m; })
      .slice(0, 8)
      .map((e: any) => e.render("he"));
  } catch { holidays = []; }

  let topics: ReturnType<typeof weekTopics> = [];
  try { topics = weekTopics(now); } catch { topics = []; }

  return (
    <div className="container-r" style={{ padding: "34px 20px 50px", maxWidth: 820 }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800 }}>לוח שנה עברי חכם</h1>
        <p style={{ color: "#6d6f88", marginTop: 6 }}>זיהוי אוטומטי של השבוע — פרשה, חג וחודש — ונושאים מומלצים</p>
      </div>
      <div className="card" style={{ padding: 26 }}>
        <p style={{ fontSize: 18 }}><b>התאריך העברי היום:</b> {now.render("he")}</p>
        {parasha && <p style={{ fontSize: 18, marginTop: 10 }}><b>פרשת השבוע:</b> {parasha}</p>}
        {holidays.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <b>מועדים בחודש זה:</b>
            <ul style={{ paddingInlineStart: 22, marginTop: 6 }}>{holidays.map((h, i) => <li key={i} style={{ marginBottom: 4 }}>{h}</li>)}</ul>
          </div>
        )}
        <p style={{ marginTop: 16, color: "#6d6f88", fontSize: 14 }}>מבוסס על ספריית @hebcal/core (חישוב מקומי, ללא תלות ברשת).</p>
      </div>

      {topics.length > 0 && (
        <div className="card" style={{ padding: 26, marginTop: 18 }}>
          <b style={{ fontSize: 18 }}>נושאים מומלצים למדף — 45 הימים הקרובים</b>
          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            {topics.map((t) => (
              <Link
                key={t.category}
                href={`/shelf?cat=${encodeURIComponent(t.category)}`}
                className="card"
                style={{ padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, textDecoration: "none", flexWrap: "wrap" }}
              >
                <span>
                  <span style={{ fontWeight: 700, color: "#2b4a8b" }}>{t.category}</span>
                  <span style={{ color: "#6d6f88", fontSize: 13.5, marginInlineStart: 8 }}>{t.reason} · {t.civilDate}</span>
                </span>
                <span className="chip" style={{ background: "#eef2fb", color: "#2b4a8b", whiteSpace: "nowrap" }}>{inDaysLabel(t.inDays)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
