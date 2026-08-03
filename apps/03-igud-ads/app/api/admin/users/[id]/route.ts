import { NextResponse } from "next/server";
import { createSupabaseService } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireSuperAdmin();
  if (guard) return guard;

  const body = await req.json();
  const { id: _id, ...rest } = body;

  const svc = createSupabaseService();
  const { data, error } = await svc
    .from("ad_users")
    .update({ ...rest, updated_at: new Date().toISOString() })
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
  const guard = await requireSuperAdmin();
  if (guard) return guard;

  const svc = createSupabaseService();
  const { error } = await svc
    .from("ad_users")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
