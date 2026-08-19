import { NextResponse } from "next/server";
import { createSupabaseService, createSupabaseServiceRaw } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = new URL(req.url).searchParams.get("id");
  const svc = createSupabaseService();
  const raw = createSupabaseServiceRaw();
  if (id) {
    const { data: project } = await svc.from("ad_projects").select("*").eq("id", id).maybeSingle();
    const { data: gens } = await svc.from("ad_generations").select("*").eq("project_id", id).order("variation_num");
    const signed = await Promise.all((gens || []).map(async (g: any) => {
      if (g.storage_path) {
        const { data: s } = await raw.storage.from("ad-outputs").createSignedUrl(g.storage_path, 3600);
        return { ...g, image_url: s?.signedUrl || g.image_url };
      }
      return g;
    }));
    return NextResponse.json({ project, generations: signed });
  }
  const { data } = await svc.from("ad_projects").select("*").order("created_at", { ascending: false }).limit(200);
  return NextResponse.json(data || []);
}

export async function DELETE(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  const svc = createSupabaseService();
  await svc.from("ad_projects").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
