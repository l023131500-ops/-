import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ALLOWED_CLIENT_FIELDS, ALLOWED_FIELD_KEYS, type AllowedField } from "../constants";

export function AllowedFieldsChecklist({
  value,
  onChange,
}: {
  value: AllowedField[];
  onChange: (next: AllowedField[]) => void;
}) {
  const toggle = (k: AllowedField, checked: boolean) => {
    if (checked) onChange(Array.from(new Set([...value, k])));
    else onChange(value.filter((v) => v !== k));
  };
  return (
    <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
      {ALLOWED_FIELD_KEYS.map((k) => (
        <label key={k} className="flex items-center gap-2 cursor-pointer text-sm">
          <Checkbox checked={value.includes(k)} onCheckedChange={(c) => toggle(k, c === true)} />
          <span>{ALLOWED_CLIENT_FIELDS[k]}</span>
        </label>
      ))}
    </div>
  );
}

export function AllowedFieldsPreview({ value }: { value: AllowedField[] }) {
  if (value.length === 0) return <p className="text-sm text-muted-foreground">לא הוגדרו שדות לחשיפה לשותף.</p>;
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="text-xs font-medium text-muted-foreground mb-2">השותף יקבל גישה ל:</div>
      <ul className="grid grid-cols-2 gap-1 text-sm">
        {value.map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {ALLOWED_CLIENT_FIELDS[k]}
          </li>
        ))}
      </ul>
    </div>
  );
}
