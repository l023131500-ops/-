import { useState, useEffect } from "react";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { clientQuery, tenantAgentsQuery, useInvalidateClient } from "@/features/clients/queries";
import { CLIENT_STATUS, GENDER, MARITAL_STATUS } from "@/features/clients/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagsInput } from "@/features/clients/components/TagsInput";

export function PersonalTab({ clientId }: { clientId: string }) {
  const { data: client } = useSuspenseQuery(clientQuery(clientId));
  const { data: agents } = useSuspenseQuery(tenantAgentsQuery());
  const invalidate = useInvalidateClient();

  const [form, setForm] = useState({
    first_name: client.first_name,
    last_name: client.last_name,
    id_number: client.id_number ?? "",
    birth_date: client.birth_date ?? "",
    gender: client.gender ?? "",
    marital_status: client.marital_status ?? "",
    phone: client.phone ?? "",
    email: client.email ?? "",
    address: client.address ?? "",
    city: client.city ?? "",
    postal_code: client.postal_code ?? "",
    status: client.status,
    assigned_agent_id: client.assigned_agent_id ?? "",
    tags: client.tags ?? [],
    notes: client.notes ?? "",
  });

  useEffect(() => {
    setForm({
      first_name: client.first_name,
      last_name: client.last_name,
      id_number: client.id_number ?? "",
      birth_date: client.birth_date ?? "",
      gender: client.gender ?? "",
      marital_status: client.marital_status ?? "",
      phone: client.phone ?? "",
      email: client.email ?? "",
      address: client.address ?? "",
      city: client.city ?? "",
      postal_code: client.postal_code ?? "",
      status: client.status,
      assigned_agent_id: client.assigned_agent_id ?? "",
      tags: client.tags ?? [],
      notes: client.notes ?? "",
    });
  }, [client]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        id_number: form.id_number || null,
        birth_date: form.birth_date || null,
        gender: form.gender || null,
        marital_status: form.marital_status || null,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
        city: form.city || null,
        postal_code: form.postal_code || null,
        assigned_agent_id: form.assigned_agent_id || null,
        notes: form.notes || null,
      };
      const { error } = await supabase.from("clients").update(payload).eq("id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("נשמר בהצלחה");
      invalidate(clientId);
    },
    onError: (e: Error) => toast.error("שגיאה בשמירה", { description: e.message }),
  });

  function field<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>פרטים אישיים</CardTitle>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin ms-2" /> : <Save className="h-4 w-4 ms-2" />}
          שמור
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <Field label="מספר תיק">
          <Input value={client.file_number ?? ""} readOnly className="font-mono bg-muted" />
        </Field>
        <Field label="שם פרטי *">
          <Input value={form.first_name} onChange={(e) => field("first_name", e.target.value)} required />
        </Field>
        <Field label="שם משפחה *">
          <Input value={form.last_name} onChange={(e) => field("last_name", e.target.value)} required />
        </Field>
        <Field label="תעודת זהות">
          <Input value={form.id_number} onChange={(e) => field("id_number", e.target.value)} dir="ltr" />
        </Field>
        <Field label="תאריך לידה">
          <Input type="date" value={form.birth_date} onChange={(e) => field("birth_date", e.target.value)} />
        </Field>
        <Field label="מגדר">
          <Select value={form.gender} onValueChange={(v) => field("gender", v)}>
            <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
            <SelectContent>
              {Object.entries(GENDER).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="מצב משפחתי">
          <Select value={form.marital_status} onValueChange={(v) => field("marital_status", v)}>
            <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
            <SelectContent>
              {Object.entries(MARITAL_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="טלפון">
          <Input value={form.phone} onChange={(e) => field("phone", e.target.value)} dir="ltr" />
        </Field>
        <Field label="אימייל">
          <Input type="email" value={form.email} onChange={(e) => field("email", e.target.value)} dir="ltr" />
        </Field>
        <Field label="עיר">
          <Input value={form.city} onChange={(e) => field("city", e.target.value)} />
        </Field>
        <Field label="כתובת" className="md:col-span-2">
          <Input value={form.address} onChange={(e) => field("address", e.target.value)} />
        </Field>
        <Field label="מיקוד">
          <Input value={form.postal_code} onChange={(e) => field("postal_code", e.target.value)} dir="ltr" />
        </Field>
        <Field label="סטטוס">
          <Select value={form.status} onValueChange={(v) => field("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CLIENT_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="סוכן מטפל">
          <Select value={form.assigned_agent_id || "none"} onValueChange={(v) => field("assigned_agent_id", v === "none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="ללא" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">ללא שיוך</SelectItem>
              {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="תגיות" className="md:col-span-2">
          <TagsInput value={form.tags} onChange={(v) => field("tags", v)} />
        </Field>
        <Field label="הערות" className="md:col-span-2">
          <Textarea rows={4} value={form.notes} onChange={(e) => field("notes", e.target.value)} />
        </Field>
      </CardContent>
    </Card>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}
