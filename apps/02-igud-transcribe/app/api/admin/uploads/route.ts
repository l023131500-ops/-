import { NextResponse } from "next/server";
import { createSupabaseService, createSupabaseServiceRaw } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sb = createSupabaseService();
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (id) {
    const { data: upload, error } = await sb.from("uploads").select("*").eq("id", id).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const { data: transcript } = await sb.from("transcripts").select("*").eq("upload_id", id).maybeSingle();

    const raw = createSupabaseServiceRaw();
    let transcriptOut: any = null;
    if (transcript) {
      const signed: any = { ...transcript };
      for (const col of ["docx_original_url", "docx_edited_url", "docx_sources_url"] as const) {
        const key = transcript[col];
        if (key) {
          const { data: s } = await raw.storage.from("docs").createSignedUrl(key, 3600);
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
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") || (await req.json().catch(() => ({}))).id;
  if (!id) return NextResponse.json({ error: "id חסר" }, { status: 400 });
  const sb = createSupabaseService();
  const raw = createSupabaseServiceRaw();
  const { data: upload } = await sb.from("uploads").select("storage_path").eq("id", id).maybeSingle();
  if (upload?.storage_path) {
    await raw.storage.from("audio").remove([upload.storage_path]);
  }
  await raw.storage
    .from("docs")
    .remove([`${id}/original.docx`, `${id}/edited.docx`, `${id}/sources.docx`]);
  const { error } = await sb.from("uploads").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
