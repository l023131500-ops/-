import { useState, type FormEvent } from "react";
import { z } from "zod";
import { Send } from "lucide-react";
import { submitInquiry } from "@/data/repositories";
import { useToast } from "@/components/ui/Toaster";
import { PageHero } from "@/components/ui/PageHero";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const schema = z.object({
  name: z.string().trim().min(2, "יש להזין שם"),
  phone: z.string().trim().regex(/^0\d{1,2}-?\d{7}$/, "מספר טלפון לא תקין").or(z.literal("")),
  email: z.string().trim().email("כתובת אימייל לא תקינה").or(z.literal("")),
  subject: z.string().trim().optional(),
  body: z.string().trim().min(5, "יש להזין תוכן פנייה"),
});

type Errors = Partial<Record<keyof z.infer<typeof schema>, string>>;

export function Contact() {
  const toast = useToast();
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const values = {
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      email: String(form.get("email") ?? ""),
      subject: String(form.get("subject") ?? ""),
      body: String(form.get("body") ?? ""),
    };
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) next[issue.path[0] as keyof Errors] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await submitInquiry(parsed.data);
      toast("הפנייה נשלחה בהצלחה. נחזור אליך בהקדם.", "success");
      e.currentTarget.reset();
    } catch {
      toast("אירעה שגיאה בשליחת הפנייה. נסו שוב מאוחר יותר.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHero eyebrow="צור קשר" title="צור קשר עם המועצה הדתית" subtitle="נשמח לעמוד לרשותכם בכל שאלה או בקשה." />
      <div className="container-page py-16">
        <form onSubmit={onSubmit} noValidate className="mx-auto max-w-xl space-y-5 rounded-lg border border-border bg-card p-6 shadow-soft sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="שם מלא" htmlFor="name" required error={errors.name}>
              <Input id="name" name="name" autoComplete="name" placeholder="ישראל ישראלי" />
            </Field>
            <Field label="טלפון" htmlFor="phone" error={errors.phone}>
              <Input id="phone" name="phone" inputMode="tel" placeholder="050-0000000" />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="אימייל" htmlFor="email" error={errors.email}>
              <Input id="email" name="email" type="email" inputMode="email" placeholder="you@example.com" />
            </Field>
            <Field label="נושא" htmlFor="subject" error={errors.subject}>
              <Input id="subject" name="subject" placeholder="נושא הפנייה" />
            </Field>
          </div>
          <Field label="תוכן הפנייה" htmlFor="body" required error={errors.body}>
            <Textarea id="body" name="body" placeholder="כתבו כאן את פנייתכם…" />
          </Field>
          <Button type="submit" size="lg" disabled={submitting} className="w-full">
            <Send className="h-4 w-4" aria-hidden />
            {submitting ? "שולח…" : "שליחת פנייה"}
          </Button>
        </form>
      </div>
    </>
  );
}
