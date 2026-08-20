import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function Profile() {
  const { user } = useAuth();
  const [p, setP] = useState<any>({ full_name: "", phone: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // profiles.id IS the auth user id (the profiles_self policy is id = auth.uid()).
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (data) setP(data);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").upsert({ ...p, id: user.id }, { onConflict: "id" });
    setLoading(false);
    if (error) toast.error(error.message); else toast.success("נשמר");
  };
  return (
    <div className="max-w-xl">
      <h1 className="font-heading text-3xl mb-6">פרופיל אישי</h1>
      <Card>
        <CardHeader><CardTitle as="h2">פרטים אישיים</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>דוא״ל</Label><Input value={user?.email || ""} disabled /></div>
          <div><Label>שם מלא</Label><Input value={p.full_name || ""} onChange={(e) => setP({ ...p, full_name: e.target.value })} /></div>
          <div><Label>טלפון</Label><Input value={p.phone || ""} onChange={(e) => setP({ ...p, phone: e.target.value })} /></div>
          <Button onClick={save} disabled={loading}>שמור</Button>
        </CardContent>
      </Card>
    </div>
  );
}
