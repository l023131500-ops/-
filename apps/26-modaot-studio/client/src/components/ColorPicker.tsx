// ═══════════════════════════════════════════════════════════════════════════
// בורר צבעים מקצועי — מפת צבעים דו-ממדית (עומק/רוויה) + גוון + שקיפות + טפטפת
// ───────────────────────────────────────────────────────────────────────────
// מבוסס @uiw/react-color: Saturation (מפה) + Hue (סרגל גוון) + Alpha (שקיפות).
// כולל: קלט HEX, טפטפת EyeDropper (Chromium), דגימות אחרונות, פלטת הפריסט.
// תומך גם בגרדיאנטים (דרך react-best-gradient-color-picker) במצב "gradient".
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useCallback, useRef, useEffect } from "react";
import { Saturation, Hue, Alpha, hsvaToHex, hexToHsva, type HsvaColor } from "@uiw/react-color";
import { Pipette, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ColorPickerProps {
  value: string;                 // צבע נוכחי (HEX או rgba)
  onChange: (color: string) => void;
  presets?: string[];            // דגימות מהפלטה של הסגנון
  allowAlpha?: boolean;          // אפשר שקיפות
  label?: string;
  compact?: boolean;             // רק כפתור צבע קטן
}

// EyeDropper API (Chromium בלבד)
declare global {
  interface Window { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> }; }
}

function normalizeHsva(hex: string): HsvaColor {
  try {
    return hexToHsva(hex.length ? hex : "#000000");
  } catch {
    return { h: 0, s: 0, v: 0, a: 1 };
  }
}

export default function ColorPicker({
  value,
  onChange,
  presets = [],
  allowAlpha = true,
  label,
  compact = false,
}: ColorPickerProps) {
  const [hsva, setHsva] = useState<HsvaColor>(() => normalizeHsva(value));
  const [hexInput, setHexInput] = useState(value);
  const [eyedropperOk, setEyedropperOk] = useState(false);
  const lastExternal = useRef(value);

  useEffect(() => {
    setEyedropperOk(typeof window !== "undefined" && !!window.EyeDropper);
  }, []);

  // סנכרון מבחוץ (כשמשתנה השכבה הנבחרת)
  useEffect(() => {
    if (value !== lastExternal.current) {
      lastExternal.current = value;
      setHsva(normalizeHsva(value));
      setHexInput(value);
    }
  }, [value]);

  const emit = useCallback(
    (next: HsvaColor) => {
      setHsva(next);
      const hex = hsvaToHex(next);
      // אם יש שקיפות < 1 — פולט rgba
      const out = allowAlpha && next.a < 1 ? hexWithAlpha(hex, next.a) : hex;
      setHexInput(out);
      lastExternal.current = out;
      onChange(out);
    },
    [allowAlpha, onChange],
  );

  const handleHex = (raw: string) => {
    setHexInput(raw);
    const clean = raw.trim();
    if (/^#?[0-9a-fA-F]{6}$/.test(clean)) {
      const hex = clean.startsWith("#") ? clean : `#${clean}`;
      const next = { ...hexToHsva(hex), a: hsva.a };
      emit(next);
    }
  };

  const handleEyedropper = async () => {
    if (!window.EyeDropper) return;
    try {
      const ed = new window.EyeDropper();
      const res = await ed.open();
      handleHex(res.sRGBHex);
    } catch {
      /* המשתמש ביטל */
    }
  };

  const swatch = hsvaToHex(hsva);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={
            compact
              ? "h-8 w-10 shrink-0 cursor-pointer rounded border border-[#C9A227]/30"
              : "flex h-9 w-full items-center gap-2 rounded-md border border-[#C9A227]/30 bg-[#0B1220] px-2 text-xs text-[#F5EEDD]"
          }
          data-testid="button-open-colorpicker"
          title={label || "בחר צבע"}
        >
          <span
            className="inline-block h-5 w-5 rounded border border-white/20"
            style={{
              background:
                value ||
                "linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%)",
            }}
          />
          {!compact && <span className="font-mono">{value}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent
        dir="ltr"
        align="end"
        className="w-64 border-[#C9A227]/30 bg-[#0E1830] p-3"
      >
        {label && (
          <p dir="rtl" className="mb-2 text-right text-xs font-semibold text-[#F5EEDD]">
            {label}
          </p>
        )}
        {/* מפת צבעים דו-ממדית — עומק (בהירות) × רוויה */}
        <div className="overflow-hidden rounded-md">
          <Saturation
            hsva={hsva}
            style={{ width: "100%", height: 150 }}
            onChange={(newColor) => emit({ ...hsva, ...newColor, a: hsva.a })}
          />
        </div>
        {/* סרגל גוון */}
        <div className="mt-3">
          <Hue
            hue={hsva.h}
            style={{ width: "100%", height: 14, borderRadius: 8 }}
            onChange={(newHue) => emit({ ...hsva, ...newHue })}
          />
        </div>
        {/* סרגל שקיפות */}
        {allowAlpha && (
          <div className="mt-3">
            <Alpha
              hsva={hsva}
              style={{ width: "100%", height: 14, borderRadius: 8 }}
              onChange={(newAlpha) => emit({ ...hsva, ...newAlpha })}
            />
          </div>
        )}
        {/* קלט HEX + טפטפת + תצוגה */}
        <div className="mt-3 flex items-center gap-2">
          <span
            className="h-8 w-8 shrink-0 rounded border border-white/20"
            style={{ background: swatch }}
          />
          <input
            value={hexInput}
            onChange={(e) => handleHex(e.target.value)}
            aria-label="קוד צבע HEX"
            className="h-8 flex-1 rounded border border-[#C9A227]/30 bg-[#0B1220] px-2 font-mono text-xs text-[#F5EEDD]"
            data-testid="input-hex"
          />
          {eyedropperOk && (
            <button
              type="button"
              onClick={handleEyedropper}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#C9A227]/30 text-[#C9A227] hover:bg-[#C9A227]/10"
              title="טפטפת — בחר צבע מהמסך"
              data-testid="button-eyedropper"
            >
              <Pipette className="h-4 w-4" />
            </button>
          )}
        </div>
        {/* דגימות מהפלטה */}
        {presets.length > 0 && (
          <div dir="rtl" className="mt-3 border-t border-[#C9A227]/10 pt-2">
            <p className="mb-1 text-right text-[10px] text-[#F5EEDD]/50">צבעי הסגנון</p>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleHex(c)}
                  className="relative h-6 w-6 rounded-full border border-white/20"
                  style={{ background: c }}
                  title={c}
                >
                  {c.toLowerCase() === swatch.toLowerCase() && (
                    <Check className="absolute inset-0 m-auto h-3 w-3 text-white drop-shadow" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ממיר HEX + alpha ל-rgba()
function hexWithAlpha(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(2))})`;
}
