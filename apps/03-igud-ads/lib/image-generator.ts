// Calls OpenAI Images API (gpt-image-1) to generate the background art.
import { getOpenAI } from "./openai";

export type GenerateResult = {
  b64: string;
  model: string;
  cost_estimate: number;
};

const MODEL = process.env.IMAGE_MODEL || "gpt-image-1";

const VALID_SIZES = ["1024x1024", "1792x1024", "1024x1792", "1024x1536"] as const;
type ValidSize = (typeof VALID_SIZES)[number];

function normalizeDalleSize(size: string | null | undefined): ValidSize {
  if (!size) return "1024x1536";
  if (VALID_SIZES.includes(size as ValidSize)) return size as ValidSize;
  // Fallback
  return "1024x1536";
}

export async function generateBackground(prompt: string, dalleSize?: string): Promise<GenerateResult> {
  const client = getOpenAI();
  const size = normalizeDalleSize(dalleSize);
  const resp = await client.images.generate({
    model: MODEL,
    prompt,
    size,
    n: 1,
    // gpt-image-1 always returns b64_json
  } as Parameters<typeof client.images.generate>[0]);

  const item = (resp as { data?: Array<{ b64_json?: string }> }).data?.[0];
  const b64: string | undefined = item?.b64_json;
  if (!b64) throw new Error("No image data returned");
  // gpt-image-1 high quality ~ $0.19 per 1024x1536; approximate
  return { b64, model: MODEL, cost_estimate: 0.19 };
}

export async function analyzeSourceAd(imageBase64Url: string): Promise<{
  description: string;
  detected_palette: string[];
  detected_layout: string;
}> {
  const client = getOpenAI();
  const resp = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You are a graphic-design analyst. Given a Hebrew religious poster image, output STRICT JSON with: description (Hebrew, 2 sentences summarizing the visual style), detected_palette (array of up to 5 hex colors), detected_layout (Hebrew, one sentence on the spatial arrangement). Do not output anything but JSON.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: "נתח את המודעה הזו לצורך שכפול גרפי:" },
          { type: "image_url", image_url: { url: imageBase64Url } },
        ],
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });
  const txt = resp.choices[0]?.message?.content || "{}";
  try {
    const j = JSON.parse(txt);
    return {
      description: j.description || "",
      detected_palette: Array.isArray(j.detected_palette) ? j.detected_palette : [],
      detected_layout: j.detected_layout || "",
    };
  } catch {
    return { description: "", detected_palette: [], detected_layout: "" };
  }
}
