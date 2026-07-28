import { useState, type FormEvent } from "react";
import { z } from "zod";
import { MessageCircleQuestion, Send } from "lucide-react";
import { submitRabbiQuestion } from "@/data/repositories";
import { useToast } from "@/components/ui/Toaster";
import { PageHero } from "@/components/ui/PageHero";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const schema = z.object({
  name: z.string().trim().optional(),
  contact: z.string().trim().optional(),
  question: z.string().trim().min(5, "יש להזין את השאלה"),
});

export function AskRav() {
  const toast = useToast();
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      name: String(form.get("name") ?? ""),
      contact: String(form.get("contact") ?? ""),
      question: String(form.get("question") ?? ""),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    setSubmitting(true);
    try {
      await submitRabbiQuestion(parsed.data);
      toast("השאלה נשלחה לרב. תשובה תישלח אליך או תתפרסם בארכיון השו״ת.", "success");
      e.currentTarget.reset();
    } catch {
      toast("אירעה שגיאה בשליחת השאלה. נסו שוב מאוחר יותר.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHero
        eyebrow="שאל את הרב"
        title="שאל את הרב"
        subtitle="שאלה בהלכה, בהשקפה או בענייני הקהילה — שלחו אותה כאן ותקבלו תשובה מרב הקהילה."
      />
      <div className="container-page py-16">
        <form onSubmit={onSubmit} noValidate className="mx-auto max-w-xl space-y-5 rounded-lg border border-border bg-card p-6 shadow-soft sm:p-8">
          <div className="flex items-center gap-3 rounded-lg bg-secondary/60 p-4 text-sm text-muted-foreground">
            <MessageCircleQuestion className="h-5 w-5 shrink-0 text-accent" aria-hidden />
            ניתן לשלוח שאלה גם באופן אנונימי. לתשובה אישית — השאירו פרטי קשר.
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="שם (לא חובה)" htmlFor="name">
              <Input id="name" name="name" placeholder="שם" autoComplete="name" />
            </Field>
            <Field label="טלפון / אימייל (לתשובה אישית)" htmlFor="contact">
              <Input id="contact" name="contact" placeholder="050-0000000 או אימייל" />
            </Field>
          </div>
          <Field label="השאלה" htmlFor="question" required error={error}>
            <Textarea id="question" name="question" placeholder="כתבו כאן את שאלתכם…" className="min-h-[160px]" />
          </Field>
          <Button type="submit" size="lg" disabled={submitting} className="w-full">
            <Send className="h-4 w-4" aria-hidden />
            {submitting ? "שולח…" : "שליחת שאלה"}
          </Button>
        </form>
      </div>
    </>
  );
}
