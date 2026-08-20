import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, Image as ImageIcon, Video as VideoIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, EntitlementStatusBadge, EntitlementCategoryBadge } from "@/features/clients/components/badges";

const GENERAL_LABEL = "__general__";

// Public, no-login case-status page — the link an agent shares from the
// client's "קישור שיתוף" card (see ShareLinkCard). Same base-path pitfall as
// auth.tsx: the app is served under /crm (vite base) but the router has no
// basepath of its own, so the API call must go through import.meta.env.BASE_URL
// rather than a plain relative path.
const apiUrl = (path: string) => `${window.location.origin}${import.meta.env.BASE_URL}${path}`;

type CaseStatus = {
  first_name: string;
  last_name: string;
  file_number: string | null;
  status: string;
  organization: string | null;
  assigned_agent: string | null;
  entitlements: { title: string | null; category: string | null; status: string; year: number | null }[];
  property_media: { id: string; property_label: string | null; media_type: "photo" | "video"; file_name: string; url: string | null }[];
};

export const Route = createFileRoute("/case/$token")({
  head: () => ({ meta: [{ title: "מעקב תיק | זכויות פרו" }] }),
  ssr: false,
  component: PublicCaseStatusPage,
});

function PublicCaseStatusPage() {
  const { token } = Route.useParams();
  const [data, setData] = useState<CaseStatus | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl(`api/public/case-status?token=${encodeURIComponent(token)}`))
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData(null); });
    return () => { cancelled = true; };
  }, [token]);

  if (data === undefined) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md text-center space-y-2">
          <h1 className="text-xl font-bold">הקישור אינו זמין</h1>
          <p className="text-sm text-muted-foreground">הקישור שגוי, פג תוקף, או שהשיתוף כובה על ידי הארגון.</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background flex flex-col items-center p-4 sm:p-8">
      <div className="w-full max-w-lg space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4" /> מעקב תיק — צפייה ללא כניסה
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>{data.first_name} {data.last_name}</CardTitle>
              {data.file_number && <div className="text-xs text-muted-foreground font-mono mt-1">{data.file_number}</div>}
            </div>
            <StatusBadge status={data.status} />
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            {data.organization && <div>ארגון מטפל: {data.organization}</div>}
            {data.assigned_agent && <div>איש קשר מטפל: {data.assigned_agent}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">זכאויות בטיפול</CardTitle>
          </CardHeader>
          <CardContent>
            {data.entitlements.length === 0 ? (
              <div className="text-sm text-muted-foreground">אין עדיין זכאויות רשומות בתיק.</div>
            ) : (
              <div className="space-y-2">
                {data.entitlements.map((e, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 border-b pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{e.title ?? "—"}</span>
                      <EntitlementCategoryBadge category={e.category} />
                    </div>
                    <div className="flex items-center gap-2">
                      {e.year && <span className="text-xs text-muted-foreground">{e.year}</span>}
                      <EntitlementStatusBadge status={e.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {data.property_media.length > 0 && <PropertyMediaGallery items={data.property_media} />}
      </div>
    </div>
  );
}

function PropertyMediaGallery({ items }: { items: CaseStatus["property_media"] }) {
  const groups = new Map<string, CaseStatus["property_media"]>();
  for (const m of items) {
    const key = m.property_label ?? GENERAL_LABEL;
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">תמונות ווידאו של הנכס</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {[...groups.entries()].map(([key, group]) => (
          <div key={key} className="space-y-2">
            {key !== GENERAL_LABEL && <div className="text-sm font-medium text-muted-foreground">{key}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {group.map((m) => (
                <div key={m.id} className="space-y-1">
                  {m.media_type === "video" ? (
                    <video src={m.url ?? undefined} controls className="w-full aspect-video rounded-md bg-black object-contain" />
                  ) : (
                    <img src={m.url ?? undefined} alt={m.file_name} className="w-full aspect-video rounded-md object-cover" />
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {m.media_type === "video" ? <VideoIcon className="h-3.5 w-3.5 shrink-0" /> : <ImageIcon className="h-3.5 w-3.5 shrink-0" />}
                    <span className="truncate">{m.file_name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
