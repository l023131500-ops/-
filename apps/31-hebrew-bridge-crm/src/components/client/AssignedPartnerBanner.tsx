import { UserCheck } from "lucide-react";
import { Card } from "@/components/ui/card";

export function AssignedPartnerBanner({ partnerName }: { partnerName: string }) {
  const initials = partnerName
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("");

  return (
    <Card className="flex items-center gap-4 p-4 border-primary/20 bg-primary/5" dir="rtl">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-semibold">
        {initials || <UserCheck className="h-6 w-6" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">המומחה המלווה שלך</p>
        <p className="text-base font-semibold text-foreground truncate">
          התיק שלך מטופל על ידי המומחה המלווה: {partnerName}
        </p>
      </div>
    </Card>
  );
}
