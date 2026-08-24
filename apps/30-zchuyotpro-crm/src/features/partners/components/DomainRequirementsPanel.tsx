import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, Circle, EyeOff, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ALLOWED_CLIENT_FIELDS, type AllowedField } from "../constants";
import {
  domainsForCategory,
  type CollabDomain,
  type DocRequirement,
  type FieldRequirement,
} from "../domains";
import { clientReadinessQuery, type ClientReadiness } from "../queries";

// מוכנות-תיק מול מיפוי דרישות תחום (מפרט סעיפים 4+5):
// אילו שדות ומסמכים התחום דורש, מה קיים בתיק, ומה מתוכם בכלל משותף לשותף.

function fieldPresent(field: AllowedField, r: ClientReadiness): boolean {
  const c = r.client;
  switch (field) {
    case "full_name": return !!(c?.first_name || c?.last_name);
    case "id_number": return !!c?.id_number;
    case "phone": return !!c?.phone;
    case "email": return !!c?.email;
    case "birth_date": return !!c?.birth_date;
    case "marital_status": return !!c?.marital_status;
    case "num_children": return r.family.some((m) => m.relation === "child");
    case "family_members": return r.family.length > 0;
    case "financial_profile": return r.hasFinancial;
    case "housing_profile": return r.hasHousing;
    case "vehicles": return r.vehiclesCount > 0;
    case "entitlements": return r.entitlementsCount > 0;
    case "documents": return r.documents.length > 0;
    default: return false;
  }
}

function matchDocument(doc: DocRequirement, r: ClientReadiness): string | null {
  for (const d of r.documents) {
    const name = (d.file_name ?? "").toLowerCase();
    if (doc.keywords.some((kw) => name.includes(kw.toLowerCase()))) return d.file_name;
  }
  return null;
}

function LevelBadge({ level }: { level: FieldRequirement["level"] }) {
  return level === "required" ? (
    <span className="text-[10px] rounded px-1 py-0.5 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200">חובה</span>
  ) : (
    <span className="text-[10px] rounded px-1 py-0.5 bg-muted text-muted-foreground">מומלץ</span>
  );
}

function StatusIcon({ present, level }: { present: boolean; level: FieldRequirement["level"] }) {
  if (present) return <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />;
  if (level === "required") return <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />;
  return <Circle className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />;
}

export function DomainRequirementsPanel({
  category,
  allowedFields,
  clientId,
}: {
  category: string;
  allowedFields: AllowedField[];
  clientId?: string | null;
}) {
  const domains = useMemo(() => domainsForCategory(category), [category]);
  const [domainKey, setDomainKey] = useState<string | null>(null);
  const domain: CollabDomain | undefined =
    domains.find((d) => d.key === domainKey) ?? domains[0];

  const readiness = useQuery({
    ...clientReadinessQuery(clientId ?? ""),
    enabled: !!clientId && !!domain,
  });

  if (!domain) return null;
  const r = clientId ? readiness.data : undefined;

  const requiredTotal =
    domain.fields.filter((f) => f.level === "required").length +
    domain.documents.filter((d) => d.level === "required").length;
  const requiredPresent = r
    ? domain.fields.filter((f) => f.level === "required" && fieldPresent(f.field, r)).length +
      domain.documents.filter((d) => d.level === "required" && matchDocument(d, r) !== null).length
    : 0;

  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-xs font-medium text-muted-foreground">מיפוי דרישות לפי תחום</div>
        {clientId && r && (
          <span
            className={cn(
              "text-[11px] font-medium rounded px-1.5 py-0.5",
              requiredPresent === requiredTotal
                ? "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200"
                : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
            )}
          >
            מוכנות: {requiredPresent}/{requiredTotal} דרישות חובה
          </span>
        )}
        {clientId && readiness.isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>

      {domains.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          {domains.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setDomainKey(d.key)}
              className={cn(
                "text-xs rounded-full border px-2.5 py-1 transition-colors",
                d.key === domain.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">{domain.description}</p>

      <div className="space-y-1">
        <div className="text-[11px] font-medium text-muted-foreground">פרטים נדרשים</div>
        <ul className="space-y-1 text-sm">
          {domain.fields.map((f) => {
            const present = r ? fieldPresent(f.field, r) : undefined;
            const shared = allowedFields.includes(f.field);
            return (
              <li key={f.field} className="flex items-center gap-1.5 flex-wrap">
                {present !== undefined ? (
                  <StatusIcon present={present} level={f.level} />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                )}
                <span className={cn(present === false && f.level === "required" && "text-amber-700 dark:text-amber-400")}>
                  {ALLOWED_CLIENT_FIELDS[f.field]}
                </span>
                <LevelBadge level={f.level} />
                {!shared && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] rounded px-1 py-0.5 bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200">
                    <EyeOff className="h-2.5 w-2.5" /> לא משותף
                  </span>
                )}
                {present === false && f.level === "required" && (
                  <span className="text-[10px] text-amber-700 dark:text-amber-400">חסר בתיק</span>
                )}
                {f.reason && <span className="text-[10px] text-muted-foreground">· {f.reason}</span>}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="space-y-1">
        <div className="text-[11px] font-medium text-muted-foreground">מסמכים נדרשים</div>
        <ul className="space-y-1 text-sm">
          {domain.documents.map((d) => {
            const matched = r ? matchDocument(d, r) : undefined;
            return (
              <li key={d.label} className="flex items-center gap-1.5 flex-wrap">
                {matched !== undefined ? (
                  <StatusIcon present={matched !== null} level={d.level} />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                )}
                <span className={cn(matched === null && d.level === "required" && "text-amber-700 dark:text-amber-400")}>
                  {d.label}
                </span>
                <LevelBadge level={d.level} />
                {matched ? (
                  <span className="text-[10px] text-green-700 dark:text-green-400 truncate max-w-40" title={matched}>
                    ✓ {matched}
                  </span>
                ) : matched === null ? (
                  <span className="text-[10px] text-muted-foreground">לא אותר בתיק</span>
                ) : null}
              </li>
            );
          })}
        </ul>
        {clientId && (
          <p className="text-[10px] text-muted-foreground">
            איתור מסמכים לפי שם הקובץ — ייתכן שמסמך קיים בשם אחר.
          </p>
        )}
      </div>
    </div>
  );
}
