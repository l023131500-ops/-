import { NextResponse } from "next/server";
import { createSupabaseService } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = createSupabaseService();
  const { data, error } = await sb
    .from("coupon_codes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { code, max_uploads, expires_at, is_active = true } = body || {};
  const maxUploads = Number(max_uploads);
  if (!code || !Number.isInteger(maxUploads) || maxUploads < 1) {
    return NextResponse.json({ error: "code + max_uploads (מספר שלם חיובי) נדרשים" }, { status: 400 });
  }
  const sb = createSupabaseService();
  const { data, error } = await sb
    .from("coupon_codes")
    .insert({
      code: String(code).trim(),
      max_uploads: maxUploads,
      expires_at: expires_at || null,
      is_active: !!is_active,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { id, ...updates } = body || {};
  if (!id) return NextResponse.json({ error: "id חסר" }, { status: 400 });
  const sb = createSupabaseService();
  const allowed: any = {};
  for (const k of ["max_uploads", "expires_at", "is_active", "code"]) {
    if (!(k in updates)) continue;
    if (k === "max_uploads") {
      const n = Number(updates.max_uploads);
      if (!Number.isInteger(n) || n < 0) {
        return NextResponse.json({ error: "max_uploads חייב להיות מספר שלם לא-שלילי" }, { status: 400 });
      }
      allowed.max_uploads = n;
      continue;
    }
    allowed[k] = updates[k];
  }
  const { data, error } = await sb.from("coupon_codes").update(allowed).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") || (await req.json().catch(() => ({}))).id;
  if (!id) return NextResponse.json({ error: "id חסר" }, { status: 400 });
  const sb = createSupabaseService();
  const { error } = await sb.from("coupon_codes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
