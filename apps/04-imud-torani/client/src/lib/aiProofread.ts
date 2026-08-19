import type { ContentBlock } from "@shared/schema";
import type { ProofIssue, IssueCategory } from "@shared/proofread";
import { issueSignature } from "@shared/proofread";

/**
 * הגהת AI — שולח את טקסט הספר למודל שפה (Claude / GPT / Gemini) עם מפתח שהמשתמש מספק.
 *
 * חשוב: מנוע ה-LLM אינו זמין בשרת לאחר פרסום (מגבלת סביבת הפרודקשן).
 * לכן הקריאה נעשית *מהדפדפן ישירות* מול ה-API של הספק, עם מפתח המשתמש.
 * המפתח נשמר בזיכרון (state) בלבד — לא ב-localStorage (חסום ב-iframe) ולא בשרת.
 *
 * חוק ברזל: הפרומפט מורה למודל *לא לשנות משמעות, לא להוסיף/למחוק מקורות,
 * ולא לגעת בציטוטים*. כל הצעה מוחלת רק לאחר אישור מפורש של המשתמש.
 */

export type AiProvider = "anthropic" | "openai" | "gemini";

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  model?: string;
}

export const DEFAULT_MODELS: Record<AiProvider, string> = {
  anthropic: "claude-sonnet-4-5-20250929",
  openai: "gpt-4o",
  gemini: "gemini-2.0-flash",
};

export const PROVIDER_LABELS: Record<AiProvider, string> = {
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI (GPT)",
  gemini: "Google (Gemini)",
};

const uid = () => "ai-" + Math.random().toString(36).slice(2, 10);

/** הוראת-מערכת מחמירה — שמירה על קדושת הטקסט והמקורות. */
const SYSTEM_PROMPT = `אתה מגיה מקצועי של ספרי קודש בעברית. תפקידך לזהות אך ורק:
1. טעויות כתיב (category: "spelling")
2. שגיאות לשון והמלצות ניסוח (category: "language")
3. טעויות במראי-מקום ומקורות (category: "source")

חוקי ברזל שאסור להפר:
- אל תשנה את משמעות הטקסט לעולם.
- אל תוסיף, אל תמחק ואל תשנה ציטוטים, פסוקים, שמות, מקורות או מראי-מקום — רק סמן אם נראה שיש בהם טעות.
- אל תציע תיקוני סגנון שמשנים את כוונת המחבר.
- אם אינך בטוח — אל תסמן.
- החזר אך ורק JSON תקין, ללא טקסט נוסף.

פורמט הפלט: מערך JSON של אובייקטים:
[{"original":"<הטקסט המדויק שגוי>","suggestion":"<התיקון המוצע>","category":"spelling|language|source","message":"<הסבר קצר בעברית>"}]
אם אין טעויות — החזר [].`;

interface RawSuggestion {
  original: string;
  suggestion: string;
  category: IssueCategory;
  message: string;
}

function buildUserPrompt(text: string): string {
  return `הגה את הקטע הבא. סמן רק טעויות ודאיות. הקטע:\n\n"""${text}"""`;
}

/* ═══════════════ קריאות API לפי ספק ═══════════════ */

async function callAnthropic(cfg: AiConfig, text: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": cfg.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: cfg.model || DEFAULT_MODELS.anthropic,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(text) }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const j = await res.json();
  return j?.content?.[0]?.text ?? "[]";
}

async function callOpenAI(cfg: AiConfig, text: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model || DEFAULT_MODELS.openai,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(text) },
      ],
      temperature: 0,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const j = await res.json();
  return j?.choices?.[0]?.message?.content ?? "[]";
}

async function callGemini(cfg: AiConfig, text: string): Promise<string> {
  const model = cfg.model || DEFAULT_MODELS.gemini;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: buildUserPrompt(text) }] }],
        generationConfig: { temperature: 0 },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const j = await res.json();
  return j?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
}

async function callProvider(cfg: AiConfig, text: string): Promise<string> {
  switch (cfg.provider) {
    case "anthropic": return callAnthropic(cfg, text);
    case "openai": return callOpenAI(cfg, text);
    case "gemini": return callGemini(cfg, text);
  }
}

/** מחלץ מערך JSON מתוך פלט מודל (ייתכן שעטוף בקוד או טקסט). */
function extractJson(raw: string): RawSuggestion[] {
  let s = raw.trim();
  // הסר גדרות קוד ```json ... ```
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  // מצא את המערך הראשון
  const start = s.indexOf("[");
  const end = s.lastIndexOf("]");
  if (start === -1 || end === -1) return [];
  try {
    const arr = JSON.parse(s.slice(start, end + 1));
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (x) => x && typeof x.original === "string" && ["spelling", "language", "source"].includes(x.category),
    );
  } catch {
    return [];
  }
}

/**
 * מגיה את כל הבלוקים באמצעות AI ומחזיר רשימת טעויות (ProofIssue).
 * onProgress — קריאה חוזרת עם (done, total) לעדכון מד-התקדמות.
 */
export async function aiScanBook(
  cfg: AiConfig,
  blocks: ContentBlock[],
  ignoreSet: Set<string> = new Set(),
  onProgress?: (done: number, total: number) => void,
): Promise<ProofIssue[]> {
  const proofLayers = new Set([
    "main", "footnote", "sidenote", "commentaryA", "commentaryB",
    "rashi", "tosafot", "question", "answer", "poem",
  ]);
  const targets = blocks.filter((b) => proofLayers.has(b.layer) && (b.text || "").trim());
  const issues: ProofIssue[] = [];

  for (let i = 0; i < targets.length; i++) {
    const block = targets[i];
    onProgress?.(i, targets.length);
    let raw: string;
    try {
      raw = await callProvider(cfg, block.text);
    } catch (e) {
      // אם קריאה נכשלת — נעצור ונזרוק כדי שה-UI יציג את השגיאה (למשל מפתח שגוי)
      throw e;
    }
    const suggestions = extractJson(raw);
    for (const sug of suggestions) {
      const idx = block.text.indexOf(sug.original);
      if (idx === -1) continue; // המודל החזיר טקסט שלא קיים בדיוק — דלג (בטיחות)
      const sig = issueSignature(block.id, sug.category, idx, sug.original);
      if (ignoreSet.has(sig)) continue;
      issues.push({
        id: uid(),
        blockId: block.id,
        category: sug.category,
        start: idx,
        end: idx + sug.original.length,
        original: sug.original,
        suggestion: sug.suggestion ?? "",
        message: sug.message || "הצעת AI",
        source: "ai",
      });
    }
  }
  onProgress?.(targets.length, targets.length);

  const order = new Map(blocks.map((b, i) => [b.id, i]));
  issues.sort((a, b) => {
    const oa = order.get(a.blockId) ?? 0;
    const ob = order.get(b.blockId) ?? 0;
    if (oa !== ob) return oa - ob;
    return a.start - b.start;
  });
  return issues;
}
