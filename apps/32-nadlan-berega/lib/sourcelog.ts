// ==== לוג המקורות — פנימי בלבד ====
//
// הדוח ללקוח אינו מציג עוד "מקור: X". זה לא אומר שאנחנו מפסיקים לדעת מאיפה
// כל נתון הגיע — להפך: בלי השורה על המסך, הלוג הזה הוא המקום היחיד שבו
// אפשר לבדוק זאת, ולכן הוא נכתב בכל הפקת דוח.
//
// נכתב לפלט השרת (Vercel Runtime Logs) ומוחזר למרכז השליטה. **לא** נשלח
// ללקוח: `/api/report` מסירה את השדה מהתשובה לפני שהיא יוצאת.

import type { PropertyReport } from './buildreport';
import type { Fact } from './report';
import { sourceOf } from './sources';

export interface SourceLogEntry {
  category: string;
  label: string;
  sourceKey: string;
  /** השם הקריא של המקור, כפי שהוא רשום במרשם המקורות. */
  sourceName: string;
  certainty: Fact['certainty'];
  hasValue: boolean;
  asOf: string | null;
}

export interface SourceLog {
  query: string;
  tier: string;
  assetType: string;
  generatedAt: string;
  /** כמה נתונים הגיעו מכל מקור — התמונה המהירה. */
  bySource: { sourceKey: string; sourceName: string; facts: number }[];
  entries: SourceLogEntry[];
}

export function buildSourceLog(report: PropertyReport): SourceLog {
  const entries: SourceLogEntry[] = [];

  for (const category of report.categories) {
    for (const f of category.facts) {
      const src = sourceOf(f.sourceKey);
      entries.push({
        category: category.title,
        label: f.label,
        sourceKey: f.sourceKey,
        sourceName: src?.publicName ?? src?.displayName ?? f.sourceKey,
        certainty: f.certainty,
        hasValue: f.value !== null,
        asOf: f.asOf ?? null,
      });
    }
  }

  const counts = new Map<string, { sourceKey: string; sourceName: string; facts: number }>();
  for (const e of entries) {
    const row = counts.get(e.sourceKey) ?? { sourceKey: e.sourceKey, sourceName: e.sourceName, facts: 0 };
    row.facts++;
    counts.set(e.sourceKey, row);
  }

  return {
    query: report.query,
    tier: report.tier,
    assetType: report.assetType,
    generatedAt: report.generatedAt,
    bySource: [...counts.values()].sort((a, b) => b.facts - a.facts),
    entries,
  };
}

/**
 * שורה אחת לפלט השרת: מה הופק, ומאיזה מקורות.
 * שורה אחת ולא שורה לכל נתון — כדי שאפשר יהיה למצוא אותה בלוג.
 */
export function logReportSources(report: PropertyReport): SourceLog {
  const log = buildSourceLog(report);
  const summary = log.bySource.map((s) => `${s.sourceName}×${s.facts}`).join(', ');
  console.log(
    `[report-sources] "${log.query}" tier=${log.tier} type=${log.assetType} ` +
      `facts=${log.entries.length} filled=${log.entries.filter((e) => e.hasValue).length} :: ${summary}`,
  );
  return log;
}
