import { useState } from "react";
import { useHashLocation } from "wouter/use-hash-location";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Sparkles,
  ClipboardList,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DetailedReport } from "@/components/DetailedReport";
import { fetchQuestionnaire, submitLead as submitLeadApi } from "@/lib/nadlanApi";
import { useAppState } from "@/lib/app-state";
import { useToast } from "@/hooks/use-toast";
import type { Questionnaire, QItem } from "@/lib/research";

const leadSchema = z.object({
  fullName: z.string().min(2, "נא להזין שם מלא"),
  phone: z
    .string()
    .min(9, "מספר טלפון לא תקין")
    .regex(/^[0-9+\-\s]+$/, "מספר טלפון לא תקין"),
  email: z.string().email("כתובת אימייל לא תקינה"),
});
type LeadForm = z.infer<typeof leadSchema>;

export default function Premium() {
  const [, navigate] = useHashLocation();
  const { profile, address, leadSubmitted, setLeadSubmitted } = useAppState();
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const { data: questionnaire, isLoading: qLoading } = useQuery<Questionnaire>({
    queryKey: ["/api/questionnaire"],
    queryFn: () => fetchQuestionnaire() as Promise<Questionnaire>,
  });

  const form = useForm<LeadForm>({
    resolver: zodResolver(leadSchema),
    defaultValues: { fullName: "", phone: "", email: "" },
  });

  const submitLead = useMutation({
    mutationFn: async (values: LeadForm) => {
      return await submitLeadApi({
        fullName: values.fullName,
        phone: values.phone,
        email: values.email,
        address: profile?.matched_address || address || "",
        profileId: profile?.profile_id ?? null,
        answers,
      });
    },
    onSuccess: () => {
      setLeadSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (err: any) => {
      toast({
        title: "השליחה נכשלה",
        description: err?.message ?? "נסו שוב",
        variant: "destructive",
      });
    },
  });

  function setAnswer(key: string, value: any) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  // ---- Thank-you + detailed report ----
  if (leadSubmitted) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <Card className="mb-8 border-accent/40 bg-primary p-8 text-center text-white" data-testid="card-thankyou">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/20">
              <CheckCircle2 className="h-8 w-8 text-accent" />
            </div>
            <h1 className="text-2xl font-extrabold">תודה! הפרטים התקבלו</h1>
            <p className="mx-auto mt-2 max-w-lg text-white/75">
              נציג שלנו ייצור איתכם קשר בהקדם. בינתיים — הדוח הדיגיטלי המפורט על הנכס
              מוכן וזמין למטה.
            </p>
          </Card>

          {profile ? (
            <>
              <div className="mb-6 text-right">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary dark:bg-accent/15 dark:text-accent">
                  <Sparkles className="h-3.5 w-3.5" />
                  דוח מפורט
                </div>
                <h2 className="mt-3 text-2xl font-extrabold text-foreground" data-testid="text-detailed-address">
                  {profile.matched_address || address}
                </h2>
                <p className="mt-1 text-muted-foreground">
                  {profile.locality_name}
                  {profile.neighborhood_name ? ` · ${profile.neighborhood_name}` : ""}
                </p>
              </div>
              <DetailedReport profile={profile} />
            </>
          ) : (
            <Card className="p-8 text-center text-muted-foreground">
              <p>לא נמצא דוח פעיל. חזרו לעמוד הבית כדי לחקור נכס.</p>
              <Button className="mt-4" onClick={() => navigate("/")} data-testid="button-back-home-empty">
                לעמוד הבית
              </Button>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // ---- Lead form + questionnaire ----
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 -mr-2"
          onClick={() => navigate(profile ? "/report" : "/")}
          data-testid="button-back"
        >
          <ArrowLeft className="ml-1.5 h-4 w-4" />
          חזרה
        </Button>

        <div className="mb-8 text-right">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-sm font-semibold text-accent">
            <Sparkles className="h-3.5 w-3.5" />
            דוח כדאיות מפורט
          </div>
          <h1 className="mt-3 text-3xl font-extrabold text-foreground">
            כמעט שם — נותרו כמה פרטים
          </h1>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            השאירו פרטים ומלאו שאלון קצר כדי שנתאים את הדוח המפורט בדיוק לצרכים שלכם.
            {profile ? ` הנכס: ${profile.matched_address || address}.` : ""}
          </p>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => submitLead.mutate(v))}
            className="space-y-8"
          >
            {/* Contact details */}
            <Card className="p-6 text-right">
              <h2 className="mb-4 text-lg font-bold text-foreground">פרטי התקשרות</h2>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>שם מלא</FormLabel>
                      <FormControl>
                        <Input placeholder="ישראל ישראלי" {...field} data-testid="input-fullname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>טלפון</FormLabel>
                        <FormControl>
                          <Input placeholder="050-0000000" inputMode="tel" {...field} data-testid="input-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>אימייל</FormLabel>
                        <FormControl>
                          <Input placeholder="name@example.com" inputMode="email" {...field} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </Card>

            {/* Questionnaire */}
            <Card className="p-6 text-right">
              <div className="mb-4 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary dark:text-accent" />
                <h2 className="text-lg font-bold text-foreground">
                  {questionnaire?.title ?? "שאלון התאמה אישית"}
                </h2>
              </div>

              {qLoading ? (
                <div className="flex items-center gap-2 py-6 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  טוען שאלון…
                </div>
              ) : (
                <div className="space-y-8">
                  {questionnaire?.sections.map((section, si) => (
                    <div key={section.section} data-testid={`qsection-${si}`}>
                      <h3 className="mb-4 border-b border-border pb-2 text-base font-bold gold-text">
                        {section.section}
                      </h3>
                      <div className="space-y-5">
                        {section.items.map((item) => (
                          <QuestionField
                            key={item.key}
                            item={item}
                            value={answers[item.key]}
                            onChange={(v) => setAnswer(item.key, v)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Button
              type="submit"
              size="lg"
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={submitLead.isPending}
              data-testid="button-submit-lead"
            >
              {submitLead.isPending ? (
                <>
                  <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                  שולח…
                </>
              ) : (
                "שלחו וקבלו את הדוח המפורט"
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}

function QuestionField({
  item,
  value,
  onChange,
}: {
  item: QItem;
  value: any;
  onChange: (v: any) => void;
}) {
  if (item.type === "single" && item.options) {
    const fieldId = `question-${item.key}`;
    return (
      <div className="text-right">
        <label htmlFor={fieldId} className="mb-1.5 block text-sm font-semibold text-foreground">{item.label}</label>
        <Select value={value ?? ""} onValueChange={onChange}>
          <SelectTrigger id={fieldId} data-testid={`select-${item.key}`}>
            <SelectValue placeholder="בחרו…" />
          </SelectTrigger>
          <SelectContent>
            {item.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (item.type === "number") {
    const fieldId = `question-${item.key}`;
    return (
      <div className="text-right">
        <label htmlFor={fieldId} className="mb-1.5 block text-sm font-semibold text-foreground">{item.label}</label>
        <Input
          id={fieldId}
          type="number"
          inputMode="numeric"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          data-testid={`input-${item.key}`}
        />
      </div>
    );
  }

  if (item.type === "scale") {
    const min = item.min ?? 1;
    const max = item.max ?? 5;
    const opts = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    return (
      <div className="text-right">
        <label className="mb-1.5 block text-sm font-semibold text-foreground">{item.label}</label>
        <div className="flex gap-2" data-testid={`scale-${item.key}`}>
          {opts.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`h-10 flex-1 rounded-lg border text-sm font-bold transition-colors ${
                value === n
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-accent/50"
              }`}
              data-testid={`scale-${item.key}-${n}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // text
  const fieldId = `question-${item.key}`;
  return (
    <div className="text-right">
      <label htmlFor={fieldId} className="mb-1.5 block text-sm font-semibold text-foreground">{item.label}</label>
      <Textarea
        id={fieldId}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        data-testid={`textarea-${item.key}`}
      />
    </div>
  );
}
