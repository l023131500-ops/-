/**
 * Admin view: approve / reject premium upgrade requests.
 * Approval auto-upgrades the user plan and dispatches a webhook for credentials/welcome.
 */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AdminGate } from "@/components/admin-gate";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Sparkles } from "lucide-react";

interface RequestRow {
  id: number;
  appUserId: number;
  status: string;
  message: string;
  adminNote: string;
  decidedAt: string | null;
  createdAt: string;
}
interface AppUserRow { id: number; fullName: string; email: string; phone: string; plan: string; username: string | null }

function PremiumRequestsInner() {
  const { toast } = useToast();
  const list = useQuery<RequestRow[]>({ queryKey: ["/api/admin/premium-requests"] });
  const users = useQuery<AppUserRow[]>({ queryKey: ["/api/admin/users"] });
  const [notes, setNotes] = useState<Record<number, string>>({});

  const decide = useMutation({
    mutationFn: async ({ id, status, note }: { id: number; status: string; note: string }) => {
      return (await apiRequest("PATCH", `/api/admin/premium-requests/${id}`, { status, adminNote: note })).json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/premium-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: variables.status === "approved" ? "הבקשה אושרה" : "הבקשה נדחתה" });
    },
    onError: () => toast({ title: "העדכון נכשל", description: "נסו שוב", variant: "destructive" }),
  });

  function userOf(id: number) { return users.data?.find((u) => u.id === id); }

  return (
    <div dir="rtl" className="space-y-4" data-testid="page-premium-requests">
      <header>
        <p className="text-sm text-muted-foreground">בקשות פרימיום</p>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> אישור / דחיית שדרוגים</h1>
        <p className="text-sm text-muted-foreground max-w-2xl mt-1">
          לאחר אישור, מסלול המשתמש מתעדכן ל"פרימיום" באופן אוטומטי. שליחת פרטי גישה / הודעת ברוכים הבאים
          מועברת ל-NEDARIM3873 בערוץ שהוגדר בקונקטור webhook_premium_decision.
        </p>
      </header>
      {list.isLoading && <Card className="p-6 text-muted-foreground">טוען...</Card>}
      {(list.data ?? []).length === 0 && <Card className="p-6 text-muted-foreground">אין בקשות.</Card>}
      <div className="grid md:grid-cols-2 gap-3">
        {(list.data ?? []).map((r) => {
          const user = userOf(r.appUserId);
          return (
            <Card key={r.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{user?.fullName || `משתמש #${r.appUserId}`}</div>
                  <div className="text-xs text-muted-foreground" dir="ltr">{user?.email} · {user?.phone}</div>
                </div>
                <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"} className="text-[11px]">{r.status}</Badge>
              </div>
              <p className="text-sm">{r.message || <span className="text-muted-foreground italic">(ללא הודעה)</span>}</p>
              <div className="text-[11px] text-muted-foreground" dir="ltr">{r.createdAt}</div>
              {r.status === "pending" ? (
                <>
                  <Textarea placeholder="הערת אדמין (תועבר ללקוח)" value={notes[r.id] || ""} onChange={(e) => setNotes((p) => ({ ...p, [r.id]: e.target.value }))} aria-label="הערת אדמין" rows={2} />
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => decide.mutate({ id: r.id, status: "approved", note: notes[r.id] || "" })} className="gap-1"><CheckCircle2 className="w-4 h-4" /> אשר</Button>
                    <Button size="sm" variant="destructive" onClick={() => decide.mutate({ id: r.id, status: "rejected", note: notes[r.id] || "" })} className="gap-1"><XCircle className="w-4 h-4" /> דחה</Button>
                  </div>
                </>
              ) : (
                r.adminNote && <p className="text-xs text-muted-foreground">תגובת אדמין: {r.adminNote}</p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function PremiumRequestsPage() {
  return (
    <AdminGate>
      <PremiumRequestsInner />
    </AdminGate>
  );
}
