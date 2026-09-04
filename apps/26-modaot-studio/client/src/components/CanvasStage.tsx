// מנוע הרינדור החי — הופך TemplateDoc ל-canvas אינטראקטיבי עם react-konva.
// כל שכבה מרונדרת לפי סוגה. טקסט עם autoFit מקטין את הפונט כדי להיכנס לתיבה.
// ה-Stage מוקטן לתצוגה (scale), אך מיוצא ברזולוציה מלאה (pixelRatio).

import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Rect, Text, Group, Path, Image as KImage, Circle, Line } from "react-konva";
import useImage from "use-image";
import type Konva from "konva";
import { Text as KonvaTextShape } from "konva/lib/shapes/Text";
import type { TemplateDoc, AnyLayer, TextLayer, ImageLayer, ShapeLayer, DecorationLayer, TemplateBackground } from "@shared/layers";
import { fitText, wrapText } from "@/lib/autofit";
import { ORNAMENTS, CORNER_ORNAMENT_PATH } from "@/lib/ornaments";

interface Props {
  doc: TemplateDoc;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onChangeLayer?: (id: string, patch: Partial<AnyLayer>) => void;
  onChangeBackground?: (patch: Partial<TemplateBackground>) => void; // גרירת תמונת הרקע עצמה
  onEditText?: (id: string) => void; // דאבל-קליק על שכבת טקסט — עריכה inline
  maxDisplayWidth?: number;
  stageRef?: React.MutableRefObject<Konva.Stage | null>;
  interactive?: boolean;
  editingId?: string | null; // שכבת טקסט שנמצאת כרגע בעריכה inline על הקנבס — מוסתרת כאן, ה-textarea של Editor.tsx מציגה אותה במקומה
}

// רקע: solid / gradient / pattern / image
function Background({ doc, interactive, onSelect, onChangeBackground }: {
  doc: TemplateDoc; interactive?: boolean; onSelect?: () => void; onChangeBackground?: (patch: Partial<TemplateBackground>) => void;
}) {
  const bg = doc.background;
  const [img] = useImage(bg.type === "image" && bg.src ? bg.src : "", "anonymous");
  if (bg.type === "image" && img) {
    // offsetX/offsetY נגררים ע"י המשתמש; לא מוגדר = 0,0, זהה בדיוק להתנהגות הקודמת (רקע קבוע ב-0,0)
    return (
      <KImage
        image={img}
        x={bg.offsetX ?? 0}
        y={bg.offsetY ?? 0}
        width={doc.width}
        height={doc.height}
        listening={!!interactive}
        draggable={!!interactive}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => onChangeBackground?.({ offsetX: e.target.x(), offsetY: e.target.y() })}
      />
    );
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
        {bg.pattern === "vignette" && (
          <Rect x={0} y={0} width={doc.width} height={doc.height} listening={false}
            fillRadialGradientStartPoint={{ x: cx, y: cy }} fillRadialGradientEndPoint={{ x: cx, y: cy }}
            fillRadialGradientStartRadius={len * 0.2} fillRadialGradientEndRadius={len * 0.62}
            fillRadialGradientColorStops={[0, "rgba(0,0,0,0)", 1, "rgba(0,0,0,0.35)"]} />
        )}
      </>
    );
  }
  return <Rect x={0} y={0} width={doc.width} height={doc.height} fill={bg.color ?? "#ffffff"} listening={false} />;
}

// שכבת טקסט עם autoFit
function TextNode({ layer, onSelect, onChange, onEdit, selected, interactive }: {
  layer: TextLayer; onSelect?: () => void; onChange?: (p: Partial<AnyLayer>) => void; onEdit?: () => void; selected: boolean; interactive: boolean;
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
  }, [layer.text, layer.fontFamily, layer.fontSize, layer.width, layer.height, layer.maxFontSize, layer.minFontSize, bold, layer.lineHeight, layer.letterSpacing]);

  const italic = !!layer.fontStyle?.includes("italic");
  const fontStyle = bold && italic ? "italic bold" : bold ? "bold" : italic ? "italic" : "normal";
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
      <Group onClick={onSelect} onTap={onSelect} listening={interactive} opacity={layer.opacity ?? 1} globalCompositeOperation={(layer.blend ?? "source-over") as any}>
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
  const common = { fill: layer.fill, stroke: layer.stroke, strokeWidth: layer.strokeWidth ?? 0, opacity: layer.opacity ?? 1, globalCompositeOperation: (layer.blend ?? "source-over") as any, listening: false };
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
      <Group listening={false} opacity={layer.opacity ?? 1} globalCompositeOperation={(layer.blend ?? "source-over") as any}>
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
      <Group x={x} y={y} rotation={layer.rotation ?? 0} listening={false} opacity={layer.opacity ?? 1} globalCompositeOperation={(layer.blend ?? "source-over") as any}>
        <Path data={CORNER_ORNAMENT_PATH} scaleX={sc} scaleY={sc} stroke={fill} strokeWidth={2} fill={fill} />
      </Group>
    );
  }

  const def = ORNAMENTS[kind];
  if (!def) return null;
  const sc = width / def.viewBox;
  const scY = height / def.viewBox;
  return (
    <Group x={x} y={y} rotation={layer.rotation ?? 0} listening={false} opacity={layer.opacity ?? 1} globalCompositeOperation={(layer.blend ?? "source-over") as any}>
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

export default function CanvasStage({ doc, selectedId, onSelect, onChangeLayer, onChangeBackground, onEditText, maxDisplayWidth = 520, stageRef, interactive = true, editingId = null }: Props) {
  const localRef = useRef<Konva.Stage | null>(null);
  const setRef = (n: Konva.Stage | null) => { localRef.current = n; if (stageRef) stageRef.current = n; };
  const scale = Math.min(1, maxDisplayWidth / doc.width);
  const [, force] = useState(0);

  // רה-רינדור לאחר טעינת פונטים
  useEffect(() => {
    if ((document as any).fonts?.ready) (document as any).fonts.ready.then(() => force((n) => n + 1));
  }, []);

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
        <Background doc={doc} interactive={interactive} onSelect={() => onSelect?.(null)} onChangeBackground={onChangeBackground} />
        {sorted.map((l) => {
          if (l.visible === false) return null;
          if (l.id === editingId) return null; // שכבה בעריכה inline — ה-textarea השקופה של Editor.tsx מציגה אותה במקום ה-Text של Konva
          if (l.type === "text") return <TextNode key={l.id} layer={l as TextLayer} selected={selectedId === l.id} interactive={interactive} onSelect={() => onSelect?.(l.id)} onChange={(p) => onChangeLayer?.(l.id, p)} onEdit={() => onEditText?.(l.id)} />;
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
