// מנוע הרינדור החי — הופך TemplateDoc ל-canvas אינטראקטיבי עם react-konva.
// כל שכבה מרונדרת לפי סוגה. טקסט עם autoFit מקטין את הפונט כדי להיכנס לתיבה.
// ה-Stage מוקטן לתצוגה (scale), אך מיוצא ברזולוציה מלאה (pixelRatio).
// כל צומת-שורש של שכבה נושא id={layer.id} — ייצוא הוידאו (lib/videoExport.ts)
// מאתר צמתים לפי מזהה השכבה כדי לצלם את הבמה בשלבי-חשיפה (scene build-up).

import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Rect, Text, Group, Path, Image as KImage, Circle, Line } from "react-konva";
import useImage from "use-image";
import type Konva from "konva";
import { Text as KonvaTextShape } from "konva/lib/shapes/Text";
import type { TemplateDoc, AnyLayer, TextLayer, ImageLayer, ShapeLayer, DecorationLayer } from "@shared/layers";
import { fitText, wrapText, ensureFontsLoaded, collectDocFontFamilies } from "@/lib/autofit";
import { ORNAMENTS, CORNER_ORNAMENT_PATH } from "@/lib/ornaments";
import { patternTile, hexToRgba } from "@/lib/backgroundLibrary";

interface Props {
  doc: TemplateDoc;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onChangeLayer?: (id: string, patch: Partial<AnyLayer>) => void;
  onEditText?: (id: string) => void; // דאבל-קליק על שכבת טקסט — עריכה inline
  maxDisplayWidth?: number;
  stageRef?: React.MutableRefObject<Konva.Stage | null>;
  interactive?: boolean;
}

// רקע: solid / gradient / pattern / image
// שכבת-מרקם מעל צבע/גרדיאנט — כל ארבעת ערכי ה-pattern שהסכמה מכריזה מרונדרים
// בפועל (עד עכשיו רק vignette צויר, והשלושה האחרים נבלעו בשקט). הווינייטה
// נשארה בדיוק באותם פרמטרים; glow הוא היפוכה (מרכז מואר בצבע patternColor);
// linen/subtle_damask מרוצפים מאריח פרוצדורלי משותף (lib/backgroundLibrary.ts).
function PatternOverlay({ doc }: { doc: TemplateDoc }) {
  const bg = doc.background;
  const p = bg.pattern;
  if (!p || p === "none") return null;
  const cx = doc.width / 2, cy = doc.height / 2;
  const len = Math.max(doc.width, doc.height);
  if (p === "vignette") {
    return (
      <Rect x={0} y={0} width={doc.width} height={doc.height} listening={false}
        fillRadialGradientStartPoint={{ x: cx, y: cy }} fillRadialGradientEndPoint={{ x: cx, y: cy }}
        fillRadialGradientStartRadius={len * 0.2} fillRadialGradientEndRadius={len * 0.62}
        fillRadialGradientColorStops={[0, "rgba(0,0,0,0)", 1, "rgba(0,0,0,0.35)"]} />
    );
  }
  if (p === "radial_glow") {
    const glow = bg.patternColor ?? "#C9A227";
    return (
      <Rect x={0} y={0} width={doc.width} height={doc.height} listening={false}
        fillRadialGradientStartPoint={{ x: cx, y: cy * 0.85 }} fillRadialGradientEndPoint={{ x: cx, y: cy * 0.85 }}
        fillRadialGradientStartRadius={0} fillRadialGradientEndRadius={len * 0.75}
        fillRadialGradientColorStops={[0, hexToRgba(glow, 0.3), 1, hexToRgba(glow, 0)]} />
    );
  }
  // linen / subtle_damask — צבע ברירת המחדל תלוי-בהירות כבר אפוי באלפא של האריח
  const tile = patternTile(p, bg.patternColor ?? "#C9A227");
  return (
    <Rect x={0} y={0} width={doc.width} height={doc.height} listening={false}
      fillPatternImage={tile as unknown as HTMLImageElement} fillPatternRepeat="repeat" />
  );
}

function Background({ doc }: { doc: TemplateDoc }) {
  const bg = doc.background;
  const [img] = useImage(bg.type === "image" && bg.src ? bg.src : "", "anonymous");
  if (bg.type === "image" && img) {
    return <KImage image={img} x={0} y={0} width={doc.width} height={doc.height} listening={false} />;
  }
  if (bg.type === "gradient" && bg.gradient) {
    const angle = ((bg.gradient.angle ?? 135) * Math.PI) / 180;
    const cx = doc.width / 2, cy = doc.height / 2;
    const len = Math.max(doc.width, doc.height);
    const dx = Math.cos(angle) * len / 2, dy = Math.sin(angle) * len / 2;
    return (
      <>
        <Rect
          x={0} y={0} width={doc.width} height={doc.height}
          fillLinearGradientStartPoint={{ x: cx - dx, y: cy - dy }}
          fillLinearGradientEndPoint={{ x: cx + dx, y: cy + dy }}
          fillLinearGradientColorStops={[0, bg.gradient.from, 1, bg.gradient.to]}
          listening={false}
        />
        <PatternOverlay doc={doc} />
      </>
    );
  }
  return (
    <>
      <Rect x={0} y={0} width={doc.width} height={doc.height} fill={bg.color ?? "#ffffff"} listening={false} />
      <PatternOverlay doc={doc} />
    </>
  );
}

// שכבת טקסט עם autoFit. fontsTick עולה כשפונטי המסמך סיימו להיטען —
// מדידה שרצה לפני כן מדדה פונט חלופי וחייבת לרוץ שוב.
function TextNode({ layer, onSelect, onChange, onEdit, selected, interactive, fontsTick }: {
  layer: TextLayer; onSelect?: () => void; onChange?: (p: Partial<AnyLayer>) => void; onEdit?: () => void; selected: boolean; interactive: boolean; fontsTick: number;
}) {
  const bold = (layer.fontWeight ?? 400) >= 700;
  const fit = useMemo(() => {
    if (layer.autoFit === false) {
      return { fontSize: layer.fontSize, lines: wrapText(layer.text, layer.fontSize, layer.fontFamily, bold, layer.width, layer.letterSpacing ?? 0) };
    }
    return fitText({
      text: layer.text || " ",
      fontFamily: layer.fontFamily,
      bold,
      maxWidth: layer.width,
      maxHeight: layer.height,
      startFontSize: layer.maxFontSize ?? layer.fontSize,
      minFontSize: layer.minFontSize ?? Math.max(12, Math.round(layer.fontSize * 0.4)),
      lineHeight: layer.lineHeight ?? 1.15,
      letterSpacing: layer.letterSpacing ?? 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer.text, layer.fontFamily, layer.fontSize, layer.width, layer.height, layer.maxFontSize, layer.minFontSize, bold, layer.lineHeight, layer.letterSpacing, fontsTick]);

  const fontStyle = bold ? "bold" : "normal";
  return (
    <Text
      id={layer.id}
      text={fit.lines.join("\n")}
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      fontSize={fit.fontSize}
      fontFamily={layer.fontFamily}
      fontStyle={fontStyle}
      fill={layer.fill}
      align={layer.align ?? "center"}
      verticalAlign={layer.verticalAlign ?? "top"}
      lineHeight={layer.lineHeight ?? 1.15}
      letterSpacing={layer.letterSpacing ?? 0}
      sceneFunc={(context, shape) => {
        // kerning=false מבטל זיווג-אותיות (fontKerning) של הדפדפן, בלי לשנות שום היגיון-שכבות אחר —
        // מריץ את ה-sceneFunc המקורי של Konva.Text במלואו (עטיפה, יישור, קווים), רק עם context attr נוסף.
        context.setAttr("fontKerning", layer.kerning === false ? "none" : "normal");
        (KonvaTextShape.prototype as any)._sceneFunc.call(shape, context);
      }}
      opacity={layer.opacity ?? 1}
      globalCompositeOperation={(layer.blend ?? "source-over") as any}
      rotation={layer.rotation ?? 0}
      stroke={layer.stroke}
      strokeWidth={layer.strokeWidth ?? 0}
      shadowColor={layer.shadowColor}
      shadowBlur={layer.shadowBlur}
      shadowOffsetX={layer.shadowOffsetX}
      shadowOffsetY={layer.shadowOffsetY}
      draggable={interactive && !layer.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={onEdit}
      onDblTap={onEdit}
      listening={interactive}
      onDragEnd={(e) => onChange?.({ x: e.target.x(), y: e.target.y() })}
    />
  );
}

function ImageNode({ layer, onSelect, onChange, interactive }: {
  layer: ImageLayer; onSelect?: () => void; onChange?: (p: Partial<AnyLayer>) => void; interactive: boolean;
}) {
  const [img] = useImage(layer.src || "", "anonymous");
  const w = layer.width, h = layer.height ?? layer.width;
  const cx = layer.x + w / 2, cy = layer.y + h / 2;
  if (!layer.src || !img) {
    // placeholder — מסגרת מקווקוות "העלה תמונה"
    return (
      <Group id={layer.id} onClick={onSelect} onTap={onSelect} listening={interactive} opacity={layer.opacity ?? 1} globalCompositeOperation={(layer.blend ?? "source-over") as any}>
        {layer.circle ? (
          <Circle x={cx} y={cy} radius={w / 2} fill="rgba(255,255,255,0.06)" stroke="#C9A227" strokeWidth={2} dash={[10, 8]} />
        ) : (
          <Rect x={layer.x} y={layer.y} width={w} height={h} cornerRadius={layer.cornerRadius ?? 0} fill="rgba(255,255,255,0.06)" stroke="#C9A227" strokeWidth={2} dash={[10, 8]} />
        )}
        <Text x={layer.x} y={cy - 18} width={w} align="center" text={"📷\n" + (layer.label ?? "העלה תמונה")} fontSize={26} fontFamily="Heebo" fill="#C9A227" listening={false} />
      </Group>
    );
  }
  // חישוב cover
  const ar = img.width / img.height;
  const box = layer.circle ? Math.min(w, h) : w;
  const boxH = layer.circle ? Math.min(w, h) : h;
  let dw = box, dh = boxH, dx = layer.x, dy = layer.y;
  if ((layer.fit ?? "cover") === "cover") {
    if (ar > box / boxH) { dh = boxH; dw = boxH * ar; } else { dw = box; dh = box / ar; }
    dx = cx - dw / 2; dy = cy - dh / 2;
  }
  const clipFn = layer.circle
    ? (ctx: any) => { ctx.arc(cx, cy, Math.min(w, h) / 2, 0, Math.PI * 2, false); }
    : undefined;
  return (
    <Group
      id={layer.id}
      onClick={onSelect} onTap={onSelect} listening={interactive}
      draggable={interactive && !layer.locked}
      onDragEnd={(e) => onChange?.({ x: layer.x + e.target.x(), y: layer.y + e.target.y() })}
      clipFunc={layer.circle ? clipFn : undefined}
      clipX={!layer.circle && layer.cornerRadius ? layer.x : undefined}
      opacity={layer.opacity ?? 1}
      globalCompositeOperation={(layer.blend ?? "source-over") as any}
    >
      <KImage image={img} x={dx} y={dy} width={dw} height={dh} cornerRadius={!layer.circle ? layer.cornerRadius : undefined} />
      {layer.circle && <Circle x={cx} y={cy} radius={Math.min(w, h) / 2} stroke="#C9A227" strokeWidth={4} />}
    </Group>
  );
}

function ShapeNode({ layer }: { layer: ShapeLayer }) {
  const common = { id: layer.id, fill: layer.fill, stroke: layer.stroke, strokeWidth: layer.strokeWidth ?? 0, opacity: layer.opacity ?? 1, globalCompositeOperation: (layer.blend ?? "source-over") as any, listening: false };
  if (layer.shape === "rect")
    return <Rect x={layer.x} y={layer.y} width={layer.width} height={layer.height ?? layer.width} cornerRadius={layer.cornerRadius ?? 0} dash={layer.dash} {...common} />;
  if (layer.shape === "circle")
    return <Circle x={layer.x + layer.width / 2} y={layer.y + layer.width / 2} radius={layer.width / 2} {...common} />;
  if (layer.shape === "line")
    return <Line points={layer.points ?? [layer.x, layer.y, layer.x + layer.width, layer.y]} {...common} />;
  return null;
}

function DecorationNode({ layer }: { layer: DecorationLayer }) {
  const { kind, x, y, width, height = width, fill, strokeWidth = 2 } = layer;

  // מסגרות — מרובעות מקיפות
  if (kind === "frame_double" || kind === "frame_ornate" || kind === "frame_mourning") {
    const thick = kind === "frame_mourning" ? 18 : strokeWidth;
    return (
      <Group id={layer.id} listening={false} opacity={layer.opacity ?? 1} globalCompositeOperation={(layer.blend ?? "source-over") as any}>
        <Rect x={x} y={y} width={width} height={height} stroke={fill} strokeWidth={thick} />
        {(kind === "frame_double" || kind === "frame_ornate") && (
          <Rect x={x + 12} y={y + 12} width={width - 24} height={height - 24} stroke={fill} strokeWidth={Math.max(1, strokeWidth - 1)} />
        )}
        {kind === "frame_ornate" && (
          <Rect x={x + 22} y={y + 22} width={width - 44} height={height - 44} stroke={fill} strokeWidth={1} opacity={0.6} />
        )}
      </Group>
    );
  }

  // עיטור פינה
  if (kind === "corner_ornament") {
    const sc = width / 42;
    return (
      <Group id={layer.id} x={x} y={y} rotation={layer.rotation ?? 0} listening={false} opacity={layer.opacity ?? 1} globalCompositeOperation={(layer.blend ?? "source-over") as any}>
        <Path data={CORNER_ORNAMENT_PATH} scaleX={sc} scaleY={sc} stroke={fill} strokeWidth={2} fill={fill} />
      </Group>
    );
  }

  const def = ORNAMENTS[kind];
  if (!def) return null;
  const sc = width / def.viewBox;
  const scY = height / def.viewBox;
  return (
    <Group id={layer.id} x={x} y={y} rotation={layer.rotation ?? 0} listening={false} opacity={layer.opacity ?? 1} globalCompositeOperation={(layer.blend ?? "source-over") as any}>
      {def.paths.map((p, i) => (
        <Path key={i} data={p.d} scaleX={sc} scaleY={scY}
          fill={p.strokeOnly ? undefined : fill}
          stroke={p.strokeOnly ? fill : undefined}
          strokeWidth={p.strokeOnly ? 3 : 0}
          fillRule={p.fillRule} />
      ))}
    </Group>
  );
}

export default function CanvasStage({ doc, selectedId, onSelect, onChangeLayer, onEditText, maxDisplayWidth = 520, stageRef, interactive = true }: Props) {
  const localRef = useRef<Konva.Stage | null>(null);
  const setRef = (n: Konva.Stage | null) => { localRef.current = n; if (stageRef) stageRef.current = n; };
  const scale = Math.min(1, maxDisplayWidth / doc.width);
  const [fontsTick, setFontsTick] = useState(0);

  // ctx.font של קנבס לא מתחיל טעינת @font-face מעצמו — משפחה שמופיעה רק על
  // הבמה (ולא בשום מקום ב-DOM) לא הייתה נטענת לעולם, והטקסט נשאר בפונט חלופי
  // בעורך, בגלריות ובכל ייצוא. טוענים במפורש את המשפחות שהמסמך משתמש בהן
  // (ההאזנה הישנה ל-fonts.ready לא עזרה כאן: טעינה שמעולם לא התחילה גם לא
  // מסתיימת), ועם סיום הטעינה מודדים מחדש — fontsTick נמצא בתלויות המדידה
  // של TextNode, כי שבירת-שורות שנמדדה עם הפונט החלופי היא חלק מהבאג.
  const fontFamiliesKey = collectDocFontFamilies(doc.layers).join("|");
  useEffect(() => {
    let live = true;
    ensureFontsLoaded(fontFamiliesKey.split("|")).then(() => {
      if (live) setFontsTick((n) => n + 1);
    });
    return () => { live = false; };
  }, [fontFamiliesKey]);

  // גם כשהמדידה יצאה זהה, הגליפים שצוירו לפני הטעינה נשארים על הקנבס עד
  // ציור-מחדש מפורש (props זהים = react-konva לא בהכרח מצייר).
  useEffect(() => {
    if (fontsTick > 0) localRef.current?.batchDraw();
  }, [fontsTick]);

  const sorted = [...doc.layers].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));

  return (
    <Stage
      ref={setRef as any}
      width={doc.width * scale}
      height={doc.height * scale}
      scaleX={scale}
      scaleY={scale}
      onMouseDown={(e) => { if (e.target === e.target.getStage()) onSelect?.(null); }}
      style={{ background: "#fff", borderRadius: 8, boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}
    >
      <Layer>
        <Background doc={doc} />
        {sorted.map((l) => {
          if (l.visible === false) return null;
          if (l.type === "text") return <TextNode key={l.id} layer={l as TextLayer} selected={selectedId === l.id} interactive={interactive} fontsTick={fontsTick} onSelect={() => onSelect?.(l.id)} onChange={(p) => onChangeLayer?.(l.id, p)} onEdit={() => onEditText?.(l.id)} />;
          if (l.type === "image") return <ImageNode key={l.id} layer={l as ImageLayer} interactive={interactive} onSelect={() => onSelect?.(l.id)} onChange={(p) => onChangeLayer?.(l.id, p)} />;
          if (l.type === "shape") return <ShapeNode key={l.id} layer={l as ShapeLayer} />;
          if (l.type === "decoration") return <DecorationNode key={l.id} layer={l as DecorationLayer} />;
          return null;
        })}
        {/* מסגרת בחירה */}
        {interactive && selectedId && (() => {
          const l = doc.layers.find((x) => x.id === selectedId);
          if (!l) return null;
          return <Rect x={l.x - 4} y={l.y - 4} width={l.width + 8} height={(l.height ?? l.width) + 8} stroke="#3b82f6" strokeWidth={2 / scale} dash={[6, 4]} listening={false} />;
        })()}
      </Layer>
    </Stage>
  );
}
