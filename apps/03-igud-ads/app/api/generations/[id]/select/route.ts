import { NextResponse } from "next/server";
import { createSupabaseService } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const svc = createSupabaseService();
  const { data: gen } = await svc.from("ad_generations").select("*").eq("id", params.id).maybeSingle();
  if (!gen) return NextResponse.json({ error: "וריאציה לא נמצאה" }, { status: 404 });

  await svc.from("ad_generations").update({ selected: false }).eq("project_id", gen.project_id);
  await svc.from("ad_generations").update({ selected: true }).eq("id", gen.id);
  await svc.from("ad_projects").update({
    selected_generation_id: gen.id,
    status: "completed",
    updated_at: new Date().toISOString(),
  }).eq("id", gen.project_id);

  await audit("generation_selected", "ad_generation", gen.id, null);
  return NextResponse.json({ ok: true });
}
