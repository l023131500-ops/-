import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Link2, Copy, Loader2 } from "lucide-react";
import { getClientShareLink, setClientShareEnabled } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * כתובת מוחלטת בתוך האפליקציה — אותו תיקון בדיוק כמו ב-auth.tsx (מערכת 30
 * נפלה בבאג #201 כש-window.location.origin לבדו נשלח בלי /gesher).
 */
const appUrl = (path: string) =>
  `${window.location.origin}${import.meta.env.BASE_URL}${path}`.replace(/([^:]\/)\/+/g, "$1");

export function ShareLinkCard({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const getFn = useServerFn(getClientShareLink);
  const setFn = useServerFn(setClientShareEnabled);

  const { data, isLoading } = useQuery({
    queryKey: ["clientShareLink", clientId],
    queryFn: () => getFn({ data: { clientId } }),
  });

  const toggle = useMutation({
    mutationFn: (enabled: boolean) => setFn({ data: { clientId, enabled } }),
    onSuccess: (_, enabled) => {
      toast.success(enabled ? "קישור השיתוף הופעל" : "קישור השיתוף כובה");
      qc.invalidateQueries({ queryKey: ["clientShareLink", clientId] });
    },
    onError: (e: Error) => toast.error("שגיאה בעדכון השיתוף", { description: e.message }),
  });

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">קישור מעקב ללא כניסה</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  const link = appUrl(`case/${data.shareToken}`);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Link2 className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-base">קישור מעקב ללא כניסה</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          קישור לצפייה חיצונית בסטטוס הטיפול בתיק בלבד — בלי פרטים אישיים, מסמכים או תקשורת. מיועד לשליחה למשפחה/גורם שת״פ.
        </p>
        <div className="flex items-center gap-2">
          <Switch
            checked={data.shareEnabled}
            disabled={toggle.isPending}
            onCheckedChange={(v) => toggle.mutate(v)}
          />
          <Label className="cursor-pointer" onClick={() => !toggle.isPending && toggle.mutate(!data.shareEnabled)}>
            {toggle.isPending ? <Loader2 className="h-3 w-3 animate-spin inline" /> : data.shareEnabled ? "פעיל" : "כבוי"}
          </Label>
        </div>
        {data.shareEnabled && (
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
