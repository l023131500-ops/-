import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitLead } from "@/lib/leads.functions";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "צור קשר — בקלוט" },
      { name: "description", content: "השאירו פרטים ונחזור אליכם בהקדם." },
      { property: "og:title", content: "צור קשר — בקלוט" },
      { property: "og:description", content: "השאירו פרטים ונחזור אליכם בהקדם." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const submit = useServerFn(submitLead);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });

  const m = useMutation({
    mutationFn: (d: typeof form) => submit({ data: d }),
    onSuccess: () => {
      toast.success("תודה! קיבלנו את פנייתך ונחזור אליך בהקדם.");
      setForm({ name: "", email: "", phone: "", message: "" });
    },
    onError: (e: any) => toast.error(e?.message ?? "שגיאה בשליחת הטופס"),
  });

  return (
    <div dir="rtl" className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="text-2xl">צור קשר</CardTitle>
          <CardDescription>השאירו פרטים ונחזור אליכם בהקדם.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.name.trim()) {
                toast.error("נא להזין שם");
                return;
              }
              m.mutate(form);
            }}
          >
            <div className="space-y-2">
              <Label>שם מלא *</Label>
              <Input
                required
                maxLength={200}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>אימייל</Label>
                <Input
                  type="email"
                  maxLength={255}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>טלפון</Label>
                <Input
                  type="tel"
                  maxLength={50}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>הודעה</Label>
              <Textarea
                rows={5}
                maxLength={5000}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full" disabled={m.isPending}>
              <Send className="ml-2 h-4 w-4" />
              שליחה
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
