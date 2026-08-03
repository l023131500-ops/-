import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createTranscribeService } from "@/lib/supabase/transcribe-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const tsvc = createTranscribeService();

  const { data: uploads, error } = await tsvc
    .from("uploads")
    .select("id, original_filename, status, style, duration_sec, size_bytes, created_at, uploader_email")
    .eq("uploader_email", user.email)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch transcripts for each upload
  const uploadIds = (uploads || []).map((u: Record<string, unknown>) => u.id as string);
  let transcripts: Record<string, unknown>[] = [];
  if (uploadIds.length > 0) {
    const { data: tr } = await tsvc
      .from("transcripts")
      .select("upload_id, id, styled_text, docx_original_url, docx_edited_url")
      .in("upload_id", uploadIds);
    transcripts = tr || [];
  }

  const transcriptMap: Record<string, unknown> = {};
  transcripts.forEach((t: Record<string, unknown>) => {
    transcriptMap[t.upload_id as string] = t;
  });

  const result = (uploads || []).map((u: Record<string, unknown>) => ({
    ...u,
    transcript: transcriptMap[u.id as string] || null,
  }));

  return NextResponse.json(result);
}
