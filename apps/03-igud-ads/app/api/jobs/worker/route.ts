import { NextResponse } from "next/server";
import { createSupabaseService, createSupabaseServiceRaw } from "@/lib/supabase/server";
import { generateBackground, analyzeSourceAd } from "@/lib/image-generator";
import { buildImagePrompt, buildOverlayPlan, type AdParameters } from "@/lib/prompt-engine";
import { compositeAd, pngBufferFromB64 } from "@/lib/image-composer";
import { pngToPdf } from "@/lib/pdf-generator";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type AdTemplate = {
  id: string;
  prompt_template: string | null;
  dalle_size: string | null;
  style_rules: { colors: string[]; font: string; alignment: string } | null;
  allows_logo: boolean;
  allows_custom_colors: boolean;
};

/** Replace {field} placeholders with values from params */
function fillPromptTemplate(template: string, params: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = params[key];
    return val != null ? String(val) : "";
  });
}

async function processJob(jobId: string) {
  const svc = createSupabaseService();
  const raw = createSupabaseServiceRaw();
  const startedAt = new Date().toISOString();

  // Claim atomically: the update only matches (and returns a row) if the job is
  // still "pending". Two concurrent runs of this route (it carries no auth, so
  // nothing stops two overlapping requests) used to both select the same pending
  // job and both process it — double DALL-E billing, duplicate ad-outputs
  // uploads, two ad_generations rows for one job. Conditioning the update on
  // .eq("status", "pending") makes only the first caller win the claim; the
  // second gets back no row and skips.
  const { data: job } = await svc
    .from("ad_jobs")
    .update({ status: "running", started_at: startedAt })
    .eq("id", jobId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();
  if (!job) return { jobId, skipped: true };

  try {
    const { data: project } = await svc.from("ad_projects").select("*").eq("id", job.project_id).maybeSingle();
    if (!project) throw new Error("project missing");

    let params: AdParameters = (project.parameters || {}) as AdParameters;

    // CLONE: analyze the source image first; merge palette/style hints into params
    if (job.type === "clone_analyze" && project.source_image_path) {
      const { data: src } = await raw.storage.from("ad-sources").download(project.source_image_path);
      if (src) {
        const buf = Buffer.from(await src.arrayBuffer());
        const b64url = `data:image/png;base64,${buf.toString("base64")}`;
        const an = await analyzeSourceAd(b64url);
        params = {
          ...params,
          palette: (params.palette && params.palette.length ? params.palette : an.detected_palette),
          style_keywords: [
            ...(params.style_keywords || []),
            ...(an.detected_layout ? [an.detected_layout] : []),
          ],
        };
        await svc.from("ad_projects").update({
          parameters: { ...params, _clone_analysis: an },
        }).eq("id", project.id);
      }
    }

    // Load template if referenced
    const templateId: string | undefined =
      (params as Record<string, unknown>)._template_id as string | undefined;
    let template: AdTemplate | null = null;
    if (templateId) {
      const { data: tmpl } = await svc
        .from("ad_templates")
        .select("id, prompt_template, dalle_size, style_rules, allows_logo, allows_custom_colors")
        .eq("id", templateId)
        .maybeSingle();
      template = tmpl as AdTemplate | null;
    }

    // Determine DALL-E size
    const dalleSize = template?.dalle_size || "1024x1536";

    // Handle logo if template allows it
    const logoPath: string | undefined = (params as Record<string, unknown>).logo_path as string | undefined;
    let logoHint = "";
    if (template?.allows_logo && logoPath) {
      logoHint = " Incorporate the provided logo/brand mark subtly into the design.";
    }

    // Handle custom colors
    const customColors: string[] | undefined = (params as Record<string, unknown>).colors as string[] | undefined;
    if (customColors?.length) {
      params = { ...params, palette: customColors };
    } else if (template?.style_rules?.colors?.length) {
      params = { ...params, palette: template.style_rules.colors };
    }

    // Generate 3 variations
    const accent = (params.palette && params.palette[1]) || "#C9A84C";
    const plan = buildOverlayPlan(params);

    for (let v = 1; v <= 3; v++) {
      let prompt: string;

      if (template?.prompt_template) {
        // Use template's prompt_template
        const filled = fillPromptTemplate(
          template.prompt_template,
          params as unknown as Record<string, unknown>
        );
        // Build a structured prompt from the filled template
        const palette = params.palette?.length
          ? `Use this exact color palette: ${params.palette.join(", ")}.`
          : "Use deep navy (#1A2E5A) with antique gold accents (#C9A84C).";

        const compositions = [
          `Vertical poster. Hero ornamental top third, centered visual focal point, lower two-thirds calm gradient for overlay text. No readable text in image.`,
          `Vertical poster. Ornamental gold filigree frame around edges, decorative corner flourishes, large empty centered area for overlay text. No readable text.`,
          `Vertical poster. Asymmetric split — upper 40% rich illustration, lower 60% flat solid backdrop for overlay text. No readable text.`,
        ];
        const comp = compositions[(v - 1) % compositions.length];

        prompt = [
          `Religious Jewish (Orthodox) poster background for: ${filled}`,
          palette,
          comp,
          logoHint,
          `IMPORTANT: do NOT render any text, letters, words, or Hebrew script in the image.`,
          `No faces. No copyrighted logos. No watermarks. Suitable for print.`,
        ].filter(Boolean).join(" ");
      } else {
        // Fallback to original prompt engine
        prompt = buildImagePrompt(params, v);
        if (logoHint) prompt += logoHint;
      }

      const gen = await generateBackground(prompt, dalleSize);
      const bgBuf = await pngBufferFromB64(gen.b64);
      const { main, whatsapp } = await compositeAd(bgBuf, plan, accent);
      const pdf = await pngToPdf(main, plan.title);

      const baseKey = `${project.id}/v${v}`;
      const mainKey = `${baseKey}/main.png`;
      const waKey   = `${baseKey}/whatsapp.png`;
      const pdfKey  = `${baseKey}/poster.pdf`;

      const up1 = await raw.storage.from("ad-outputs").upload(mainKey, main, { contentType: "image/png", upsert: true });
      const up2 = await raw.storage.from("ad-outputs").upload(waKey, whatsapp, { contentType: "image/png", upsert: true });
      const up3 = await raw.storage.from("ad-outputs").upload(pdfKey, pdf, { contentType: "application/pdf", upsert: true });
      if (up1.error || up2.error || up3.error) {
        throw new Error(up1.error?.message || up2.error?.message || up3.error?.message || "upload failed");
      }
      const { data: sMain, error: eMain } = await raw.storage.from("ad-outputs").createSignedUrl(mainKey, 3600);
      const { data: sWa, error: eWa }     = await raw.storage.from("ad-outputs").createSignedUrl(waKey, 3600);
      const { data: sPdf, error: ePdf }   = await raw.storage.from("ad-outputs").createSignedUrl(pdfKey, 3600);
      if (eMain || eWa || ePdf) {
        throw new Error(eMain?.message || eWa?.message || ePdf?.message || "signed url failed");
      }

      await svc.from("ad_generations").insert({
        project_id: project.id,
        variation_num: v,
        image_url: sMain?.signedUrl,
        whatsapp_url: sWa?.signedUrl,
        pdf_url: sPdf?.signedUrl,
        storage_path: mainKey,
        prompt_used: prompt,
        composited: true,
        model_used: gen.model,
        cost_estimate: gen.cost_estimate,
      });
    }

    await svc.from("ad_projects").update({
      status: "ready",
      updated_at: new Date().toISOString(),
    }).eq("id", project.id);

    await svc.from("ad_jobs").update({
      status: "done",
      finished_at: new Date().toISOString(),
      result: { variations: 3 },
    }).eq("id", jobId);

    return { jobId, ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("worker error", msg);
    await svc.from("ad_jobs").update({
      status: "error",
      error_message: msg,
      attempts: (job.attempts || 0) + 1,
      finished_at: new Date().toISOString(),
    }).eq("id", jobId);
    await svc.from("ad_projects").update({
      status: "error",
      error_message: msg,
    }).eq("id", job.project_id);
    return { jobId, error: msg };
  }
}

async function runWorker() {
  const svc = createSupabaseService();
  const { data: jobs } = await svc
    .from("ad_jobs")
    .select("id")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(2);
  if (!jobs?.length) return { processed: 0 };
  const results = await Promise.all(jobs.map((j: { id: string }) => processJob(j.id)));
  return { processed: results.length, results };
}

export async function POST() {
  const r = await runWorker();
  return NextResponse.json(r);
}
export async function GET() {
  // Vercel cron uses GET
  const r = await runWorker();
  return NextResponse.json(r);
}
