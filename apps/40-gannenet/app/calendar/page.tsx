import { HDate, HebrewCalendar, Location, Sedra } from "@hebcal/core";

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
        <p style={{ marginTop: 16, color: "#6d6f88", fontSize: 14 }}>מבוסס על ספריית @hebcal/core (חישוב מקומי, ללא תלות ברשת) · בהמשך יחובר לנושאים המומלצים לכל שבוע.</p>
      </div>
    </div>
  );
}
