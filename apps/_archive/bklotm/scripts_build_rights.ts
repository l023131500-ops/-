import ExcelJS from "exceljs";
import { writeFileSync } from "fs";
import { mainCategories } from "/dev-server/src/data/rightsData.ts";

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile("/tmp/podcasts.xlsx");
const ws = wb.getWorksheet("גיליון1")!;
const getText = (cell: any): string => {
  if (!cell || cell.value == null) return "";
  const v = cell.value;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v.richText) return v.richText.map((r: any) => r.text).join("");
  if (typeof v === "object" && v.text) return v.text;
  return String(v);
};

// Extract full body for each column (skip column 23 which is just category header "רשות המיסים")
const collectCol = (col: number, skipFirst = false) => {
  const parts: string[] = [];
  for (let r = 1; r <= ws.rowCount; r++) {
    const t = getText(ws.getCell(r, col)).trim();
    if (!t) continue;
    if (skipFirst && parts.length === 0 && t.length < 50) continue;
    // skip meta sentences like "מעולה. אנחנו עוברים..." or "סיימנו את נושא..."
    if (/^(מעולה|מצוין|זהו השלב|אנחנו (ממשיכים|עוברים)|הנה הנוסח|צודק לגמרי|תיקנו והשלמנו|סיימנו את נושא|האם (אפשר|תרצה))/.test(t) && t.length < 200) continue;
    parts.push(t);
  }
  return parts.join("\n\n");
};

// MANUAL MAPPING: column number -> exact topic_label from rightsData
const COL_TO_TOPIC: Record<number, string> = {
  1: "דמי אבטלה", // col1: כל מה שצריך לדעת על דמי אבטלה (alt for col 37, but col 37 also exists)
  2: "מענק עבודה (מס הכנסה שלילי)",
  3: "שיקום מקצועי",
  4: "קצבת נכות כללית",
  5: 'קצבת שירותים מיוחדים (שר"מ)',
  6: "קצבת ניידות",
  7: "קצבת ילד נכה",
  8: "קצבת ילדים ומענק לימודים",
  9: "דמי לידה ומענק לידה", // מענק לידה
  10: "דמי לידה ומענק לידה", // דמי לידה - same topic
  11: "קצבת מזונות",
  12: "קצבת שאירים",
  13: "קצבת אזרח ותיק (זקנה)",
  14: "גמלת סיעוד",
  15: "הבטחת הכנסה והשלמת הכנסה", // השלמת הכנסה לאזרח ותיק
  16: "הבטחת הכנסה והשלמת הכנסה",
  17: "מענק חימום",
  18: "הנחות והטבות למקבלי קצבאות",
  19: "דמי תאונת דרכים", // דמי תאונה
  20: "זכויות נפגעי פעולות איבה",
  21: "תגמולי מילואים",
  22: "דמי קבורה ומענקי פטירה",
  24: "החזרי מס לשכירים",
  25: "פטור ממס הכנסה מטעמי רפואה",
  26: "מענק עבודה (מס הכנסה שלילי)",
  27: "נקודות זיכוי להורים לילדים עם צרכים מיוחדים",
  28: "זיכוי מס לתושבי הפריפריה",
  29: "החזרי מס שבח ומס רכישה",
  30: "פטור ממס על משיכת פיצויים ופנסיה",
  31: "החזרי מס על תרומות",
  32: "זכויות נפגעי פעולות איבה", // משרד הביטחון - הכרה בנכות (closest match)
  33: "זכויות חיילים משוחררים",
  34: "סיוע בשכר דירה",
  35: "דירה בהנחה (מחיר למשתכן)",
  36: "דיור ציבורי",
  37: "דמי אבטלה",
  38: "איסור פיטורי עובדת בהיריון", // זכויות נשים בעבודה
  39: "זכויות עובדי משק בית", // זכויות עובדים - generic
  40: "תקרות תשלום בסל הבריאות",
  41: "קנאביס רפואי",
  42: "ייפוי כוח מתמשך רפואי",
  43: "ירושות וצוואות",
  44: "תו נכה ואגרת רישוי מופחתת",
  45: "הנחה בתחבורה ציבורית", // צדק תחבורתי - closest
  46: "הר הכסף (חשבונות ופנסיות אבודות)",
  47: "הר הביטוח (איתור כפילויות)",
  48: 'הלוואת זכאות (משכנתא מסובסדת)', // משכנתאות
  49: "סיוע במימון מכשירי שמיעה",
  50: "רפואה משלימה מסובסדת",
  51: "סבסוד טיפולי שיניים", // בריאות השן
  52: "אבחונים וטיפולים לילדים", // need to check
  53: "אורח חיים בריא", // need to check
  54: "בריאות העין", // need to check
  55: "תקרות תשלום בסל הבריאות", // תרופות - similar
  56: "אימוץ ילדים - זכויות ומענקים", // חבילת אימוץ
  57: "פינוי באמבולנס", // need check
  58: "מכשירי שיקום וניידות", // אביזרי שיקום
  59: "פיצויי פיטורין",
  60: "סיוע במימון מכשירי שמיעה", // שמיעה ואורתופדיה
  61: "דמי מחלה",
  62: "הפרשות לפנסיה - חובת מעסיק",
  63: "דמי הבראה",
};

// Build topics list with stable numbering
const topics: any[] = [];
let n = 0;
for (const cat of mainCategories) {
  for (const t of cat.topics) {
    n++;
    topics.push({ topic_number: n, topic_name: t.label, category: cat.label, plain_description: t.desc || "" });
  }
}

// Verify mapping coverage
const topicByName = new Map(topics.map(t => [t.topic_name, t]));
const missing: string[] = [];
for (const [col, name] of Object.entries(COL_TO_TOPIC)) {
  if (!topicByName.has(name)) missing.push(`col ${col} -> "${name}"`);
}
if (missing.length) {
  console.error("MISSING topics:", missing);
}

// Attach podcasts. If a topic is mapped from multiple cols, pick the longest body.
const podcastByTopic = new Map<string, string>();
for (const [colStr, topicName] of Object.entries(COL_TO_TOPIC)) {
  const col = Number(colStr);
  const body = collectCol(col).trim();
  if (!body) continue;
  const existing = podcastByTopic.get(topicName);
  if (!existing || body.length > existing.length) podcastByTopic.set(topicName, body);
}

console.log("Topics with podcasts:", podcastByTopic.size);
console.log("Total topics:", topics.length);

// Output as SQL inserts
const escSQL = (s: string) => s.replace(/'/g, "''");
const lines: string[] = [];
lines.push("-- Insert all 174 topics and attach podcasts where available");
lines.push("BEGIN;");
lines.push("DELETE FROM rights_reference;");
for (const t of topics) {
  const podcast = podcastByTopic.get(t.topic_name) || null;
  const podSQL = podcast ? `'${escSQL(podcast)}'` : "NULL";
  lines.push(
    `INSERT INTO rights_reference (topic_number, topic_name, category, plain_description, podcast_text) VALUES (${t.topic_number}, '${escSQL(t.topic_name)}', '${escSQL(t.category)}', '${escSQL(t.plain_description)}', ${podSQL});`
  );
}
lines.push("COMMIT;");
writeFileSync("/tmp/work/load_rights.sql", lines.join("\n"));
console.log("SQL written:", lines.length, "lines");

// Also output mapped topics for review
console.log("\n=== MAPPED TOPICS WITH PODCASTS ===");
for (const [name, body] of podcastByTopic.entries()) {
  console.log("✓", name, `(${body.length} chars)`);
}
