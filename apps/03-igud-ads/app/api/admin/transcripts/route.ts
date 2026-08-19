import { NextResponse } from "next/server";
import { createTranscribeService, createSupabaseServiceRaw } from "@/lib/supabase/transcribe-server";
import { requireAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const sb = createTranscribeService();
  const raw = createSupabaseServiceRaw();
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (id) {
    const { data: upload, error } = await sb
      .from("uploads")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: transcript } = await sb
      .from("transcripts")
      .select("*")
      .eq("upload_id", id)
      .maybeSingle();

    let transcriptOut: Record<string, unknown> | null = null;
    if (transcript) {
      const signed: Record<string, unknown> = { ...(transcript as Record<string, unknown>) };
      for (const col of ["docx_original_url", "docx_edited_url", "docx_sources_url"] as const) {
        const key = (transcript as Record<string, unknown>)[col];
        if (key) {
          const { data: s } = await raw.storage
            .from("docs")
            .createSignedUrl(key as string, 3600);
          signed[col] = s?.signedUrl || null;
        }
      }
      transcriptOut = signed;
    }

    return NextResponse.json({ ...upload, transcript: transcriptOut });
  }

  const { data, error } = await sb
    .from("uploads")
    .select("id, uploader_email, style, status, original_filename, duration_sec, size_bytes, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}
