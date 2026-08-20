import { NextResponse } from "next/server";
import { createSupabaseService, createSupabaseServiceRaw } from "@/lib/supabase/server";
import { transcribeAudio } from "@/lib/transcribe";
import { editTranscript, type StyleKey } from "@/lib/postprocess";
import { buildOriginalDocx, buildEditedDocx, buildSourcesDocx } from "@/lib/docx-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Worker: עיבוד job אחד מהתור.
 * קריאה GET = הרץ פעם אחת (cron יכול לקרוא כל 60 שנ').
 * קריאה POST { upload_id } = עיבוד מיידי של job ספציפי.
 *
 * חייב לשבת תחת /api/admin/ (לא /api/jobs) כדי ש-middleware.ts יגן עליו —
 * לפני המעבר הזה כל קורא אנונימי יכול היה לקרוא POST עם upload_id כלשהו
 * ולהפעיל תמלול Whisper מלא (בתשלום) על כל upload בפרויקט.
 */
export async function GET() {
  const result = await processNext();
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const { upload_id } = await req.json().catch(() => ({}));
  if (!upload_id) return NextResponse.json({ ok: false, error: "upload_id חסר" }, { status: 400 });
  const result = await processUpload(upload_id);
  return NextResponse.json(result);
}

async function processNext() {
  const sb = createSupabaseService();
  const { data: job } = await sb
    .from("jobs")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!job) return { ok: true, processed: 0, message: "אין משימות בתור" };
  {
    const { error } = await sb.from("jobs").update({ status: "running", started_at: new Date().toISOString() }).eq("id", job.id);
    if (error) console.error("[jobs] mark running failed", job.id, error);
  }
  try {
    const result = await processUpload(job.upload_id);
    if (result.ok) {
      const { error } = await sb.from("jobs").update({ status: "done", finished_at: new Date().toISOString() }).eq("id", job.id);
      if (error) console.error("[jobs] mark done failed", job.id, error);
    } else {
      const { error } = await sb.from("jobs").update({ status: "error", finished_at: new Date().toISOString(), error_message: result.error }).eq("id", job.id);
      if (error) console.error("[jobs] mark error failed", job.id, error);
    }
    return { processed: 1, job_id: job.id, ...result };
  } catch (e: any) {
    const { error } = await sb.from("jobs").update({ status: "error", finished_at: new Date().toISOString(), error_message: e?.message }).eq("id", job.id);
    if (error) console.error("[jobs] mark error(catch) failed", job.id, error);
    return { ok: false, error: e?.message };
  }
}

async function processUpload(upload_id: string) {
  const sb = createSupabaseService();
  const raw = createSupabaseServiceRaw();

  const { data: upload, error: upErr } = await sb.from("uploads").select("*").eq("id", upload_id).single();
  if (upErr || !upload) return { ok: false, error: "upload לא נמצא" };

  {
    const { error } = await sb.from("uploads").update({ status: "processing" }).eq("id", upload_id);
    if (error) console.error("[jobs] mark upload processing failed", upload_id, error);
  }

  try {
    // 1. הורד את האודיו מ-Storage
    const { data: blob, error: dlErr } = await raw.storage.from("audio").download(upload.storage_path);
    if (dlErr || !blob) throw new Error("שגיאה בהורדת אודיו: " + dlErr?.message);

    // 2. תמלול
    const { text: rawText, durationSec } = await transcribeAudio({
      file: blob,
      filename: upload.original_filename || "audio.mp3"
    });
    if (durationSec) {
      const { error } = await sb.from("uploads").update({ duration_sec: Math.round(durationSec) }).eq("id", upload_id);
      if (error) console.error("[jobs] update duration_sec failed", upload_id, error);
    }

    // 3. שמור transcript עם raw_text
    const { data: transcriptRow, error: tErr } = await sb
      .from("transcripts")
      .insert({ upload_id, raw_text: rawText })
      .select()
      .single();
    if (tErr) throw tErr;

    // 4. שלוף מילון מונחים למסלול
    const { data: glossary } = await sb
      .from("style_glossary")
      .select("term, replacement, notes")
      .eq("style", upload.style);

    // 5. עריכה + מקורות
    const edited = await editTranscript({
      rawText,
      style: upload.style as StyleKey,
      glossary: glossary || []
    });

    // 6. שמור edited_text + footnotes
    {
      const { error } = await sb.from("transcripts").update({ edited_text: edited.edited_text }).eq("id", transcriptRow.id);
      if (error) console.error("[jobs] update edited_text failed", transcriptRow.id, error);
    }
    if (edited.footnotes.length) {
      const { error } = await sb.from("footnotes").insert(
        edited.footnotes.map((f) => ({
          transcript_id: transcriptRow.id,
          number: f.number,
          position: f.position ?? null,
          note_text: f.note_text,
          source_ref: f.source_ref || null
        }))
      );
      if (error) console.error("[jobs] insert footnotes failed", transcriptRow.id, error);
    }

    // 7. בנה 3 קבצי DOCX והעלה ל-Storage (bucket: docs)
    const date = new Date();
    const title = upload.original_filename || `שיעור ${upload_id.slice(0, 8)}`;
    const baseKey = upload_id;
    const styleHe = upload.style === "litvish" ? "ליטאי" : upload.style === "chassidish" ? "חסידי" : "אידיש";

    const originalDocx = await buildOriginalDocx({ title, style: styleHe, rawText, date });
    const editedDocx = await buildEditedDocx({ title, style: styleHe, editedText: edited.edited_text, footnotes: edited.footnotes, date });
    const sourcesDocx = await buildSourcesDocx({ title, editedText: edited.edited_text, footnotes: edited.footnotes, date });

    const uploads = [
      { key: `${baseKey}/original.docx`, buf: originalDocx, col: "docx_original_url" },
      { key: `${baseKey}/edited.docx`, buf: editedDocx, col: "docx_edited_url" },
      { key: `${baseKey}/sources.docx`, buf: sourcesDocx, col: "docx_sources_url" },
    ];
    for (const u of uploads) {
      const { error } = await raw.storage.from("docs").upload(u.key, u.buf, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true
      });
      if (error) throw new Error("שגיאת העלאת DOCX: " + error.message);
      const { error: colErr } = await sb.from("transcripts").update({ [u.col]: u.key }).eq("id", transcriptRow.id);
      if (colErr) console.error(`[jobs] update ${u.col} failed`, transcriptRow.id, colErr);
    }

    {
      const { error } = await sb.from("uploads").update({ status: "done" }).eq("id", upload_id);
      if (error) console.error("[jobs] mark upload done failed", upload_id, error);
    }
    return { ok: true, transcript_id: transcriptRow.id };
  } catch (e: any) {
    console.error("[jobs] processUpload", e);
    const { error } = await sb.from("uploads").update({ status: "error" }).eq("id", upload_id);
    if (error) console.error("[jobs] mark upload error failed", upload_id, error);
    return { ok: false, error: e?.message || "שגיאה לא ידועה" };
  }
}
