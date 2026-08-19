// ---------------------------------------------------------------------------
// פירוט הכיסוי בפועל לכל קופה ולכל מסלול, לפי מספר קטלוגי.
//
// זה מה שהופך את המסך להשוואה: `fundsAvailable` אומר רק "כל ארבע הקופות
// מכסות", בלי המסלול, השיעור, הסכום ותקופת ההמתנה — כלומר בלי שום דבר להשוות.
// הקובץ נבנה מהמקור של מערכת 06 (`script/build-fund-details.ts`).
//
// נטען פעם אחת ל-cold start ונשמר בזיכרון; ~1.1MB, ולכן הוא לא נכנס לתשובת
// רשימת הנושאים אלא רק לנושא בודד.
// ---------------------------------------------------------------------------
import { readFileSync } from "node:fs";
import { join } from "node:path";

export type FundPlan = {
  plan: string;
  code: string;
  text: string;
  rate?: string;
  amount?: string;
  waiting?: string;
};
export type FundDetails = Record<string, FundPlan[]>;

let cache: Record<string, FundDetails> | null = null;

function load(): Record<string, FundDetails> {
  if (cache) return cache;
  // ב-Vercel הפונקציה מורצת מתוך שורש הפריסה; בפיתוח — משורש האפליקציה.
  const candidates = [
    join(process.cwd(), "hf_fund_details.json"),
    join(process.cwd(), "..", "hf_fund_details.json"),
  ];
  for (const p of candidates) {
    try {
      cache = JSON.parse(readFileSync(p, "utf8"));
      return cache!;
    } catch {
      /* try next */
    }
  }
  // eslint-disable-next-line no-console
  console.error("[fund-details] file not found; comparison detail unavailable");
  cache = {};
  return cache;
}

export function fundDetailsFor(catalogNo: number | null): FundDetails | null {
  if (catalogNo == null) return null;
  return load()[String(catalogNo)] ?? null;
}
