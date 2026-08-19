// ==== טאבו — שכבה משפטית לפי דרישה (VIP) ====
//
// אין API ציבורי לנסח, ואין להמציא נתונים משפטיים. לכן זהו **מתאם ספק** גנרי
// עם שני מצבים, וסוג הנסח הוא פרמטר ולא שלושה מסלולי קוד נפרדים:
//
//   (א) `official_manual` — ברירת המחדל. אין ספק מוגדר, ולכן מוחזרת הפניה
//       להזמנה רשמית מ-gov.il עם העלות המדויקת לכל סוג נסח.
//   (ב) `provider_api`   — כשמוגדרים גם TABU_API_URL וגם TABU_API_KEY.
//
// ⚠️ הזמנה בפועל מחייבת אישור מפורש. `orderTabu` בלי `confirmed: true` מחזיר
// `awaiting_confirmation` ואינו פונה לספק — נסח עולה כסף אמיתי לכל בקשה.

import { robustFetch } from './http';
import { env } from './env';

export type TabuDocType = 'regular' | 'historical' | 'concentrated';

export interface TabuDocSpec {
  type: TabuDocType;
  labelHe: string;
  costIls: number;
  description: string;
}

/** שלושת סוגי הנסח. העלות היא המחיר הרשמי להפקה מקוונת. */
export const TABU_DOCS: Record<TabuDocType, TabuDocSpec> = {
  regular: {
    type: 'regular',
    labelHe: 'נסח רגיל',
    costIls: 18,
    description: 'מצב הזכויות הנוכחי — בעלות, משכנתאות, עיקולים והערות אזהרה.',
  },
  historical: {
    type: 'historical',
    labelHe: 'נסח היסטורי',
    costIls: 74,
    description: 'כל הרישומים שבוטלו לאורך השנים — משמש לבדיקת שרשרת בעלות.',
  },
  concentrated: {
    type: 'concentrated',
    labelHe: 'נסח מרוכז',
    costIls: 131,
    description: 'כל תתי-החלקות בחלקה במסמך אחד — לבניין שלם ולא לדירה בודדת.',
  },
};

export const TABU_DOC_LIST: TabuDocSpec[] = Object.values(TABU_DOCS);

export const TABU_OFFICIAL_URL = 'https://www.gov.il/he/service/land_registration_extract';

export type TabuMode = 'official_manual' | 'provider_api';

function providerUrl(): string {
  return env('TABU_API_URL') ?? '';
}
function providerKey(): string {
  return env('TABU_API_KEY') ?? '';
}

/** ספק צד-ג' פעיל רק כששני המשתנים קיימים. אחד בלי השני אינו תצורה תקפה. */
export function tabuMode(): TabuMode {
  return providerUrl() && providerKey() ? 'provider_api' : 'official_manual';
}

export interface TabuOrderRequest {
  gush: string;
  helka: string;
  tatHelka?: string | null;
  docType: TabuDocType;
  /** חובה כדי לבצע הזמנה בפועל מול ספק בתשלום. */
  confirmed?: boolean;
}

export type TabuOrderStatus =
  | 'manual_order_required'
  | 'awaiting_confirmation'
  | 'ordered'
  | 'failed';

export interface TabuOrderResult {
  mode: TabuMode;
  doc: TabuDocSpec;
  status: TabuOrderStatus;
  message: string;
  /** קישור להזמנה הרשמית — קיים תמיד, גם כשיש ספק. */
  officialUrl: string;
  /** המסמך עצמו, רק אחרי הזמנה מוצלחת מול ספק. */
  documentUrl?: string;
  reference?: string;
}

function validate(req: TabuOrderRequest): string | null {
  if (!req.gush?.trim() || !req.helka?.trim()) return 'נדרשים גוש וחלקה כדי להזמין נסח.';
  if (!TABU_DOCS[req.docType]) return 'סוג נסח לא מוכר.';
  return null;
}

export async function orderTabu(req: TabuOrderRequest): Promise<TabuOrderResult> {
  const doc = TABU_DOCS[req.docType] ?? TABU_DOCS.regular;
  const mode = tabuMode();
  const base = { mode, doc, officialUrl: TABU_OFFICIAL_URL };

  const invalid = validate(req);
  if (invalid) return { ...base, status: 'failed', message: invalid };

  // מצב (א): אין ספק — מפנים להזמנה רשמית. זה לא כשל, זו ההתנהגות המתוכננת.
  if (mode === 'official_manual') {
    return {
      ...base,
      status: 'manual_order_required',
      message:
        `${doc.labelHe} עבור גוש ${req.gush} חלקה ${req.helka}` +
        `${req.tatHelka ? ` תת-חלקה ${req.tatHelka}` : ''} — ` +
        `מופק רשמית באתר רשם המקרקעין בעלות ${doc.costIls} ₪. ` +
        'לא מוצגים כאן נתוני בעלות או שעבודים ללא נסח אמיתי.',
    };
  }

  // ⚠️ שער האישור. בלעדיו לא יוצאת שום בקשה לספק בתשלום.
  if (!req.confirmed) {
    return {
      ...base,
      status: 'awaiting_confirmation',
      message:
        `הזמנת ${doc.labelHe} תחויב ב-${doc.costIls} ₪. ` +
        'ההזמנה תבוצע רק לאחר אישור מפורש.',
    };
  }

  try {
    const res = await robustFetch(providerUrl(), {
      method: 'POST',
      timeoutMs: 30000,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${providerKey()}`,
      },
      body: JSON.stringify({
        gush: req.gush,
        helka: req.helka,
        tat_helka: req.tatHelka ?? null,
        // סוג הנסח עובר כפרמטר — אותו נתיב קוד לשלושת הסוגים.
        doc_type: req.docType,
      }),
    });

    if (!res.ok) {
      return {
        ...base,
        status: 'failed',
        message: `הספק החזיר שגיאה (${res.status}). אפשר להזמין ישירות מרשם המקרקעין.`,
      };
    }

    const json: any = await res.json();
    const documentUrl = json?.document_url ?? json?.url ?? undefined;
    if (!documentUrl) {
      return {
        ...base,
        status: 'failed',
        message: 'הספק לא החזיר קישור למסמך. אפשר להזמין ישירות מרשם המקרקעין.',
      };
    }

    return {
      ...base,
      status: 'ordered',
      message: `${doc.labelHe} הופק בהצלחה.`,
      documentUrl,
      reference: json?.reference ?? json?.id ?? undefined,
    };
  } catch (e: any) {
    return {
      ...base,
      status: 'failed',
      message: `לא הצלחנו לפנות לספק הנסחים (${e?.message ?? 'שגיאה'}). אפשר להזמין ישירות מרשם המקרקעין.`,
    };
  }
}

/** תאימות לאחור — מה שהדוח מציג כשלא ביקשו נסח בפועל. */
export interface TabuOrderInfo {
  available: false;
  officialUrl: string;
  mode: TabuMode;
  options: { type: TabuDocType; label: string; costIls: number; description: string }[];
  note: string;
}

export function tabuOrderInfo(): TabuOrderInfo {
  return {
    available: false,
    officialUrl: TABU_OFFICIAL_URL,
    mode: tabuMode(),
    options: TABU_DOC_LIST.map((d) => ({
      type: d.type,
      label: d.labelHe,
      costIls: d.costIls,
      description: d.description,
    })),
    note:
      'נסח טאבו מופק בתשלום לכל בקשה. המערכת אינה מציגה נתוני בעלות או שעבודים ללא נסח אמיתי.',
  };
}
