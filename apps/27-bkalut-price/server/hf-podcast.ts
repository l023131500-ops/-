/**
 * Health-fund podcast helpers.
 *
 * Two independent capabilities, exactly as requested:
 *   1. buildPodcastScript(topic)  → vocalized Hebrew narration text (editable).
 *   2. generatePodcastAudio(text) → ElevenLabs MP3 uploaded to Supabase Storage,
 *      returning a public URL. Reuses the SAME ElevenLabs + Supabase storage
 *      infrastructure as server/yemot.ts (the voice / phone system). It does
 *      NOT modify anything in yemot.ts — it is a parallel, additive module.
 *
 * The script is built from the catalog fields in a fixed structure:
 *   קטגוריה  →  מידע כללי  →  מה ניתן לקבל  →  המלצה.
 *
 * Audio voice: an authoritative, engaging male Hebrew narrator. The voice id
 * is configurable via HF_PODCAST_VOICE_ID and falls back to a documentary-style
 * male voice. The narration text is passed through toTtsSafeHebrew so numbers
 * and currency are read correctly in Hebrew.
 */
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import WebSocketImpl from "ws";
import { toTtsSafeHebrew } from "@shared/tts-hebrew";
import type { HfTopic } from "./health-funds";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";
// אותה בעיה כמו ב-server/yemot.ts (סבב B קודם): הקריאה ל-ElevenLabs הייתה בלי
// AbortController — ספק תקוע היה תולה את יצירת הפודקאסט בלי גבול.
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
// Authoritative, engaging male Hebrew narrator. Overridable per-deployment.
const HF_PODCAST_VOICE_ID = process.env.HF_PODCAST_VOICE_ID || "9mC4rMlfrKiadcMhOgey";
// Public bucket so the generated podcast files can be downloaded / sent to the
// voice system by URL. Kept separate from the private "yemot-audio" cache.
const PODCAST_BUCKET = "hf-podcasts";

// ─── Script generation ───────────────────────────────────────────────────────

function clean(s: unknown): string {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

function fundLabel(topic: HfTopic): string {
  const best = clean(topic.bestFund);
  if (!best || best === "טעון השוואה פרטנית") return "";
  return best;
}

/**
 * Build the editable narration script for a topic.
 * Structure: opening → category → general info → what you can get → recommendation.
 * Returns plain (un-vocalized) Hebrew; vocalization for TTS happens at audio time
 * so the stored script stays human-editable and clean.
 */
export function buildPodcastScript(topic: HfTopic): string {
  const lines: string[] = [];
  const isGov = topic.kind === "gov";
  const subject = clean(topic.topic);
  const category = clean(topic.category);
  const audience = clean(topic.audience);
  const benefit = clean(topic.benefitSummary);
  const range = clean(topic.rangeText);
  const full = clean(topic.fullBenefit);
  const best = fundLabel(topic);

  // Opening
  lines.push(`שלום, וברוכים הבאים למאגר ההטבות והזכויות של בקלות.`);
  if (subject) {
    lines.push(`בפרק הזה נדבר על ${subject}.`);
  }

  // Category context
  if (category) {
    if (isGov) {
      lines.push(`מדובר בהטבה משלימה ממשרדי הממשלה השונים, בתחום ${category}.`);
    } else {
      lines.push(`ההטבה הזו שייכת לתחום ${category} בקופות החולים ובתוכניות השב"ן.`);
    }
  }

  // General info
  if (audience) {
    lines.push(`למי זה מיועד? ${audience}.`);
  }
  if (benefit) {
    lines.push(`מה ההטבה? ${benefit}.`);
  } else if (full) {
    lines.push(full.length > 600 ? full.slice(0, 600) + "…" : full);
  }

  // What you can get
  if (range) {
    lines.push(`מה ניתן לקבל בסך הכול? ${range}.`);
  }

  // Recommendation
  if (best && !isGov) {
    lines.push(`ההמלצה שלנו: הקופה המיטיבה ביותר בנושא הזה היא ${best}. כדאי לבדוק את הזכאות שלכם בהתאם לתוכנית שבה אתם חברים.`);
  } else if (isGov) {
    lines.push(`ההמלצה שלנו: בדקו את זכאותכם מול הגוף הממשלתי הרלוונטי, ואל תוותרו על הטבה שמגיעה לכם.`);
  } else {
    lines.push(`ההמלצה שלנו: כדאי להשוות בין הקופות והתוכניות, ולבדוק מה הכי משתלם עבורכם.`);
  }

  // Call to action
  lines.push(`לקבלת המידע המלא, או כדי שצוות בקלות יבצע את הבקשה עבורכם, השאירו פרטים ונחזור אליכם. כאן בקלות, דואגים שתקבלו את כל מה שמגיע לכם.`);

  return lines.join(" ");
}

// ─── Supabase Storage (public podcast bucket) ────────────────────────────────

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: WebSocketImpl as unknown as never },
  });
}

function audioKey(catalogNo: number, text: string): string {
  const hash = crypto.createHash("sha256").update(text, "utf8").digest("hex").slice(0, 16);
  return `topic-${catalogNo}-${hash}.mp3`;
}

// ─── ElevenLabs synthesis ────────────────────────────────────────────────────

async function synthElevenLabs(apiKey: string, text: string): Promise<Buffer> {
  const res = await fetchWithTimeout(
    `${ELEVENLABS_BASE}/text-to-speech/${HF_PODCAST_VOICE_ID}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.8,
          style: 0.45,
          use_speaker_boost: true,
        },
      }),
    },
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${err.slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

export interface PodcastAudioResult {
  ok: boolean;
  url: string;
  error?: string;
}

/**
 * Generate the podcast audio for a topic's script and store it publicly.
 * Returns a public download/stream URL. The script is vocalized for Hebrew TTS
 * just before synthesis (numbers/currency → words) without mutating the stored
 * editable script.
 */
export async function generatePodcastAudio(catalogNo: number, script: string): Promise<PodcastAudioResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return { ok: false, url: "", error: "ELEVENLABS_API_KEY missing" };
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, url: "", error: "Supabase storage not configured" };

  const spoken = toTtsSafeHebrew(clean(script));
  if (!spoken) return { ok: false, url: "", error: "empty script" };

  try {
    const audio = await synthElevenLabs(apiKey, spoken);
    await sb.storage.createBucket(PODCAST_BUCKET, { public: true }).catch(() => {});
    const key = audioKey(catalogNo, spoken);
    const up = await sb.storage.from(PODCAST_BUCKET).upload(key, audio, {
      contentType: "audio/mpeg",
      upsert: true,
    });
    if (up.error) return { ok: false, url: "", error: up.error.message };
    const { data } = sb.storage.from(PODCAST_BUCKET).getPublicUrl(key);
    return { ok: true, url: data.publicUrl };
  } catch (e: any) {
    return { ok: false, url: "", error: String(e?.message || e) };
  }
}
