import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const DAYS = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"];

export default function Schedule() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ title: "", teacher_name: "", description: "", location: "", time: "", days_of_week: [] as number[], audience: "", lesson_type: "", contact_phone: "", is_public: true, is_active: true });

  const { data: lessons } = useQuery({
    queryKey: ["my-lessons", tenant?.id, user?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase.from("lessons").select("*").eq("tenant_id", tenant!.id).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("lessons").insert({ ...form, tenant_id: tenant!.id, created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("שיעור נוסף");
      setOpen(false);
      setForm({ title: "", teacher_name: "", description: "", location: "", time: "", days_of_week: [], audience: "", lesson_type: "", contact_phone: "", is_public: true, is_active: true });
      qc.invalidateQueries({ queryKey: ["my-lessons"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lessons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("נמחק"); qc.invalidateQueries({ queryKey: ["my-lessons"] }); },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl">לוח שיעורים</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="ml-2 h-4 w-4" /> שיעור חדש</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>הוספת שיעור</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>שם השיעור *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>שם המגיד *</Label><Input value={form.teacher_name} onChange={(e) => setForm({ ...form, teacher_name: e.target.value })} /></div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label>מקום</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
                <div><Label>שעה</Label><Input value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
              </div>
              <div>
                <Label>ימים בשבוע</Label>
                <div className="flex gap-2 mt-2">
                  {DAYS.map((d, i) => (
                    <Button key={i} type="button" size="sm" variant={form.days_of_week.includes(i) ? "default" : "outline"}
                      onClick={() => setForm({ ...form, days_of_week: form.days_of_week.includes(i) ? form.days_of_week.filter((x: number) => x !== i) : [...form.days_of_week, i] })}>
                      {d}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label>קהל יעד</Label><Input value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} /></div>
                <div><Label>סוג שיעור</Label><Input value={form.lesson_type} onChange={(e) => setForm({ ...form, lesson_type: e.target.value })} /></div>
              </div>
              <div><Label>טלפון</Label><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></div>
              <div><Label>תיאור</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <Button onClick={() => create.mutate()} disabled={create.isPending || !form.title} className="w-full">שמור</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(lessons || []).map((l: any) => (
          <Card key={l.id}>
            <CardHeader>
              <CardTitle as="h2" className="text-lg">{l.title}</CardTitle>
              <div className="text-sm text-muted-foreground">{l.teacher_name}</div>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {l.location && <div>{l.location}</div>}
              {l.time && <div>{l.time}</div>}
              {Array.isArray(l.days_of_week) && <div className="flex gap-1">{l.days_of_week.map((d: number) => <Badge key={d} variant="secondary" className="text-xs">{DAYS[d]}</Badge>)}</div>}
              <div className="flex justify-end pt-2"><Button size="icon" variant="ghost" onClick={() => del.mutate(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
