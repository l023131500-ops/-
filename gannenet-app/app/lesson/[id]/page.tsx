import Link from "next/link";
import { mashlimaLessons, regularLessons } from "@/lib/content";

export function generateStaticParams() {
  return [...mashlimaLessons, ...regularLessons].map((l: any) => ({ id: l.id }));
}

const H = ({ children }: any) => <h2 style={{ fontSize: 21, fontWeight: 800, color: "#2b4a8b", margin: "22px 0 8px" }}>{children}</h2>;
const P = ({ children }: any) => <p style={{ fontSize: 16, lineHeight: 1.8, color: "#3a3c56", marginBottom: 10 }}>{children}</p>;
const List = ({ items }: { items: string[] }) => (
  <ul style={{ paddingInlineStart: 22, marginBottom: 10 }}>{items.map((x, i) => <li key={i} style={{ fontSize: 16, lineHeight: 1.7, color: "#3a3c56", marginBottom: 4 }}>{x}</li>)}</ul>
);
const Rhyme = ({ lines }: { lines: string[] }) => (
  <div style={{ background: "#f7efd8", borderRadius: 12, padding: "14px 18px", textAlign: "center", lineHeight: 2, color: "#8a6a1c", margin: "8px 0", fontSize: 17 }}>
    {lines.map((l, i) => <div key={i}>{l}</div>)}
  </div>
);

export default function LessonPage({ params }: { params: { id: string } }) {
  const m = mashlimaLessons.find((l) => l.id === params.id);
  const r = regularLessons.find((l) => l.id === params.id);
  if (!m && !r) return <div className="container-r" style={{ padding: 40 }}><p>המערך לא נמצא. <Link href="/library" style={{ color: "#2b4a8b" }}>חזרה למאגר</Link></p></div>;

  return (
    <div className="container-r" style={{ padding: "30px 20px 50px", maxWidth: 900 }}>
      <Link href="/library" style={{ color: "#2b4a8b", fontWeight: 600 }}>→ חזרה למאגר</Link>
      {m && (
        <article className="card" style={{ padding: "28px 32px", marginTop: 14 }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: "#2b4a8b", textAlign: "center" }}>{m.title}</h1>
          <p style={{ textAlign: "center", color: "#6d6f88", marginTop: 6, borderBottom: "2px solid #f7efd8", paddingBottom: 14 }}>{m.meta}</p>
          <H>רקע וידע לגננת</H>{m.background.map((p, i) => <P key={i}>{p}</P>)}
          <H>מטרות המפגש</H><List items={m.objectives} />
          <H>פתיחה</H><P>{m.opening}</P>
          <H>הסיפור לילדים</H>{m.story.map((p, i) => <P key={i}>{p}</P>)}
          <H>פעילות בקבוצה</H><P>{m.activity}</P>
          <H>רעיון למעבר</H><P>{m.transition}</P>
          <H>יצירה</H>{m.crafts.map((c, i) => <P key={i}><b>{c.t}: </b>{c.body}</P>)}
          <H>דקלום בחרוזים</H><Rhyme lines={m.rhyme} />
          <H>שיח וסיכום</H><List items={m.summary} />
          <H>הרחבות</H><List items={m.extensions} />
          <H>דף עבודה מוצע</H><P>{m.worksheet}</P>
        </article>
      )}
      {r && (
        <article className="card" style={{ padding: "28px 32px", marginTop: 14 }}>
          <p style={{ textAlign: "center", color: "#6d6f88" }}>{r.topic} · מפגש {r.day} מתוך 5</p>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#2b4a8b", textAlign: "center" }}>{r.title}</h1>
          <p style={{ textAlign: "center", color: "#6d6f88", marginTop: 6, borderBottom: "2px solid #f7efd8", paddingBottom: 14 }}>{r.meta}</p>
          <H>פתיחת המפגש</H><P>{r.opening}</P>
          <H>רקע וידע לגננת (עם מקורות)</H>{r.teacherKnowledge.map((p, i) => <P key={i}>{p}</P>)}
          <H>הלימוד לילדים</H>{r.childLearning.map((p, i) => <P key={i}>{p}</P>)}
          <H>העמקה ושיח</H>{r.deepening.map((p, i) => <P key={i}>{p}</P>)}
          {r.questions?.length > 0 && <List items={r.questions} />}
          <H>סיכום המפגש</H><P>{r.summary}</P>
          {r.pasuk?.length > 0 && <Rhyme lines={r.pasuk} />}
          {r.sources && <P><b>מקורות: </b>{r.sources}</P>}
          <H>מעברים ויצירות</H>
          <List items={r.transitions} />
          {r.crafts.map((c, i) => <P key={i}><b>{c.t}: </b>{c.body}</P>)}
          <H>דף עבודה מוצע</H><P>{r.worksheet}</P>
        </article>
      )}
    </div>
  );
}
