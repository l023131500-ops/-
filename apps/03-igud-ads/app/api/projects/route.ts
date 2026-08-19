import { NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseService, createSupabaseServiceRaw } from "@/lib/supabase/server";
import { validateAndConsumeCoupon, incrementCouponUsage } from "@/lib/coupon";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const svc = createSupabaseService();
  // Try to find projects by customer_data email or uploader_email
  const { data } = await svc
    .from("ad_projects")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  // Filter client-side since customer_data is JSONB
  const filtered = (data || []).filter((p: Record<string, unknown>) => {
    const cd = p.customer_data as Record<string, unknown> | null;
    return (
      (p.uploader_email as string | null) === user.email ||
      cd?.email === user.email ||
      cd?.contact === user.email
    );
  });

  return NextResponse.json(filtered);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { coupon_code, mode, parameters, source_image_b64, template_id } = body;
    if (!coupon_code || !mode || !parameters) {
      return NextResponse.json({ error: "חסרים שדות" }, { status: 400 });
    }
    const cv = await validateAndConsumeCoupon(coupon_code);
    if (!cv.ok) return NextResponse.json({ error: cv.reason }, { status: 400 });

    const svc = createSupabaseService();
    const raw = createSupabaseServiceRaw();

    // Validate template if provided
    let resolvedTemplateId: string | undefined = template_id;
    if (template_id) {
      const { data: tmpl } = await svc
        .from("ad_templates")
        .select("id, is_active, required_fields")
        .eq("id", template_id)
        .maybeSingle();
      if (!tmpl) {
        return NextResponse.json({ error: "תבנית לא נמצאה" }, { status: 400 });
      }
      if (!tmpl.is_active) {
        return NextResponse.json({ error: "תבנית אינה פעילה" }, { status: 400 });
      }
      // Validate required_fields
      const required: string[] = Array.isArray(tmpl.required_fields) ? tmpl.required_fields : [];
      const missing = required.filter((f: string) => !parameters[f]?.toString().trim());
      if (missing.length > 0) {
        return NextResponse.json(
          { error: `שדות חובה חסרים: ${missing.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Ensure template_id is in parameters for the worker
    const finalParameters = {
      ...parameters,
      _template_id: resolvedTemplateId || parameters._template_id || null,
    };

    // optionally upload source image
    let source_image_path: string | undefined;
    if (mode === "clone" && source_image_b64) {
      const m = /^data:(image\/[a-z]+);base64,(.+)$/i.exec(source_image_b64);
      if (m) {
        const mime = m[1];
        const ext = mime.split("/")[1].replace("jpeg", "jpg");
        const path = `${crypto.randomUUID()}.${ext}`;
        const bytes = Buffer.from(m[2], "base64");
        const { error: upErr } = await raw.storage
          .from("ad-sources")
          .upload(path, bytes, { contentType: mime, upsert: false });
        if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
        source_image_path = path;
      }
    }

    const { data: project, error } = await svc
      .from("ad_projects")
      .insert({
        coupon_id: cv.coupon.id,
        uploader_email: parameters?.contact || null,
        mode,
        status: "generating",
        parameters: finalParameters,
        source_image_path,
        category: parameters?.category || null,
        title: parameters?.lesson_name || parameters?.title || null,
      })
      .select("*")
      .single();
    if (error || !project) {
      return NextResponse.json({ error: error?.message || "כשל ביצירה" }, { status: 500 });
    }

    // create a generate job
    await svc.from("ad_jobs").insert({
      project_id: project.id,
      type: mode === "clone" ? "clone_analyze" : "generate",
      status: "pending",
      payload: { project_id: project.id },
    });

    await incrementCouponUsage(cv.coupon.id);
    await audit("project_created", "ad_project", project.id, parameters?.contact || null, { mode, template_id: resolvedTemplateId });

    // kick worker (best effort, non-blocking)
    fetch(new URL("/api/jobs/worker", req.url).toString(), { method: "POST" }).catch(() => {});

    return NextResponse.json({ project });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
