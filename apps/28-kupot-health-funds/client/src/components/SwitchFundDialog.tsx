import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { ArrowLeftRight, ShieldCheck } from "lucide-react";
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
  idNumber: z.string().optional().or(z.literal("")),
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
  const { toast } = useToast();

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
      setOpen(false);
    } catch (e: any) {
      toast({
        title: "אירעה שגיאה",
        description: e?.message || "לא ניתן היה לשלוח את הפנייה. נא לנסות שוב.",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-3"
          data-testid="form-switch-lead"
        >
          <Field label="שם מלא" required error={form.formState.errors.fullName?.message}>
            <Input
              {...form.register("fullName")}
              placeholder="שם פרטי ומשפחה"
              data-testid="input-fullName"
            />
          </Field>

          <Field label="טלפון" required error={form.formState.errors.phone?.message}>
            <Input
              {...form.register("phone")}
              inputMode="tel"
              placeholder="050-0000000"
              data-testid="input-phone"
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="דוא&quot;ל" error={form.formState.errors.email?.message}>
              <Input
                {...form.register("email")}
                type="email"
                placeholder="name@example.com"
                data-testid="input-email"
              />
            </Field>
            <Field label="תעודת זהות">
              <Input
                {...form.register("idNumber")}
                inputMode="numeric"
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="קופה נוכחית">
              <Select
                onValueChange={(v) => form.setValue("currentFund", v)}
              >
                <SelectTrigger data-testid="select-currentFund">
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
              <Select onValueChange={(v) => form.setValue("targetFund", v)}>
                <SelectTrigger data-testid="select-targetFund">
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

          <Field label="הערה">
            <Textarea
              {...form.register("note")}
              rows={2}
              placeholder="פרטים נוספים שברצונך לציין (לא חובה)"
              data-testid="input-note"
            />
          </Field>

          <p className="text-xs text-muted-foreground">
            הפרטים משמשים ליצירת קשר בלבד לצורך בירור אפשרות המעבר. אין באמור
            משום התחייבות או ייעוץ רפואי.
          </p>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
            data-testid="button-submit-lead"
          >
            {isSubmitting ? "שולח..." : "שליחת פנייה"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5 text-right">
      <Label className="text-sm">
        {label}
        {required && <span className="mr-1 text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
