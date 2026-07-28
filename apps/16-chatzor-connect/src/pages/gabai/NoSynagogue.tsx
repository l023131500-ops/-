import { Building2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export function NoSynagogue() {
  return (
    <EmptyState
      icon={Building2}
      title="לא שויך בית כנסת"
      description="פנו למועצה הדתית כדי שישייכו את חשבונכם לבית הכנסת שלכם."
    />
  );
}
