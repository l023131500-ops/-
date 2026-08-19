import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { OrgRow } from "@shared/schema";
import { Link, useRoute } from "wouter";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, AlertTriangle, Edit3, Save } from "lucide-react";
import { HaredinessBadge, TypeBadge } from "@/components/badges";
import { CopyButton } from "@/components/copy-button";
import { renderWithLinks } from "@/lib/links";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const ORG_EDIT_FIELDS: Array<[keyof OrgRow, string, "short" | "long"]> = [
  ["order", "סדר", "short"],
  ["category", "קטגוריה", "short"],
  ["name", "ארגון / גוף", "short"],
  ["bodyType", "סוג הגוף", "short"],
  ["audience", "למי מיועד", "long"],
  ["helpProvided", "מה הסיוע בפועל", "long"],
  ["conditions", "תנאים ודגשים", "long"],
  ["preparation", "מה צריך להכין מראש", "long"],
  ["requirements", "מסמכים / פרטים נדרשים", "long"],
  ["howToContact", "איך פונים בפועל", "long"],
  ["phoneEmail", "טלפון / מייל מרכזי", "long"],
  ["sourceLink", "קישור מקור", "long"],
  ["haredi", "התאמה לציבור חרדי", "long"],
];

function Section({ title, children, testId }: { title: string; children: React.ReactNode; testId: string }) {
  return (
    <section className="space-y-2" data-testid={`section-org-${testId}`}>
      <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">{title}</h2>
      <div className="text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function LongText({ text, testId }: { text: string; testId: string }) {
  if (!text) return <p className="text-muted-foreground italic text-sm">אין מידע במאגר</p>;
  return (
    <div className="whitespace-prewrap leading-relaxed text-foreground" data-testid={`text-org-${testId}`}>
      {renderWithLinks(text)}
    </div>
  );
}

function orgFieldValue(row: OrgRow, key: keyof OrgRow) {
  const value = row[key];
  return value === null || value === undefined ? "" : String(value);
}

function EditOrgCard({ row }: { row: OrgRow }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const next: Record<string, string> = {};
    ORG_EDIT_FIELDS.forEach(([key]) => {
      next[key] = orgFieldValue(row, key);
    });
    setValues(next);
  }, [row]);

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/orgs/${row.id}`, values);
      return (await response.json()) as OrgRow;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["/api/orgs", String(row.id)], updated);
      queryClient.invalidateQueries({ queryKey: ["/api/orgs"] });
      toast({ title: "נשמר", description: "פרטי הארגון עודכנו במאגר." });
      setOpen(false);
    },
    onError: (error) => {
      toast({ title: "שגיאה בשמירה", description: error instanceof Error ? error.message : "לא ניתן לשמור", variant: "destructive" });
    },
  });

  return (
    <Card className="p-5 bg-card border border-card-border space-y-4" data-testid="card-edit-org">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">עריכת פרטי הארגון</h2>
          <p className="text-xs text-muted-foreground mt-1">
            ניתן לעדכן את פרטי העמותה, תנאי הפנייה, מסמכים, טלפונים וקישור מקור. הערות פנימיות אינן נחשפות באתר הציבורי.
          </p>
        </div>
        <Button type="button" variant={open ? "secondary" : "default"} onClick={() => setOpen((v) => !v)} data-testid="button-toggle-edit-org">
          <Edit3 className="w-4 h-4 ml-1" />
          {open ? "סגור עריכה" : "פתח עריכה"}
        </Button>
      </div>
      {open && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            {ORG_EDIT_FIELDS.map(([key, label, size]) => (
              <label key={key} className={size === "long" ? "md:col-span-2 space-y-1" : "space-y-1"}>
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
                {size === "short" ? (
                  <Input value={values[key] ?? ""} onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))} data-testid={`input-edit-org-${key}`} />
                ) : (
                  <Textarea value={values[key] ?? ""} onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))} className="min-h-28 leading-relaxed" data-testid={`textarea-edit-org-${key}`} />
                )}
              </label>
            ))}
          </div>
          <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()} data-testid="button-save-org">
            <Save className="w-4 h-4 ml-1" />
            {mutation.isPending ? "שומר..." : "שמור שינויים במאגר"}
          </Button>
        </div>
      )}
    </Card>
  );
}

export default function OrgDetail() {
  const [, params] = useRoute("/orgs/:id");
  const id = params?.id;
  const { data: row, isLoading } = useQuery<OrgRow>({
    queryKey: ["/api/orgs", id],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }
  if (!row) {
    return (
      <div className="text-center py-16">
        <p className="font-medium">לא נמצא במאגר</p>
        <Link href="/orgs" className="text-primary text-sm mt-3 inline-block">
          חזרה לרשימת העמותות
        </Link>
      </div>
    );
  }

  return (
    <article className="space-y-6 pb-12" data-testid="page-org-detail">
      <Link href="/orgs" data-testid="link-back-to-orgs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="w-3.5 h-3.5" />
        חזרה לרשימת העמותות
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge kind="org" />
          <HaredinessBadge value={row.haredi} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{row.category}</p>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight mt-1" data-testid="text-org-detail-name">
            {row.name}
          </h1>
          {row.bodyType && (
            <p className="text-sm text-muted-foreground mt-1" data-testid="text-org-detail-bodytype">
              {row.bodyType}
            </p>
          )}
        </div>
      </header>

      <Card className="p-4 bg-[hsl(42_75%_94%)] border border-[hsl(42_60%_78%)]" data-testid="card-org-disclaimer">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[hsl(22_60%_38%)] mt-0.5 shrink-0" />
          <p className="text-sm leading-relaxed">
            <strong>חשוב:</strong> ארגון או עמותה הם <em>אפשרות לפנייה לסיוע</em> — לא זכות לפי חוק. הסיוע
            תלוי בנהלי הארגון, במלאי ובשיקול דעת. תמיד להציג ללקוח בצורה ברורה ולא כהתחייבות.
          </p>
        </div>
      </Card>

      <EditOrgCard row={row} />

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5 space-y-6 bg-card border border-card-border">
          <Section title="למי מיועד" testId="audience">
            <LongText text={row.audience} testId="audience" />
          </Section>
          <Section title="מה הסיוע בפועל" testId="help-provided">
            <LongText text={row.helpProvided} testId="help-provided" />
          </Section>
          {row.conditions && (
            <Section title="תנאים ודגשים" testId="conditions">
              <LongText text={row.conditions} testId="conditions" />
            </Section>
          )}
          {row.preparation && (
            <Section title="מה צריך להכין מראש" testId="preparation">
              <LongText text={row.preparation} testId="preparation" />
            </Section>
          )}
          {row.requirements && (
            <Section title="מסמכים / פרטים נדרשים" testId="requirements">
              <LongText text={row.requirements} testId="requirements" />
            </Section>
          )}
          {row.howToContact && (
            <Section title="איך פונים בפועל" testId="how-to-contact">
              <LongText text={row.howToContact} testId="how-to-contact" />
            </Section>
          )}
          {row.sourceLink && (
            <Section title="קישור מקור" testId="source-link">
              <LongText text={row.sourceLink} testId="source-link" />
            </Section>
          )}
        </Card>

        <aside className="space-y-4">
          {row.phoneEmail && (
            <Card className="p-5 bg-card border border-card-border" data-testid="card-org-phone">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                  טלפון / מייל מרכזי
                </h3>
                <CopyButton text={row.phoneEmail} label="העתק" testId="copy-org-phone" />
              </div>
              <p className="text-sm whitespace-prewrap leading-relaxed" data-testid="text-org-phone-content">
                {row.phoneEmail}
              </p>
            </Card>
          )}

          {row.internalNotes && (
            <Card className="p-5 bg-[hsl(354_55%_96%)] border border-[hsl(354_55%_84%)]" data-testid="card-org-internal-notes">
              <h3 className="text-xs uppercase tracking-widest text-[hsl(354_60%_32%)] font-semibold mb-2">
                הערות פנימיות לשימוש במאגר
              </h3>
              <p className="text-sm whitespace-prewrap leading-relaxed text-foreground/85">
                {row.internalNotes}
              </p>
            </Card>
          )}
        </aside>
      </div>

      <div>
        <Button asChild variant="outline" data-testid="button-back-bottom-orgs">
          <Link href="/orgs">
            <ArrowRight className="w-4 h-4 ml-1" />
            חזרה לרשימת העמותות
          </Link>
        </Button>
      </div>
    </article>
  );
}
