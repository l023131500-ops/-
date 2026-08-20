import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2 } from "lucide-react";

type QuestionType = "text" | "textarea" | "number" | "yesno" | "choice" | "multichoice" | "date" | "phone" | "email";
interface QuestionOption { value: string; label: string }
interface Question {
  id: number;
  label: string;
  helpText: string | null;
  type: QuestionType;
  required: boolean;
  options: QuestionOption[];
}
interface Payload {
  slug: string;
  linkId: number;
  questionnaire: {
    id: number;
    title: string;
    description: string | null;
    logoUrl: string | null;
    introText: string | null;
    successText: string | null;
    collectContact: boolean;
    brandingText?: string | null;
  };
  questions: Question[];
}

export default function PublicCommunity() {
  const [, params] = useRoute("/community/:slug");
  const slug = params?.slug || "";
  const { toast } = useToast();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [contact, setContact] = useState({ name: "", phone: "", email: "", communityName: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`${API_BASE}/api/public/community/${encodeURIComponent(slug)}`)
      .then((r) => { if (!r.ok) throw new Error("not found"); return r.json(); })
      .then((d: Payload) => setData(d))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  function setAnswer(id: number, value: unknown) {
    setAnswers((prev) => ({ ...prev, [String(id)]: value }));
  }

  function toggleMulti(id: number, value: string) {
    setAnswers((prev) => {
      const cur = Array.isArray(prev[String(id)]) ? (prev[String(id)] as string[]) : [];
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      return { ...prev, [String(id)]: next };
    });
  }

  async function submit() {
    if (!data) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/public/community/${encodeURIComponent(slug)}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers, contact }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message || "שגיאה בשליחה");
      setDone(body.successText || data.questionnaire.successText || "תודה! הפנייה התקבלה.");
    } catch (e) {
      toast({ title: "לא ניתן לשלוח", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  function renderQuestion(q: Question) {
    const v = answers[String(q.id)];
    switch (q.type) {
      case "textarea":
        return <Textarea value={(v as string) || ""} onChange={(e) => setAnswer(q.id, e.target.value)} aria-label={q.label} data-testid={`q-${q.id}`} />;
      case "number":
        return <Input type="number" inputMode="numeric" value={(v as string) ?? ""} onChange={(e) => setAnswer(q.id, e.target.value)} data-testid={`q-${q.id}`} />;
      case "date":
        return <Input type="date" value={(v as string) || ""} onChange={(e) => setAnswer(q.id, e.target.value)} data-testid={`q-${q.id}`} />;
      case "phone":
        return <Input type="tel" inputMode="tel" maxLength={10} value={(v as string) || ""} onChange={(e) => setAnswer(q.id, e.target.value)} data-testid={`q-${q.id}`} />;
      case "email":
        return <Input type="email" inputMode="email" value={(v as string) || ""} onChange={(e) => setAnswer(q.id, e.target.value)} data-testid={`q-${q.id}`} />;
      case "yesno":
        return (
          <RadioGroup value={(v as string) || ""} onValueChange={(val) => setAnswer(q.id, val)} className="flex gap-4" data-testid={`q-${q.id}`}>
            <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="כן" /> כן</label>
            <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="לא" /> לא</label>
          </RadioGroup>
        );
      case "choice":
        return (
          <RadioGroup value={(v as string) || ""} onValueChange={(val) => setAnswer(q.id, val)} className="flex flex-col gap-2" data-testid={`q-${q.id}`}>
            {q.options.map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-sm"><RadioGroupItem value={o.value} /> {o.label}</label>
            ))}
          </RadioGroup>
        );
      case "multichoice":
        return (
          <div className="flex flex-col gap-2" data-testid={`q-${q.id}`}>
            {q.options.map((o) => {
              const arr = Array.isArray(v) ? (v as string[]) : [];
              return (
                <label key={o.value} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={arr.includes(o.value)} onCheckedChange={() => toggleMulti(q.id, o.value)} /> {o.label}
                </label>
              );
            })}
          </div>
        );
      default:
        return <Input value={(v as string) || ""} onChange={(e) => setAnswer(q.id, e.target.value)} data-testid={`q-${q.id}`} />;
    }
  }

  if (loading) {
    return <div className="max-w-2xl mx-auto px-4 py-12 space-y-4" dir="rtl"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-40" /></div>;
  }
  if (notFound || !data) {
    return <div className="max-w-2xl mx-auto px-4 py-20 text-center text-muted-foreground" dir="rtl" role="alert" aria-live="assertive" data-testid="community-not-found">השאלון לא נמצא או אינו פעיל.</div>;
  }
  if (done) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center" dir="rtl" role="status" aria-live="polite" data-testid="community-success">
        <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">{data.questionnaire.title}</h1>
        <p className="text-muted-foreground">{done}</p>
      </div>
    );
  }

  const q = data.questionnaire;
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6" dir="rtl" data-testid="page-public-community">
      <header className="text-center space-y-3">
        {q.logoUrl && <img src={q.logoUrl} alt="לוגו" className="h-16 mx-auto object-contain" data-testid="community-logo" />}
        <h1 className="text-2xl font-bold">{q.title}</h1>
        {q.description && <p className="text-sm text-muted-foreground">{q.description}</p>}
        {q.introText && <p className="text-sm text-muted-foreground bg-muted/40 rounded-md p-3">{q.introText}</p>}
      </header>

      <div className="space-y-5">
        {data.questions.map((ques) => (
          <Card key={ques.id} className="p-4 space-y-2" data-testid={`community-question-${ques.id}`}>
            <Label className="text-sm font-medium">
              {ques.label} {ques.required && <span className="text-destructive">*</span>}
            </Label>
            {ques.helpText && <p className="text-xs text-muted-foreground">{ques.helpText}</p>}
            {renderQuestion(ques)}
          </Card>
        ))}
      </div>

      {q.collectContact && (
        <Card className="p-4 space-y-3" data-testid="community-contact">
          <h3 className="font-semibold text-sm">פרטי קשר</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">שם איש הקשר</Label><Input value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} data-testid="input-community-name" autoComplete="name" /></div>
            <div className="space-y-1"><Label className="text-xs">שם הקהילה</Label><Input value={contact.communityName} onChange={(e) => setContact({ ...contact, communityName: e.target.value })} data-testid="input-community-community" /></div>
            <div className="space-y-1"><Label className="text-xs">טלפון</Label><Input type="tel" inputMode="tel" maxLength={10} value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} data-testid="input-community-phone" autoComplete="tel" /></div>
            <div className="space-y-1"><Label className="text-xs">דוא״ל</Label><Input type="email" inputMode="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} data-testid="input-community-email" autoComplete="email" /></div>
          </div>
        </Card>
      )}

      <Button className="w-full" size="lg" onClick={submit} disabled={submitting} data-testid="button-community-submit">
        {submitting ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : null}
        שליחת השאלון
      </Button>

      {q.brandingText && (
        <p className="text-center text-xs text-muted-foreground whitespace-pre-line" data-testid="community-branding">{q.brandingText}</p>
      )}
    </div>
  );
}
