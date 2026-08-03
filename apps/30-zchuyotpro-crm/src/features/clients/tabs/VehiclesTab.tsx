import { useState } from "react";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { vehiclesQuery, clientQuery, useInvalidateClient } from "@/features/clients/queries";
import type { Vehicle } from "@/features/clients/queries";
import { formatDateHe } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type Draft = Partial<Vehicle> & { client_id: string; tenant_id: string };

export function VehiclesTab({ clientId }: { clientId: string }) {
  const { data: client } = useSuspenseQuery(clientQuery(clientId));
  const { data: vehicles } = useSuspenseQuery(vehiclesQuery(clientId));
  const invalidate = useInvalidateClient();
  const [editing, setEditing] = useState<Draft | null>(null);

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      if (d.id) {
        const { error } = await supabase.from("client_vehicles").update(d).eq("id", d.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("client_vehicles").insert(d as never);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("נשמר"); invalidate(clientId); setEditing(null); },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_vehicles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("נמחק"); invalidate(clientId); },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>רכבים</CardTitle>
        <Button onClick={() => setEditing({ client_id: clientId, tenant_id: client.tenant_id, disability_badge: false })}>
          <Plus className="h-4 w-4 ms-2" /> הוסף רכב
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>לוחית רישוי</TableHead>
              <TableHead>יצרן/דגם</TableHead>
              <TableHead>שנה</TableHead>
              <TableHead>תג נכה</TableHead>
              <TableHead>תוקף ביטוח</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">אין רכבים רשומים</TableCell></TableRow>}
            {vehicles.map((v) => (
              <TableRow key={v.id}>
                <TableCell dir="ltr" className="text-start font-mono">{v.license_plate ?? "—"}</TableCell>
                <TableCell>{[v.make, v.model].filter(Boolean).join(" ") || "—"}</TableCell>
                <TableCell>{v.year ?? "—"}</TableCell>
                <TableCell>{v.disability_badge ? <Badge className="bg-accent text-accent-foreground border-0">תג נכה</Badge> : "—"}</TableCell>
                <TableCell>{formatDateHe(v.insurance_expiry)}</TableCell>
                <TableCell className="text-end">
                  <Button variant="ghost" size="icon" onClick={() => setEditing(v as Draft)}><Pencil className="h-4 w-4" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent dir="rtl">
                      <AlertDialogHeader><AlertDialogTitle>למחוק רכב?</AlertDialogTitle></AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>ביטול</AlertDialogCancel>
                        <AlertDialogAction onClick={() => del.mutate(v.id)}>מחק</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="left" className="overflow-y-auto" dir="rtl">
          <SheetHeader><SheetTitle>{editing?.id ? "עריכת רכב" : "רכב חדש"}</SheetTitle></SheetHeader>
          {editing && (
            <div className="space-y-4 mt-4 px-4">
              <Field label="לוחית רישוי"><Input dir="ltr" value={editing.license_plate ?? ""} onChange={(e) => setEditing({ ...editing, license_plate: e.target.value })} /></Field>
              <Field label="יצרן"><Input value={editing.make ?? ""} onChange={(e) => setEditing({ ...editing, make: e.target.value })} /></Field>
              <Field label="דגם"><Input value={editing.model ?? ""} onChange={(e) => setEditing({ ...editing, model: e.target.value })} /></Field>
              <Field label="שנת ייצור"><Input type="number" value={editing.year ?? ""} onChange={(e) => setEditing({ ...editing, year: e.target.value ? Number(e.target.value) : null })} /></Field>
              <Field label="סוג רכב"><Input value={editing.vehicle_type ?? ""} onChange={(e) => setEditing({ ...editing, vehicle_type: e.target.value })} /></Field>
              <div className="flex items-center justify-between"><Label>תג חנייה לנכה</Label><Switch checked={!!editing.disability_badge} onCheckedChange={(v) => setEditing({ ...editing, disability_badge: v })} /></div>
              <div className="flex items-center justify-between"><Label>קיים ביטוח</Label><Switch checked={!!editing.has_insurance} onCheckedChange={(v) => setEditing({ ...editing, has_insurance: v })} /></div>
              <Field label="תוקף ביטוח"><Input type="date" value={editing.insurance_expiry ?? ""} onChange={(e) => setEditing({ ...editing, insurance_expiry: e.target.value })} /></Field>
            </div>
          )}
          <SheetFooter className="px-4 mt-4">
            <Button onClick={() => editing && save.mutate(editing)} disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin ms-2" />}שמור
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-sm">{label}</Label>{children}</div>;
}
