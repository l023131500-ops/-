import type { HtrLine, HtrMaterial, HtrTier } from './htr-types';
import { fetchWithTimeout } from './fetch-with-timeout';

// ============================================================
// שכבת אבסטרקציה למנועי HTR.
// הארכיטקטורה: adapter pattern. כל מנוע ממש את HtrEngine.
// ------------------------------------------------------------
// עיקרון: המנוע ה"ראשי" הוא תמיד לא-גנרטיבי (Kraken/Transkribus)
// כדי למנוע הזיות. VLM לעולם לא ראשי לעברית רבנית.
// ============================================================

export interface HtrResult {
  engine: string;
  lines: HtrLine[];
  rawText: string;
  meanConfidence: number;
}

export interface HtrEngine {
  name: string;
  /**
   * imageUrl — signed URL זמני לתמונה ב-Storage.
   * material — משפיע על בחירת מודל (למשל BiblIA לכתב מרובע).
   */
  recognize(imageUrl: string, material: HtrMaterial): Promise<HtrResult>;
}

// ------------------------------------------------------------
// בחירת מודל Kraken לפי סוג החומר (לפי המחקר):
//   modern_handwriting -> מודל מותאם (יש לאמן) / fallback כללי
//   medieval_square    -> BiblIA (>97% על כתב מרובע)
//   rabbinic_18_19     -> Sofer Mahir (אשכנזי/איטלקי/ספרדי)
//   rashi_ladino       -> Sofer Mahir rashi variant
// ------------------------------------------------------------
export function krakenModelFor(material: HtrMaterial): string {
  switch (material) {
    case 'medieval_square': return 'biblia_v3';
    case 'rabbinic_18_19': return 'sofer_mahir_ashkenazi';
    case 'rashi_ladino': return 'sofer_mahir_rashi';
    case 'print': return 'hebrew_print_generic';
    case 'modern_handwriting':
    default: return 'modern_hw_custom'; // יאומן על כתב היד הספציפי
  }
}

// ============================================================
// KrakenEngine — מנוע ברירת המחדל (מנוי רגיל).
// self-hosted eScriptorium/Kraken על שרת GPU נפרד (לא Vercel).
// כאן: adapter שקורא ל-endpoint HTTP של שרת ה-Kraken.
// אם KRAKEN_ENDPOINT לא מוגדר -> stub שמחזיר שגיאה ברורה
// (כדי שאפשר יהיה לבנות ולבדוק את כל השאר ללא GPU).
// ============================================================
export class KrakenEngine implements HtrEngine {
  name = 'kraken';
  private endpoint = process.env.KRAKEN_ENDPOINT || '';
  private apiKey = process.env.KRAKEN_API_KEY || '';

  async recognize(imageUrl: string, material: HtrMaterial): Promise<HtrResult> {
    const model = krakenModelFor(material);

    if (!this.endpoint) {
      // ---- STUB MODE ----
      // שרת ה-Kraken דורש GPU ומותקן בנפרד (Runpod/שרת ייעודי).
      // עד שיחובר, מחזירים שגיאה מפורשת. אין הזיה, אין טקסט מומצא.
      throw new HtrEngineNotConfigured(
        'kraken',
        `שרת Kraken אינו מוגדר (KRAKEN_ENDPOINT חסר). ` +
        `המנוע דורש GPU ומותקן בנפרד — ראה מסמך המסירה, פרק "פריסת שרת HTR". ` +
        `המודל שהיה נבחר לחומר "${material}": ${model}.`
      );
    }

    // ---- REAL MODE ----
    // חוזה API מול שרת ה-Kraken (eScriptorium-compatible):
    // POST { image_url, model } -> { lines: [{text, confidence, bbox}], ... }
    const resp = await fetchWithTimeout(`${this.endpoint.replace(/\/$/, '')}/recognize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {})
      },
      body: JSON.stringify({ image_url: imageUrl, model })
    }, 60000);

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      throw new Error(`שרת Kraken החזיר שגיאה ${resp.status}: ${detail.slice(0, 300)}`);
    }

    const data = await resp.json();
    return normalizeEngineLines('kraken', data?.lines ?? []);
  }
}

// ============================================================
// מיפוי סוג חומר -> modelId ב-Transkribus (Processing API v2).
// ניתן לעקוף פר-מנוי דרך TRANSKRIBUS_MODEL_<MATERIAL>.
// ברירות מחדל: מודלים ציבוריים ידועים לעברית/כתב מרובע.
export function transkribusModelFor(material: HtrMaterial): number {
  const envKey = `TRANSKRIBUS_MODEL_${material.toUpperCase()}`;
  const override = process.env[envKey];
  if (override && !Number.isNaN(Number(override))) return Number(override);
  // ברירות מחדל (ניתן לכוונן במסמך המסירה):
  switch (material) {
    case 'medieval_square': return Number(process.env.TRANSKRIBUS_MODEL_DEFAULT || 0);
    case 'rabbinic_18_19': return Number(process.env.TRANSKRIBUS_MODEL_DEFAULT || 0);
    case 'rashi_ladino': return Number(process.env.TRANSKRIBUS_MODEL_DEFAULT || 0);
    case 'print': return Number(process.env.TRANSKRIBUS_MODEL_DEFAULT || 0);
    case 'modern_handwriting':
    default: return Number(process.env.TRANSKRIBUS_MODEL_DEFAULT || 0);
  }
}

// ============================================================
// TranskribusEngine — מנוי פנימי (דיוק מקסימלי, ענן).
// לא תואם NetFree (ענן חיצוני) — לכן רק לרמה 'internal'.
// מימוש מלא של Processing API v2:
//   1. OpenID Connect password grant -> access_token
//   2. POST /processing/v2/processes { config:{modelId}, image:{imageUrl} }
//   3. polling GET /processing/v2/processes/{processId} עד status סופי
//   4. חילוץ הטקסט מהתשובה (plain text / PAGE-XML)
// ============================================================
export class TranskribusEngine implements HtrEngine {
  name = 'transkribus';
  private user = process.env.TRANSKRIBUS_USER || '';
  private pass = process.env.TRANSKRIBUS_PASS || '';
  private tokenUrl =
    process.env.TRANSKRIBUS_TOKEN_URL ||
    'https://account.readcoop.eu/auth/realms/readcoop/protocol/openid-connect/token';
  private apiBase =
    process.env.TRANSKRIBUS_API_BASE || 'https://transkribus.eu/processing/v2';
  private clientId =
    process.env.TRANSKRIBUS_CLIENT_ID || 'processing-api-client';

  async recognize(imageUrl: string, material: HtrMaterial): Promise<HtrResult> {
    if (!this.user || !this.pass) {
      throw new HtrEngineNotConfigured(
        'transkribus',
        'Transkribus אינו מוגדר (TRANSKRIBUS_USER/PASS חסרים). ' +
        'זמין רק למנויים פנימיים (ענן חיצוני, לא תואם NetFree).'
      );
    }

    // 1) אימות — OpenID Connect password grant (הפרטים בגוף הבקשה)
    const token = await this.getToken();

    // 2) שליחת תהליך זיהוי
    const modelId = transkribusModelFor(material);
    if (!modelId) {
      throw new HtrEngineNotConfigured(
        'transkribus',
        `לא הוגדר modelId ל-Transkribus עבור החומר "${material}". ` +
        `הגדר TRANSKRIBUS_MODEL_${material.toUpperCase()} או TRANSKRIBUS_MODEL_DEFAULT.`
      );
    }
    const submitResp = await fetchWithTimeout(`${this.apiBase}/processes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        config: { textRecognition: { htrId: modelId }, modelId },
        image: { imageUrl }
      })
    }, 20000);
    if (!submitResp.ok) {
      const detail = await submitResp.text().catch(() => '');
      throw new Error(
        `Transkribus submit נכשל (${submitResp.status}): ${detail.slice(0, 300)}`
      );
    }
    const submitData: any = await submitResp.json();
    const processId = submitData?.processId ?? submitData?.id;
    if (!processId) {
      throw new Error(
        `Transkribus לא החזיר processId: ${JSON.stringify(submitData).slice(0, 200)}`
      );
    }

    // 3) polling עד סיום (עד ~5 דקות)
    const maxAttempts = 60;
    const intervalMs = 5000;
    let result: any = null;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, intervalMs));
      const statusResp = await fetchWithTimeout(`${this.apiBase}/processes/${processId}`, {
        headers: { Authorization: `Bearer ${token}` }
      }, 15000);
      if (!statusResp.ok) {
        const detail = await statusResp.text().catch(() => '');
        throw new Error(
          `Transkribus status נכשל (${statusResp.status}): ${detail.slice(0, 200)}`
        );
      }
      const statusData: any = await statusResp.json();
      const status = String(
        statusData?.status ?? statusData?.state ?? ''
      ).toUpperCase();
      if (['FINISHED', 'COMPLETED', 'DONE', 'SUCCESS'].includes(status)) {
        result = statusData;
        break;
      }
      if (['FAILED', 'ERROR', 'CANCELED', 'CANCELLED'].includes(status)) {
        throw new Error(
          `Transkribus נכשל בעיבוד (status=${status}) עבור process ${processId}.`
        );
      }
    }
    if (!result) {
      throw new Error(
        `Transkribus לא סיים בזמן הצפוי (process ${processId}). נסה שוב מאוחר יותר.`
      );
    }

    // 4) חילוץ טקסט — תומך במספר צורות תשובה אפשריות
    return this.extractResult(result, token, processId);
  }

  private async getToken(): Promise<string> {
    const body = new URLSearchParams({
      grant_type: 'password',
      username: this.user,
      password: this.pass,
      client_id: this.clientId
    });
    const resp = await fetchWithTimeout(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    }, 15000);
    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      throw new Error(
        `אימות Transkribus נכשל (${resp.status}). בדוק שם משתמש/סיסמה. ${detail.slice(0, 200)}`
      );
    }
    const data: any = await resp.json();
    if (!data?.access_token) {
      throw new Error('Transkribus לא החזיר access_token.');
    }
    return data.access_token as string;
  }

  private async extractResult(
    result: any,
    token: string,
    processId: string
  ): Promise<HtrResult> {
    // ניסיון 1: טקסט ישיר בתוך התשובה
    let text: string | null =
      result?.content?.text ??
      result?.text ??
      result?.result?.text ??
      null;

    // ניסיון 2: PAGE-XML בתוך התשובה
    const pageXml: string | null =
      result?.content?.pageXml ?? result?.pageXml ?? result?.page ?? null;

    // ניסיון 3: הורדת תוצאה ייעודית אם יש נתיב
    if (!text && !pageXml) {
      try {
        const txtResp = await fetchWithTimeout(
          `${this.apiBase}/processes/${processId}/text`,
          { headers: { Authorization: `Bearer ${token}` } },
          15000
        );
        if (txtResp.ok) text = await txtResp.text();
      } catch {
        /* מתעלמים — ננסה PAGE-XML */
      }
    }

    let lines: HtrLine[] = [];
    if (pageXml) {
      lines = parsePageXmlLines(pageXml);
    } else if (text) {
      lines = String(text)
        .split(/\r?\n/)
        .filter((l) => l.length > 0)
        .map((t, i) => ({ line: i, text: t, confidence: 0.9 }));
    }

    if (!lines.length) {
      throw new Error(
        `Transkribus סיים אך לא נמצא טקסט בתשובה (process ${processId}).`
      );
    }
    const rawText = lines.map((l) => l.text).join('\n');
    const meanConfidence = lines.reduce((s, l) => s + l.confidence, 0) / lines.length;
    return { engine: 'transkribus', lines, rawText, meanConfidence };
  }
}

// חילוץ שורות + ביטחון מ-PAGE-XML (TextLine + TextEquiv/Unicode, conf attribute)
function parsePageXmlLines(xml: string): HtrLine[] {
  const lines: HtrLine[] = [];
  const lineRegex = /<TextLine\b[^>]*>([\s\S]*?)<\/TextLine>/g;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = lineRegex.exec(xml)) !== null) {
    const block = m[1];
    const unicodeMatch = /<Unicode>([\s\S]*?)<\/Unicode>/.exec(block);
    const textEquivMatch = /<TextEquiv\b([^>]*)>/.exec(block);
    let confidence = 0;
    if (textEquivMatch) {
      const confAttr = /conf="([\d.]+)"/.exec(textEquivMatch[1]);
      if (confAttr) confidence = Number(confAttr[1]);
    }
    const text = unicodeMatch
      ? unicodeMatch[1]
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .trim()
      : '';
    if (text) {
      lines.push({ line: idx++, text, confidence });
    }
  }
  return lines;
}

// ============================================================
// בחירת מנוע לפי רמת מנוי.
// ------------------------------------------------------------
// Kraken דורש שרת GPU נפרד ו-Transkribus דורש מנוי; אף אחד מהם אינו מוגדר
// בפריסה, ולכן המודול כולו החזיר HtrEngineNotConfigured על כל בקשה — הפיצ'ר
// היה מת. כשהמנוע המועדף לרמה הזו אינו מוגדר, נופלים ל-VisionEngine במקום
// להיכשל.
//
// זה אינו ויתור על הכלל "לא מנוע גנרטיבי יחיד": VisionEngine קורא את הדף
// **פעמיים בשני מודלים בלתי תלויים** ומצליב שורה מול שורה, כך שהזיה של מודל
// אחד מופיעה כמחלוקת ולא כטקסט בטוח. ההנמקה המלאה ב-htr-vision.ts.
// ============================================================
export function pickEngine(tier: HtrTier): HtrEngine {
  const preferred = tier === 'internal' ? new TranskribusEngine() : new KrakenEngine();
  if (isConfigured(preferred)) return preferred;
  // ייבוא עצל: htr-vision מייבא מכאן, וייבוא ישיר בראש הקובץ סוגר מעגל.
  const { VisionEngine } = require('./htr-vision') as typeof import('./htr-vision');
  return new VisionEngine();
}

function isConfigured(engine: HtrEngine): boolean {
  if (engine instanceof KrakenEngine) return !!(process.env.KRAKEN_ENDPOINT || '').trim();
  if (engine instanceof TranskribusEngine) {
    return !!(process.env.TRANSKRIBUS_USER || '').trim() && !!(process.env.TRANSKRIBUS_PASS || '').trim();
  }
  return true;
}

// ---------- עזרים ----------
export class HtrEngineNotConfigured extends Error {
  engineName: string;
  constructor(engineName: string, message: string) {
    super(message);
    this.name = 'HtrEngineNotConfigured';
    this.engineName = engineName;
  }
}

function normalizeEngineLines(engine: string, rawLines: any[]): HtrResult {
  const lines: HtrLine[] = rawLines.map((l: any, i: number) => ({
    line: i,
    text: String(l.text ?? ''),
    confidence: typeof l.confidence === 'number' ? l.confidence : 0
  }));
  const rawText = lines.map((l) => l.text).join('\n');
  const meanConfidence = lines.length
    ? lines.reduce((s, l) => s + l.confidence, 0) / lines.length
    : 0;
  return { engine, lines, rawText, meanConfidence };
}
