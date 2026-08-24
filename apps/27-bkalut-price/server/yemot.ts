import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import WebSocketImpl from "ws";

const YEMOT_BASE = "https://www.call2all.co.il/ym/api";
const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";
const ELEVENLABS_VOICE_ID = "9mC4rMlfrKiadcMhOgey";
const AUDIO_BUCKET = "yemot-audio";

// כל הקריאות היוצאות ל-Yemot/ElevenLabs כאן היו בלי AbortController — ספק תקוע
// היה תולה את שליחת ההודעה הקולית עד שהפלטפורמה עצמה קוטעת את הבקשה.
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export interface YemotResult {
  ok: boolean;
  whitelist: string;
  extension3: string;
  tts: string;
  detail: string;
}

// ─── Supabase Storage cache ──────────────────────────────────────────────────

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: WebSocketImpl as unknown as never },
  });
}

/** 0501234567 → 050***4567. Enough to match a record, not enough to dial. */
function maskPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length < 7) return "***";
  return `${d.slice(0, 3)}***${d.slice(-4)}`;
}

function textCacheKey(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex") + ".mp3";
}

async function getCachedAudio(text: string): Promise<Buffer | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;
  const key = textCacheKey(text);
  const { data, error } = await sb.storage.from(AUDIO_BUCKET).download(key);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

async function setCachedAudio(text: string, audio: Buffer): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;
  // צור bucket אם לא קיים
  await sb.storage.createBucket(AUDIO_BUCKET, { public: false }).catch(() => {});
  const key = textCacheKey(text);
  await sb.storage.from(AUDIO_BUCKET).upload(key, audio, {
    contentType: "audio/mpeg",
    upsert: true,
  });
}

// ─── ElevenLabs ──────────────────────────────────────────────────────────────

async function generateElevenLabsAudio(elevenLabsKey: string, text: string): Promise<Buffer> {
  // בדוק קאש קודם
  const cached = await getCachedAudio(text);
  if (cached) return cached;

  const res = await fetchWithTimeout(
    `${ELEVENLABS_BASE}/text-to-speech/${ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": elevenLabsKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_v3",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true,
        },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${err.slice(0, 200)}`);
  }
  const audio = Buffer.from(await res.arrayBuffer());

  // שמור לקאש ברקע — לא מחכים לזה
  setCachedAudio(text, audio).catch(() => {});

  return audio;
}

// ─── Yemot API calls ─────────────────────────────────────────────────────────

async function updateWhitelist(apiKey: string, phone: string): Promise<void> {
  const getForm = new FormData();
  getForm.append("path", "/333/WhiteList.ini");
  const getRes = await fetchWithTimeout(`${YEMOT_BASE}/GetTextFile`, {
    method: "POST",
    headers: { Authorization: `Basic ${apiKey}` },
    body: getForm,
  });
  const json = (await getRes.json()) as { responseStatus: string; contents?: string };

  const existing = (json.contents ?? "")
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);
  if (existing.includes(phone)) return;

  const newContents = json.contents ? `${json.contents}\n${phone}` : phone;
  const updateForm = new FormData();
  updateForm.append("path", "/333/WhiteList.ini");
  updateForm.append("contents", newContents);
  await fetchWithTimeout(`${YEMOT_BASE}/UploadTextFile`, {
    method: "POST",
    headers: { Authorization: `Basic ${apiKey}` },
    body: updateForm,
  });
}

async function uploadToExtension3(apiKey: string, phone: string, audio: Buffer): Promise<void> {
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  const fileName = `${month}.wav`;
  const digits = phone.startsWith("0") ? phone.slice(1) : phone;
  const path = `ivr2:3/2/2/Phone/0${digits}`;

  const formData = new FormData();
  formData.append("fileName", fileName);
  formData.append("file", new Blob([audio], { type: "audio/mpeg" }), fileName);
  formData.append("path", path);
  formData.append("convertAudio", "1");

  const res = await fetchWithTimeout(`${YEMOT_BASE}/UploadFile`, {
    method: "POST",
    headers: { Authorization: `Basic ${apiKey}` },
    body: formData,
  });
  const result = (await res.json()) as { responseStatus: string; message?: string };
  if (result.responseStatus !== "OK") {
    throw new Error(`UploadFile: ${result.message ?? result.responseStatus}`);
  }
}

async function sendTTS(apiKey: string, phone: string, message: string): Promise<void> {
  const formData = new FormData();
  formData.append("phones", phone);
  formData.append("ttsVoice", "Elik_2100");
  formData.append("ttsMessage", message);
  formData.append("repeatFile", "1");

  const url = `${YEMOT_BASE}/SendTTS`;
  // Log that a send happened and enough to debug it — not who it went to or
  // what it said. This line used to carry `phone` and `message` in full: the
  // customer's number and the text read out to them, on every send.
  console.log(
    `[yemot] SendTTS request: ${url} to=${maskPhone(phone)} chars=${message.length} keyLen=${apiKey.length}`,
  );

  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { Authorization: `Basic ${apiKey}` },
    body: formData,
  });
  const rawText = await res.text();
  // Size, not contents — the provider echoes the destination number in some of
  // its error strings. The full text still reaches the caller: on failure it is
  // thrown below, and the route stores it against the message record.
  console.log(`[yemot] SendTTS response: ${res.status} (${rawText.length} chars)`);

  let result: { responseStatus: string; message?: string };
  try {
    result = JSON.parse(rawText);
  } catch {
    throw new Error(`SendTTS: תגובה לא תקינה מהשרת: ${rawText.slice(0, 200)}`);
  }
  if (result.responseStatus !== "OK") {
    throw new Error(`SendTTS: ${result.message ?? result.responseStatus}`);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * שולח הודעה קולית ללקוח דרך ימות המשיח:
 * 1. רשימה לבנה — הלקוח יקבל התראה בפעם הבאה שיתקשר
 * 2. שלוחה 3 — הודעה מפורטת (ElevenLabs, עם קאש בסופרבייס)
 * 3. צינטוק — שיחה יוצאת קצרה לידיעת הלקוח
 *
 * @param phone          מספר הטלפון של הלקוח (פורמט 05XXXXXXXX)
 * @param ttsMessage     טקסט קצר לצינטוק
 * @param extension3Text טקסט מפורט לשלוחה 3 (אם שונה מה-ttsMessage)
 */
export async function sendYemotVoice(
  phone: string,
  ttsMessage: string,
  extension3Text?: string
): Promise<YemotResult> {
  const apiKey = process.env.YEMOT_API_KEY;
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return {
      ok: false,
      whitelist: "SKIPPED",
      extension3: "SKIPPED",
      tts: "SKIPPED",
      detail: "YEMOT_API_KEY לא מוגדר בסביבה",
    };
  }

  const r = { whitelist: "", extension3: "", tts: "" };

  // שלב 1: רשימה לבנה
  try {
    await updateWhitelist(apiKey, phone);
    r.whitelist = "OK";
  } catch (e) {
    r.whitelist = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  // שלב 2: ElevenLabs → שלוחה 3
  const voiceText = extension3Text ?? ttsMessage;
  if (elevenLabsKey) {
    try {
      const audio = await generateElevenLabsAudio(elevenLabsKey, voiceText);
      await uploadToExtension3(apiKey, phone, audio);
      r.extension3 = "OK";
    } catch (e) {
      r.extension3 = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
    }
  } else {
    r.extension3 = "SKIPPED (ELEVENLABS_API_KEY לא מוגדר)";
  }

  // שלב 3: צינטוק
  try {
    await sendTTS(apiKey, phone, ttsMessage);
    r.tts = "OK";
  } catch (e) {
    r.tts = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  const ok = r.tts === "OK";
  return {
    ok,
    ...r,
    detail: ok
      ? `רשימה לבנה=${r.whitelist} | שלוחה3=${r.extension3} | צינטוק=${r.tts}`
      : `נכשל — ${r.tts}`,
  };
}
