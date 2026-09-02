import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// leads.kind values, not leads.type — that column doesn't exist (see
// Contact.tsx / FindLesson.tsx / RequestLesson.tsx / JoinTeacher.tsx).
const TYPE_LABELS: Record<string, string> = {
  find_lesson: "אתר לי שיעור",
  lesson_request: "בקש שיעור",
  teacher_offer: "הצטרף כמגיד",
  contact: "צור קשר",
};

export default function Leads() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["leads-all"],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("*, tenants(name)").order("created_at", { ascending: false }).limit(500);
      return data || [];
    },
  });
  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("עודכן"); qc.invalidateQueries({ queryKey: ["leads-all"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div>
      <h1 className="font-heading text-3xl mb-6">פניות ולידים</h1>
      <div className="space-y-3">
        {(data || []).map((l: any) => (
          <Card key={l.id}><CardContent className="py-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-medium">{l.full_name} · {l.phone}</div>
                <div className="text-sm text-muted-foreground">{l.email}</div>
              </div>
              <div className="flex gap-2 items-center">
                <Badge variant="secondary">{TYPE_LABELS[l.kind] || l.kind}</Badge>
                <Select value={l.status} onValueChange={(s) => update.mutate({ id: l.id, status: s })} disabled={update.isPending && update.variables?.id === l.id}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">חדש</SelectItem>
                    <SelectItem value="in_progress">בטיפול</SelectItem>
                    <SelectItem value="closed">סגור</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {l.raw_data && <pre className="text-xs bg-muted rounded p-2 overflow-x-auto">{JSON.stringify(l.raw_data, null, 2)}</pre>}
            <div className="text-xs text-muted-foreground mt-2">{new Date(l.created_at).toLocaleString("he-IL")} · {l.tenants?.name}</div>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}
