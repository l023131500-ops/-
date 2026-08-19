import { Card } from "@/components/ui/card";
import { Users, Navigation, ShieldAlert, Coins } from "lucide-react";
import { PARAM_GROUPS, paramByKey, formatNumber, formatCurrency, formatDistance } from "@/lib/research";
import type { ResearchProfile, ResearchParameter } from "@shared/schema";

const GROUP_ICONS: Record<string, any> = {
  "אוכלוסייה ודמוגרפיה": Users,
  "נגישות ותחבורה": Navigation,
  "סביבה ובטיחות": ShieldAlert,
  "שווי ותשואה": Coins,
};

function renderValue(p: ResearchParameter): string {
  if (p.value == null) return "—";
  if (p.unit === "₪") return formatCurrency(Number(p.value));
  if (p.unit === "מ'") return formatDistance(Number(p.value));
  if (typeof p.value === "number") return `${formatNumber(p.value)}${p.unit ? ` ${p.unit}` : ""}`;
  return String(p.value);
}

export function DetailedReport({ profile }: { profile: ResearchProfile }) {
  return (
    <div className="space-y-6" data-testid="section-detailed-report">
      {PARAM_GROUPS.map((group) => {
        const params = group.keys
          .map((k) => paramByKey(profile, k))
          .filter((p): p is ResearchParameter => Boolean(p));
        if (params.length === 0) return null;
        const Icon = GROUP_ICONS[group.title] ?? Users;
        return (
          <Card key={group.title} className="p-6 text-right" data-testid={`group-${group.title}`}>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-accent/15 dark:text-accent">
                <Icon className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">{group.title}</h3>
            </div>
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {params.map((p) => (
                <div
                  key={p.key}
                  className="border-b border-border/60 pb-3"
                  data-testid={`param-${p.key}`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-muted-foreground">{p.label}</span>
                    <span className="text-base font-bold text-foreground">{renderValue(p)}</span>
                  </div>
                  {p.impact && (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{p.impact}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
