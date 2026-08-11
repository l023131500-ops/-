import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Palette, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

export default function Settings() {
  const { tenant, reload } = useTenant();
  const qc = useQueryClient();
  const [b, setB] = useState<any>(null);
  const [nedarim, setNedarim] = useState({ mosad_id: "", api_password: "" });

  useEffect(() => { if (tenant?.branding) setB({ ...tenant.branding }); }, [tenant]);

  const { data: nedarimCfg } = useQuery({
    queryKey: ["nedarim-cfg", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase.from("nedarim_configs").select("*").eq("tenant_id", tenant!.id).maybeSingle();
      if (data) setNedarim({ mosad_id: data.mosad_id || "", api_password: "" });
      return data;
    },
  });

  const saveBrand = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tenant_branding").update(b).eq("tenant_id", tenant!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("עוצב נשמר"); reload(); },
    onError: (e: any) => toast.error(e.message),
  });

  const saveNedarim = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("nedarim_configs").upsert({ tenant_id: tenant!.id, ...nedarim }, { onConflict: "tenant_id" });
      if (error) throw error;
    },
    onSuccess: () => toast.success("הגדרות סליקה נשמרו"),
    onError: (e: any) => toast.error(e.message),
  });

  if (!b) return null;

  return (
    <div>
      <h1 className="font-heading text-3xl mb-6">הגדרות</h1>
      <Tabs defaultValue="branding">
        <TabsList>
          <TabsTrigger value="branding">עיצוב ומיתוג</TabsTrigger>
          <TabsTrigger value="content">תוכן</TabsTrigger>
          <TabsTrigger value="payments">סליקה</TabsTrigger>
        </TabsList>
        <TabsContent value="branding" className="pt-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> עיצוב מותג</CardTitle><CardDescription>כל ההגדרות חלות מיידית על האתר הציבורי</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label>שם האתר</Label><Input value={b.site_name || ""} onChange={(e) => setB({ ...b, site_name: e.target.value })} /></div>
                <div><Label>סלוגן</Label><Input value={b.site_tagline || ""} onChange={(e) => setB({ ...b, site_tagline: e.target.value })} /></div>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div><Label>צבע ראשי</Label><Input type="color" value={b.primary_color || "#1A2E5A"} onChange={(e) => setB({ ...b, primary_color: e.target.value })} /></div>
                <div><Label>צבע משני</Label><Input type="color" value={b.secondary_color || "#C9A84C"} onChange={(e) => setB({ ...b, secondary_color: e.target.value })} /></div>
                <div><Label>צבע הדגשה</Label><Input type="color" value={b.accent_color || "#F2D678"} onChange={(e) => setB({ ...b, accent_color: e.target.value })} /></div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label>פונט כותרות</Label><Input value={b.font_heading || ""} onChange={(e) => setB({ ...b, font_heading: e.target.value })} placeholder="Noto Serif Hebrew" /></div>
                <div><Label>פונט גוף</Label><Input value={b.font_body || ""} onChange={(e) => setB({ ...b, font_body: e.target.value })} placeholder="Rubik" /></div>
              </div>
              <div><Label>לוגו URL</Label><Input value={b.logo_url || ""} onChange={(e) => setB({ ...b, logo_url: e.target.value })} /></div>
              <div><Label>תמונת רקע (Hero)</Label><Input value={b.hero_image_url || ""} onChange={(e) => setB({ ...b, hero_image_url: e.target.value })} /></div>
              <div className="flex items-center gap-3"><Switch checked={b.animations_enabled} onCheckedChange={(v) => setB({ ...b, animations_enabled: v })} /><Label>אנימציות</Label></div>
              <div className="flex items-center gap-3"><Switch checked={b.show_union_footer} onCheckedChange={(v) => setB({ ...b, show_union_footer: v })} /><Label>הצג קרדיט איגוד שיעורי תורה</Label></div>
              <Button onClick={() => saveBrand.mutate()} disabled={saveBrand.isPending}>{saveBrand.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="ml-2 h-4 w-4" /> שמור</>}</Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="content" className="pt-4">
          <Card>
            <CardHeader><CardTitle>תוכן ופוטר</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>טקסט פוטר</Label><Textarea value={b.footer_text || ""} onChange={(e) => setB({ ...b, footer_text: e.target.value })} /></div>
              <Button onClick={() => saveBrand.mutate()} disabled={saveBrand.isPending}>שמור</Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="payments" className="pt-4">
          <Card>
            <CardHeader><CardTitle>הגדרות נדרים פלוס</CardTitle><CardDescription>פרטי מוסד עבור סליקת כרטיסי אשראי. הסיסמה מוצפנת במסד הנתונים.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Mosad ID</Label><Input value={nedarim.mosad_id} onChange={(e) => setNedarim({ ...nedarim, mosad_id: e.target.value })} /></div>
              <div><Label htmlFor="api-password">API Password</Label><PasswordInput id="api-password" value={nedarim.api_password} onChange={(e) => setNedarim({ ...nedarim, api_password: e.target.value })} placeholder="השאר ריק כדי לא לשנות" /></div>
              <Button onClick={() => saveNedarim.mutate()} disabled={saveNedarim.isPending}>שמור</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
