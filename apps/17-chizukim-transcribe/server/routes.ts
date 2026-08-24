import type { Express, Request, Response } from "express";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { randomBytes } from "node:crypto";
import multer from "multer";
import { transcribe, type TranscribeResult } from "./transcribe";
import { editTranscript } from "./edit";
import { isAdminRequest, handleAdminLogin, handleAdminLogout } from "./auth";
import { renderAdminPage } from "./admin-page";
import { hitRateLimit, clientIp } from "./rate-limit";

// המנוע שנבחר לתמלול. ברירת המחדל נקבעה במדידה על הקלטות אמיתיות מהארכיון
// (ראה /api/lab/transcribe למטה), ולא לפי מוניטין. על 217.wav, אותו אודיו בדיוק:
//
//   whisper-1          "גאין בן תמוז, תפשין, פבאב ... ירי שמיים ... השולחן, ברוך ירי שם"
//   gpt-4o-transcribe  "י' זין בתמוז תשעין פבב ... יראה שמיים ... השולחן ברוך"   (3 סימני פיסוק בלבד)
//   gpt-transcribe     "י״ז בתמוז תשפ״ב ... ירא שמיים ... השולחן ערוך"            (135 סימני פיסוק)
//
// כלומר המודל הנבחר הוא גם היחיד שקלע לתאריך העברי, לשם "הרב זילברשטיין"
// ולשם הספר — והוא גם המהיר מבין השלושה.
// אפשר לעקוף בלי פריסה מחדש דרך משתנה סביבה.
const TRANSCRIBE_MODEL = process.env.TRANSCRIBE_MODEL || "gpt-transcribe";

// ראה server/rate-limit.ts: /api/transcribe/:id הוא ציבורי, בלי אימות, ומריץ
// קריאת RunPod/OpenAI בתשלום אמיתי לכל בקשה שאינה אידמפוטנטית.
const TRANSCRIBE_RATE_LIMIT_PER_HOUR = 20;

const SUPABASE_URL = "https://csjekrvukbdznetsrodj.supabase.co";
const SUPABASE_KEY = "sb_publishable_Bv6ysG9LfUZ2lUPgZVZO6g_l1wEZIlX";
const BUCKET = "recordings-audio";

const ALLOWED_AUDIO = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/aac",
  "audio/ogg",
  "audio/opus",
  "audio/webm",
  "audio/flac",
  "audio/x-flac",
];

// Small-file / fallback path: buffer in memory.
//
// This used to allow 500MB, and that figure had leaked onto the upload page as
// a promise to the user. It was never reachable: whichever route the file
// takes it ends up in the Supabase bucket, which accepts 50MB and answers 413
// at 51MB (measured — scripts/qa/chizukim-upload-ceiling.mjs). A generous
// limit here only bought a longer wait before the same refusal, on a path that
// buffers the whole file in memory first.
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

// `file_size_bytes`/`duration_seconds` reach these routes straight from the
// client (register) or a raw multipart field (fallback upload) with no other
// validation layer in front — a negative or non-numeric value would otherwise
// persist as-is and corrupt the recording's metadata (e.g. formatDuration()
// rendering a negative timestamp).
function nonNegativeNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    const ok =
      ALLOWED_AUDIO.includes((file.mimetype || "").toLowerCase()) ||
      /\.(mp3|wav|m4a|aac|ogg|opus|webm|flac)$/i.test(file.originalname);
    cb(null, ok);
  },
});

async function nextSeq(): Promise<number> {
  const listRes = await fetch(
    `${SUPABASE_URL}/rest/v1/recordings?select=seq&order=seq.desc&limit=1`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
  );
  if (!listRes.ok) {
    throw new Error(`שגיאה בקבלת המספר הסידורי הבא: ${listRes.status}`);
  }
  const rows = (await listRes.json()) as { seq: number | null }[];
  return (rows[0]?.seq ?? 0) + 1;
}

// nextSeq() reads-then-increments with no DB-side locking, so two uploads close
// together can land on the same seq. objectPath used to be just `${seq}.${ext}`,
// and every write used x-upsert:true — a seq collision meant the second upload's
// audio silently overwrote the first's in storage, with no error to either
// uploader. Confirmed against live data: 11 pairs of `recordings` rows share the
// same seq (and the same audio_path) from a 2026-07-04 batch upload. Appending a
// random token makes the storage path collision-proof regardless of whether seq
// itself collides — seq stays a plain display label everywhere it's read.
function randomToken(): string {
  return randomBytes(4).toString("hex");
}

function extFromName(name: string): string {
  const e = (name.split(".").pop() || "mp3").toLowerCase();
  return /^[a-z0-9]{1,5}$/.test(e) ? e : "mp3";
}

// ---- RunPod (ivrit.ai) transcription helpers ----
const RUNPOD_MODEL = "ivrit-ai/whisper-large-v3-turbo-ct2";
const RUNPOD_FALLBACK_BASE = "https://api.runpod.ai/v2/bpj1ej8c3mg2cc";
// Rough cost estimate ($/min) — used only when we have a duration.
const COST_PER_MINUTE_USD = 0.0004;
const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 600_000;

function runpodBase(): string {
  const injected = process.env.CUSTOM_CRED_API_RUNPOD_AI_URL;
  const base = injected && injected.trim() ? injected.trim() : RUNPOD_FALLBACK_BASE;
  return base.replace(/\/+$/, "");
}

function runpodHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = process.env.CUSTOM_CRED_API_RUNPOD_AI_TOKEN;
  if (token && token.trim()) headers["x-api-key"] = token.trim();
  return headers;
}

// Recursively collect transcript segments from RunPod's nested output.
// Mirrors the _walk/extract logic in tr_daemon.py.
function walkSegments(node: any, segs: any[]): void {
  if (Array.isArray(node)) {
    for (const x of node) walkSegments(x, segs);
  } else if (node && typeof node === "object") {
    if (node.type === "segments" && Array.isArray(node.data)) {
      for (const seg of node.data) {
        if (seg && typeof seg === "object" && typeof seg.text === "string") {
          segs.push({
            start: seg.start ?? null,
            end: seg.end ?? null,
            text: String(seg.text).trim(),
          });
        }
      }
    } else {
      for (const v of Object.values(node)) {
        if (v && (Array.isArray(v) || typeof v === "object")) walkSegments(v, segs);
      }
    }
  }
}

function extractTranscript(data: any): { text: string; segments: any[] } {
  const segs: any[] = [];
  walkSegments(data?.output ?? [], segs);
  const full = segs
    .map((s) => s.text)
    .filter(Boolean)
    .join(" ");
  const text = full.split(/\s+/).filter(Boolean).join(" ");
  return { text, segments: segs };
}

function hasRunpodToken(): boolean {
  return !!(process.env.CUSTOM_CRED_API_RUNPOD_AI_TOKEN || "").trim();
}

// ---- מנוע התמלול השני (OpenAI) ----
// RunPod מריץ את ה-Whisper המכוונן לעברית של ivrit.ai והוא המועדף כשהטוקן שלו
// מוגדר. בלי הטוקן הזה המסלול של RunPod נדחה, ולכן קיים כאן מנוע שני מלא.
// המימוש עצמו — בחירת מודל, ההקשר התורני, חיתוך קבצים ארוכים וסימון קטעים
// לא־בטוחים — יושב ב-server/transcribe.ts.
//
// התמחור מוערך לפי דקת אודיו והוא באותו סדר גודל לכל מודלי התמלול כאן.
const OPENAI_COST_PER_MINUTE_USD = 0.006;

const POLL_FIELDS =
  "id,status,raw_transcript,edited_transcript,topic,parsha_or_date,duration_seconds,transcription_cost_usd,updated_at";

async function fetchRecordingRow(id: string): Promise<any | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/recordings?id=eq.${id}&select=*`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as any[];
  return rows[0] ?? null;
}

async function patchRecording(id: string, patch: Record<string, any>): Promise<any | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/recordings?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`עדכון הרשומה נכשל: ${t}`);
  }
  const rows = (await res.json()) as any[];
  return rows[0] ?? null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // ---- Large-file path (recommended): browser uploads directly to Supabase Storage ----
  // Step 1: reserve a sequence + object path for a direct-to-storage upload.
  app.post("/api/upload/init", async (req: Request, res: Response) => {
    try {
      const originalName = (req.body?.original_name as string) || "recording.mp3";
      const seq = await nextSeq();
      const ext = extFromName(originalName);
      const objectPath = `${seq}-${randomToken()}.${ext}`;
      // Public bucket + open RLS: the browser can PUT directly with the anon key.
      const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objectPath}`;
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`;
      res.json({ seq, objectPath, uploadUrl, publicUrl, apikey: SUPABASE_KEY });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "שגיאה באתחול ההעלאה" });
    }
  });

  // Step 2: after the browser finished the direct upload, register the DB row.
  app.post("/api/upload/register", async (req: Request, res: Response) => {
    try {
      const {
        seq,
        objectPath,
        original_name,
        file_size_bytes,
        duration_seconds,
        topic,
        parsha_or_date,
      } = req.body || {};
      if (!seq || !objectPath) {
        return res.status(400).json({ error: "חסרים נתוני העלאה" });
      }
      const audioUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`;
      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/recordings`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          seq,
          original_name: original_name || objectPath,
          audio_path: objectPath,
          audio_url: audioUrl,
          file_size_bytes: nonNegativeNumberOrNull(file_size_bytes),
          duration_seconds: nonNegativeNumberOrNull(duration_seconds),
          topic: topic || null,
          parsha_or_date: parsha_or_date || null,
          status: "uploaded",
        }),
      });
      if (!insertRes.ok) {
        const t = await insertRes.text();
        return res.status(500).json({ error: `שגיאה ביצירת הרשומה: ${t}` });
      }
      const inserted = await insertRes.json();
      res.json({ recording: inserted[0] });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "שגיאה ברישום ההקלטה" });
    }
  });

  // ---- Fallback path: server-side upload for smaller files ----
  app.post(
    "/api/upload",
    upload.single("audio"),
    async (req: Request, res: Response) => {
      try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: "לא צורף קובץ אודיו תקין" });

        const topic = (req.body.topic as string) || null;
        const parsha = (req.body.parsha_or_date as string) || null;
        const duration = nonNegativeNumberOrNull(req.body.duration_seconds);

        const seq = await nextSeq();
        const ext = extFromName(file.originalname);
        const objectPath = `${seq}-${randomToken()}.${ext}`;

        const storeRes = await fetch(
          `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objectPath}`,
          {
            method: "POST",
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              "Content-Type": file.mimetype || "audio/mpeg",
              "x-upsert": "true",
            },
            body: file.buffer,
          },
        );
        if (!storeRes.ok) {
          const t = await storeRes.text();
          return res.status(500).json({ error: `שגיאה באחסון האודיו: ${t}` });
        }

        const audioUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`;

        const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/recordings`, {
          method: "POST",
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            seq,
            original_name: file.originalname,
            audio_path: objectPath,
            audio_url: audioUrl,
            file_size_bytes: file.size,
            duration_seconds: duration,
            topic,
            parsha_or_date: parsha,
            status: "uploaded",
          }),
        });
        if (!insertRes.ok) {
          const t = await insertRes.text();
          return res.status(500).json({ error: `שגיאה ביצירת הרשומה: ${t}` });
        }
        const inserted = await insertRes.json();
        return res.json({ recording: inserted[0] });
      } catch (e: any) {
        return res.status(500).json({ error: e.message || "שגיאה כללית" });
      }
    },
  );

  // ---- Polling endpoint: lightweight status for the frontend ----
  app.get("/api/recordings/:id", async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/recordings?id=eq.${id}&select=${POLL_FIELDS}`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
      );
      if (!r.ok) {
        const t = await r.text();
        return res.status(500).json({ error: `שגיאה בטעינת ההקלטה: ${t}` });
      }
      const rows = (await r.json()) as any[];
      if (!rows.length) return res.status(404).json({ error: "ההקלטה לא נמצאה" });
      res.json(rows[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "שגיאה בטעינת ההקלטה" });
    }
  });

  // ---- On-demand transcription: RunPod (ivrit.ai) + status pipeline ----
  app.post("/api/transcribe/:id", async (req: Request, res: Response) => {
    const id = String(req.params.id);
    if (hitRateLimit(`transcribe:${clientIp(req)}`, TRANSCRIBE_RATE_LIMIT_PER_HOUR)) {
      return res.status(429).json({ error: "יותר מדי בקשות תמלול, נסו שוב מאוחר יותר" });
    }
    try {
      const rec = await fetchRecordingRow(id);
      if (!rec) return res.status(404).json({ error: "ההקלטה לא נמצאה" });

      // Idempotent: don't re-run while in a working/finished state.
      if (["ready", "transcribing", "editing", "transcribed"].includes(rec.status)) {
        return res.json({ recording: rec, skipped: true });
      }

      const audioUrl = rec.audio_url as string | null;
      if (!audioUrl) {
        await patchRecording(id, { status: "error" });
        return res.status(400).json({ error: "אין קובץ אודיו זמין להקלטה זו" });
      }

      // 1) mark transcribing
      await patchRecording(id, { status: "transcribing" });

      // 2) download audio -> base64
      const audioRes = await fetch(audioUrl);
      if (!audioRes.ok) {
        await patchRecording(id, { status: "error" });
        return res.status(500).json({ error: `הורדת האודיו נכשלה: ${audioRes.status}` });
      }
      const buf = Buffer.from(await audioRes.arrayBuffer());

      // 3) transcribe. RunPod (ivrit.ai) when its token is configured, otherwise
      //    OpenAI Whisper. Both return the same { text, segments } shape.
      let text: string;
      let segments: any[];

      let lowConfidence: TranscribeResult["lowConfidence"] = [];
      let engine = "runpod";

      if (!hasRunpodToken()) {
        try {
          const r = await transcribe(
            buf,
            (rec.original_name as string) || (rec.audio_path as string) || "audio.mp3",
            { model: TRANSCRIBE_MODEL },
          );
          text = r.text;
          segments = r.segments;
          lowConfidence = r.lowConfidence;
          engine = `${r.model}${r.chunks > 1 ? ` ×${r.chunks}` : ""}`;
        } catch (e: any) {
          await patchRecording(id, { status: "error" });
          return res.status(500).json({ error: e?.message || "התמלול נכשל" });
        }
      } else {
        const blob = buf.toString("base64");
        const base = runpodBase();
        const headers = runpodHeaders();
        const submitRes = await fetch(`${base}/run`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            input: {
              model: RUNPOD_MODEL,
              transcribe_args: { blob, language: "he", transcription: "plain_text" },
            },
          }),
        });
        if (!submitRes.ok) {
          const t = await submitRes.text();
          await patchRecording(id, { status: "error" });
          return res.status(500).json({ error: `הפעלת המנוע נכשלה: ${t}` });
        }
        const submitJson: any = await submitRes.json();
        const jobId = submitJson?.id;
        if (!jobId) {
          await patchRecording(id, { status: "error" });
          return res.status(500).json({ error: "המנוע לא החזיר מזהה משימה" });
        }

        // 4) poll /status every 4s up to timeout
        const deadline = Date.now() + POLL_TIMEOUT_MS;
        let statusJson: any = null;
        while (Date.now() < deadline) {
          await sleep(POLL_INTERVAL_MS);
          const sRes = await fetch(`${base}/status/${jobId}`, { headers });
          if (!sRes.ok) continue;
          const sJson: any = await sRes.json();
          const st = sJson?.status;
          if (st === "COMPLETED") {
            statusJson = sJson;
            break;
          }
          if (["FAILED", "CANCELLED", "TIMED_OUT"].includes(st)) {
            await patchRecording(id, { status: "error" });
            return res.status(500).json({ error: `התמלול נכשל במנוע (${st})` });
          }
        }
        if (!statusJson) {
          await patchRecording(id, { status: "error" });
          return res.status(500).json({ error: "התמלול חרג מהזמן המוקצב" });
        }

        // 5) extract raw text + segments
        ({ text, segments } = extractTranscript(statusJson));
      }

      if (!text.trim()) {
        await patchRecording(id, { status: "error" });
        return res.status(500).json({ error: "התמלול חזר ריק" });
      }
      const lastSeg = segments.length ? segments[segments.length - 1] : null;
      const duration =
        rec.duration_seconds ?? (lastSeg && lastSeg.end ? Math.round(lastSeg.end) : null);

      await patchRecording(id, {
        raw_transcript: text,
        segments: segments,
        duration_seconds: duration,
        status: "transcribed",
      });

      // 6) עריכה — פיסוק וחלוקה לפסקאות, עם שומר שמונע כתיבה מחדש של השיעור.
      await patchRecording(id, { status: "editing" });
      const editResult = await editTranscript(text, {
        title: (rec.original_name as string) ?? null,
        topic: (rec.topic as string) ?? null,
      });
      const edited = editResult.text;
      const topic =
        rec.topic && String(rec.topic).trim()
          ? rec.topic
          : text.split(/\s+/).filter(Boolean).slice(0, 8).join(" ");

      // 7) cost estimate — per the engine that actually ran
      const perMinute = hasRunpodToken() ? COST_PER_MINUTE_USD : OPENAI_COST_PER_MINUTE_USD;
      const cost = duration ? Number(((duration / 60) * perMinute).toFixed(6)) : 0;

      // 8) finalize -> ready
      const updated = await patchRecording(id, {
        edited_transcript: edited,
        topic,
        transcription_cost_usd: cost,
        status: "ready",
      });

      res.json({
        recording: updated,
        // מה באמת רץ, וכמה בטוח היה — כדי שלא צריך לנחש מהתוצאה.
        engine,
        edit: { method: editResult.method, note: editResult.note },
        low_confidence: lowConfidence.slice(0, 40),
      });
    } catch (e: any) {
      try {
        await patchRecording(id, { status: "error" });
      } catch {
        // ignore secondary failure
      }
      res.status(500).json({ error: e.message || "שגיאה כללית בתמלול" });
    }
  });

  // ---- השוואת מנועים על הקלטה אמיתית, בלי לשמור כלום ----
  // בחירת מנוע התמלול היא החלטה שצריכה להישען על מדידה, לא על מוניטין. המסלול
  // הזה מריץ כמה מנועים על אותה הקלטה מהארכיון ומחזיר את הטקסטים זה מול זה.
  //
  // הוא לא נגיש בלי טוקן, ומסיבה טובה: הוא צורך זמן חישוב וכסף לכל קריאה,
  // והוא מקבל מזהה הקלטה שרירותי. בלי `LAB_TOKEN` מוגדר הוא מחזיר 404 — כלומר
  // בפריסה רגילה הוא פשוט לא קיים.
  app.post("/api/lab/transcribe/:id", async (req: Request, res: Response) => {
    const expected = (process.env.LAB_TOKEN || "").trim();
    if (!expected) return res.status(404).json({ error: "לא נמצא" });
    if ((req.header("x-lab-token") || "").trim() !== expected) {
      return res.status(401).json({ error: "טוקן חסר או שגוי" });
    }
    try {
      const rec = await fetchRecordingRow(String(req.params.id));
      if (!rec?.audio_url) return res.status(404).json({ error: "ההקלטה או האודיו לא נמצאו" });

      const audioRes = await fetch(rec.audio_url as string);
      if (!audioRes.ok) return res.status(500).json({ error: `הורדת האודיו נכשלה: ${audioRes.status}` });
      const buf = Buffer.from(await audioRes.arrayBuffer());
      const name = (rec.original_name as string) || (rec.audio_path as string) || "audio.mp3";

      const models: string[] = Array.isArray(req.body?.models) && req.body.models.length
        ? req.body.models
        : ["whisper-1", "gpt-4o-transcribe", "gpt-transcribe"];
      const withPrompt = req.body?.prompt !== false;

      const results: any[] = [];
      for (const model of models) {
        const started = Date.now();
        try {
          const r = await transcribe(buf, name, { model, prompt: withPrompt ? undefined : "" });
          results.push({
            model,
            ok: true,
            seconds: Math.round((Date.now() - started) / 100) / 10,
            chars: r.text.length,
            words: r.text.split(/\s+/).filter(Boolean).length,
            low_confidence: r.lowConfidence.length,
            text: r.text,
          });
        } catch (e: any) {
          results.push({ model, ok: false, error: String(e?.message ?? e).slice(0, 300) });
        }
      }
      res.json({ seq: rec.seq, name, size_mb: +(buf.length / 1048576).toFixed(2), prompt: withPrompt, results });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "השוואה נכשלה" });
    }
  });

  // ---- עמוד ניהול — רשימת הקלטות לצפייה תפעולית (מס' סידורי/סטטוס/משך) ----
  // מוגן בעוגיית כניסה (STD_ADMIN_USER/STD_ADMIN_PASSWORD), אותה תבנית בדיוק
  // כמו apps/28-kupot-health-funds/server/routes.ts. תוספת בלבד — לא נוגע
  // בשום מסלול ציבורי קיים (upload/recordings/transcribe).
  app.get("/api/admin", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(renderAdminPage());
  });
  app.post("/api/admin/login", handleAdminLogin);
  app.post("/api/admin/logout", handleAdminLogout);
  app.get("/api/admin/recordings", async (req: Request, res: Response) => {
    if (!isAdminRequest(req)) {
      return res.status(403).json({ error: "גישה נדחתה" });
    }
    try {
      const fields =
        "id,seq,original_name,topic,parsha_or_date,status,duration_seconds,created_at";
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/recordings?select=${fields}&order=seq.desc&limit=1000`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
      );
      if (!r.ok) {
        const t = await r.text();
        return res.status(500).json({ error: `שגיאה בטעינת ההקלטות: ${t}` });
      }
      res.json(await r.json());
    } catch (e: any) {
      res.status(500).json({ error: e.message || "שגיאה בטעינת ההקלטות" });
    }
  });

  return httpServer;
}
