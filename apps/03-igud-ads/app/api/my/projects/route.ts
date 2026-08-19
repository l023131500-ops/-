import { NextResponse } from "next/server";
import { createSupabaseService, createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ projects: [] });

  const svc = createSupabaseService();
  const { data } = await svc
    .from("ad_projects")
    .select("id, status, ad_type, customer_data, generated_image_url, generated_pdf_url, created_at")
    .or(`customer_data->>email.eq.${user.email}`)
    .order("created_at", { ascending: false })
    .limit(100);

  return NextResponse.json({ projects: data || [] });
}
