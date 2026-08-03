import { NextResponse } from "next/server";
import { createSupabaseService } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Public endpoint — returns only active templates */
export async function GET() {
  const svc = createSupabaseService();
  const { data, error } = await svc
    .from("ad_templates")
    .select(
      "id, name, description, thumbnail_url, category, is_active, sort_order, " +
      "required_fields, optional_fields, style_rules, price_nis, " +
      "allows_logo, allows_custom_colors, aspect_ratio, dalle_size"
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}
