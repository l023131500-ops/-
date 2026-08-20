import { useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Shield, ChevronLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listVisibilityRules, upsertVisibilityRule, type VisibilityRule } from "@/lib/admin.functions";
import { PRETTY_CATEGORY } from "@/lib/partner-categories";

const SCHEMA_FIELDS: { key: string; label: string }[] = [
  { key: "full_name", label: "שם מלא" },
  { key: "phone", label: "טלפון" },
  { key: "email", label: 'דוא"ל' },
  { key: "lead_source", label: "מקור הגעה" },
  { key: "payment_status", label: "סטטוס מנוי" },
  { key: "raw_voicemail_transcription", label: "תמלול הודעה קולית" },
  { key: "uploaded_documents", label: "מסמכים שהועלו" },
  { key: "internal_admin_notes", label: "הערות מנהל פנימיות" },
];

export function VisibilityRulesGrid() {
  const listFn = useServerFn(listVisibilityRules);
  const { data } = useSuspenseQuery({ queryKey: ["visibilityRules"], queryFn: () => listFn() });
  const [editing, setEditing] = useState<VisibilityRule | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((rule) => (
          <Card
            key={rule.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setEditing(rule)}
            role="button"
            tabIndex={0}
            aria-label={`עריכת הרשאות חשיפה עבור ${PRETTY_CATEGORY[rule.partner_category] ?? rule.partner_category}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setEditing(rule);
              }
            }}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{PRETTY_CATEGORY[rule.partner_category] ?? rule.partner_category}</CardTitle>
                </div>
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">שדות מותרים לחשיפה</span>
                <Badge variant="secondary">{rule.allowed_schema_fields.length} / {SCHEMA_FIELDS.length}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editing && (
        <EditSheet rule={editing} onClose={() => setEditing(null)} />
      )}
    </>
  );
}

function EditSheet({ rule, onClose }: { rule: VisibilityRule; onClose: () => void }) {
  const [selected, setSelected] = useState<string[]>(rule.allowed_schema_fields);
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertVisibilityRule);
  const mutation = useMutation({
    mutationFn: () => upsertFn({ data: { category: rule.partner_category, allowedFields: selected } }),
    onSuccess: () => {
      toast.success("הרשאות החשיפה עודכנו");
      qc.invalidateQueries({ queryKey: ["visibilityRules"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (key: string) => {
    setSelected((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="left" dir="rtl" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-right">{PRETTY_CATEGORY[rule.partner_category] ?? rule.partner_category}</SheetTitle>
          <SheetDescription className="text-right">
            סמן אילו שדות מהפרופיל יוצגו לשותפים מקטגוריה זו.
          </SheetDescription>
        </SheetHeader>
        <div className="py-6 space-y-3">
          {SCHEMA_FIELDS.map((f) => (
            <label key={f.key} className="flex items-center justify-between gap-3 p-3 rounded-md border hover:bg-accent/50 cursor-pointer">
              <span className="text-sm font-medium">{f.label}</span>
              <Checkbox checked={selected.includes(f.key)} onCheckedChange={() => toggle(f.key)} />
            </label>
          ))}
        </div>
        <SheetFooter>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "שומר..." : "שמירת הגדרות"}
          </Button>
          <Button variant="outline" onClick={onClose}>ביטול</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
