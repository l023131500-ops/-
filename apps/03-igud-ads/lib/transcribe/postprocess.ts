import { getOpenAI, EDITOR_MODEL } from "../openai";

export type StyleKey = "litvish" | "chassidish" | "yiddish";

export type GlossaryItem = { term: string; replacement: string | null; notes?: string | null };

const STYLE_GUIDES: Record<StyleKey, string> = {
  litvish: `סגנון ליטאי: שיח תלמודי-ישיבתי. לשון צחה, מדויקת, יבשה משהו. מונחים כמו "סוגיה", "פלפול", "ראש ישיבה", "שיעור כללי", "בחור ישיבה", "מוסר", "יגיעה", "חזרה על הסוגיה". העדף "אומר" / "מבאר" / "מסיק". פסקאות קצרות וברורות.`,
  chassidish: `סגנון חסידי: שיח של מאמרי חסידות ועבודת השם. מונחים: "טיש", "צדיק", "הדלקה", "דביקות", "פנימיות", "ניגון", "עבודה פנימית", "התעוררות", "ביטול". אופי חם, נושם, ביטויי קבלה מותרים בזהירות.`,
  yiddish: `מסלול אידיש: שמור על מילים/ביטויים באידיש כפי שנאמרו, ותן בסוגריים תרגום קצר לעברית כאשר זה עוזר להבנה. אל תתרגם שמות מקובלים. אם מופיע משפט שלם באידיש — תעתיק עברי + תרגום.`
};

export interface EditedResult {
  edited_text: string;          // טקסט ערוך עם פיסוק וכותרות
  footnotes: Array<{
    number: number;             // מספר הערה (החל מ-1)
    position?: number;          // אינדקס תווי של המיקום בטקסט (לא חובה)
    note_text: string;          // תוכן ההערה
    source_ref?: string;        // מקור (לדוגמה: "ברכות ה ע\"א")
  }>;
}

export async function editTranscript(opts: {
  rawText: string;
  style: StyleKey;
  glossary: GlossaryItem[];
}): Promise<EditedResult> {
  const openai = getOpenAI();
  const { rawText, style, glossary } = opts;

  const glossaryBlock = glossary.length
    ? "מילון מונחים למסלול " + style + " (להחליף בעדינות במידת הצורך):\n" +
      glossary.map((g) => `- "${g.term}" → ${g.replacement || g.term}${g.notes ? " | " + g.notes : ""}`).join("\n")
    : "אין מילון מונחים מותאם למסלול זה.";

  const system = `אתה עורך מקצועי בעברית של שיעורי תורה. עבודתך:
1) קבל טקסט תמלול גולמי של שיעור.
2) הוסף פיסוק (פסיקים, נקודות, סימני שאלה).
3) חלק לפסקאות הגיוניות.
4) הוסף כותרות משנה לפי נושאים (### כותרת).
5) זהה ציטוטים: פסוקים, חז"ל, גמרא, ראשונים, אחרונים — וסמן אותם עם [^N] שבו N הוא מספר רץ.
6) אל תשנה משמעות, אל תוסיף תכנים שלא נאמרו, אל תסיר תכנים שנאמרו. רק עריכה לשונית והוספת מקורות.
7) ${STYLE_GUIDES[style]}
8) ${glossaryBlock}

הפלט שלך חייב להיות JSON תקין במבנה הבא, ללא טקסט נוסף:
{
  "edited_text": "כותרת ראשית\\n\\n### כותרת משנה\\nפסקה ראשונה[^1]. ...\\n",
  "footnotes": [
    { "number": 1, "note_text": "ברכות ה ע\\"א", "source_ref": "ברכות ה ע\\"א" }
  ]
}

הערות:
- ב-edited_text הסימון של ההערות הוא [^N] במקום הציטוט.
- footnotes חייב להיות ממוין לפי number, החל מ-1 ברצף.
- אם לא מצאת מקורות — החזר footnotes = [].
- אסור להחזיר כל טקסט מחוץ ל-JSON.`;

  const resp = await openai.chat.completions.create({
    model: EDITOR_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: `מסלול: ${style}\n\n=== טקסט גולמי ===\n${rawText}` }
    ]
  });

  const content = resp.choices[0]?.message?.content || "{}";
  let parsed: EditedResult;
  try {
    parsed = JSON.parse(content) as EditedResult;
  } catch {
    throw new Error("פלט עורך לא תקין: " + content.slice(0, 300));
  }
  if (!parsed.edited_text) throw new Error("edited_text ריק");
  parsed.footnotes = (parsed.footnotes || []).map((f, i) => ({
    number: f.number ?? i + 1,
    note_text: f.note_text || "",
    source_ref: f.source_ref || f.note_text || "",
    position: (f as any).position
  }));
  return parsed;
}
