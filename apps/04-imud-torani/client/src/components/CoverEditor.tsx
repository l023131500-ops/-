// עורך שער גרפי (גרפו-לייק) — שכבות טקסט מעל רקע הכריכה,
// ניתנות לגרירה / עריכה / מחיקה, עם ייצוא ל-PDF.
// עצמאי לחלוטין — Konva + jsPDF בצד הלקוח, ללא חיבורי API נוספים.
import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Rect, Text as KText, Transformer } from "react-konva";
import type Konva from "konva";
import { jsPDF } from "jspdf";
import { Plus, Trash2, Copy, Type, Download, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

// ── טיפוסי שכבה ──
export interface CoverTextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  fontFamily: string;
  fontSize: number;
  fontStyle: "normal" | "bold";
  fill: string;
  align: "right" | "center" | "left";
  z: number;
}

// גודל השער — יחס 3:4 (A-ish). ברזולוציה גבוהה לייצוא.
const COVER_W = 600;
const COVER_H = 800;

const FONT_OPTIONS = [
  "Frank Ruhl Libre",
  "David Libre",
  "Noto Serif Hebrew",
  "Suez One",
  "Assistant",
  "Heebo",
  "Rubik",
  "Alef",
  "Miriam Libre",
  "Bellefair",
];

let _c = 0;
const newId = () => `cov_${Date.now().toString(36)}_${(_c++).toString(36)}`;

function defaultLayers(title: string, author: string): CoverTextLayer[] {
  return [
    {
      id: newId(), text: title || "כותרת הספר", x: 60, y: 220, width: COVER_W - 120,
      fontFamily: "Frank Ruhl Libre", fontSize: 56, fontStyle: "bold", fill: "#ffffff",
      align: "center", z: 1,
    },
    {
      id: newId(), text: author || "שם המחבר", x: 60, y: 560, width: COVER_W - 120,
      fontFamily: "Frank Ruhl Libre", fontSize: 30, fontStyle: "normal", fill: "#ffffff",
      align: "center", z: 2,
    },
  ];
}

// ── צומת טקסט בודד ──
function TextNode({
  layer, selected, onSelect, onChange, onDblClick,
}: {
  layer: CoverTextLayer;
  selected: boolean;
  onSelect: () => void;
  onChange: (p: Partial<CoverTextLayer>) => void;
  onDblClick: () => void;
}) {
  return (
    <KText
      text={layer.text}
      x={layer.x}
      y={layer.y}
      width={layer.width}
      fontSize={layer.fontSize}
      fontFamily={layer.fontFamily}
      fontStyle={layer.fontStyle}
      fill={layer.fill}
      align={layer.align}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={onDblClick}
      onDblTap={onDblClick}
      name={selected ? "selected-node" : undefined}
      onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() })}
      onTransformEnd={(e) => {
        const node = e.target as Konva.Text;
        const scaleX = node.scaleX();
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          x: node.x(),
          y: node.y(),
          width: Math.max(40, node.width() * scaleX),
          fontSize: Math.max(8, Math.round(layer.fontSize * scaleX)),
        });
      }}
    />
  );
}

export default function CoverEditor({
  title, author, coverColor,
}: {
  title: string;
  author: string;
  coverColor: string;
}) {
  const [layers, setLayers] = useState<CoverTextLayer[]>(() => defaultLayers(title, author));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [display, setDisplay] = useState(360);
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);

  const scale = display / COVER_W;
  const selected = useMemo(() => layers.find((l) => l.id === selectedId) || null, [layers, selectedId]);

  // חיבור ה-Transformer לצומת הנבחר
  useEffect(() => {
    const tr = trRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;
    if (!selectedId) { tr.nodes([]); tr.getLayer()?.batchDraw(); return; }
    const node = stage.findOne(".selected-node");
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selectedId, layers]);

  function patch(id: string, p: Partial<CoverTextLayer>) {
    setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, ...p } : l)));
  }
  function maxZ() { return layers.reduce((m, l) => Math.max(m, l.z), 0); }

  function addLayer() {
    const l: CoverTextLayer = {
      id: newId(), text: "טקסט חדש", x: 80, y: 380, width: COVER_W - 160,
      fontFamily: "Frank Ruhl Libre", fontSize: 34, fontStyle: "normal",
      fill: "#ffffff", align: "center", z: maxZ() + 1,
    };
    setLayers((ls) => [...ls, l]);
    setSelectedId(l.id);
  }
  function deleteLayer(id: string) {
    setLayers((ls) => ls.filter((l) => l.id !== id));
    if (selectedId === id) setSelectedId(null);
  }
  function duplicateLayer(id: string) {
    const src = layers.find((l) => l.id === id);
    if (!src) return;
    const copy = { ...src, id: newId(), x: src.x + 16, y: src.y + 16, z: maxZ() + 1 };
    setLayers((ls) => [...ls, copy]);
    setSelectedId(copy.id);
  }
  function moveZ(id: string, dir: 1 | -1) {
    setLayers((ls) => {
      const sorted = [...ls].sort((a, b) => a.z - b.z);
      const idx = sorted.findIndex((l) => l.id === id);
      const swap = idx + dir;
      if (swap < 0 || swap >= sorted.length) return ls;
      const zi = sorted[idx].z; sorted[idx].z = sorted[swap].z; sorted[swap].z = zi;
      return [...sorted];
    });
  }

  function startInlineEdit(id: string) {
    setSelectedId(id);
    setTimeout(() => { editRef.current?.focus(); editRef.current?.select(); }, 60);
  }

  function exportPDF() {
    const stage = stageRef.current;
    if (!stage) return;
    setSelectedId(null); // הסתר transformer בייצוא
    setTimeout(() => {
      const url = stage.toDataURL({ pixelRatio: COVER_W / display * 2, mimeType: "image/png" });
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [COVER_W, COVER_H] });
      pdf.addImage(url, "PNG", 0, 0, COVER_W, COVER_H);
      pdf.save("shaar.pdf");
    }, 80);
  }

  const ordered = [...layers].sort((a, b) => a.z - b.z);
  const orderedDesc = [...layers].sort((a, b) => b.z - a.z);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={addLayer} data-testid="button-add-cover-layer">
          <Plus className="ml-1 h-4 w-4" /> הוסף טקסט
        </Button>
        <Button size="sm" variant="outline" onClick={exportPDF} data-testid="button-export-cover-pdf">
          <Download className="ml-1 h-4 w-4" /> ייצוא PDF
        </Button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>תצוגה</span>
          <div className="w-24">
            <Slider value={[display]} min={260} max={480} step={20} onValueChange={([v]) => setDisplay(v)} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        {/* בד העריכה */}
        <div className="rounded-md border border-border bg-muted/30 p-2" data-testid="cover-canvas">
          <Stage
            ref={stageRef}
            width={COVER_W * scale}
            height={COVER_H * scale}
            scaleX={scale}
            scaleY={scale}
            onMouseDown={(e) => { if (e.target === e.target.getStage()) setSelectedId(null); }}
            onTouchStart={(e) => { if (e.target === e.target.getStage()) setSelectedId(null); }}
          >
            <Layer>
              <Rect x={0} y={0} width={COVER_W} height={COVER_H} fill={coverColor} />
              {ordered.map((l) => (
                <TextNode
                  key={l.id}
                  layer={l}
                  selected={selectedId === l.id}
                  onSelect={() => setSelectedId(l.id)}
                  onChange={(p) => patch(l.id, p)}
                  onDblClick={() => startInlineEdit(l.id)}
                />
              ))}
              <Transformer
                ref={trRef}
                rotateEnabled={false}
                enabledAnchors={["middle-left", "middle-right"]}
                boundBoxFunc={(_o, n) => n}
              />
            </Layer>
          </Stage>
        </div>

        {/* פאנל שכבות + מאפיינים */}
        <div className="min-w-[240px] flex-1 space-y-3">
          <div>
            <h4 className="mb-2 border-b border-border pb-1 text-xs font-bold text-primary">שכבות</h4>
            <div className="space-y-1">
              {orderedDesc.map((l) => (
                <div
                  key={l.id}
                  onClick={() => setSelectedId(l.id)}
                  className={`flex items-center gap-1 rounded border px-2 py-1 text-xs cursor-pointer ${selectedId === l.id ? "border-primary bg-primary/10" : "border-border"}`}
                  data-testid={`layer-row-${l.id}`}
                >
                  <Type className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{l.text || "(ריק)"}</span>
                  <button title="העלה" onClick={(e) => { e.stopPropagation(); moveZ(l.id, 1); }} className="rounded p-0.5 hover:bg-muted"><ArrowUp className="h-3 w-3" /></button>
                  <button title="הורד" onClick={(e) => { e.stopPropagation(); moveZ(l.id, -1); }} className="rounded p-0.5 hover:bg-muted"><ArrowDown className="h-3 w-3" /></button>
                  <button title="שכפל" onClick={(e) => { e.stopPropagation(); duplicateLayer(l.id); }} className="rounded p-0.5 hover:bg-muted"><Copy className="h-3 w-3" /></button>
                  <button title="מחק" onClick={(e) => { e.stopPropagation(); deleteLayer(l.id); }} className="rounded p-0.5 text-red-500 hover:bg-red-500/15" data-testid={`button-delete-cover-layer-${l.id}`}><Trash2 className="h-3 w-3" /></button>
                </div>
              ))}
              {layers.length === 0 && <p className="text-xs text-muted-foreground">אין שכבות — הוסף טקסט.</p>}
            </div>
          </div>

          {/* מאפייני השכבה הנבחרת */}
          {selected && (
            <div className="space-y-3 rounded-md border border-border p-3">
              <div>
                <Label className="mb-1 block text-xs font-semibold">טקסט</Label>
                <textarea
                  ref={editRef}
                  value={selected.text}
                  onChange={(e) => patch(selected.id, { text: e.target.value })}
                  rows={2}
                  className="w-full resize-none rounded border border-border bg-background p-2 text-sm"
                  data-testid="input-cover-layer-text"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="mb-1 block text-xs font-semibold">גופן</Label>
                  <select
                    value={selected.fontFamily}
                    onChange={(e) => patch(selected.id, { fontFamily: e.target.value })}
                    className="w-full rounded border border-border bg-background p-1.5 text-sm"
                    data-testid="select-cover-font"
                  >
                    {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="mb-1 block text-xs font-semibold">צבע</Label>
                  <input
                    type="color"
                    value={selected.fill}
                    onChange={(e) => patch(selected.id, { fill: e.target.value })}
                    className="h-9 w-full cursor-pointer rounded border border-border"
                    data-testid="input-cover-color"
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs font-semibold">
                  <span>גודל</span><span className="text-muted-foreground">{selected.fontSize}</span>
                </div>
                <Slider value={[selected.fontSize]} min={12} max={120} step={1}
                  onValueChange={([v]) => patch(selected.id, { fontSize: v })} data-testid="slider-cover-size" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant={selected.fontStyle === "bold" ? "default" : "outline"}
                  onClick={() => patch(selected.id, { fontStyle: selected.fontStyle === "bold" ? "normal" : "bold" })}
                  data-testid="button-cover-bold">מודגש</Button>
                {(["right", "center", "left"] as const).map((a) => (
                  <Button key={a} size="sm" variant={selected.align === a ? "default" : "outline"}
                    onClick={() => patch(selected.id, { align: a })} data-testid={`button-cover-align-${a}`}>
                    {a === "right" ? "ימין" : a === "center" ? "מרכז" : "שמאל"}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        גררו שכבות במיקום הרצוי, לחצו פעמיים לעריכת טקסט, ומחקו לפני ייצוא ל-PDF.
      </p>
    </div>
  );
}
