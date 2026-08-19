// ═══════════════════════════════════════════════════════════════════════════
// בקרת פונט מלאה — בחירת פונט מכל המשפחות (מקובצות לפי סוג) + עובי חופשי.
// פונט משתנה (variable) → סליידר עובי רציף 100–900. אחרת → כפתורי עובי זמינים.
// כל אפשרות מוצגת בתצוגה מקדימה של הפונט עצמו.
// ═══════════════════════════════════════════════════════════════════════════
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FONTS, FONT_CATEGORIES, getFont } from "@shared/styles";

interface FontControlProps {
  fontFamily: string;
  fontWeight: number;
  onChange: (patch: { fontFamily?: string; fontWeight?: number }) => void;
}

const WEIGHT_LABEL: Record<number, string> = {
  100: "דק מאוד",
  200: "דק",
  300: "קל",
  400: "רגיל",
  500: "בינוני",
  600: "חצי-מודגש",
  700: "מודגש",
  800: "כבד",
  900: "שחור",
};

export default function FontControl({ fontFamily, fontWeight, onChange }: FontControlProps) {
  const font = getFont(fontFamily) ?? FONTS[0];
  const isVariable = !!font.variable;
  const minW = font.minWeight ?? Math.min(...font.weights);
  const maxW = font.maxWeight ?? Math.max(...font.weights);
  const currentW = fontWeight ?? 400;

  function handleFontChange(key: string) {
    const next = getFont(key);
    if (!next) return;
    // מוודא שהעובי הנוכחי נתמך בפונט החדש
    let w = currentW;
    if (next.variable) {
      w = Math.min(Math.max(currentW, next.minWeight ?? 100), next.maxWeight ?? 900);
    } else if (!next.weights.includes(currentW)) {
      // בוחר את העובי הקרוב ביותר
      w = next.weights.reduce((p, c) => (Math.abs(c - currentW) < Math.abs(p - currentW) ? c : p), next.weights[0]);
    }
    onChange({ fontFamily: key, fontWeight: w });
  }

  return (
    <div className="space-y-3">
      {/* בחירת פונט — מקובץ לפי סוג, עם תצוגה מקדימה */}
      <div>
        <Label className="mb-1 block text-xs text-[#F5EEDD]/70">פונט</Label>
        <Select value={fontFamily} onValueChange={handleFontChange}>
          <SelectTrigger className="border-[#C9A227]/20 bg-[#0B1220] text-xs" data-testid="select-font">
            <SelectValue>
              <span style={{ fontFamily }}>{font.label}</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {FONT_CATEGORIES.map((cat) => {
              const list = FONTS.filter((f) => f.category === cat.key);
              if (!list.length) return null;
              return (
                <SelectGroup key={cat.key}>
                  <SelectLabel className="text-[10px] text-[#C9A227]">{cat.label}</SelectLabel>
                  {list.map((f) => (
                    <SelectItem key={f.key} value={f.key}>
                      <span style={{ fontFamily: f.key }} className="text-sm">
                        {f.label} · אבגד
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* עובי */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <Label className="text-xs text-[#F5EEDD]/70">עובי</Label>
          <span className="text-[11px] text-[#C9A227]">
            {currentW} · {WEIGHT_LABEL[Math.round(currentW / 100) * 100] ?? ""}
          </span>
        </div>
        {isVariable ? (
          // פונט משתנה → סליידר עובי רציף חופשי
          <Slider
            value={[currentW]}
            min={minW}
            max={maxW}
            step={10}
            onValueChange={([v]) => onChange({ fontWeight: v })}
            data-testid="slider-weight"
          />
        ) : (
          // פונט קבוע → כפתורי העובי הזמינים בלבד
          <div className="flex flex-wrap gap-1.5">
            {font.weights.map((w) => (
              <Button
                key={w}
                size="sm"
                variant={currentW === w ? "default" : "outline"}
                className={
                  currentW === w
                    ? "flex-1 bg-[#C9A227] text-[#0B1220]"
                    : "flex-1 border-[#C9A227]/30 text-[#F5EEDD]/70"
                }
                onClick={() => onChange({ fontWeight: w })}
                data-testid={`button-weight-${w}`}
              >
                {w}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
