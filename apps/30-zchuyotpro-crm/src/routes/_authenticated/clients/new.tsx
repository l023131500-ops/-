import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { meProfileQuery, useInvalidateClient } from "@/features/clients/queries";
import { GENDER, MARITAL_STATUS, CLIENT_STATUS } from "@/features/clients/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/clients/new")({
  head: () => ({ meta: [{ title: "לקוח חדש | זכויות פרו" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(meProfileQuery()),
  component: NewClientPage,
  errorComponent: ({ error }) => <div className="p-4 text-destructive">שגיאה: {error.message}</div>,
});

type Draft = {
  first_name: string;
  last_name: string;
  id_number: string;
  birth_date: string;
  gender: string;
  marital_status: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  postal_code: string;
  status: string;
  notes: string;
};

const empty: Draft = {
  first_name: "", last_name: "", id_number: "", birth_date: "",
  gender: "", marital_status: "", phone: "", email: "",
  address: "", city: "", postal_code: "", status: "pending", notes: "",
};

function NewClientPage() {
  const navigate = useNavigate();
  const { data: me } = useSuspenseQuery(meProfileQuery());
  const invalidate = useInvalidateClient();
  const [d, setD] = useState<Draft>(empty);

  const create = useMutation({
    mutationFn: async () => {
      if (!d.first_name.trim() || !d.last_name.trim()) throw new Error("שם פרטי ומשפחה הם חובה");
      if (!me) throw new Error("פרופיל לא נמצא");
      const payload = {
        tenant_id: me.tenant_id,
        first_name: d.first_name.trim(),
        last_name: d.last_name.trim(),
        id_number: d.id_number || null,
        birth_date: d.birth_date || null,
        gender: d.gender || null,
        marital_status: d.marital_status || null,
        phone: d.phone || null,
        email: d.email || null,
        address: d.address || null,
        city: d.city || null,
        postal_code: d.postal_code || null,
        status: d.status,
        notes: d.notes || null,
        assigned_agent_id: me.id,
      };
      const { data, error } = await supabase.from("clients").insert(payload).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("הלקוח נוצר");
      invalidate(id);
      navigate({ to: "/clients/$id", params: { id } });
    },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/clients"><ArrowRight className="h-4 w-4 ms-1" /> חזרה לרשימה</Link>
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>לקוח חדש</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <F label="שם פרטי *"><Input value={d.first_name} onChange={(e) => setD({ ...d, first_name: e.target.value })} /></F>
            <F label="שם משפחה *"><Input value={d.last_name} onChange={(e) => setD({ ...d, last_name: e.target.value })} /></F>
            <F label="תעודת זהות"><Input dir="ltr" value={d.id_number} onChange={(e) => setD({ ...d, id_number: e.target.value })} /></F>
            <F label="תאריך לידה"><Input type="date" value={d.birth_date} onChange={(e) => setD({ ...d, birth_date: e.target.value })} /></F>
            <F label="מגדר">
              <Select value={d.gender} onValueChange={(v) => setD({ ...d, gender: v })}>
                <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
                <SelectContent>{Object.entries(GENDER).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="מצב משפחתי">
              <Select value={d.marital_status} onValueChange={(v) => setD({ ...d, marital_status: v })}>
                <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
                <SelectContent>{Object.entries(MARITAL_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="טלפון"><Input dir="ltr" value={d.phone} onChange={(e) => setD({ ...d, phone: e.target.value })} /></F>
            <F label="אימייל"><Input dir="ltr" type="email" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} /></F>
            <F label="כתובת"><Input value={d.address} onChange={(e) => setD({ ...d, address: e.target.value })} /></F>
            <F label="עיר"><Input value={d.city} onChange={(e) => setD({ ...d, city: e.target.value })} /></F>
            <F label="מיקוד"><Input dir="ltr" value={d.postal_code} onChange={(e) => setD({ ...d, postal_code: e.target.value })} /></F>
            <F label="סטטוס">
              <Select value={d.status} onValueChange={(v) => setD({ ...d, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CLIENT_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </F>
          </div>
          <F label="הערות"><Textarea rows={3} value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} /></F>
          <div className="text-xs text-muted-foreground">לאחר היצירה תועברו לעמוד הלקוח להשלמת פרטים נוספים (משפחה, פיננסי, דיור וכו׳).</div>
          <div className="flex justify-start gap-2">
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin ms-2" />}
              צור לקוח
            </Button>
            <Button variant="outline" asChild><Link to="/clients">ביטול</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-sm">{label}</Label>{children}</div>;
}
