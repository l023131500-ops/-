import { useState, cloneElement, isValidElement } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { ArrowLeftRight, ShieldCheck, ArrowRight, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const FUNDS = ["כללית", "מכבי", "מאוחדת", "לאומית"];

const formSchema = z.object({
  fullName: z.string().min(2, "נא להזין שם מלא"),
  phone: z
    .string()
    .min(9, "נא להזין מספר טלפון תקין")
    .regex(/^[0-9\-+\s]{9,15}$/, "מספר הטלפון אינו תקין"),
  email: z.string().email("כתובת דוא\"ל אינה תקינה").optional().or(z.literal("")),
  idNumber: z
    .string()
    .regex(/^[0-9]{5,9}$/, "תעודת הזהות צריכה להכיל 5 עד 9 ספרות")
    .optional()
    .or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  currentFund: z.string().optional().or(z.literal("")),
  currentSupplemental: z.string().optional().or(z.literal("")),
  targetFund: z.string().optional().or(z.literal("")),
  peopleCount: z.string().optional().or(z.literal("")),
  note: z.string().optional().or(z.literal("")),
});
type FormValues = z.infer<typeof formSchema>;

export function SwitchFundDialog({
  topicId,
  topicName,
}: {
  topicId: number;
  topicName: string;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const { toast } = useToast();
  const STEPS = ["פרטי המעבר", "פרטי התקשרות", "אישור ושליחה"] as const;
  const STEP1_FIELDS = ["currentFund", "targetFund", "currentSupplemental"] as const;
  const STEP2_FIELDS = ["fullName", "phone", "email", "idNumber", "city", "peopleCount"] as const;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      idNumber: "",
      city: "",
      currentFund: "",
      currentSupplemental: "",
      targetFund: "",
      peopleCount: "",
      note: "",
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(values: FormValues) {
    try {
      await apiRequest("POST", "/api/switch-lead", {
        ...values,
        topicId,
        topic: topicName,
      });
      toast({
        title: "פנייתך התקבלה בהצלחה",
        description:
          "תודה שפנית אלינו. נציג/ה מטעמנו ייצור/תיצור עמך קשר בהקדם לבירור אפשרות המעבר וההתאמה.",
      });
      form.reset();
      setStep(0);
      setOpen(false);
    } catch (e: any) {
      toast({
        title: "אירעה שגיאה",
        description: e?.message || "לא ניתן היה לשלוח את הפנייה. נא לנסות שוב.",
        variant: "destructive",
      });
    }
  }

  async function goNext(e: React.MouseEvent) {
    e.preventDefault();
    const fields = step === 0 ? STEP1_FIELDS : STEP2_FIELDS;
    const valid = await form.trigger(fields as any);
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setStep(0);
      }}
    >
      <DialogTrigger asChild>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="outline"
            className="gap-2 border-primary/40 text-primary hover:bg-primary/5"
            data-testid={`button-switch-${topicId}`}
          >
            <ArrowLeftRight className="h-4 w-4" />
            מתעניין/ת במעבר קופה
          </Button>
        </motion.div>
      </DialogTrigger>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        dir="rtl"
      >
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            בקשת בדיקת מעבר קופה
          </DialogTitle>
          <DialogDescription className="text-right">
            נשמח לסייע בבדיקת התאמת קופה עבורך בנושא:{" "}
            <span className="font-medium text-foreground">{topicName}</span>. נא
            למלא את הפרטים ונחזור אליך בהקדם.
          </DialogDescription>
        </DialogHeader>

        <div
          className="flex items-center justify-between gap-1 text-xs"
          data-testid="wizard-steps"
        >
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`flex flex-1 items-center gap-2 ${
                i > 0 ? "border-r pr-2" : ""
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
                  i === step
                    ? "bg-primary text-primary-foreground"
                    : i < step
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </span>
              <span
                className={i === step ? "text-foreground" : "text-muted-foreground"}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-3"
          data-testid="form-switch-lead"
        >
          {step === 0 && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="קופה נוכחית">
                  <Select
                    defaultValue={form.getValues("currentFund")}
                    onValueChange={(v) => form.setValue("currentFund", v)}
                  >
                    <SelectTrigger data-testid="select-currentFund" aria-label="קופה נוכחית">
                      <SelectValue placeholder="בחר/י קופה" />
                    </SelectTrigger>
                    <SelectContent>
                      {FUNDS.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="קופת יעד">
                  <Select
                    defaultValue={form.getValues("targetFund")}
                    onValueChange={(v) => form.setValue("targetFund", v)}
                  >
                    <SelectTrigger data-testid="select-targetFund" aria-label="קופת יעד">
                      <SelectValue placeholder="בחר/י קופה" />
                    </SelectTrigger>
                    <SelectContent>
                      {FUNDS.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                      <SelectItem value="עדיין לא יודע/ת">עדיין לא יודע/ת</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label="ביטוח משלים / שב&quot;ן נוכחי">
                <Input
                  {...form.register("currentSupplemental")}
                  placeholder="לדוגמה: מכבי זהב (לא חובה)"
                  data-testid="input-currentSupplemental"
                />
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <Field id="fullName" label="שם מלא" required error={form.formState.errors.fullName?.message}>
                <Input
                  {...form.register("fullName")}
                  placeholder="שם פרטי ומשפחה"
                  data-testid="input-fullName"
                  autoComplete="name"
                />
              </Field>

              <Field id="phone" label="טלפון" required error={form.formState.errors.phone?.message}>
                <Input
                  {...form.register("phone")}
                  inputMode="tel"
                  maxLength={15}
                  placeholder="050-0000000"
                  data-testid="input-phone"
                  autoComplete="tel"
                />
              </Field>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field id="email" label="דוא&quot;ל" error={form.formState.errors.email?.message}>
                  <Input
                    {...form.register("email")}
                    type="email"
                    placeholder="name@example.com"
                    data-testid="input-email"
                    autoComplete="email"
                  />
                </Field>
                <Field id="idNumber" label="תעודת זהות" error={form.formState.errors.idNumber?.message}>
                  <Input
                    {...form.register("idNumber")}
                    inputMode="numeric"
                    maxLength={9}
                    placeholder="לא חובה"
                    data-testid="input-idNumber"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="יישוב מגורים">
                  <Input
                    {...form.register("city")}
                    placeholder="לא חובה"
                    data-testid="input-city"
                  />
                </Field>
                <Field label="מספר נפשות">
                  <Input
                    {...form.register("peopleCount")}
                    inputMode="numeric"
                    placeholder="לא חובה"
                    data-testid="input-peopleCount"
                  />
                </Field>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <Field label="הערה">
                <Textarea
                  {...form.register("note")}
                  rows={2}
                  placeholder="פרטים נוספים שברצונך לציין (לא חובה)"
                  aria-label="הערה"
                  data-testid="input-note"
                />
              </Field>

              <div
                className="space-y-1 rounded-md border bg-muted/30 p-3 text-sm"
                data-testid="wizard-review"
              >
                <p className="font-medium text-foreground">סיכום הבקשה</p>
                <ReviewRow label="מ / אל" value={
                  [form.getValues("currentFund"), form.getValues("targetFund")]
                    .filter(Boolean)
                    .join(" ← ") || "לא צוין"
                } />
                <ReviewRow label="שם" value={form.getValues("fullName") || "—"} />
                <ReviewRow label="טלפון" value={form.getValues("phone") || "—"} />
              </div>

              <p className="text-xs text-muted-foreground">
                הפרטים משמשים ליצירת קשר בלבד לצורך בירור אפשרות המעבר. אין
                באמור משום התחייבות או ייעוץ רפואי.
              </p>
            </>
          )}

          <div className="flex gap-2 pt-1">
            {step > 0 && (
              <Button
                type="button"
                variant="outline"
                className="gap-1"
                onClick={goBack}
                data-testid="button-wizard-back"
              >
                <ArrowRight className="h-4 w-4" />
                חזרה
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button
                key="wizard-next"
                type="button"
                className="flex-1 gap-1"
                onClick={goNext}
                data-testid="button-wizard-next"
              >
                המשך
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                key="wizard-submit"
                type="submit"
                className="flex-1"
                disabled={isSubmitting}
                data-testid="button-submit-lead"
              >
                {isSubmitting ? "שולח..." : "שליחת פנייה"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  required,
  error,
  children,
}: {
  id?: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  const errorId = id ? `${id}-error` : undefined;
  const content =
    id && isValidElement(children)
      ? cloneElement(children as React.ReactElement<any>, {
          id,
          "aria-invalid": !!error,
          "aria-describedby": error ? errorId : undefined,
        })
      : children;
  return (
    <div className="space-y-1.5 text-right">
      <Label htmlFor={id} className="text-sm">
        {label}
        {required && <span className="mr-1 text-destructive">*</span>}
      </Label>
      {content}
      {error && <p id={errorId} className="text-xs text-destructive" role="alert" aria-live="assertive">{error}</p>}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
