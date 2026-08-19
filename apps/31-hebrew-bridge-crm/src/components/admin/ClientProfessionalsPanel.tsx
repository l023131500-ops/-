import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listClientProfessionals,
  setClientProfessionalAssignment,
} from "@/lib/professionals.functions";

export function ClientProfessionalsPanel({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const list = useServerFn(listClientProfessionals);
  const setAssign = useServerFn(setClientProfessionalAssignment);

  const key = ["client-professionals", clientId];
  const query = useQuery({ queryKey: key, queryFn: () => list({ data: { clientId } }) });

  const toggle = useMutation({
    mutationFn: (v: { professionalId: string; assigned: boolean }) =>
      setAssign({ data: { clientId, ...v } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e: any) => toast.error(e?.message ?? "שגיאה"),
  });

  const rows = query.data ?? [];
  // group by category
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const k = r.category_name ?? "ללא קטגוריה";
    if (!groups.has(k)) groups.set(k, [] as any);
    groups.get(k)!.push(r);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>אנשי מקצוע משויכים</CardTitle>
        <CardDescription>סמן אילו אנשי מקצוע משויכים ללקוח. הם יישלחו ל-n8n יחד עם הנושא.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {query.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">
            אין אנשי מקצוע. הוסף תחת "ניהול תוכן ונושאים".
          </p>
        ) : (
          Array.from(groups.entries()).map(([cat, items]) => (
            <div key={cat} className="space-y-2">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold">{cat}</h4>
                <Badge variant="outline">{items.length}</Badge>
              </div>
              <div className="space-y-2">
                {items.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-md border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {p.email ?? "ללא אימייל"}
                      </div>
                    </div>
                    <Switch
                      checked={p.is_assigned}
                      onCheckedChange={(v) =>
                        toggle.mutate({ professionalId: p.id, assigned: v })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
