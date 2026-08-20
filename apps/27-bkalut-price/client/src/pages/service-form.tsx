import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import type { Client, MetaResponse, PublicRightRow } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/logo";
import { ArrowRight, CheckCircle2, FileUp, HeartHandshake, Mail, Phone, PlusCircle, SearchCheck, Send, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ParsedField {
  id: string;
  label: string;
  help?: string;
  required?: boolean;
  type?: string;
  weight?: number;
}

interface NormalizedQuestion {
  id: string;
  label: string;
  help?: string;
  required?: boolean;
  type: "yesno" | "number" | "text" | "textarea" | "date" | "tel" | "email" | "file" | "select";
  options?: string[];
  weight?: number;
}

interface PublicServiceContext {
  id: number;
  topic: string;
  category: string;
  subCategory: string;
  audience: string;
  whatReceived: string;
  publicSiteText: string;
  eligibility: NormalizedQuestion[];
  intake: NormalizedQuestion[];
  documents: NormalizedQuestion[];
  sensitive: boolean;
  categoryTopics: Array<{ id: number; topic: string; category: string; subCategory: string }>;
}

const CONTACT_EMAIL = "l023131500@gmail.com";
const CONTACT_PHONE = "0213131500";
const REQUEST_TYPES = [
  {
    key: "info",
    label: "מידע בלבד",
    description: "פרטי קשר בלבד — נשלח לכם את המידע. ללא ת.ז., מסמכים או פרטים נוספים.",
  },
  {
    key: "reminder",
    label: "בקשת מידע ותזכורות",
    description: "פרטי קשר בלבד — נשלח לכם מידע ותזכורת לביצוע. ללא מסמכים.",
  },
  {
    key: "treatment",
    label: "טיפול בבקשה",
    description: "פתיחת טיפול מלא — שאלון פרטים, מסמכים נדרשים והסכמות.",
  },
] as const;

function fallbackIntake(topic: string): ParsedField[] {
  return [
    { id: "notes", label: `פרטים נוספים שקשורים ל${topic}`, required: false, type: "textarea" },
  ];
}

function baseClientFields(): ParsedField[] {
  return [
    { id: "full_name", label: "שם מלא", required: true, type: "text" },
    { id: "phone", label: "טלפון לחזרה", required: true, type: "tel" },
    { id: "email", label: "מייל", required: true, type: "email" },
    { id: "id_number", label: "מספר זהות", required: false, type: "text" },
    { id: "birth_date", label: "תאריך לידה", required: false, type: "date" },
    { id: "city", label: "עיר מגורים", required: false, type: "text" },
    { id: "family_status", label: "מצב משפחתי", required: false, type: "text" },
    { id: "income", label: "הכנסה חודשית משוערת, אם רלוונטי", required: false, type: "text" },
  ];
}

export default function ServiceFormPage() {
  const { toast } = useToast();
  const [, params] = useRoute("/service/:id");
  const id = params?.id;
  // Single sanitized endpoint for the public service form. It returns the
  // basic public info, the normalized questionnaire, and a slim list of
  // sibling topics in the same category — never the raw internal RightRow.
  const { data: row, isLoading } = useQuery<PublicServiceContext>({
    queryKey: [`/api/public/service-context/${id}`],
    enabled: !!id,
  });
  const { data: meta } = useQuery<MetaResponse>({ queryKey: ["/api/meta"] });
  // Full public catalog (sanitized) — powers the "additional topics" flow so
  // the customer can add topics from any category without re-entering contact
  // info. Public endpoint, no internal fields exposed.
  const { data: allPublicRights } = useQuery<PublicRightRow[]>({ queryKey: ["/api/public/rights"] });

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [details, setDetails] = useState<Record<string, string>>({});
  const [additionalOpen, setAdditionalOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [files, setFiles] = useState<Record<string, string[]>>({});
  const [additionalTopics, setAdditionalTopics] = useState<Array<{ id: number; topic: string; category: string; subCategory: string }>>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [legalDocsAccepted, setLegalDocsAccepted] = useState<Record<string, boolean>>({
    terms: false,
    privacy: false,
    poa: false,
    confidentiality: false,
    fee_agreement: false,
  });
  const [submitted, setSubmitted] = useState<null | {
    submissionId: number;
    potentialLevel: string;
    potentialPercent: number;
    webhook?: { ok: boolean; status: number };
  }>(null);
  const [requestType, setRequestType] = useState<"info" | "reminder" | "treatment" | "">("");

  // When the user switches between request types, close/reset the previous
  // option's extra fields so we never show overlapping panels. Reminder is
  // contact-only (name/phone/email); only treatment opens full intake and
  // document upload.
  function selectRequestType(next: "info" | "reminder" | "treatment") {
    if (next === requestType) return;
    setRequestType(next);
    setFiles({});
    // Clear extended intake fields (anything beyond the basic contact set)
    // so leftover values from a previous option don't leak into the new one.
    setDetails((prev) => {
      const cleaned: Record<string, string> = {};
      const keep = next === "treatment"
        ? ["full_name", "phone", "email", "id_number", "birth_date", "family_status", "city"]
        : ["full_name", "phone", "email"];
      for (const k of keep) if (prev[k]) cleaned[k] = prev[k];
      return cleaned;
    });
    // Reset legal acceptances — different request types have different
    // required documents, so previous checkmarks shouldn't carry over.
    setLegalDocsAccepted({
      terms: false,
      privacy: false,
      poa: false,
      confidentiality: false,
      fee_agreement: false,
    });
    setTermsAccepted(false);
  }
  const requiresPoaFee = requestType === "treatment";
  const requiredLegalDocs = requiresPoaFee
    ? ["terms", "privacy", "poa", "confidentiality", "fee_agreement"]
    : requestType === "reminder"
      ? ["terms", "privacy", "confidentiality"]
      : ["terms", "privacy"];
  const legalAllSigned = requiredLegalDocs.every((k) => legalDocsAccepted[k]);

  // Server already normalized the questionnaire (eligibility/intake/documents)
  // for public consumption. The form only adds the basic contact fields
  // every public submission needs.
  const questions = useMemo<NormalizedQuestion[]>(() => row?.eligibility ?? [], [row]);
  const intakeFields = useMemo<NormalizedQuestion[]>(() => {
    if (!row) return [];
    const base: NormalizedQuestion[] = baseClientFields().map((f) => ({
      ...f,
      type: ((f.type as any) === "tel" ? "tel" : (f.type as any) === "email" ? "email" : (f.type as any) === "date" ? "date" : "text") as NormalizedQuestion["type"],
    }));
    const extra = row.intake ?? [];
    const fallback: NormalizedQuestion[] = extra.length
      ? extra
      : fallbackIntake(row.topic).map((f) => ({ ...f, type: "textarea" as const }));
    const seen = new Set(base.map((field) => field.id));
    return [...base, ...fallback.filter((field) => !seen.has(field.id))];
  }, [row]);
  const docFields = useMemo<NormalizedQuestion[]>(() => row?.documents ?? [], [row]);

  // Scoring: meaningful signal from yes/no/unknown AND numeric answers.
  //   - yesno: yes = full weight, unknown = half weight, no = 0
  //   - number: any non-empty answer adds 0.6 of weight (treated as a positive
  //     signal that the user knows the figure; cannot judge thresholds here)
  //   - select with chosen value: 0.5 of weight
  // The denominator counts the maximum achievable across these scored types
  // so the percent stays in 0..100.
  const SCOREABLE: Array<NormalizedQuestion["type"]> = ["yesno", "number", "select"];
  const scoreable = questions.filter((q) => SCOREABLE.includes(q.type));
  const scoreMax = scoreable.reduce((sum, q) => sum + (q.weight ?? 1), 0);
  const userScore = scoreable.reduce((sum, q) => {
    const w = q.weight ?? 1;
    const a = answers[q.id];
    if (!a) return sum;
    if (q.type === "yesno") {
      if (a === "yes") return sum + w;
      if (a === "unknown") return sum + w * 0.5;
      return sum;
    }
    if (q.type === "number") {
      const v = Number(a);
      if (Number.isFinite(v)) return sum + w * 0.6;
      return sum;
    }
    if (q.type === "select") return sum + w * 0.5;
    return sum;
  }, 0);
  const answered = questions.filter((q) => answers[q.id] && String(answers[q.id]).length > 0).length;
  const percent = scoreMax > 0 ? Math.min(100, Math.round((userScore / Math.max(scoreMax, 1)) * 100)) : 0;
  const level = percent >= 75 ? "פוטנציאל גבוה" : percent >= 45 ? "פוטנציאל בינוני" : percent > 0 ? "פוטנציאל נמוך" : "דורש בירור ראשוני";
  // Topics for the currently selected additional-flow category. Use the full
  // public catalog so the user can pick from ANY category, and exclude the
  // primary topic we're already filling out.
  const categoryTopics = useMemo(() => {
    const source = allPublicRights ?? [];
    return source
      .filter((t) => (category ? t.category === category : false))
      .filter((t) => t.id !== (row?.id ?? -1))
      .map((t) => ({ id: t.id, topic: t.topic, category: t.category, subCategory: t.subCategory }))
      .slice(0, 60);
  }, [allPublicRights, category, row?.id]);
  // Categories to show in the additional-topics picker — union of meta list
  // and what's actually present in the public catalog.
  const additionalCategories = useMemo(() => {
    const fromMeta = meta?.rightsCategories ?? [];
    const fromRows = Array.from(new Set((allPublicRights ?? []).map((r) => r.category).filter(Boolean)));
    const merged = new Set<string>([...fromMeta, ...fromRows]);
    return Array.from(merged).sort((a, b) => a.localeCompare(b, "he"));
  }, [meta, allPublicRights]);

  const loadClientMutation = useMutation({
    mutationFn: async (phone: string) => {
      const response = await apiRequest("GET", `/api/clients/by-phone?phone=${encodeURIComponent(phone)}`);
      return (await response.json()) as Client | null;
    },
    onSuccess: (client) => {
      if (!client) return;
      setDetails((prev) => ({
        ...prev,
        full_name: prev.full_name || client.fullName || "",
        phone: prev.phone || client.phone || "",
        email: prev.email || client.email || "",
        id_number: prev.id_number || client.idNumber || "",
        birth_date: prev.birth_date || client.birthDate || "",
        city: prev.city || client.city || "",
        family_status: prev.family_status || client.familyStatus || "",
      }));
      toast({ title: "נמצאו פרטים קודמים", description: "הטופס הושלם לפי פרטים שכבר קיימים במערכת." });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const legalAccepted: Record<string, string> = {};
      for (const docKey of requiredLegalDocs) {
        if (legalDocsAccepted[docKey]) legalAccepted[docKey] = "1.0";
      }
      const response = await apiRequest("POST", "/api/service-submissions", {
        rightId: row?.id,
        answers,
        details,
        documents: files,
        additionalTopics,
        potentialPercent: percent,
        requestType,
        termsAccepted,
        legalAccepted,
      });
      return (await response.json()) as {
        submissionId: number;
        potentialLevel: string;
        potentialPercent: number;
        webhook?: { ok: boolean; status: number };
      };
    },
    onSuccess: (result) => {
      setSubmitted(result);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (error) => {
      toast({ title: "לא ניתן לשלוח את הטופס", description: error instanceof Error ? error.message : "בדקו שמולא טלפון ואושרו תנאי השירות.", variant: "destructive" });
    },
  });

  function toggleAdditionalTopic(topic: { id: number; topic: string; category: string; subCategory: string }) {
    setAdditionalTopics((prev) => {
      const exists = prev.some((item) => item.id === topic.id);
      if (exists) return prev.filter((item) => item.id !== topic.id);
      return [...prev, { id: topic.id, topic: topic.topic, category: topic.category, subCategory: topic.subCategory }];
    });
  }

  // For info / reminder requests we explicitly limit to only full_name/phone/email.
  // Only treatment opens the broader contact identifiers and additional fields.
  const minimalContactIds = ["full_name", "phone", "email"];
  const broadContactIds = [...minimalContactIds, "id_number", "birth_date", "family_status"];
  const activeContactIds = requestType === "treatment" ? broadContactIds : minimalContactIds;
  const contactFields = intakeFields.filter((field) => activeContactIds.includes(field.id));
  const extendedFields = intakeFields.filter((field) => !broadContactIds.includes(field.id));
  const shouldShowContact = Boolean(requestType);
  const shouldShowFullIntake = requestType === "treatment";
  const shouldShowDocuments = requestType === "treatment";
  const missingRequiredContact =
    !details.full_name?.trim() ||
    !details.phone?.trim() ||
    !details.email?.trim();
  const canSubmit = Boolean(requestType) && !missingRequiredContact && termsAccepted && legalAllSigned && !submitMutation.isPending;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!row) {
    return (
      <div className="text-center py-16">
        <p className="font-medium">הטופס לא נמצא</p>
        <Link href="/eligibility" className="text-primary text-sm mt-3 inline-block">חזרה לקטלוג הציבורי</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-10" data-testid="page-service-form">
      {submitted && (
        <Card className="relative overflow-hidden p-6 border border-primary/20 bg-gradient-to-br from-primary/10 via-[hsl(42_85%_93%)] to-[hsl(190_55%_94%)]" role="status" aria-live="polite" data-testid="card-submit-success">
          <div className="bkalut-stars" aria-hidden="true">
            {Array.from({ length: 16 }).map((_, index) => <span key={index}>★</span>)}
          </div>
          <div className="relative z-10 flex items-start gap-3">
            <span className="rounded-full bg-primary text-primary-foreground p-2">
              <CheckCircle2 className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl font-bold">הפנייה התקבלה</h2>
              <p className="text-sm leading-relaxed mt-2">
                צוות בקלות מטפלים בפנייתכם בהקדם. מספר פנייה: {submitted.submissionId}.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                נחזור אליכם בערוצים שמילאתם (טלפון/מייל/וואטסאפ). ניתן לקבל מידע ותזכורות ללא עלות.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-5 border border-primary/20 bg-primary/5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Logo size={40} className="text-primary" />
          <div className="text-sm text-foreground/75 text-left" dir="ltr">
            <div className="flex items-center gap-2 justify-end"><Phone className="w-4 h-4" /> {CONTACT_PHONE}</div>
            <div className="flex items-center gap-2 justify-end"><Mail className="w-4 h-4" /> {CONTACT_EMAIL}</div>
          </div>
        </div>
        <div className="mt-5">
          <p className="text-sm text-muted-foreground">טופס בדיקה והכנת מסמכים</p>
          <h1 className="text-xl md:text-2xl font-bold mt-1" data-testid="text-service-title">{row.topic}</h1>
          <p className="text-sm text-foreground/75 mt-2">
            מלאו את השאלות והפרטים בצורה מדויקת. הטופס נותן כיוון ראשוני בלבד, והצוות בודק את הזכאות הסופית לפי המסמכים והכללים הרשמיים.
          </p>
        </div>
      </Card>

      <Card className="sticky top-16 z-20 p-4 border border-card-border bg-card/95 backdrop-blur" data-testid="card-probability-bar">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <SearchCheck className="w-4 h-4 text-primary" />
            אחוז סיכוי ראשוני לפי התשובות
          </div>
          <div className="text-sm">
            <span className="font-bold tabular-nums text-primary" data-testid="text-service-percent">{percent}%</span>
            <span className="text-muted-foreground mr-2">נענו {answered}/{questions.length} שאלות · {level}</span>
          </div>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
        </div>
      </Card>

      <Card className="p-5 border border-card-border bg-card space-y-4" data-testid="card-eligibility-service">
        <h2 className="text-base font-semibold">שאלות בדיקת זכאות</h2>
        {questions.length ? questions.map((q, index) => (
          <div key={q.id} className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-sm font-medium">{index + 1}. {q.label}{q.required ? " *" : ""}</p>
            {q.help && <p className="text-xs text-muted-foreground mt-1">{q.help}</p>}
            <div className="mt-3">
              {q.type === "yesno" && (
                <div className="flex flex-wrap gap-2">
                  {[["yes", "כן"], ["no", "לא"], ["unknown", "לא יודע/ת"]].map(([value, label]) => (
                    <Button key={value} type="button" size="sm" variant={answers[q.id] === value ? "default" : "outline"} onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: value }))}>
                      {label}
                    </Button>
                  ))}
                </div>
              )}
              {q.type === "number" && (
                <Input type="number" inputMode="numeric" placeholder="הקלידו מספר" value={answers[q.id] ?? ""} onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))} data-testid={`input-q-${q.id}`} />
              )}
              {q.type === "date" && (
                <Input type="date" value={answers[q.id] ?? ""} onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))} />
              )}
              {q.type === "tel" && (
                <Input type="tel" inputMode="tel" value={answers[q.id] ?? ""} onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))} />
              )}
              {q.type === "email" && (
                <Input type="email" value={answers[q.id] ?? ""} onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))} />
              )}
              {q.type === "select" && (
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={answers[q.id] ?? ""} onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))} aria-label={q.label}>
                  <option value="">בחרו</option>
                  {(q.options ?? []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              )}
              {q.type === "textarea" && (
                <Textarea className="min-h-20" value={answers[q.id] ?? ""} onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))} />
              )}
              {q.type === "text" && (
                <Input type="text" value={answers[q.id] ?? ""} onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))} />
              )}
              {q.type === "file" && (
                <Input type="file" multiple onChange={(e) => setFiles((prev) => ({ ...prev, [q.id]: Array.from(e.target.files ?? []).map((file) => file.name) }))} />
              )}
            </div>
          </div>
        )) : (
          <p className="text-sm text-muted-foreground">אין שאלות זכאות מובנות לנושא הזה. אפשר להמשיך למילוי פרטים ומסמכים.</p>
        )}
        {scoreMax === 0 && questions.length > 0 && (
          <p className="text-xs text-muted-foreground">הצוות יסקור את התשובות. מד אחוז הסיכוי מבוסס על שאלות כן/לא, שאלות מספריות ושאלות בחירה.</p>
        )}
      </Card>

      <Card className="p-5 border border-card-border bg-gradient-to-br from-card via-[hsl(190_45%_96%)] to-[hsl(42_80%_96%)] space-y-4" data-testid="card-request-type">
        <div>
          <h2 className="text-base font-semibold">איך תרצו להמשיך?</h2>
          <p className="text-xs text-muted-foreground mt-1">
            הבחירה קובעת אילו פרטים נדרשים בהמשך ומה יישמר בפנייה.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {REQUEST_TYPES.map((type) => (
            <button
              key={type.key}
              type="button"
              onClick={() => selectRequestType(type.key)}
              className={`text-right rounded-lg border p-4 transition-colors hover-elevate ${
                requestType === type.key ? "border-primary bg-primary/10" : "border-border bg-background/70"
              }`}
              data-testid={`button-request-type-${type.key}`}
            >
              <span className="font-semibold text-sm">{type.label}</span>
              <span className="block text-xs text-muted-foreground mt-2 leading-relaxed">{type.description}</span>
            </button>
          ))}
        </div>
      </Card>

      {shouldShowContact && (
      <Card className="p-5 border border-card-border bg-card space-y-4" data-testid="card-contact-service">
        <h2 className="text-base font-semibold">
          {requestType === "treatment" ? "פרטי קשר ופרטים בסיסיים" : "פרטי קשר בלבד"}
        </h2>
        <p className="text-xs text-muted-foreground">
          {requestType === "treatment"
            ? "נשמרים לפחות נושא הזכות, רמת הפוטנציאל, שם מלא, טלפון ומייל. אם תמלאו גם תעודת זהות, תאריך לידה ומצב משפחתי, הם יישמרו יחד עם הפנייה."
            : requestType === "reminder"
              ? "לבקשת תזכורות נדרשים רק שם מלא, טלפון ומייל. לא מבקשים מסמכים או פרטים נוספים."
              : "לקבלת מידע נדרשים רק שם מלא, טלפון ומייל. לא נבקש ת.ז., מסמכים או פרטים נוספים."}
        </p>
        <div className="grid md:grid-cols-2 gap-3">
          {contactFields.map((field) => (
            <label key={field.id} className={field.type === "textarea" ? "md:col-span-2 space-y-1" : "space-y-1"}>
              <span className="text-xs font-medium text-muted-foreground">
                {field.label}{field.required ? " *" : ""}
              </span>
              {field.help && <p className="text-[11px] text-muted-foreground">{field.help}</p>}
              {field.type === "textarea" ? (
                <Textarea value={details[field.id] ?? ""} onChange={(e) => setDetails((prev) => ({ ...prev, [field.id]: e.target.value }))} className="min-h-24" data-testid={`textarea-contact-${field.id}`} />
              ) : (
                <Input
                  type={field.type === "tel" ? "tel" : field.type === "email" ? "email" : field.type === "date" ? "date" : "text"}
                  value={details[field.id] ?? ""}
                  onChange={(e) => setDetails((prev) => ({ ...prev, [field.id]: e.target.value }))}
                  onBlur={() => {
                    if (field.id === "phone" && details.phone && details.phone.length >= 6) {
                      loadClientMutation.mutate(details.phone);
                    }
                  }}
                  data-testid={`input-contact-${field.id}`}
                />
              )}
            </label>
          ))}
        </div>
      </Card>
      )}

      {shouldShowFullIntake && (
      <Card className="p-5 border border-card-border bg-card space-y-4" data-testid="card-intake-service">
        <h2 className="text-base font-semibold">שאלון פרטים להמשך טיפול / תזכורת</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {extendedFields.map((field) => (
            <label key={field.id} className={field.type === "textarea" ? "md:col-span-2 space-y-1" : "space-y-1"}>
              <span className="text-xs font-medium text-muted-foreground">
                {field.label}{field.required ? " *" : ""}
              </span>
              {field.help && <p className="text-[11px] text-muted-foreground">{field.help}</p>}
              {field.type === "textarea" ? (
                <Textarea value={details[field.id] ?? ""} onChange={(e) => setDetails((prev) => ({ ...prev, [field.id]: e.target.value }))} className="min-h-24" />
              ) : (
                <Input
                  type={field.type === "date" ? "date" : "text"}
                  value={details[field.id] ?? ""}
                  onChange={(e) => setDetails((prev) => ({ ...prev, [field.id]: e.target.value }))}
                />
              )}
            </label>
          ))}
        </div>
      </Card>
      )}

      {shouldShowDocuments && (
      <Card className="p-5 border border-card-border bg-card space-y-4" data-testid="card-documents-service">
        <div>
          <h2 className="text-base font-semibold">צירוף מסמכים</h2>
          <p className="text-xs text-muted-foreground mt-1">הקבצים מצורפים בדפדפן לצורך הכנת הפנייה. בחיבור אוטומציה מלא הם יישלחו למשרד או למערכת CRM.</p>
        </div>
        <div className="space-y-3">
          {docFields.length ? docFields.map((doc, index) => (
            <label key={doc.id} className="block rounded-lg border border-border bg-muted/20 p-3">
              <span className="text-sm font-medium">{index + 1}. {doc.label}{doc.required ? " *" : ""}</span>
              {doc.help && <p className="text-xs text-muted-foreground mt-1">{doc.help}</p>}
              <Input className="mt-3" type="file" multiple onChange={(e) => setFiles((prev) => ({ ...prev, [doc.id]: Array.from(e.target.files ?? []).map((file) => file.name) }))} />
              {files[doc.id]?.length ? <p className="text-xs text-primary mt-2">{files[doc.id].join(", ")}</p> : null}
            </label>
          )) : <p className="text-sm text-muted-foreground">לא הוגדרו מסמכים מובנים לנושא הזה.</p>}

          <label className="block rounded-lg border border-dashed border-border bg-muted/10 p-3">
            <span className="text-sm font-medium flex items-center gap-2"><FileUp className="w-4 h-4 text-primary" /> מסמכים נוספים</span>
            <Input className="mt-3" type="file" multiple onChange={(e) => setFiles((prev) => ({ ...prev, additional: Array.from(e.target.files ?? []).map((file) => file.name) }))} />
            {files.additional?.length ? <p className="text-xs text-primary mt-2">{files.additional.join(", ")}</p> : null}
          </label>
        </div>
      </Card>
      )}

      <Card className="p-5 border border-card-border bg-card space-y-4" data-testid="card-more-help">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-primary" />
              בדיקת זכאות בנושאים נוספים
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              אפשר להוסיף נושאים מקטגוריות נוספות לבדיקת זכאות באותה פנייה. פרטי הקשר שכבר מילאתם יישמרו לכל הנושאים — לא צריך למלא אותם שוב.
            </p>
          </div>
          <Button
            type="button"
            variant={additionalOpen ? "secondary" : "default"}
            onClick={() => setAdditionalOpen((v) => !v)}
            data-testid="button-toggle-additional"
          >
            <PlusCircle className="w-4 h-4 ml-1" />
            {additionalOpen ? "סגירת הוספת נושאים" : "בדיקת זכאות בנושאים נוספים"}
          </Button>
        </div>

        {additionalTopics.length > 0 && (
          <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-2" data-testid="summary-additional-topics">
            <div className="text-xs font-semibold">
              נבחרו {additionalTopics.length} נושאים נוספים לבדיקה — יישלחו בפנייה אחת משולבת.
            </div>
            <ul className="space-y-1.5">
              {additionalTopics.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-2 text-xs rounded border border-primary/20 bg-card px-2 py-1.5"
                  data-testid={`row-additional-${t.id}`}
                >
                  <span className="truncate">
                    <span className="font-medium">{t.topic}</span>
                    <span className="text-muted-foreground mr-1">· {t.category}</span>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleAdditionalTopic(t)}
                    data-testid={`button-remove-additional-${t.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    הסרה
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {additionalOpen && (
          <div className="space-y-3" data-testid="picker-additional-topics">
            <div className="text-xs text-muted-foreground">בחרו קטגוריה ולאחר מכן נושא להוספה לרשימה.</div>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              data-testid="select-additional-category"
              aria-label="בחרו קטגוריה"
            >
              <option value="">בחרו קטגוריה</option>
              {additionalCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {category && (
              categoryTopics.length === 0 ? (
                <p className="text-xs text-muted-foreground">לא נמצאו נושאים נוספים בקטגוריה זו.</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-2">
                  {categoryTopics.map((topic) => {
                    const selected = additionalTopics.some((item) => item.id === topic.id);
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => toggleAdditionalTopic(topic)}
                        className={`text-right rounded-md border p-3 text-sm hover-elevate flex items-center justify-between gap-2 ${
                          selected ? "border-primary bg-primary/10" : "border-border bg-muted/20"
                        }`}
                        data-testid={`button-additional-topic-${topic.id}`}
                      >
                        <span className="truncate">{topic.topic}</span>
                        {selected ? (
                          <span className="text-[10px] inline-flex items-center gap-1 text-primary">
                            <CheckCircle2 className="w-3.5 h-3.5" /> נשמר
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">הוספה</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )
            )}
          </div>
        )}
      </Card>

      <Card className="p-5 border border-card-border bg-gradient-to-br from-card via-[hsl(42_70%_96%)] to-[hsl(190_50%_96%)] space-y-4" data-testid="card-submit-service">
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">אישורי שירות ומסמכים משפטיים</h3>
          <p className="text-xs text-muted-foreground">
            לפני שליחת הטופס צריך לקרוא ולאשר את המסמכים הרלוונטיים לפי סוג הפנייה. המסמכים זמינים לקריאה בעמוד <a className="underline" href="#/terms" target="_blank" rel="noopener noreferrer">תנאי השירות ומדיניות פרטיות</a>.
          </p>
          {requiredLegalDocs.map((key) => {
            const titles: Record<string, string> = {
              terms: "תנאי שירות כלליים",
              privacy: "מדיניות ושימוש במידע",
              poa: "ייפוי כוח / הרשאה לפעול מול גופים",
              confidentiality: "ויתור סודיות מוגבל",
              fee_agreement: "הסכמה לשכר טרחה / תנאי התשלום",
            };
            return (
              <label key={key} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={Boolean(legalDocsAccepted[key])}
                  onChange={(e) => setLegalDocsAccepted((p) => ({ ...p, [key]: e.target.checked }))}
                  data-testid={`checkbox-legal-${key}`}
                />
                <span>
                  קראתי ואני מסכים ל-<a className="underline font-semibold" href={`#/terms?doc=${key}`} target="_blank" rel="noopener noreferrer">{titles[key]}</a>.
                </span>
              </label>
            );
          })}
        </div>
        <label className="flex items-start gap-3 text-sm border-t pt-3">
          <input
            type="checkbox"
            className="mt-1"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            data-testid="checkbox-terms"
          />
          <span>
            אני מאשר/ת סיכום: המידע נמסר לצורך בדיקת זכאות ומיצוי זכויות, המידע ממלא נכון ועדכני כמיטב יכולתי, לא מהווה החלטת זכאות סופית, וצוות בקלות רשאי ליצור קשר בטלפון / וואטסאפ / מייל / מערכת קולית לפי הפרטים שמילאתי.
          </span>
        </label>
        {(!requestType || missingRequiredContact) && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status" aria-live="polite" data-testid="notice-submit-requirements">
            לפני השליחה צריך לבחור איך תרצו להמשיך, ולמלא שם מלא, טלפון ומייל. אם בחרתם טיפול בבקשה, מומלץ למלא גם את השאלון המורחב והמסמכים.
          </div>
        )}
        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={!canSubmit}
          onClick={() => {
            if (!canSubmit) {
              toast({ title: "חסרים פרטים לשליחה", description: "בחרו סוג פנייה, מלאו שם מלא, טלפון ומייל, ואשרו את תנאי השירות.", variant: "destructive" });
              return;
            }
            submitMutation.mutate();
          }}
          data-testid="button-submit-service"
        >
          <Send className="w-4 h-4 ml-1" />
          {submitMutation.isPending ? "שולח את הטופס..." : "שליחת הטופס לבקלות"}
        </Button>
      </Card>

      <Card className="p-5 border border-primary/20 bg-primary/5 text-sm" data-testid="card-service-footer">
        <p className="font-semibold">בקלות - כל מה שמגיע לכם, בקלות.</p>
        <p className="mt-2">
          ליצירת קשר: טלפון {CONTACT_PHONE}, מייל {CONTACT_EMAIL}, או דרך עמדות נדרים פלוס. ניתן גם לפתוח נושא נוסף מתוך המאגר ולהמשיך בדיקה מסודרת.
        </p>
        <div className="mt-4">
          <Button asChild variant="outline">
            <Link href={`/p/topic/${row.id}`}><ArrowRight className="w-4 h-4 ml-1" /> חזרה לפרטי הנושא</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
