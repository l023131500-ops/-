import type { ContentBlock } from "./schema";

/**
 * מנוע הגהה — סורק את כל בלוקי הספר ומחזיר רשימת טעויות/הערות מסודרת.
 *
 * עיקרון-על (חוק ברזל): המנוע לעולם אינו משנה טקסט בעצמו.
 * הוא רק *מזהה* ומציע. כל תיקון מוחל אך ורק לאחר אישור מפורש של המשתמש.
 * הטקסט קדוש — אין מחיקה או שינוי אוטומטי.
 *
 * שלוש קטגוריות (לפי דרישת המשתמש):
 *   1. spelling  — טעויות כתיב
 *   2. language  — עריכת לשון + המלצות ניסוח
 *   3. source    — טעויות מקורות / מראי-מקום
 */

export type IssueCategory = "spelling" | "language" | "source";

export const CATEGORY_META: Record<IssueCategory, { label: string; color: string }> = {
  spelling: { label: "טעויות כתיב", color: "#a13544" },
  language: { label: "עריכת לשון וניסוח", color: "#7a39bb" },
  source: { label: "טעויות מקורות", color: "#964219" },
};

export interface ProofIssue {
  id: string;                 // מזהה ייחודי
  blockId: string;            // הבלוק שבו נמצאה הטעות
  category: IssueCategory;
  start: number;             // אינדקס תו התחלה בטקסט הבלוק
  end: number;               // אינדקס תו סיום
  original: string;          // הטקסט המקורי (מה שיוחלף)
  suggestion: string;        // ההצעה לתיקון (עשוי להיות ריק להערה בלבד)
  message: string;           // הסבר קצר בעברית
  source: "rules" | "ai";    // מקור הזיהוי
}

const uid = () => "iss-" + Math.random().toString(36).slice(2, 10);

/* ═══════════════ כללי כתיב נפוצים ═══════════════ */

interface Rule {
  category: IssueCategory;
  re: RegExp;
  suggest: (m: RegExpMatchArray) => string;
  message: string;
}

/**
 * כללים שמרניים בלבד — טעויות כתיב/לשון ברורות, לא ספק.
 * מכוון לעברית תורנית. כל כלל מציע תיקון אך אינו מחיל אותו.
 */
const RULES: Rule[] = [
  /* — רווחים כפולים — */
  {
    category: "spelling",
    re: /  +/g,
    suggest: () => " ",
    message: "רווח כפול — מומלץ רווח יחיד",
  },
  /* — רווח לפני פסיק/נקודה — */
  {
    category: "spelling",
    re: / +([,.;:!?])/g,
    suggest: (m) => m[1],
    message: "רווח מיותר לפני סימן פיסוק",
  },
  /* — שלוש נקודות במקום … / נקודות מרובות — */
  {
    category: "language",
    re: /\.{4,}/g,
    suggest: () => "...",
    message: "רצף נקודות ארוך — מומלץ שלוש נקודות",
  },
  /* — גרשיים כפולים סמוכים — */
  {
    category: "spelling",
    re: /""|”“|“”/g,
    suggest: () => '"',
    message: "גרשיים כפולים סמוכים",
  },
  /* — שגיאות כתיב נפוצות בעברית — */
  {
    category: "spelling",
    re: /\bבמיוחד\b/g,
    suggest: () => "במיוחד",
    message: "בדיקת כתיב: 'במיוחד'",
  },
  {
    category: "spelling",
    re: /\bלמרות ש/g,
    suggest: () => "אף על פי ש",
    message: "המלצת ניסוח: 'למרות ש...' → 'אף על פי ש...'",
  },
  {
    category: "language",
    re: /\bבגלל ש/g,
    suggest: () => "מפני ש",
    message: "המלצת ניסוח: 'בגלל ש...' → 'מפני ש...' / 'משום ש...'",
  },
  {
    category: "language",
    re: /\bבכדי\b/g,
    suggest: () => "כדי",
    message: "'בכדי' — עדיף 'כדי' (אלא בהקשר 'לא בכדי')",
  },
  {
    category: "spelling",
    re: /\bאיתי\b/g,
    suggest: () => "אתי",
    message: "כתיב מלא/חסר: 'איתי' ↔ 'אתי'",
  },
  /* — כפילות מילה רצופה — */
  {
    category: "language",
    re: /\b(\S+)\s+\1\b/g,
    suggest: (m) => m[1],
    message: "כפילות מילה רצופה",
  },
];

/* ═══════════════ זיהוי מראי-מקום (source) ═══════════════ */

// דפוסים של מראי מקום שגויים או חסרים
const SOURCE_RULES: Rule[] = [
  /* — סימן/דף ללא מספר — */
  {
    category: "source",
    re: /\b(דף|עמ'|עמוד|סימן|סעיף|פרק|הלכה)\s*(?=[.,;)\]]|$)/g,
    suggest: (m) => m[0],
    message: "מראה-מקום חסר מספר (למשל 'דף' ללא ציון הדף)",
  },
  /* — פרק בספרות רגילות בהקשר תורני (מומלץ אותיות) — */
  {
    category: "source",
    re: /\b(פרק|סימן)\s+(\d{1,3})\b/g,
    suggest: (m) => m[0],
    message: "מראה-מקום במספרים — במקורות תורניים מקובל לעיתים באותיות",
  },
];

/* ═══════════════ הסורק הראשי ═══════════════ */

/** בודק אילו שכבות רלוונטיות להגהה (טקסט מהותי, לא כותרות בלבד). */
const PROOF_LAYERS = new Set([
  "main", "footnote", "sidenote", "commentaryA", "commentaryB",
  "rashi", "tosafot", "question", "answer", "source", "openingWord", "poem",
  "heading", "subheading",
]);

/**
 * סורק את כל הבלוקים ומחזיר רשימת טעויות ממוינת לפי מיקום בספר.
 * ignoreSet — קבוצת מזהי-חתימה של טעויות שהמשתמש בחר להתעלם מהן (לא יופיעו שוב).
 */
export function scanBook(
  blocks: ContentBlock[],
  ignoreSet: Set<string> = new Set(),
): ProofIssue[] {
  const issues: ProofIssue[] = [];
  const allRules = [...RULES, ...SOURCE_RULES];

  for (const block of blocks) {
    if (!PROOF_LAYERS.has(block.layer)) continue;
    const text = block.text || "";
    if (!text.trim()) continue;

    for (const rule of allRules) {
      rule.re.lastIndex = 0;
      let m: RegExpMatchArray | null;
      // eslint-disable-next-line no-cond-assign
      while ((m = rule.re.exec(text)) !== null) {
        const start = m.index ?? 0;
        const original = m[0];
        const suggestion = rule.suggest(m);
        // דלג אם ההצעה זהה למקור ואין הודעה משמעותית של source
        if (suggestion === original && rule.category !== "source") {
          if (!rule.re.global) break;
          continue;
        }
        const sig = issueSignature(block.id, rule.category, start, original);
        if (!ignoreSet.has(sig)) {
          issues.push({
            id: uid(),
            blockId: block.id,
            category: rule.category,
            start,
            end: start + original.length,
            original,
            suggestion,
            message: rule.message,
            source: "rules",
          });
        }
        if (!rule.re.global) break;
        if (m.index === rule.re.lastIndex) rule.re.lastIndex++; // הגנה מלולאה אינסופית
      }
    }
  }

  // מיון: לפי סדר הבלוקים ואז לפי מיקום
  const order = new Map(blocks.map((b, i) => [b.id, i]));
  issues.sort((a, b) => {
    const oa = order.get(a.blockId) ?? 0;
    const ob = order.get(b.blockId) ?? 0;
    if (oa !== ob) return oa - ob;
    return a.start - b.start;
  });

  return issues;
}

/** חתימה יציבה לטעות — לזיהוי "התעלם" בין סריקות. */
export function issueSignature(
  blockId: string, category: IssueCategory, start: number, original: string,
): string {
  return `${blockId}|${category}|${start}|${original}`;
}

/**
 * מחיל תיקון בודד על טקסט בלוק — פונקציה טהורה.
 * מוחזר טקסט חדש; ה-caller אחראי לעדכן את הבלוק (רק לאחר אישור).
 */
export function applyFix(text: string, issue: ProofIssue): string {
  return text.slice(0, issue.start) + issue.suggestion + text.slice(issue.end);
}

/** סטטיסטיקה לפי קטגוריה. */
export function countByCategory(issues: ProofIssue[]): Record<IssueCategory, number> {
  const out: Record<IssueCategory, number> = { spelling: 0, language: 0, source: 0 };
  for (const i of issues) out[i.category]++;
  return out;
}
