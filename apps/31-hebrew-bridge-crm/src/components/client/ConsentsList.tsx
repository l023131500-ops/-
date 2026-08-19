import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { setClientConsent, type ClientConsent } from "@/lib/client.functions";
import { prettyCategory, prettyField } from "@/lib/partner-categories";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const dateFmt = new Intl.DateTimeFormat("he-IL", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function ConsentsList({ consents }: { consents: ClientConsent[] }) {
  const qc = useQueryClient();
  const saveFn = useServerFn(setClientConsent);
  const [pending, setPending] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (vars: { category: string; isGranted: boolean }) => saveFn({ data: vars }),
    onSuccess: (_res, vars) => {
      toast.success(
        vars.isGranted
          ? `השיתוף עם ${prettyCategory(vars.category)} הופעל`
          : `השיתוף עם ${prettyCategory(vars.category)} בוטל`,
      );
      qc.invalidateQueries({ queryKey: ["clientConsents"] });
    },
    onError: (e: Error) => toast.error(e.message || "שגיאה בשמירת ההרשאה"),
    onSettled: () => setPending(null),
  });

  if (consents.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground" dir="rtl">
        לא הוגדרו קטגוריות שותפים במערכת, ולכן אין כרגע מה לשתף.
      </Card>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {consents.map((c) => {
        const isPending = mutation.isPending && pending === c.category;
        const switchId = `consent-${c.category}`;
        return (
          <Card key={c.category} className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={
                    c.isGranted
                      ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600"
                      : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                  }
                >
                  {c.isGranted ? (
                    <ShieldCheck className="h-5 w-5" />
                  ) : (
                    <ShieldOff className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <Label htmlFor={switchId} className="text-base font-semibold text-foreground">
                    {prettyCategory(c.category)}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {c.isGranted
                      ? "שותפים בקטגוריה זו רשאים לצפות בפרטים המסומנים למטה."
                      : "שותפים בקטגוריה זו אינם רשאים לצפות בפרטיך."}
                  </p>
                  {c.updatedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      עודכן ב־{dateFmt.format(new Date(c.updatedAt))}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                <Switch
                  id={switchId}
                  checked={c.isGranted}
                  disabled={mutation.isPending}
                  aria-label={`שיתוף מידע עם ${prettyCategory(c.category)}`}
                  onCheckedChange={(next) => {
                    setPending(c.category);
                    mutation.mutate({ category: c.category, isGranted: next });
                  }}
                />
              </div>
            </div>

            <div className="border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {c.allowedFields.length > 0
                  ? "פרטים שייחשפו בקטגוריה זו:"
                  : "המנהל טרם הגדיר אילו פרטים נחשפים בקטגוריה זו — כרגע לא ייחשף שום פרט."}
              </p>
              {c.allowedFields.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {c.allowedFields.map((f) => (
                    <Badge key={f} variant="outline" className="border-primary/30 text-primary">
                      {prettyField(f)}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
