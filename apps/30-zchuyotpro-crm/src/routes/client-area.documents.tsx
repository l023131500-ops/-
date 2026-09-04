import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { queryOptions } from "@tanstack/react-query";
import { meClientQuery } from "@/routes/client-area";

function sigBadge(status: string | null) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "ממתין לחתימה", cls: "bg-yellow-100 text-yellow-900" },
    signed: { label: "נחתם", cls: "bg-green-100 text-green-900" },
    rejected: { label: "נדחה", cls: "bg-red-100 text-red-900" },
  };
  if (!status) return null;
  const v = map[status];
  return v ? <Badge className={`${v.cls} border-0`} variant="secondary">{v.label}</Badge> : null;
}

const myDocsQuery = (clientId: string | undefined) =>
  queryOptions({
    queryKey: ["my-docs", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clientId,
  });

export const Route = createFileRoute("/client-area/documents")({
  head: () => ({ meta: [{ title: "מסמכים | אזור אישי" }] }),
  component: DocsPage,
});

function DocsPage() {
  const { data: client } = useQuery(meClientQuery());
  const { data: docs, isLoading } = useQuery(myDocsQuery(client?.id));

  async function download(path: string, name: string) {
    const { data, error } = await supabase.storage.from("client-documents").createSignedUrl(path, 60);
    if (error || !data) { toast.error("הורדה נכשלה"); return; }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = name;
    a.click();
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (docs ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">אין מסמכים</p>
        ) : (
          (docs ?? []).map((d) => (
            <div key={d.id} className="flex items-center justify-between border-b last:border-0 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{d.file_name}</div>
                  <div className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString("he-IL")}</div>
                  {d.requires_signature && <div className="mt-1">{sigBadge(d.signature_status)}</div>}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => download(d.storage_path, d.file_name)}>
                <Download className="h-4 w-4 me-1" /> הורד
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
