import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, Home } from "lucide-react";

const LABELS: Record<string, string> = {
  dashboard: "לוח בקרה",
  clients: "לקוחות",
  partners: "שותפים",
  referrals: "הפניות",
  entitlements: "זכאויות",
  messages: "תיבת תקשורת",
  documents: "מסמכים",
  settings: "הגדרות",
  "partner-portal": "פורטל שותפים",
  "client-area": "אזור אישי",
  new: "חדש",
};

export function Breadcrumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname === "/" || pathname === "/dashboard") return null;
  const parts = pathname.split("/").filter(Boolean);
  let acc = "";
  const crumbs = parts.map((p) => {
    acc += "/" + p;
    const isDynamic = !LABELS[p] && p.length > 12;
    return { url: acc, label: LABELS[p] ?? (isDynamic ? "פרטים" : p) };
  });
  return (
    <nav className="hidden md:flex items-center text-xs text-muted-foreground gap-1" aria-label="breadcrumb">
      <Link to="/dashboard" className="flex items-center gap-1 hover:text-foreground">
        <Home className="h-3 w-3" />
      </Link>
      {crumbs.map((c, i) => (
        <span key={c.url} className="flex items-center gap-1">
          <ChevronLeft className="h-3 w-3" />
          {i === crumbs.length - 1 ? (
            <span className="text-foreground">{c.label}</span>
          ) : (
            <Link to={c.url} className="hover:text-foreground">{c.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}
