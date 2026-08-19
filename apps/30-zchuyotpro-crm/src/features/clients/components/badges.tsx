import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CLIENT_STATUS, STATUS_BADGE_COLOR, ENTITLEMENT_STATUS, ENTITLEMENT_STATUS_COLOR, ENTITLEMENT_CATEGORY, ENTITLEMENT_CATEGORY_COLOR, HEALTH_FUND, HEALTH_FUND_COLOR, REFERRAL_STATUS, REFERRAL_STATUS_COLOR } from "../constants";

export function EntitlementCategoryBadge({ category }: { category: string | null }) {
  if (!category) return <span className="text-muted-foreground">—</span>;
  const label = (ENTITLEMENT_CATEGORY as Record<string, string>)[category] ?? category;
  return <Badge className={cn("border-0", ENTITLEMENT_CATEGORY_COLOR[category] ?? "bg-muted")} variant="secondary">{label}</Badge>;
}

export function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const label = (CLIENT_STATUS as Record<string, string>)[status] ?? status;
  return <Badge className={cn("border-0", STATUS_BADGE_COLOR[status])} variant="secondary">{label}</Badge>;
}

export function EntitlementStatusBadge({ status }: { status: string | null }) {
  const key = status ?? "to_check";
  const label = (ENTITLEMENT_STATUS as Record<string, string>)[key] ?? key;
  return <Badge className={cn("border", ENTITLEMENT_STATUS_COLOR[key])} variant="outline">{label}</Badge>;
}

export function HealthFundBadge({ fund }: { fund: string | null }) {
  if (!fund) return <span className="text-muted-foreground">—</span>;
  const label = (HEALTH_FUND as Record<string, string>)[fund] ?? fund;
  return <Badge className={cn("border-0", HEALTH_FUND_COLOR[fund] ?? "bg-muted")} variant="secondary">{label}</Badge>;
}

export function ReferralStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const label = (REFERRAL_STATUS as Record<string, string>)[status] ?? status;
  return <Badge className={cn("border-0", REFERRAL_STATUS_COLOR[status])} variant="secondary">{label}</Badge>;
}
