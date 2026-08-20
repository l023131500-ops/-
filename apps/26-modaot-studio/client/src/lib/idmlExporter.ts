// ייצוא IDML (Adobe InDesign) — מתאם #12 ב-CHECKLIST/graphics.md, לדפוס-כמות
// (עלוני A3/עיתונות). בונה חבילת IDML אמיתית (zip תקני + XML לפי סכמת
// idPkg הרשמית של אדובי) ישירות מ-TemplateDoc, כמו stageToSVG (מתאם Figma,
// exporter.ts) — לא ריצוף פיקסלים. טקסט (שכבות text) = TextFrame אמיתי עם
// Story אמיתי (פונט/גודל/צבע/יישור/כיוון-RTL בר-עריכה ב-InDesign). שכבות
// image/shape/decoration מיוצאות כמלבן-מיקום מתויג (הערת XML) — בדיוק אותה
// מגבלה מתועדת כמו עיטורים במתאם Figma (#10): לעיצוב-מחדש ידני בInDesign.
// אין ספריית zip בפרויקט (jszip וכו') — נכתב zip תקני (method 0=store) ביד.
import type { TemplateDoc, AnyLayer, TextLayer } from "@shared/layers";
import { baseTextDirection } from "./exporter";

// ---- ZIP (stored, ללא דחיסה) ----

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(arr: number[], v: number) {
  arr.push(v & 0xff, (v >>> 8) & 0xff);
}
function u32(arr: number[], v: number) {
  arr.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

function buildZip(entries: ZipEntry[]): Uint8Array {
  const enc = new TextEncoder();
  const fileChunks: Uint8Array[] = [];
  const central: number[] = [];
  let offset = 0;
  const DOS_TIME = 0;
  const DOS_DATE = 0x21; // 1980-01-01, קבוע — התאריך לא רלוונטי לתוכן
  for (const entry of entries) {
    const nameBytes = enc.encode(entry.name);
    const data = entry.data;
    const crc = crc32(data);
    const local: number[] = [];
    u32(local, 0x04034b50);
    u16(local, 20);
    u16(local, 0);
    u16(local, 0);
    u16(local, DOS_TIME);
    u16(local, DOS_DATE);
    u32(local, crc);
    u32(local, data.length);
    u32(local, data.length);
    u16(local, nameBytes.length);
    u16(local, 0);
    const localHeader = new Uint8Array(local);
    fileChunks.push(localHeader, nameBytes, data);

    const rec: number[] = [];
    u32(rec, 0x02014b50);
    u16(rec, 20);
    u16(rec, 20);
    u16(rec, 0);
    u16(rec, 0);
    u16(rec, DOS_TIME);
    u16(rec, DOS_DATE);
    u32(rec, crc);
    u32(rec, data.length);
    u32(rec, data.length);
    u16(rec, nameBytes.length);
    u16(rec, 0);
    u16(rec, 0);
    u16(rec, 0);
    u16(rec, 0);
    u32(rec, 0);
    u32(rec, offset);
    for (const b of rec) central.push(b);
    for (const b of Array.from(nameBytes)) central.push(b);

    offset += localHeader.length + nameBytes.length + data.length;
  }
  const centralBytes = new Uint8Array(central);
  const centralOffset = offset;
  const end: number[] = [];
  u32(end, 0x06054b50);
  u16(end, 0);
  u16(end, 0);
  u16(end, entries.length);
  u16(end, entries.length);
  u32(end, centralBytes.length);
  u32(end, centralOffset);
  u16(end, 0);
  const endBytes = new Uint8Array(end);

  const total = fileChunks.reduce((s, c) => s + c.length, 0) + centralBytes.length + endBytes.length;
  const out = new Uint8Array(total);
  let p = 0;
  for (const c of fileChunks) {
    out.set(c, p);
    p += c.length;
  }
  out.set(centralBytes, p);
  p += centralBytes.length;
  out.set(endBytes, p);
  return out;
}

// ---- עזרי XML ----

function xesc(v: string | number): string {
  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function hexToRGB(hex?: string): { r: number; g: number; b: number } | null {
  if (!hex) return null;
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const num = parseInt(h, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

// מסלול מלבני סטנדרטי (4 פינות ישרות) — משמש גם ל-Rectangle וגם ל-TextFrame,
// בדיוק כמו שכל ה-PageItems ב-IDML מתארים גיאומטריה דרך PathPointArray.
function rectPathGeometry(w: number, h: number): string {
  const pts = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ];
  const points = pts
    .map(([x, y]) => `<PathPointType Anchor="${x} ${y}" LeftDirection="${x} ${y}" RightDirection="${x} ${y}"/>`)
    .join("");
  return `<Properties><PathGeometry><GeometryPathType PathOpen="false"><PathPointArray>${points}</PathPointArray></GeometryPathType></PathGeometry></Properties>`;
}

// ---- בניית ה-IDML מתוך TemplateDoc ----

export function buildIDML(doc: TemplateDoc): Uint8Array {
  const w = doc.width;
  const h = doc.height;
  const sorted = [...doc.layers].filter((l) => l.visible !== false).sort((a, b) => (a.z ?? 0) - (b.z ?? 0));

  // צבעים ייחודיים -> Color resources
  const colorMap = new Map<string, string>(); // hex -> "Color/AutoColorN"
  function colorRef(hex?: string): string {
    const rgb = hexToRGB(hex);
    if (!rgb) return "Color/Black";
    if (!colorMap.has(hex!)) colorMap.set(hex!, `Color/AutoColor${colorMap.size + 1}`);
    return colorMap.get(hex!)!;
  }
  const bgHex = doc.background.type === "solid" ? doc.background.color : doc.background.gradient?.from;
  const bgColorRef = colorRef(bgHex ?? "#FFFFFF");
  for (const l of sorted) {
    if (l.type === "text") {
      colorRef((l as TextLayer).fill);
      if ((l as TextLayer).stroke) colorRef((l as TextLayer).stroke);
    } else if (l.type === "shape" || l.type === "decoration") {
      const fill = (l as any).fill as string | undefined;
      if (fill) colorRef(fill);
    }
  }

  // פונטים ייחודיים -> FontFamily resources
  const fontFamilies = new Set<string>();
  for (const l of sorted) if (l.type === "text") fontFamilies.add((l as TextLayer).fontFamily || "Arial");

  // ---- Resources/Graphic.xml ----
  const colorEntries = Array.from(colorMap.entries())
    .map(([hex, ref]) => {
      const rgb = hexToRGB(hex)!;
      return `<Color Self="${ref}" Model="Process" Space="RGB" ColorValue="${rgb.r} ${rgb.g} ${rgb.b}" Name="${xesc(ref.replace("Color/", ""))}"/>`;
    })
    .join("\n");
  const graphicXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<idPkg:Graphic xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="16.0">\n<Color Self="Color/Black" Model="Process" Space="CMYK" ColorValue="0 0 0 100" Name="Black"/>\n<Color Self="Color/Paper" Model="Process" Space="CMYK" ColorValue="0 0 0 0" Name="Paper"/>\n${colorEntries}\n</idPkg:Graphic>`;

  // ---- Resources/Fonts.xml (4 סגנונות לכל משפחה — Regular/Bold/Italic/Bold Italic) ----
  const styleNames = ["Regular", "Bold", "Italic", "Bold Italic"];
  const fontEntries = Array.from(fontFamilies)
    .map((fam) => {
      const fonts = styleNames
        .map(
          (st) =>
            `<Font Self="Font/${xesc(fam)}\t${xesc(st)}" FontFamily="${xesc(fam)}" Name="${xesc(fam)}" PostScriptName="${xesc(fam)}" FontStyleName="${xesc(st)}" Status="Installed"/>`,
        )
        .join("");
      return `<FontFamily Self="FontFamily/${xesc(fam)}" Name="${xesc(fam)}">${fonts}</FontFamily>`;
    })
    .join("\n");
  const fontsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<idPkg:Fonts xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="16.0">\n${fontEntries}\n</idPkg:Fonts>`;

  // ---- Resources/Styles.xml (מינימום סגנונות ברירת-מחדל נדרשים) ----
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<idPkg:Styles xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="16.0">\n<RootCharacterStyleGroup Self="uc"><CharacterStyle Self="CharacterStyle/$ID/[No character style]" Name="$ID/[No character style]"/></RootCharacterStyleGroup>\n<RootParagraphStyleGroup Self="up"><ParagraphStyle Self="ParagraphStyle/$ID/[No paragraph style]" Name="$ID/[No paragraph style]"/><ParagraphStyle Self="ParagraphStyle/$ID/NormalParagraphStyle" Name="$ID/NormalParagraphStyle" BasedOn="ParagraphStyle/$ID/[No paragraph style]"/></RootParagraphStyleGroup>\n<RootObjectStyleGroup Self="uo"><ObjectStyle Self="ObjectStyle/$ID/[None]" Name="$ID/[None]"/><ObjectStyle Self="ObjectStyle/$ID/[Normal Text Frame]" Name="$ID/[Normal Text Frame]"/><ObjectStyle Self="ObjectStyle/$ID/[Normal Graphics Frame]" Name="$ID/[Normal Graphics Frame]"/></RootObjectStyleGroup>\n<RootTableStyleGroup Self="ut"><TableStyle Self="TableStyle/$ID/[No table style]" Name="$ID/[No table style]"/></RootTableStyleGroup>\n<RootCellStyleGroup Self="uy"><CellStyle Self="CellStyle/$ID/[None]" Name="$ID/[None]"/></RootCellStyleGroup>\n</idPkg:Styles>`;

  // ---- Resources/Preferences.xml ----
  const preferencesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<idPkg:Preferences xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="16.0">\n<DocumentPreference Self="documentPreference" PageWidth="${w}" PageHeight="${h}" PagesPerDocument="1" FacingPages="false" DocumentBleedTopOffset="0" DocumentBleedBottomOffset="0" DocumentBleedInsideOrLeftOffset="0" DocumentBleedOutsideOrRightOffset="0"/>\n<ViewPreference Self="viewPreference" HorizontalMeasurementUnits="Points" VerticalMeasurementUnits="Points"/>\n</idPkg:Preferences>`;

  // ---- MasterSpreads/MasterSpread_uMaster.xml ----
  const masterXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<idPkg:MasterSpread xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="16.0">\n<MasterSpread Self="MasterSpread/uMaster" Name="A-Master" BaseName="A-Master" ShowMasterItems="true" NamePrefix="A" PageCount="1">\n<FlattenerPreference LineArtAndTextResolution="300" GradientAndMeshResolution="150"/>\n<Page Self="MasterPage_u1" GeometricBounds="0 0 ${h} ${w}" ItemTransform="1 0 0 1 0 0" Name="A" AppliedMaster="n"/>\n</MasterSpread>\n</idPkg:MasterSpread>`;

  // ---- Stories (שכבה טקסטואלית אחת = story אחד) ----
  const stories: { id: string; xml: string }[] = [];
  const textFrameXmls: string[] = [];
  let ti = 0;
  for (const l of sorted) {
    if (l.type !== "text") continue;
    const t = l as TextLayer;
    ti++;
    const storyId = `Story_u${ti}`;
    const weight = t.fontWeight ?? (t.fontStyle?.includes("bold") ? 700 : 400);
    const isBold = weight >= 700;
    const isItalic = !!t.fontStyle?.includes("italic");
    const fontStyleName = isBold && isItalic ? "Bold Italic" : isBold ? "Bold" : isItalic ? "Italic" : "Regular";
    const justification = t.align === "right" ? "RightAlign" : t.align === "left" ? "LeftAlign" : "CenterAlign";
    const tracking = t.fontSize ? Math.round(((t.letterSpacing ?? 0) / t.fontSize) * 1000) : 0;
    const leading = Math.round((t.lineHeight ?? 1.15) * t.fontSize);
    const fillRef = colorRef(t.fill);
    const lines = (t.text || "").split("\n");
    const content = lines.map((line) => `<Content>${xesc(line)}</Content>`).join("<Br/>");
    // כמו stageToSVG (exporter.ts): כיוון-בסיס לפי התו החזק הראשון בתוכן, לא
    // rtl קבוע — שכבת טקסט באנגלית בלבד (קריאה-לפעולה/שם-מותג/טלפון) חייבת
    // StoryDirection="LeftToRightDirection" כדי לא להתהפך ב-InDesign.
    const storyDirection = baseTextDirection(t.text || "") === "ltr" ? "LeftToRightDirection" : "RightToLeftDirection";
    stories.push({
      id: storyId,
      xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<idPkg:Story xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="16.0">\n<Story Self="${storyId}" TrackChanges="false">\n<StoryPreference StoryOrientation="Horizontal" StoryDirection="${storyDirection}"/>\n<ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/$ID/NormalParagraphStyle" Justification="${justification}" Leading="${leading}">\n<CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]" PointSize="${t.fontSize}" AppliedFont="${xesc(t.fontFamily)}" FontStyle="${xesc(fontStyleName)}" FillColor="${fillRef}" Tracking="${tracking}">\n${content}\n</CharacterStyleRange>\n</ParagraphStyleRange>\n</Story>\n</idPkg:Story>`,
    });
    const vAlign = t.verticalAlign === "middle" ? "CenterAlign" : t.verticalAlign === "bottom" ? "BottomAlign" : "TopAlign";
    const fh = t.height ?? t.fontSize * lines.length * (t.lineHeight ?? 1.15);
    textFrameXmls.push(
      `<TextFrame Self="tf_${ti}" ParentStory="${storyId}" ItemTransform="1 0 0 1 ${t.x} ${t.y}">\n<TextFramePreference VerticalJustification="${vAlign}"/>\n${rectPathGeometry(t.width, fh)}\n</TextFrame>`,
    );
  }

  // ---- מלבנים-מיקום (image/shape/decoration) — כמו עיטורים במתאם Figma #10 ----
  const placeholderXmls: string[] = [];
  let pi = 0;
  for (const l of sorted) {
    if (l.type === "text") continue;
    pi++;
    const anyL = l as any;
    const fillHex: string | undefined = l.type === "image" ? undefined : anyL.fill;
    const fillRef = fillHex ? colorRef(fillHex) : "Color/None";
    const kindLabel = l.type === "image" ? "image" : l.type === "shape" ? `shape:${anyL.shape}` : `decoration:${anyL.kind}`;
    const ph = l.height ?? l.width;
    placeholderXmls.push(
      `<!-- placeholder layer: ${xesc(kindLabel)} (id=${xesc(l.id)}) -->\n<Rectangle Self="ph_${pi}" FillColor="${fillRef}" StrokeColor="Color/Black" StrokeWeight="0.5" ItemTransform="1 0 0 1 ${l.x} ${l.y}">\n${rectPathGeometry(l.width, ph)}\n</Rectangle>`,
    );
  }

  // ---- Spreads/Spread_u1.xml ----
  const backgroundRect = `<Rectangle Self="bg" FillColor="${bgColorRef}" StrokeColor="Color/None" StrokeWeight="0" ItemTransform="1 0 0 1 0 0">\n${rectPathGeometry(w, h)}\n</Rectangle>`;
  const spreadXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<idPkg:Spread xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="16.0">\n<Spread Self="Spread_u1" ShowMasterItems="true" PageCount="1">\n<FlattenerPreference LineArtAndTextResolution="300" GradientAndMeshResolution="150"/>\n<Page Self="Page_u1" GeometricBounds="0 0 ${h} ${w}" ItemTransform="1 0 0 1 0 0" Name="1" AppliedMaster="MasterSpread/uMaster"/>\n${backgroundRect}\n${placeholderXmls.join("\n")}\n${textFrameXmls.join("\n")}\n</Spread>\n</idPkg:Spread>`;

  // ---- META-INF/container.xml + designmap.xml ----
  const containerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">\n<rootfiles><rootfile full-path="designmap.xml" media-type="application/vnd.adobe.indesign-idml-package"/></rootfiles>\n</container>`;

  const storyRefs = stories
    .map((s) => `<idPkg:Story xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" src="Stories/${s.id}.xml"/>`)
    .join("\n");
  const designmapXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<?aid style="50" type="document" readerVersion="6.0" featureSet="257" product="19.0(64)" ?>\n<Document DOMVersion="16.0" Self="d">\n<idPkg:Graphic xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" src="Resources/Graphic.xml"/>\n<idPkg:Fonts xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" src="Resources/Fonts.xml"/>\n<idPkg:Styles xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" src="Resources/Styles.xml"/>\n<idPkg:Preferences xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" src="Resources/Preferences.xml"/>\n<idPkg:MasterSpread xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" src="MasterSpreads/MasterSpread_uMaster.xml"/>\n${storyRefs}\n<idPkg:Spread xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" src="Spreads/Spread_u1.xml"/>\n<Language Self="Language/$ID/Hebrew" Name="$ID/Hebrew"/>\n</Document>`;

  const enc = new TextEncoder();
  const entries: ZipEntry[] = [
    { name: "mimetype", data: enc.encode("application/vnd.adobe.indesign-idml-package") },
    { name: "META-INF/container.xml", data: enc.encode(containerXml) },
    { name: "designmap.xml", data: enc.encode(designmapXml) },
    { name: "Resources/Graphic.xml", data: enc.encode(graphicXml) },
    { name: "Resources/Fonts.xml", data: enc.encode(fontsXml) },
    { name: "Resources/Styles.xml", data: enc.encode(stylesXml) },
    { name: "Resources/Preferences.xml", data: enc.encode(preferencesXml) },
    { name: "MasterSpreads/MasterSpread_uMaster.xml", data: enc.encode(masterXml) },
    ...stories.map((s) => ({ name: `Stories/${s.id}.xml`, data: enc.encode(s.xml) })),
    { name: "Spreads/Spread_u1.xml", data: enc.encode(spreadXml) },
  ];
  return buildZip(entries);
}

export function downloadIDML(doc: TemplateDoc, filename = "modaa.idml") {
  const bytes = buildIDML(doc);
  const blob = new Blob([bytes], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
