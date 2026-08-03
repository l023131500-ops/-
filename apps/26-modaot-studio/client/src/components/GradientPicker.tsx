// ═══════════════════════════════════════════════════════════════════════════
// בורר גרדיאנט + צבע מלא — לרקעי המודעה. מבוסס react-best-gradient-color-picker.
// כולל טפטפת, שקיפות, גרדיאנטים לינאריים/רדיאליים, ודגימות.
// ═══════════════════════════════════════════════════════════════════════════
import ColorPickerLib from "react-best-gradient-color-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface GradientPickerProps {
  value: string;                       // "linear-gradient(...)" או צבע מלא
  onChange: (value: string) => void;
  label?: string;
}

export default function GradientPicker({ value, onChange, label }: GradientPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center gap-2 rounded-md border border-[#C9A227]/30 bg-[#0B1220] px-2 text-xs text-[#F5EEDD]"
          data-testid="button-open-gradient"
          title={label || "בחר רקע"}
        >
          <span
            className="inline-block h-5 w-8 rounded border border-white/20"
            style={{ background: value || "#0B1220" }}
          />
          <span className="truncate text-[11px]">{label || "רקע"}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent dir="ltr" align="end" className="w-auto border-[#C9A227]/30 bg-[#0E1830] p-3">
        {label && (
          <p dir="rtl" className="mb-2 text-right text-xs font-semibold text-[#F5EEDD]">
            {label}
          </p>
        )}
        <ColorPickerLib
          value={value || "rgba(11,18,32,1)"}
          onChange={onChange}
          width={244}
          height={150}
        />
      </PopoverContent>
    </Popover>
  );
}
