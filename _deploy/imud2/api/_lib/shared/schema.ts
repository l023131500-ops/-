import { z } from "zod";

/**
 * מנוע עימוד תורני — סכימת נתונים (גרסה 2, מורחבת).
 *
 * ספר (book) → מכיל הגדרות עימוד (templateKey + settings JSON) + תוכן (content JSON).
 * התוכן נשמר כמערך "בלוקים" (blocks), כל בלוק בעל שכבה (layer), טקסט, ומאפיינים.
 * שכבות אפשריות: ראה LayerKind.
 *
 * הרחבות גרסה 2:
 *   • שדות מטא לספר: קטגוריה, שער, כריכה.
 *   • BookSettings מורחב משמעותית — מיקרו-טיפוגרפיה, מספור, מעברים.
 *   • ContentBlock מורחב — מעברי עמוד/מקטע, נעילה, סגנון כותרת מותאם.
 *   • כל השדות אחורה-תואמים: ספרים ישנים ממשיכים לעבוד (ברירות-מחדל).
 */

/**
 * הנתונים נשמרים ב-Supabase (טבלת otvedaf.books). כאן מוגדרים הטיפוסים
 * וסכימות ה-Zod בלבד — ללא תלות ב-Drizzle/SQLite.
 * settings/content מיוצגים כמחרוזות JSON בטיפוס Book (הלקוח וה-DOCX מצפים למחרוזת);
 * שכבת האחסון מסדרת/מפענחת אל/מ-jsonb.
 */
export interface Book {
  id: number;
  title: string;
  author: string;
  templateKey: string;
  settings: string;   // JSON string (BookSettings)
  content: string;    // JSON string (ContentBlock[])
  createdAt: number;
  updatedAt: number;
}

export const insertBookSchema = z.object({
  title: z.string().min(1),
  author: z.string().default(""),
  templateKey: z.string().default("regular"),
  settings: z.string().default("{}"),
  content: z.string().default("[]"),
});

export const updateBookSchema = insertBookSchema.partial();

export type InsertBook = z.infer<typeof insertBookSchema>;
export type UpdateBook = z.infer<typeof updateBookSchema>;

/* ═══════════════ טיפוסי תוכן ותבנית (משותף ללקוח/שרת) ═══════════════ */

export type LayerKind =
  | "main"        // טקסט מרכזי
  | "rashi"       // פירוש פנימי (רש"י)
  | "tosafot"     // פירוש חיצוני (תוספות)
  | "commentaryA" // פרשן א'
  | "commentaryB" // פרשן ב'
  | "footnote"    // הערת שוליים
  | "sidenote"    // מ"מ / הערת צד
  | "heading"     // כותרת פרק/סימן/הלכה
  | "subheading"  // כותרת משנה
  | "openingWord" // מילת פתיחה מוגדלת
  | "question"    // שאלה (שו"ת)
  | "answer"      // תשובה (שו"ת)
  | "source"      // ציטוט מקור / פסוק
  | "poem";       // בית שיר / פיוט

export interface BlockMeta {
  level?: number;        // רמת כותרת 1-4 (עבור heading)
  marker?: string;       // סימן/מספר להערה, הלכה, סימן
  ref?: string;          // מראה-מקום
  // סגנון כותרת מותאם (רק ל-heading/subheading)
  headingFont?: string;  // stack CSS; ריק = ברירת-מחדל התבנית
  headingSize?: number;  // em יחסי (למשל 1.5)
  headingBold?: boolean;
  headingAlign?: "right" | "center" | "left";
  // מעברים ידניים לפני הבלוק
  pageBreakBefore?: boolean;    // מעבר עמוד לפני
  columnBreakBefore?: boolean;  // מעבר מקטע/טור לפני
  keepWithNext?: boolean;       // הישאר עם הבא (לכותרות/הלכות)
  // סימון "נעול" — הגנה מפני שינוי לא-מכוון (למידע קדוש)
  locked?: boolean;
}

export interface ContentBlock {
  id: string;
  layer: LayerKind;
  text: string;
  meta?: BlockMeta;
}

/* ─── מיקרו-טיפוגרפיה: מיקום מספור, יישור שורה אחרונה ─── */
export type NumberingStyle = "gematria" | "decimal" | "letters" | "none";
export type NumberSide = "inner" | "outer" | "right" | "left" | "center";
export type LastLineAlign = "justify" | "center" | "right" | "start";
export type OpeningWordStyle = "dropcap" | "bold-word" | "small-caps" | "none";

export interface BookSettings {
  /* גודל ופריסה */
  pageSize: "a4" | "a5" | "b5" | "letter";
  columns: 1 | 2;               // מספר טורים לטקסט הראשי
  columnGap: number;            // mm

  /* טיפוגרפיה בסיסית */
  fontFamily: string;
  fontSize: number;             // px
  lineHeight: number;           // יחס

  /* שוליים (mm) */
  marginTop: number;
  marginBottom: number;
  marginInner: number;          // צד השדרה
  marginOuter: number;

  /* מספור עמודים */
  pageNumbering: NumberingStyle; // גימטריה / ספרות / אותיות / ללא
  pageNumberSide: NumberSide;    // ימין / שמאל / חיצוני / פנימי / מרכז

  /* כותרות רצות */
  runningHead: boolean;
  runningHeadText: string;       // ריק = שם הספר
  runningHeadShowChapter: boolean; // הצג שם פרק נוכחי

  /* מיקרו-טיפוגרפיה של הטקסט */
  openingWord: OpeningWordStyle; // מילה/אות ראשונה בולטת
  lastLineAlign: LastLineAlign;  // יישור שורה אחרונה בכל מקטע
  smallParens: boolean;          // סוגריים קטנות מהטקסט
  preventWidows: boolean;        // מנע "חלון" — שורה אחרונה עם מילה בודדת
  paragraphIndent: number;       // em — כניסת שורה ראשונה

  /* כותרות */
  headingFont: string;           // ברירת-מחדל לכותרות
  headingSizeH1: number;         // em
  headingSizeH2: number;         // em
  headingAlign: "right" | "center" | "left";

  /* תוכן ותכונות */
  nikud: boolean;                // תוכן מנוקד
  tableOfContents: boolean;      // הפק תוכן עניינים אוטומטי
  footnoteColumns: 1 | 2;        // הערות שוליים בטור אחד או שניים

  /* שער וכריכה */
  titlePage: boolean;            // עמוד שער
  coverColor: string;            // hex — צבע כריכה
  titlePageSubtitle: string;     // תת-כותרת בשער
}
