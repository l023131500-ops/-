import { NextResponse } from "next/server";
import { createSupabaseService } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdmin();
  if (guard) return guard;

  const svc = createSupabaseService();
  const { data, error } = await svc
    .from("ad_templates")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const b = await req.json();
  const svc = createSupabaseService();

  const { data, error } = await svc
    .from("ad_templates")
    .insert({
      name: b.name,
      description: b.description || null,
      category: b.category,
      thumbnail_url: b.thumbnail_url || null,
      layout_json: b.layout_json || null,
      is_active: b.is_active ?? true,
      sort_order: b.sort_order ?? 0,
      prompt_template: b.prompt_template || null,
      required_fields: b.required_fields || [],
      optional_fields: b.optional_fields || [],
      style_rules: b.style_rules || null,
      price_nis: b.price_nis ?? null,
      allows_logo: b.allows_logo ?? false,
      allows_custom_colors: b.allows_custom_colors ?? false,
      aspect_ratio: b.aspect_ratio || "1:1",
      dalle_size: b.dalle_size || "1024x1024",
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id, ...rest } = await req.json();
  if (!id) return NextResponse.json({ error: "חסר id" }, { status: 400 });

  const svc = createSupabaseService();
  const { data, error } = await svc
    .from("ad_templates")
    .update({ ...rest, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "חסר id" }, { status: 400 });

  const svc = createSupabaseService();
  const { error } = await svc.from("ad_templates").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
