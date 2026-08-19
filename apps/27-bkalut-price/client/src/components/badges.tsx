import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldCheck } from "lucide-react";

export function HaredinessBadge({ value }: { value: string }) {
  if (!value) return null;
  // Modesty marker — only fertility/intimacy/birth themes, not generic "רגיש"
  // see client/src/lib/modesty.ts
  const needsModestWording = /צניעות|צנוע|פוריות|פריון|הריון|היריון|לידה|אינטימ|אישות|טהרת המשפחה|הפלה|IVF|הזרעה/.test(value);
  const isHighFit = value.includes("מתאים מאוד");

  if (needsModestWording) {
    return (
      <Badge
        variant="outline"
        className="bg-[hsl(42_85%_93%)] text-[hsl(32_72%_26%)] border-[hsl(42_70%_76%)] gap-1"
        data-testid="badge-modest-wording"
      >
        <AlertTriangle className="w-3 h-3" />
        דורש ניסוח צנוע
      </Badge>
    );
  }
  if (isHighFit) {
    return (
      <Badge
        variant="outline"
        className="bg-[hsl(187_40%_92%)] text-[hsl(187_82%_22%)] border-[hsl(187_40%_82%)] gap-1"
        data-testid="badge-haredi-fit"
      >
        <ShieldCheck className="w-3 h-3" />
        מתאים לציבור חרדי
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="bg-secondary/60 text-secondary-foreground/80 border-border gap-1"
      data-testid="badge-haredi-regular"
    >
      <ShieldCheck className="w-3 h-3" />
      פרסום ציבורי רגיל
    </Badge>
  );
}

export function TypeBadge({ kind }: { kind: "right" | "org" }) {
  if (kind === "right") {
    return (
      <Badge className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15" data-testid="badge-type-right">
        זכות / הטבה רשמית
      </Badge>
    );
  }
  return (
    <Badge
      className="bg-[hsl(42_75%_88%)] text-[hsl(22_60%_28%)] border border-[hsl(42_60%_70%)] hover:bg-[hsl(42_75%_84%)]"
      data-testid="badge-type-org"
    >
      ארגון / עמותה — פנייה לסיוע
    </Badge>
  );
}
