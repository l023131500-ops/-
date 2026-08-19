import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TYPES = [
  { v: "religious_council", l: "מועצה דתית" },
  { v: "organization", l: "ארגון" },
  { v: "synagogue", l: "בית כנסת" },
  { v: "maggid", l: "מגיד שיעור" },
  { v: "rabbi", l: "רב" },
  { v: "mori_horaah", l: "מורה הוראה" },
];

export default function Tenants() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", type: "organization", display_name: "" });

  const { data } = useQuery({
    queryKey: ["all-tenants"],
    queryFn: async () => {
      const { data } = await supabase.from("tenants").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tenants").insert({ ...form, status: "active" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("ארגון נוסף"); setOpen(false); qc.invalidateQueries({ queryKey: ["all-tenants"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl">ארגונים</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="ml-2 h-4 w-4" /> ארגון חדש</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>הוספת ארגון</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>שם פנימי *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>שם תצוגה</Label><Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></div>
              <div><Label>Slug (כתובת) *</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="kehilat-shalom" /></div>
              <div>
                <Label>סוג</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={() => create.mutate()} disabled={!form.name || !form.slug}>צור</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(data || []).map((t: any) => (
          <Link key={t.id} to={`/admin/tenants/${t.id}`}>
            <Card className="h-full hover:shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3 mb-3"><Building2 className="h-8 w-8 text-primary" /><div className="flex-1">
                  <div className="font-medium">{t.display_name || t.name}</div>
                  <div className="text-sm text-muted-foreground">{t.slug}</div>
                </div></div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary">{TYPES.find((x) => x.v === t.type)?.l || t.type}</Badge>
                  <Badge variant={t.status === "active" ? "success" : "outline"}>{t.status}</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
