import { NextResponse } from "next/server";
import { createTranscribeService, createSupabaseServiceRaw } from "@/lib/supabase/transcribe-server";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const sb = createTranscribeService();
  const raw = createSupabaseServiceRaw();
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "original"; // original | edited | sources

  const colMap: Record<string, string> = {
    original: "docx_original_url",
    edited: "docx_edited_url",
    sources: "docx_sources_url",
  };

  const col = colMap[type] || "docx_original_url";

  const { data: transcript, error } = await sb
    .from("transcripts")
    .select(`${col}, upload_id` as string)
    .eq("upload_id", params.id)
    .maybeSingle() as unknown as { data: Record<string, unknown> | null; error: unknown };

  if (error || !transcript) {
    return NextResponse.json({ error: "תמלול לא נמצא" }, { status: 404 });
  }

  const storagePath = transcript[col] as string | null;
  if (!storagePath) {
    return NextResponse.json({ error: "קובץ לא זמין" }, { status: 404 });
  }

  // Create signed URL for download
  const { data: signed, error: signErr } = await raw.storage
    .from("docs")
    .createSignedUrl(storagePath, 300); // 5 min

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ error: "שגיאה בהורדה" }, { status: 500 });
  }

  // Redirect to signed URL
  return NextResponse.redirect(signed.signedUrl);
}
