import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { RefreshCw, RotateCw, Save, Copy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getWebhookSettings,
  listOutboxQueue,
  retryOutboxItem,
  updateWebhookSettings,
} from "@/lib/webhooks.functions";

export const Route = createFileRoute("/_authenticated/admin/integrations")({
  component: IntegrationsPage,
});

function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "ממתין", variant: "secondary" },
    sent: { label: "נשלח", variant: "default" },
    failed: { label: "נכשל", variant: "destructive" },
  };
  const m = map[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("he-IL");
}

function IntegrationsPage() {
  const qc = useQueryClient();
  const getSettings = useServerFn(getWebhookSettings);
  const updateSettings = useServerFn(updateWebhookSettings);
  const listQueue = useServerFn(listOutboxQueue);
  const retryItem = useServerFn(retryOutboxItem);

  const settingsQuery = useQuery({
    queryKey: ["webhook-settings"],
    queryFn: () => getSettings(),
  });
  const queueQuery = useQuery({
    queryKey: ["outbox-queue"],
    queryFn: () => listQueue(),
    refetchInterval: 10000,
  });

  const [url, setUrl] = useState("");
  useEffect(() => {
    if (settingsQuery.data?.outbound_url) setUrl(settingsQuery.data.outbound_url);
  }, [settingsQuery.data?.outbound_url]);

  // כתובת מוחלטת אמיתית של המערכת החיה (window.location.origin + BASE_URL),
  // לא ה-URL של תצוגה מקדימה ב-Lovable שהיה כאן קבוע בקוד — אותו באג
  // שתועד ב-auth.tsx (appUrl) עבור מייל האיפוס. מחושב ב-effect כדי ש-window
  // לא יירוק ב-SSR.
  const [incomingUrl, setIncomingUrl] = useState("");
  useEffect(() => {
    setIncomingUrl(
      `${window.location.origin}${import.meta.env.BASE_URL}api/public/webhooks/incoming`.replace(
        /([^:]\/)\/+/g,
        "$1",
      ),
    );
  }, []);

  const saveMutation = useMutation({
    mutationFn: (outbound_url: string) => updateSettings({ data: { outbound_url } }),
    onSuccess: () => {
      toast.success("כתובת ה-Webhook עודכנה בהצלחה");
      qc.invalidateQueries({ queryKey: ["webhook-settings"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "שגיאה בעדכון"),
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => retryItem({ data: { id } }),
    onSuccess: () => {
      toast.success("הפריט הוחזר לתור השליחה");
      qc.invalidateQueries({ queryKey: ["outbox-queue"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "שגיאה בנסיון חוזר"),
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold">אינטגרציות ו-Webhooks</h1>
        <p className="text-muted-foreground mt-1">
          ניהול חיבור דו-כיווני ל-n8n ולמערכות חיצוניות.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>הגדרת כתובת Webhook יוצאת</CardTitle>
          <CardDescription>
            כל אירוע שנכנס לתור היציאה יישלח לכתובת זו עם חתימת HMAC-SHA256 בכותרת
            <code className="mx-1 px-1 rounded bg-muted">X-Webhook-Signature</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="outbound_url">כתובת היעד (n8n Webhook URL)</Label>
            {settingsQuery.isLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Input
                id="outbound_url"
                type="url"
                dir="ltr"
                placeholder="https://n8n.example.com/webhook/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            )}
            {settingsQuery.data?.updated_at && (
              <p className="text-xs text-muted-foreground">
                עודכן לאחרונה: {formatDate(settingsQuery.data.updated_at)}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => saveMutation.mutate(url)}
              disabled={!url || saveMutation.isPending}
            >
              <Save className="ml-2 h-4 w-4" />
              שמירה
            </Button>
          </div>

          <div className="border-t pt-4 space-y-2">
            <Label>כתובת קבלת Webhook נכנס (לשימוש ב-n8n)</Label>
            <div className="flex gap-2">
              <Input dir="ltr" value={incomingUrl} readOnly className="font-mono text-xs" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(incomingUrl);
                  toast.success("הכתובת הועתקה");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              יש לשלוח את ה-API Key בכותרת <code className="px-1 rounded bg-muted">X-API-Key</code>.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>תור שליחות יוצאות (Outbox)</CardTitle>
            <CardDescription>100 שליחות אחרונות. מתעדכן אוטומטית כל 10 שניות.</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => qc.invalidateQueries({ queryKey: ["outbox-queue"] })}
          >
            <RefreshCw className="ml-2 h-4 w-4" />
            רענון
          </Button>
        </CardHeader>
        <CardContent>
          {queueQuery.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (queueQuery.data ?? []).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">אין שליחות בתור.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">סטטוס</TableHead>
                  <TableHead className="text-right">סוג אירוע</TableHead>
                  <TableHead className="text-right">ניסיונות</TableHead>
                  <TableHead className="text-right">נוצר</TableHead>
                  <TableHead className="text-right">נשלח</TableHead>
                  <TableHead className="text-right">שגיאה אחרונה</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(queueQuery.data ?? []).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{statusBadge(row.status)}</TableCell>
                    <TableCell className="font-mono text-xs">{row.event_type}</TableCell>
                    <TableCell>{row.attempts}</TableCell>
                    <TableCell className="text-xs">{formatDate(row.created_at)}</TableCell>
                    <TableCell className="text-xs">{formatDate(row.sent_at)}</TableCell>
                    <TableCell
                      className="max-w-xs truncate text-xs text-destructive"
                      title={row.last_error ?? ""}
                    >
                      {row.last_error ?? "—"}
                    </TableCell>
                    <TableCell>
                      {row.status === "failed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => retryMutation.mutate(row.id)}
                          disabled={retryMutation.isPending}
                        >
                          <RotateCw className="ml-2 h-3 w-3" />
                          נסה שוב
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
