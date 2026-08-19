import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createTranscribeService } from "@/lib/supabase/transcribe-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ uploads: [] });

  const t = createTranscribeService();
  const { data } = await t
    .from("uploads")
    .select("id, status, original_filename, style, duration_sec, created_at")
    .eq("uploader_email", user.email)
    .order("created_at", { ascending: false })
    .limit(100);

  return NextResponse.json({ uploads: data || [] });
}
