import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `אתה עוזר פדגוגי מומחה לגיל הרך עבור רשת גני ילדים בציבור החרדי והדתי בישראל. הקפד על הכללים הבאים בכל תגובה:
(1) שפה ומונחים — השתמש אך ורק בשפה חינוכית, חמה, מכבדת ובעלת גוון יהודי־תורני, בהתייחסות לפרשת השבוע, מועדי ישראל ומידות טובות בגובה עיני הילד.
(2) התאמה גילאית — התאם את רמת ההסברים, אורך הטקסטים ואופי הפעילויות בדיוק לשכבת הגיל המבוקשת (מעון / טרום־חובה / חובה).
(3) כשרות ויזואלית ותוכנית — אין לכלול תכנים או הנחיות עיצוב שאינם הולמים את ערכי החינוך החרדי; ההנחיות ליצירה ולציורים יהיו נקיות, צנועות וממוקדות בלמידה חווייתית.
(4) פלט — החזר תמיד JSON תקין בלבד בפורמט:
{ "title": "", "ageGroup": "", "instructions": "", "contentElements": ["", ""], "designHints": ["", ""] }
ללא טקסט חופשי נוסף מחוץ ל-JSON.`;

export async function POST(req: NextRequest) {
  try {
    const { topic, ageGroup, style } = await req.json();
    if (!topic) return NextResponse.json({ error: "חסר נושא" }, { status: 400 });

    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      return NextResponse.json({
        notConnected: true,
        title: `דף משימה: ${topic}`,
        ageGroup: ageGroup || "טרום־חובה",
        instructions: "כדי להפעיל יצירה אמיתית בזמן אמת, יש להזין מפתח ANTHROPIC_API_KEY במשתני הסביבה. זהו תצוגת דוגמה של מבנה הפלט.",
        contentElements: [`פתיחה בנושא "${topic}"`, "3 שאלות התאמה מותאמות לגיל", "משימת צביעה נקייה", "דקלום קצר בחרוזים"],
        designHints: ["כותרת מעוצבת למעלה", "קווים נקיים לגזירה", "אלמנטים גרפיים צנועים בלבד"],
      });
    }

    const client = new Anthropic({ apiKey: key });
    const msg = await client.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `צור דף משימה. נושא: ${topic}. קבוצת גיל: ${ageGroup || "טרום־חובה"}. סוג פעילות: ${style || "דף עבודה"}.` }],
    });
    const text = msg.content.map((c: any) => (c.type === "text" ? c.text : "")).join("");
    let data: any;
    try { data = JSON.parse(text); } catch { data = { title: `דף משימה: ${topic}`, ageGroup, instructions: text, contentElements: [], designHints: [] }; }
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "שגיאה" }, { status: 500 });
  }
}
