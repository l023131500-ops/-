import { Fragment, useState } from "react";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { familyQuery, useInvalidateClient, clientQuery } from "@/features/clients/queries";
import type { FamilyMember } from "@/features/clients/queries";
import { RELATION, HEALTH_FUND, GENDER } from "@/features/clients/constants";
import { HealthFundBadge } from "@/features/clients/components/badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatDateHe } from "@/lib/format";

type Draft = Partial<FamilyMember> & { client_id: string; tenant_id: string };

export function FamilyTab({ clientId }: { clientId: string }) {
  const { data: client } = useSuspenseQuery(clientQuery(clientId));
  const { data: family } = useSuspenseQuery(familyQuery(clientId));
  const invalidate = useInvalidateClient();
  const [editing, setEditing] = useState<Draft | null>(null);

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      if (d.id) {
        const { error } = await supabase.from("client_family_members").update(d).eq("id", d.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("client_family_members").insert(d as never);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("נשמר"); invalidate(clientId); setEditing(null); },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_family_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("נמחק"); invalidate(clientId); },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>בני משפחה</CardTitle>
        <Button onClick={() => setEditing({ client_id: clientId, tenant_id: client.tenant_id, relation: "child", first_name: "" })}>
          <Plus className="h-4 w-4 ms-2" /> הוסף
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>קשר</TableHead>
              <TableHead>שם</TableHead>
              <TableHead>ת.ז.</TableHead>
              <TableHead>תאריך לידה</TableHead>
              <TableHead>קופ"ח</TableHead>
              <TableHead>סטטוס בריאות</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {family.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">אין בני משפחה רשומים</TableCell></TableRow>}
            {family.map((m) => (
              <Fragment key={m.id}>
                <TableRow>
                  <TableCell>{(RELATION as Record<string, string>)[m.relation] ?? m.relation}</TableCell>
                  <TableCell className="font-medium">{m.first_name} {m.last_name ?? ""}</TableCell>
                  <TableCell dir="ltr" className="text-start">{m.id_number ?? "—"}</TableCell>
                  <TableCell>{formatDateHe(m.birth_date)}</TableCell>
                  <TableCell><HealthFundBadge fund={m.health_fund} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.health_status ?? "—"}</TableCell>
                  <TableCell className="text-end">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(m as Draft)}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent dir="rtl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>למחוק בן משפחה?</AlertDialogTitle>
                          <AlertDialogDescription>{m.first_name} {m.last_name}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>ביטול</AlertDialogCancel>
                          <AlertDialogAction onClick={() => del.mutate(m.id)}>מחק</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
                {m.notes && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="py-2 bg-muted/20">
                      <div className="text-xs">
                        <span className="text-muted-foreground">הערות: </span>
                        <span className="whitespace-pre-wrap">{m.notes}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="left" className="overflow-y-auto" dir="rtl">
          <SheetHeader>
            <SheetTitle>{editing?.id ? "עריכת בן משפחה" : "בן משפחה חדש"}</SheetTitle>
          </SheetHeader>
          {editing && (
            <div className="space-y-4 mt-4 px-4">
              <FormField label="קשר">
                <Select value={editing.relation ?? ""} onValueChange={(v) => setEditing({ ...editing, relation: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(RELATION).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="שם פרטי *">
                <Input value={editing.first_name ?? ""} onChange={(e) => setEditing({ ...editing, first_name: e.target.value })} />
              </FormField>
              <FormField label="שם משפחה">
                <Input value={editing.last_name ?? ""} onChange={(e) => setEditing({ ...editing, last_name: e.target.value })} />
              </FormField>
              <FormField label="תעודת זהות">
                <Input dir="ltr" value={editing.id_number ?? ""} onChange={(e) => setEditing({ ...editing, id_number: e.target.value })} />
              </FormField>
              <FormField label="תאריך לידה">
                <Input type="date" value={editing.birth_date ?? ""} onChange={(e) => setEditing({ ...editing, birth_date: e.target.value })} />
              </FormField>
              <FormField label="מגדר">
                <Select value={editing.gender ?? ""} onValueChange={(v) => setEditing({ ...editing, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
                  <SelectContent>{Object.entries(GENDER).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="קופת חולים">
                <Select value={editing.health_fund ?? ""} onValueChange={(v) => setEditing({ ...editing, health_fund: v })}>
                  <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
                  <SelectContent>{Object.entries(HEALTH_FUND).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="סטטוס בריאות">
                <Textarea rows={3} value={editing.health_status ?? ""} onChange={(e) => setEditing({ ...editing, health_status: e.target.value })} />
              </FormField>
              <FormField label="הערות">
                <Textarea rows={3} value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </FormField>
            </div>
          )}
          <SheetFooter className="px-4 mt-4">
            <Button onClick={() => editing && save.mutate(editing)} disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin ms-2" />}
              שמור
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Card>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-sm">{label}</Label>{children}</div>;
}
