import { NextResponse } from "next/server";
import { createSupabaseService, createSupabaseServiceRaw } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const svc = createSupabaseService();
  const raw = createSupabaseServiceRaw();

  const { data: project } = await svc
    .from("ad_projects")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data: gens } = await svc
    .from("ad_generations")
    .select("*")
    .eq("project_id", params.id)
    .order("variation_num");

  const signed = await Promise.all(
    (gens || []).map(async (g: Record<string, unknown>) => {
      if (g.storage_path) {
        const { data: s } = await raw.storage
          .from("ad-outputs")
          .createSignedUrl(g.storage_path as string, 3600);
        return { ...g, image_url: s?.signedUrl || g.image_url };
      }
      return g;
    })
  );

  const { data: payments } = await svc
    .from("ad_payments")
    .select("*")
    .eq("project_id", params.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ project, generations: signed, payments: payments || [] });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await req.json();
  const svc = createSupabaseService();

  const { data, error } = await svc
    .from("ad_projects")
    .update(body)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const svc = createSupabaseService();
  const { error } = await svc.from("ad_projects").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
