import { Badge } from "@/components/ui/badge";

const LEAD_LABELS: Record<string, { label: string; className: string }> = {
  whatsapp: { label: "וואטסאפ", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  email: { label: 'דוא"ל', className: "bg-blue-100 text-blue-800 border-blue-200" },
  yemot_hamashiach: { label: "ימות המשיח", className: "bg-purple-100 text-purple-800 border-purple-200" },
  nedarim_plus: { label: "נדרים פלוס", className: "bg-amber-100 text-amber-900 border-amber-200" },
};

export function LeadSourceBadge({ source }: { source: string | null }) {
  if (!source) return <span className="text-muted-foreground text-xs">—</span>;
  const cfg = LEAD_LABELS[source] ?? { label: source, className: "" };
  return <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: string }) {
  if (status === "active_subscriber") {
    return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600/90">מנוי פעיל</Badge>;
  }
  return <Badge variant="secondary">לא שולם</Badge>;
}
