import { NextResponse } from "next/server";
import { createSupabaseService, createSupabaseServiceRaw } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const svc = createSupabaseService();
  const raw = createSupabaseServiceRaw();
  const { data: project } = await svc.from("ad_projects").select("*").eq("id", params.id).maybeSingle();
  if (!project) return NextResponse.json({ project: null });
  const { data: generations } = await svc
    .from("ad_generations").select("*").eq("project_id", params.id).order("variation_num", { ascending: true });

  // Sign URLs for image_url paths in the storage bucket
  const signed = await Promise.all((generations || []).map(async (g) => {
    if (g.storage_path) {
      const { data: s } = await raw.storage.from("ad-outputs").createSignedUrl(g.storage_path, 3600);
      return { ...g, image_url: s?.signedUrl || g.image_url };
    }
    return g;
  }));

  return NextResponse.json({ project, generations: signed });
}
