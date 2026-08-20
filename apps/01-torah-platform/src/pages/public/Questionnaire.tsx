import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

// Uses `leads` table: kind (required), full_name, phone, email, city, area, preferred_subject, message, tenant_id, status

const TOPICS = ["תלמוד בבלי", "תלמוד ירושלמי", "הלכה", "פרשת שבוע", "נביאים", "חסידות", "מוסר", "קבלה"];
const LEVELS = [
  { value: "beginner", label: "מתחיל" },
  { value: "intermediate", label: "בינוני" },
  { value: "advanced", label: "מתקדם" },
];
const TIMES = ["בוקר (6:00-9:00)", "צהריים (12:00-14:00)", "ערב (19:00-22:00)", "לילה (22:00+)", "גמיש"];
const CITIES = ["ירושלים", "תל אביב", "בני ברק", "ביתר עילית", "מודיעין עילית", "אחר", "מרחוק (Zoom)"];

type Role = "seeker" | "teacher" | null;

interface FormData {
  role: Role;
  topics: string[];
  level: string;
  times: string[];
  city: string;
  full_name: string;
  phone: string;
  email: string;
  notes: string;
}

const initialForm: FormData = {
  role: null,
  topics: [],
  level: "",
  times: [],
  city: "",
  full_name: "",
  phone: "",
  email: "",
  notes: "",
};

export default function Questionnaire() {
  const { tenant } = useTenant();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(initialForm);
  const [submitted, setSubmitted] = useState(false);

  const toggleArray = (arr: string[], val: string): string[] =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  const submit = useMutation({
    mutationFn: async () => {
      if (!form.role) throw new Error("יש לבחור תפקיד");
      const preferred = [...form.topics, ...(form.level ? [`רמה: ${form.level}`] : []), ...form.times].join(", ");
      const payload: {
        kind: string;
        full_name: string;
        phone: string;
        email?: string | null;
        city?: string | null;
        preferred_subject?: string | null;
        message?: string | null;
        tenant_id?: string | null;
        status: string;
      } = {
        kind: form.role,
        full_name: form.full_name,
        phone: form.phone,
        email: form.email || null,
        city: form.city || null,
        preferred_subject: preferred || null,
        message: form.notes || null,
        status: "new",
      };
      if (tenant?.id) payload.tenant_id = tenant.id;
      const { error } = await supabase.from("leads").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => setSubmitted(true),
    onError: (e: Error) => toast.error(e.message),
  });

  if (submitted) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-10 pb-10">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">תודה רבה!</h2>
            <p className="text-muted-foreground">
              {form.role === "seeker"
                ? "פנייתך התקבלה. נחזור אליך בהקדם עם הצעות שיעורים מתאימות."
                : "פנייתך התקבלה. נשמח לחבר אותך עם תלמידים מתאימים בקרוב."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const steps = [
    {
      title: "מי אתה?",
      valid: !!form.role,
      content: (
        <div className="grid grid-cols-2 gap-4">
          {(["seeker", "teacher"] as const).map((r) => (
            <Card
              key={r}
              className={`cursor-pointer transition-all p-6 text-center ${
                form.role === r ? "border-primary bg-primary/5 ring-2 ring-primary" : "hover:border-primary/50"
              }`}
              onClick={() => setForm({ ...form, role: r })}
            >
              <div className="text-4xl mb-2">{r === "seeker" ? "📖" : "🎓"}</div>
              <div className="font-semibold">{r === "seeker" ? "מחפש ללמוד" : "מורה / מגיד שיעור"}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {r === "seeker" ? "אני מחפש מורה / שיעור" : "אני רוצה ללמד תלמידים"}
              </div>
            </Card>
          ))}
        </div>
      ),
    },
    {
      title: "העדפות לימוד",
      valid: form.topics.length > 0 && !!form.level,
      content: (
        <div className="space-y-5">
          <div>
            <Label className="mb-2 block">נושאים מועדפים (בחר אחד או יותר)</Label>
            <div className="flex flex-wrap gap-2">
              {TOPICS.map((t) => (
                <Badge
                  key={t}
                  variant={form.topics.includes(t) ? "default" : "outline"}
                  className="cursor-pointer text-sm py-1 px-3"
                  onClick={() => setForm({ ...form, topics: toggleArray(form.topics, t) })}
                >
                  {t}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <Label className="mb-2 block">רמה</Label>
            <div className="flex gap-3">
              {LEVELS.map((l) => (
                <Card
                  key={l.value}
                  className={`cursor-pointer flex-1 text-center p-3 ${
                    form.level === l.value ? "border-primary bg-primary/5" : "hover:border-primary/50"
                  }`}
                  onClick={() => setForm({ ...form, level: l.value })}
                >
                  <div className="font-medium text-sm">{l.label}</div>
                </Card>
              ))}
            </div>
          </div>
          <div>
            <Label className="mb-2 block">זמנים מועדפים</Label>
            <div className="flex flex-wrap gap-2">
              {TIMES.map((t) => (
                <Badge
                  key={t}
                  variant={form.times.includes(t) ? "default" : "outline"}
                  className="cursor-pointer text-sm py-1 px-3"
                  onClick={() => setForm({ ...form, times: toggleArray(form.times, t) })}
                >
                  {t}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <Label className="mb-2 block">עיר</Label>
            <Select value={form.city} onValueChange={(v) => setForm({ ...form, city: v })}>
              <SelectTrigger>
                <SelectValue placeholder="בחר עיר..." />
              </SelectTrigger>
              <SelectContent>
                {CITIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ),
    },
    {
      title: "פרטי קשר",
      valid: !!form.full_name && !!form.phone,
      content: (
        <div className="space-y-4">
          <div>
            <Label htmlFor="q-name">שם מלא *</Label>
            <Input
              id="q-name"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="ישראל ישראלי"
            />
          </div>
          <div>
            <Label htmlFor="q-phone">טלפון *</Label>
            <Input
              id="q-phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="050-0000000"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
            />
          </div>
          <div>
            <Label htmlFor="q-email">אימייל (אופציונלי)</Label>
            <Input
              id="q-email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@example.com"
              type="email"
              inputMode="email"
              autoComplete="email"
            />
          </div>
          <div>
            <Label htmlFor="q-notes">הערות נוספות</Label>
            <Input
              id="q-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="כל מידע נוסף שיעזור לנו..."
            />
          </div>
        </div>
      ),
    },
  ];

  const current = steps[step];

  return (
    <div dir="rtl" className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-6 justify-center">
          {steps.map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  i < step
                    ? "bg-green-500 text-white"
                    : i === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted-foreground/30 text-muted-foreground"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-12 h-1 rounded ${i < step ? "bg-green-500" : "bg-muted-foreground/30"}`} />
              )}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{current.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {current.content}
            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => setStep((s) => s - 1)}
                disabled={step === 0}
              >
                <ChevronRight className="h-4 w-4 ml-1" />
                הקודם
              </Button>
              {step < steps.length - 1 ? (
                <Button onClick={() => setStep((s) => s + 1)} disabled={!current.valid}>
                  הבא
                  <ChevronLeft className="h-4 w-4 mr-1" />
                </Button>
              ) : (
                <Button
                  onClick={() => submit.mutate()}
                  disabled={!current.valid || submit.isPending}
                >
                  {submit.isPending ? "שולח..." : "שלח"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
