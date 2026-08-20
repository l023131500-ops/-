import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function TagsInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  function add() {
    const v = draft.trim();
    if (!v) return;
    if (value.includes(v)) { setDraft(""); return; }
    onChange([...value, v]);
    setDraft("");
  }
  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {value.map((t) => (
          <Badge key={t} variant="secondary" className="gap-1">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`הסר תגית ${t}`} className="hover:opacity-70">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={add}
        placeholder="הוסף תגית ולחץ Enter"
      />
    </div>
  );
}
