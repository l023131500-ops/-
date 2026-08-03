// Prompt engineering for ad generation
// Hebrew text is composed in code (sharp), not requested from the image model.
// We tell DALL·E/gpt-image-1 to leave space for the text overlay.

export type AdParameters = {
  category: "shiur" | "gmach" | "beis_knesset" | "tefilla" | "event" | "other";
  rabbi_name?: string;       // שם הרב/מרצה
  lesson_name?: string;      // שם השיעור
  day?: string;              // יום
  time?: string;             // שעה
  location?: string;         // מקום
  palette?: string[];        // צבעים hex
  contact?: string;          // פרטי קשר
  free_text?: string;        // טקסט חופשי
  style_keywords?: string[]; // hand-picked vibe
  logo_present?: boolean;
};

const CATEGORY_VIBES: Record<string, string> = {
  shiur:
    "Classic Torah study atmosphere: a clean elegant layout, a hint of an open Gemara/Sefer, warm parchment cream tones, a gold seal or motif, a calm and dignified mood. Authentic Jewish religious aesthetic.",
  gmach:
    "Chesed (charity) warmth: gentle gradients, a stylized hand giving, warm gold and forest green, subtle hamsa or olive-branch motif, generous open space.",
  beis_knesset:
    "Stately synagogue ambiance: deep navy and gold, a stylized aron kodesh or magen david silhouette, soft glow, ornate but restrained.",
  tefilla:
    "Prayer mood: pre-dawn deep purple to gold gradient, soft star-of-david motif, contemplative quietness.",
  event:
    "Festive Jewish celebration: regal purple and warm gold, light bokeh, simcha sparkle yet tasteful, ornamental Hebrew frame.",
  other: "Distinctive Jewish religious poster aesthetic, dignified and modern.",
};

export function buildImagePrompt(params: AdParameters, variation: number): string {
  const vibe = CATEGORY_VIBES[params.category] ?? CATEGORY_VIBES.other;
  const palette = params.palette?.length
    ? `Use this exact color palette as dominant hues: ${params.palette.join(", ")}. `
    : "Use deep navy (#1A2E5A) with antique gold accents (#C9A84C). ";

  // Variation system: different compositions per call
  const compositions = [
    "Vertical poster, 1024x1536. Hero ornamental top third, centered visual focal point, lower two thirds intentionally left as a calm gradient or subtle texture to receive overlay text. No actual readable text in the image.",
    "Vertical poster, 1024x1536. An ornamental gold filigree frame around the edges, decorative corner flourishes, large empty centered area for an overlay text card. No actual readable text.",
    "Vertical poster, 1024x1536. Asymmetric split — upper 40% rich illustration (ornament/motif), lower 60% flat solid backdrop area kept clean for overlay text. No actual readable text.",
  ];
  const comp = compositions[(variation - 1) % compositions.length];

  const styleKw = params.style_keywords?.length
    ? params.style_keywords.join(", ") + ", "
    : "";

  return [
    `Religious Jewish (Orthodox) poster background, intended for a Torah lesson advertisement.`,
    vibe,
    palette,
    `${styleKw}rich ornamental details, gold leaf accents, parchment textures where appropriate.`,
    comp,
    `IMPORTANT: do NOT render any text, letters, words, or Hebrew script in the image. The image must serve as a pure visual background — text will be overlaid in code afterward.`,
    `No people's faces. No copyrighted logos. No watermarks. Suitable for print.`,
  ].join(" ");
}

export function buildOverlayPlan(params: AdParameters): {
  title: string;
  subtitle?: string;
  details: string[];
  contact?: string;
} {
  const title = params.lesson_name || "שיעור תורה";
  const subtitle = params.rabbi_name ? `מפי ${params.rabbi_name}` : undefined;
  const details: string[] = [];
  if (params.day) details.push(`יום: ${params.day}`);
  if (params.time) details.push(`שעה: ${params.time}`);
  if (params.location) details.push(`מקום: ${params.location}`);
  if (params.free_text) details.push(params.free_text);
  return { title, subtitle, details, contact: params.contact };
}
