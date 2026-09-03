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
  const [form, setForm] = useState<any>({ title: "", teacher_name: "", description: "", location: "", time: "", days_of_week: [] as number[], audience: "", lesson_type: "", contact_phone: "", is_active: true });

  const { data: lessons } = useQuery({
    queryKey: ["my-lessons", tenant?.id, user?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase.from("lessons").select("*").eq("tenant_id", tenant!.id).order("created_at", { ascending: false });
      return data || [];
    },
  });

  // lessons.is_approved is the moderation gate the public directory/search
  // actually reads (LessonsDirectory.tsx, FeaturedLessons.tsx, search-lessons
  // edge fn all filter .eq("is_approved", true)), and defaults to false on
  // insert (protect_lessons_moderation_fields trigger, migration
  // 20260831130000) unless the inserting user already holds tenant_admin/
  // moderator. That trigger also silently reverts any is_approved change
  // attempted by a plain member. But no portal screen anywhere ever showed
  // the flag or offered a way to flip it -- portal/Lessons.tsx (teacher's own
  // "השיעורים שלי") only ever renders a read-only "ממתין לאישור" badge, and
  // the one screen that lists every lesson in the tenant (this one) showed
  // nothing about approval at all. The only UI that ever wrote is_approved
  // was the global super-admin-only /legacy/admin console (RequireSuperAdmin
  // gate, App.tsx) -- not reachable by a tenant's own moderator/tenant_admin.
  // Net effect: a teacher-submitted lesson could never actually become
  // publicly visible unless a super admin happened to flip it by hand.
  const { data: myRole } = useQuery({
    queryKey: ["my-tenant-role", tenant?.id, user?.id],
    enabled: !!tenant?.id && !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role")
        .eq("user_id", user!.id).eq("tenant_id", tenant!.id).limit(1).maybeSingle();
      return data?.role ?? null;
    },
  });
  const canModerate = myRole === "tenant_admin" || myRole === "moderator";

  const approve = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase.from("lessons").update({ is_approved: value }).eq("id", id).eq("tenant_id", tenant!.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-lessons"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const create = useMutation({
    mutationFn: async () => {
      // "lessons" has no teacher_name/location/time/days_of_week[]/lesson_type/is_public
      // columns (post-multi-tenant-migration schema) — map to the real columns
      // (rabbi_name/address/time_hhmm/day_of_week int/style), same rename this
      // table's other screens (e.g. portal/Lessons.tsx) already went through.
      // day_of_week is one int per row, so a lesson recurring on several days
      // becomes several rows, same convention portal/Lessons.tsx uses.
      const base = {
        tenant_id: tenant!.id,
        title: form.title,
        rabbi_name: form.teacher_name || null,
        description: form.description || null,
        address: form.location || null,
        time_hhmm: form.time || null,
        audience: form.audience || null,
        style: form.lesson_type || null,
        contact_phone: form.contact_phone || null,
        is_active: form.is_active,
      };
      const rows = form.days_of_week.length > 0
        ? form.days_of_week.map((d: number) => ({ ...base, day_of_week: d }))
        : [base];
      const { error } = await supabase.from("lessons").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("שיעור נוסף");
      setOpen(false);
      setForm({ title: "", teacher_name: "", description: "", location: "", time: "", days_of_week: [], audience: "", lesson_type: "", contact_phone: "", is_active: true });
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
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg">{l.title}</CardTitle>
                <Badge variant={l.is_approved ? "default" : "outline"} className={l.is_approved ? "" : "text-amber-600 border-amber-300"}>
                  {l.is_approved ? "מאושר" : "ממתין לאישור"}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">{l.rabbi_name}</div>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {l.address && <div>{l.address}</div>}
              {l.time_hhmm && <div>{l.time_hhmm}</div>}
              {l.day_of_week != null && <div className="flex gap-1"><Badge variant="secondary" className="text-xs">{DAYS[l.day_of_week]}</Badge></div>}
              <div className="flex items-center justify-between pt-2">
                {canModerate ? (
                  <Button size="sm" variant={l.is_approved ? "outline" : "default"} disabled={approve.isPending}
                    onClick={() => approve.mutate({ id: l.id, value: !l.is_approved })}>
                    {l.is_approved ? "בטל אישור" : "אשר שיעור"}
                  </Button>
                ) : <span />}
                <Button size="icon" variant="ghost" onClick={() => del.mutate(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
