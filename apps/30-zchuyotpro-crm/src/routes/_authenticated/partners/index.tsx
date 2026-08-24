import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { partnersListQuery, useInvalidatePartners } from "@/features/partners/queries";
import { defaultFieldsForCategory } from "@/features/partners/domains";
import { meProfileQuery } from "@/features/clients/queries";
import { PARTNER_CATEGORY } from "@/features/clients/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/partners/")({
  head: () => ({ meta: [{ title: "שותפים | זכויות פרו" }] }),
  component: PartnersListPage,
});

function PartnersListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [active, setActive] = useState("active");
  const { data: partners } = useSuspenseQuery(partnersListQuery({ search, category, active }));
  const { data: me } = useSuspenseQuery(meProfileQuery());
  const invalidate = useInvalidatePartners();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ company_name: "", contact_name: "", email: "", phone: "", category: "mortgage" });

  const create = useMutation({
    mutationFn: async () => {
      if (!draft.company_name.trim() || !draft.email.trim()) throw new Error("שם חברה ואימייל חובה");
      const { data, error } = await supabase.from("partners").insert({
        tenant_id: me!.tenant_id,
        company_name: draft.company_name.trim(),
        contact_name: draft.contact_name.trim() || null,
        email: draft.email.trim(),
        phone: draft.phone.trim() || null,
        category: draft.category,
        // ברירת מחדל לפי מיפוי התחום: שדות החובה של תחומי הקטגוריה בלבד
        allowed_client_fields: defaultFieldsForCategory(draft.category),
        is_active: true,
      }).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("שותף נוצר");
      invalidate();
      setOpen(false);
      navigate({ to: "/partners/$id", params: { id: data.id } });
    },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">שותפים</h2>
          <p className="text-muted-foreground text-sm mt-1">ניהול שותפים והרשאות גישה</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 ms-2" /> שותף חדש</Button>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="חיפוש שותף..." value={search} onChange={(e) => setSearch(e.target.value)} className="pe-9" />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הקטגוריות</SelectItem>
              {Object.entries(PARTNER_CATEGORY).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={active} onValueChange={setActive}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              <SelectItem value="active">פעיל</SelectItem>
              <SelectItem value="inactive">לא פעיל</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>חברה</TableHead>
                <TableHead>איש קשר</TableHead>
                <TableHead>קטגוריה</TableHead>
                <TableHead>אימייל</TableHead>
                <TableHead>טלפון</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>הפניות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">לא נמצאו שותפים</TableCell></TableRow>}
              {partners.map((p) => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate({ to: "/partners/$id", params: { id: p.id } })}>
                  <TableCell className="font-medium">
                    <Link to="/partners/$id" params={{ id: p.id }} onClick={(e) => e.stopPropagation()} className="hover:underline">{p.company_name}</Link>
                  </TableCell>
                  <TableCell>{p.contact_name ?? "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{(PARTNER_CATEGORY as Record<string, string>)[p.category] ?? p.category}</Badge></TableCell>
                  <TableCell className="text-sm">{p.email}</TableCell>
                  <TableCell className="text-sm">{p.phone ?? "—"}</TableCell>
                  <TableCell>{p.is_active ? <Badge className="bg-green-100 text-green-900 border-0">פעיל</Badge> : <Badge variant="secondary">לא פעיל</Badge>}</TableCell>
                  <TableCell><Badge variant="outline">{p.referrals_count}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" dir="rtl">
          <SheetHeader><SheetTitle>שותף חדש</SheetTitle></SheetHeader>
          <div className="space-y-3 mt-4 px-4">
            <div className="space-y-1.5"><Label>שם חברה *</Label><Input value={draft.company_name} onChange={(e) => setDraft({ ...draft, company_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>איש קשר</Label><Input value={draft.contact_name} onChange={(e) => setDraft({ ...draft, contact_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>אימייל *</Label><Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>טלפון</Label><Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></div>
            <div className="space-y-1.5">
              <Label>קטגוריה</Label>
              <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PARTNER_CATEGORY).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter className="px-4 mt-4">
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin ms-2" />}שמור והמשך לעריכה
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
