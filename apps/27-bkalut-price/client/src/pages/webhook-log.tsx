/**
 * Admin view of every outbound webhook (NEDARIM3873 + others).
 * Shows status, payload preview, response, attempts, retry.
 */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminGate } from "@/components/admin-gate";
import { RefreshCcw, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LogRow {
  id: number;
  source: string;
  endpointUrl: string;
  relatedKind?: string | null;
  relatedId?: number | null;
  status: string;
  httpStatus: number | null;
  responseText: string | null;
  attempts: number;
  lastAttemptAt: string | null;
  nextRetryAt?: string | null;
  createdAt: string;
  payload?: any;
  payloadJson: string;
}

function WebhookLogInner() {
  const { toast } = useToast();
  const [filter, setFilter] = useState("");
  const [opened, setOpened] = useState<number | null>(null);
  const q = useQuery<LogRow[]>({ queryKey: ["/api/admin/webhook-log"] });
  const retry = useMutation({
    mutationFn: async (id: number) => (await apiRequest("POST", `/api/admin/webhook-log/${id}/retry`)).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/webhook-log"] }),
    onError: () => toast({ title: "ניסיון החוזר נכשל", variant: "destructive" }),
  });
  const data = (q.data ?? []).filter((r) => {
    const t = filter.trim().toLowerCase();
    if (!t) return true;
    return [r.source, r.status, r.endpointUrl, r.relatedKind].some((v) => (v || "").toLowerCase().includes(t));
  });

  return (
    <div dir="rtl" className="space-y-4" data-testid="page-webhook-log">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">יומן וובהוקים</p>
          <h1 className="text-xl md:text-2xl font-bold">פניות וטיפולים שנשלחו ל-NEDARIM3873 ולמערכות חיצוניות</h1>
          <p className="text-sm text-muted-foreground max-w-2xl mt-1">
            כל פנייה — זכויות, פיננסי, שליחת פרטי כניסה, החלטות פרימיום — נרשמת כאן עם סטטוס, קוד HTTP,
            תגובה ומספר ניסיונות. ניתן להריץ ניסיון נוסף לכל שורה שנכשלה.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="חיפוש מקור / סטטוס / endpoint" value={filter} onChange={(e) => setFilter(e.target.value)} className="w-72" />
          <Button variant="outline" onClick={() => q.refetch()} size="sm" className="gap-1"><RefreshCcw className="w-4 h-4" /> רענן</Button>
        </div>
      </header>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-right">
            <tr>
              <th className="py-2 px-3">#</th>
              <th className="py-2 px-3">תאריך</th>
              <th className="py-2 px-3">מקור</th>
              <th className="py-2 px-3">קישור</th>
              <th className="py-2 px-3">סטטוס</th>
              <th className="py-2 px-3">HTTP</th>
              <th className="py-2 px-3">ניסיונות</th>
              <th className="py-2 px-3 text-left">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading && <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">טוען...</td></tr>}
            {!q.isLoading && data.length === 0 && <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">אין רשומות תואמות.</td></tr>}
            {data.map((r) => (
              <>
                <tr key={r.id} className="border-t border-border">
                  <td className="py-2 px-3 font-mono text-xs">{r.id}</td>
                  <td className="py-2 px-3 text-xs" dir="ltr">{r.createdAt?.slice(0, 19).replace("T", " ")}</td>
                  <td className="py-2 px-3">{r.source}</td>
                  <td className="py-2 px-3 text-xs">{r.relatedKind ? `${r.relatedKind} #${r.relatedId}` : "—"}</td>
                  <td className="py-2 px-3">
                    <Badge variant={r.status === "sent" ? "default" : r.status === "failed" ? "destructive" : "secondary"} className="text-[11px]">{r.status}</Badge>
                  </td>
                  <td className="py-2 px-3 text-xs">{r.httpStatus ?? "—"}</td>
                  <td className="py-2 px-3 text-xs">{r.attempts}</td>
                  <td className="py-2 px-3 text-left flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setOpened(opened === r.id ? null : r.id)} className="gap-1"><Eye className="w-3.5 h-3.5" /> פרטים</Button>
                    {r.status !== "sent" && (
                      <Button size="sm" variant="outline" disabled={retry.isPending} onClick={() => retry.mutate(r.id)} className="gap-1">
                        <RefreshCcw className="w-3.5 h-3.5" /> נסה שוב
                      </Button>
                    )}
                  </td>
                </tr>
                {opened === r.id && (
                  <tr className="border-t border-border bg-muted/20">
                    <td colSpan={8} className="py-3 px-3">
                      <div className="space-y-2 text-xs">
                        <div><strong>Endpoint:</strong> <span dir="ltr">{r.endpointUrl}</span></div>
                        {r.lastAttemptAt && <div><strong>ניסיון אחרון:</strong> <span dir="ltr">{r.lastAttemptAt}</span></div>}
                        {r.nextRetryAt && <div><strong>ניסיון הבא מתוזמן:</strong> <span dir="ltr">{r.nextRetryAt}</span></div>}
                        {r.responseText && <div><strong>תגובת השרת:</strong> <pre className="bg-background border rounded p-2 overflow-x-auto whitespace-pre-wrap" dir="ltr">{r.responseText}</pre></div>}
                        <div><strong>Payload:</strong>
                          <pre className="bg-background border rounded p-2 overflow-x-auto whitespace-pre-wrap" dir="ltr">{JSON.stringify(r.payload ?? safeParse(r.payloadJson), null, 2)}</pre>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function safeParse(s: string) { try { return JSON.parse(s); } catch { return s; } }

export default function WebhookLogPage() {
  return (
    <AdminGate>
      <WebhookLogInner />
    </AdminGate>
  );
}
