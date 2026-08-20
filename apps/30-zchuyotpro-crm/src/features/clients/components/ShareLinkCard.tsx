import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link2, Copy, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidateClient } from "@/features/clients/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Same base-path pitfall documented in auth.tsx/case.$token.tsx: the app is
// served under /crm (vite base) with no router basepath of its own.
const appUrl = (path: string) => `${window.location.origin}${import.meta.env.BASE_URL}${path}`;

export function ShareLinkCard({
  clientId,
  shareToken,
  shareEnabled,
}: {
  clientId: string;
  shareToken: string;
  shareEnabled: boolean;
}) {
  const invalidate = useInvalidateClient();

  const toggle = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase.from("clients").update({ share_enabled: enabled }).eq("id", clientId);
      if (error) throw error;
    },
    onSuccess: (_, enabled) => {
      toast.success(enabled ? "קישור השיתוף הופעל" : "קישור השיתוף כובה");
      invalidate(clientId);
    },
    onError: (e: Error) => toast.error("שגיאה בעדכון השיתוף", { description: e.message }),
  });

  const link = appUrl(`case/${shareToken}`);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Link2 className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-base">קישור מעקב ללא כניסה</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          קישור לצפייה חיצונית בסטטוס התיק והזכאויות בלבד — בלי פרטים אישיים, מסמכים או תקשורת. מיועד לשליחה למשפחה/גורם שת״פ.
        </p>
        <div className="flex items-center gap-2">
          <Switch
            checked={shareEnabled}
            disabled={toggle.isPending}
            onCheckedChange={(v) => toggle.mutate(v)}
          />
          <Label className="cursor-pointer" onClick={() => !toggle.isPending && toggle.mutate(!shareEnabled)}>
            {toggle.isPending ? <Loader2 className="h-3 w-3 animate-spin inline" /> : shareEnabled ? "פעיל" : "כבוי"}
          </Label>
        </div>
        {shareEnabled && (
          <div className="flex items-center gap-2">
            <Input value={link} readOnly dir="ltr" className="text-xs font-mono" onFocus={(e) => e.currentTarget.select()} />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                toast.success("הקישור הועתק");
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
