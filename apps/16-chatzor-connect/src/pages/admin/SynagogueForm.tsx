import { useState, type FormEvent } from "react";
import { z } from "zod";
import type { Synagogue, SynagogueInput } from "@/lib/types";
import { BRAND_GRADIENTS } from "@/data/seed";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const GRADIENT_OPTIONS = [
  { label: "כחול קלאסי", value: BRAND_GRADIENTS.classicBlue },
  { label: "תכלת וזהב", value: BRAND_GRADIENTS.skyGold },
  { label: "ירוק עמוק", value: BRAND_GRADIENTS.deepGreen },
  { label: "סגול מלכותי", value: BRAND_GRADIENTS.royalPurple },
  { label: "חום חם", value: BRAND_GRADIENTS.warmBrown },
];

const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/['"]/g, "").replace(/[^a-z0-9֐-׿]+/g, "-").replace(/^-+|-+$/g, "");

const schema = z.object({
  name: z.string().trim().min(2, "יש להזין שם"),
  slug: z.string().trim().min(2, "יש להזין מזהה כתובת").regex(/^[a-z0-9֐-׿-]+$/, "מזהה לא תקין"),
  donationLink: z.string().trim().url("קישור לא תקין").startsWith("https://", "הקישור חייב להתחיל ב-https://").or(z.literal("")),
});

export function SynagogueForm({ initial, onSubmit, submitting }: {
  initial?: Synagogue;
  onSubmit: (input: SynagogueInput) => void;
  submitting: boolean;
}) {
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(!!initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const values = {
      name: String(form.get("name") ?? ""),
      slug: String(form.get("slug") ?? ""),
      donationLink: String(form.get("donationLink") ?? ""),
    };
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) next[i.path[0] as string] = i.message;
      setErrors(next);
      return;
    }
    setErrors({});
    onSubmit({
      name: values.name,
      slug: values.slug,
      nusach: String(form.get("nusach") ?? "") || null,
      address: String(form.get("address") ?? "") || null,
      description: String(form.get("description") ?? "") || null,
      brandGradient: String(form.get("brandGradient") ?? "") || undefined,
      logoUrl: String(form.get("logoUrl") ?? "") || null,
      donationLink: values.donationLink || null,
      isPublished: form.get("isPublished") === "on",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="שם בית הכנסת" htmlFor="name" required error={errors.name}>
        <Input id="name" name="name" defaultValue={initial?.name}
          onChange={(e) => { if (!slugEdited) setSlug(slugify(e.target.value)); }} placeholder="בית הכנסת ..." />
      </Field>
      <Field label="מזהה כתובת (לקישור /k/...)" htmlFor="slug" required error={errors.slug}>
        <Input id="slug" name="slug" value={slug} onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }} placeholder="tiferet-israel" dir="ltr" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="נוסח" htmlFor="nusach">
          <Input id="nusach" name="nusach" defaultValue={initial?.nusach ?? ""} placeholder="ספרד / אשכנז / עדות המזרח" />
        </Field>
        <Field label="כתובת" htmlFor="address">
          <Input id="address" name="address" defaultValue={initial?.address ?? ""} placeholder="רחוב ..." />
        </Field>
      </div>
      <Field label="תיאור" htmlFor="description">
        <Textarea id="description" name="description" defaultValue={initial?.description ?? ""} className="min-h-[80px]" placeholder="תיאור קצר של בית הכנסת" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="עיצוב (צבע רקע)" htmlFor="brandGradient">
          <Select id="brandGradient" name="brandGradient" defaultValue={initial?.brandGradient ?? GRADIENT_OPTIONS[0]!.value}>
            {GRADIENT_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </Select>
        </Field>
        <Field label="קישור ללוגו (אופציונלי)" htmlFor="logoUrl">
          <Input id="logoUrl" name="logoUrl" defaultValue={initial?.logoUrl ?? ""} dir="ltr" placeholder="https://…" />
        </Field>
      </div>
      <Field label="קישור לתרומות (https)" htmlFor="donationLink" error={errors.donationLink}>
        <Input id="donationLink" name="donationLink" defaultValue={initial?.donationLink ?? ""} dir="ltr" placeholder="https://…" />
      </Field>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" name="isPublished" defaultChecked={initial?.isPublished ?? true} className="h-4 w-4 rounded border-input accent-[hsl(var(--accent))]" />
        מפורסם באתר
      </label>
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "שומר…" : initial ? "שמירת שינויים" : "יצירת בית כנסת"}
      </Button>
    </form>
  );
}
