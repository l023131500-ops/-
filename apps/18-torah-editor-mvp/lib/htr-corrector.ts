import Anthropic from '@anthropic-ai/sdk';
import type { HtrTier } from './htr-types';
import { fetchWithTimeout } from './fetch-with-timeout';

// ============================================================
// שכבת תיקון-אחר (post-OCR correction).
// מקבלת טקסט גולמי מ-HTR ומתקנת שגיאות זיהוי בעזרת LLM עברי.
// ------------------------------------------------------------
// עיקרון קדושת הטקסט: התיקון מיושם על עותק (corrected_text),
// לעולם לא דורס את raw_text. אדם מאשר לפני שילוב בספר.
// המודל מקבל הנחיה מפורשת: לתקן שגיאות זיהוי בלבד, לא "לשפר"
// ולא להשלים תוכן שאינו במקור — כדי לצמצם הזיות.
// ============================================================

export interface CorrectionResult {
  corrector: string;
  correctedText: string;
}

const SYSTEM_PROMPT = `אתה מתקן פלט של זיהוי כתב יד עברי (HTR).
המשימה: לתקן אך ורק שגיאות זיהוי אופייניות (אותיות דומות שהתחלפו, ניקוד שגוי, רווחים, שבירת שורות).

כללים מחייבים:
1. אל תמציא, אל תשלים ואל תוסיף מילים שאינן במקור. אם משהו לא ברור — השאר כפי שהוא.
2. אל תשנה את המשמעות, הסגנון או הנוסח. זהו טקסט תורני — "הטקסט קדוש".
3. אל תתקן ציטוטים או שמות אם אינך בטוח — עדיף להשאיר מסומן.
4. שמור על מבנה השורות המקורי ככל האפשר.
5. החזר אך ורק את הטקסט המתוקן, ללא הסברים, ללא הערות, ללא markdown.`;

// ============================================================
// ClaudeCorrector — למנויים פנימיים (דיוק מקסימלי).
// ============================================================
export class ClaudeCorrector {
  name = 'claude';
  private key = process.env.ANTHROPIC_API_KEY || '';

  async correct(rawText: string): Promise<CorrectionResult> {
    if (!this.key) {
      throw new CorrectorNotConfigured('claude', 'ANTHROPIC_API_KEY חסר');
    }
    const client = new Anthropic({ apiKey: this.key });
    // max_tokens מכסה חשיבה וטקסט יחד במודלי Claude 5, ולכן תקציב שכויל
    // למודל בלי חשיבה קוטע את התשובה באמצע.
    const msg = await client.messages.create({
      model: process.env.HTR_CORRECTOR_MODEL || 'claude-opus-5',
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `הטקסט הגולמי מ-HTR:\n\n${rawText}` }]
    });
    if ((msg as any).stop_reason === 'refusal') {
      throw new Error('התיקון נדחה על ידי מסנני הבטיחות של המודל');
    }
    const out = msg.content
      .filter((b) => b.type === 'text')
      .map((b: any) => b.text)
      .join('')
      .trim();
    return { corrector: 'claude', correctedText: out || rawText };
  }
}

// ============================================================
// DictaLMCorrector — למנוי רגיל (חינם, קוד פתוח, NetFree).
// self-hosted DictaLM 2.0 (GGUF) על שרת פנימי עם endpoint
// תואם-OpenAI. stub עד שיוגדר DICTALM_ENDPOINT.
// ============================================================
export class DictaLMCorrector {
  name = 'dictalm';
  private endpoint = process.env.DICTALM_ENDPOINT || '';

  async correct(rawText: string): Promise<CorrectionResult> {
    if (!this.endpoint) {
      throw new CorrectorNotConfigured(
        'dictalm',
        'DICTALM_ENDPOINT חסר — DictaLM 2.0 מותקן self-hosted (ראה מסמך המסירה).'
      );
    }
    // חוזה תואם-OpenAI: POST /v1/chat/completions
    const resp = await fetchWithTimeout(`${this.endpoint.replace(/\/$/, '')}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'dictalm2.0',
        temperature: 0.1,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `הטקסט הגולמי מ-HTR:\n\n${rawText}` }
        ]
      })
    }, 60000);
    if (!resp.ok) {
      const d = await resp.text().catch(() => '');
      throw new Error(`DictaLM החזיר ${resp.status}: ${d.slice(0, 300)}`);
    }
    const data = await resp.json();
    const out = (data?.choices?.[0]?.message?.content || '').trim();
    return { corrector: 'dictalm', correctedText: out || rawText };
  }
}

export function pickCorrector(tier: HtrTier) {
  return tier === 'internal' ? new ClaudeCorrector() : new DictaLMCorrector();
}

export class CorrectorNotConfigured extends Error {
  correctorName: string;
  constructor(correctorName: string, message: string) {
    super(message);
    this.name = 'CorrectorNotConfigured';
    this.correctorName = correctorName;
  }
}
