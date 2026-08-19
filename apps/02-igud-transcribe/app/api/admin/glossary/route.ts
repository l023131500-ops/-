import { NextResponse } from "next/server";
import { createSupabaseService } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const style = url.searchParams.get("style");
  const sb = createSupabaseService();
  let q = sb.from("style_glossary").select("*").order("style").order("term");
  if (style) q = q.eq("style", style);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  const { style, term, replacement, notes } = await req.json();
  if (!style || !term) return NextResponse.json({ error: "style+term נדרשים" }, { status: 400 });
  const sb = createSupabaseService();
  const { data, error } = await sb
    .from("style_glossary")
    .insert({ style, term, replacement: replacement || null, notes: notes || null })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: "id חסר" }, { status: 400 });
  const sb = createSupabaseService();
  const { data, error } = await sb.from("style_glossary").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") || (await req.json().catch(() => ({}))).id;
  if (!id) return NextResponse.json({ error: "id חסר" }, { status: 400 });
  const sb = createSupabaseService();
  const { error } = await sb.from("style_glossary").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
