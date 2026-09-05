import { useRef, useState } from "react";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, Download, Trash2, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { documentsQuery, clientQuery, meProfileQuery, useInvalidateClient } from "@/features/clients/queries";
import { formatDateTimeHe } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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

function processingBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    processing: { label: "בעיבוד", cls: "bg-blue-100 text-blue-900" },
    completed: { label: "הושלם", cls: "bg-green-100 text-green-900" },
    failed: { label: "נכשל", cls: "bg-red-100 text-red-900" },
  };
  const v = map[status];
  return v ? <Badge variant="secondary" className={`${v.cls} border-0`}>{v.label}</Badge> : null;
}

const FILE_TAGS: Record<string, string> = {
  pay_stub: "תלוש שכר",
  id_card: "תעודת זהות",
  contract: "חוזה",
  medical: "מסמך רפואי",
  bank: "דף חשבון",
  other: "אחר",
};

export function DocumentsTab({ clientId }: { clientId: string }) {
  const { data: client } = useSuspenseQuery(clientQuery(clientId));
  const { data: me } = useSuspenseQuery(meProfileQuery());
  const { data: docs } = useSuspenseQuery(documentsQuery(clientId));
  const invalidate = useInvalidateClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      setUploading(true);
      const path = `${client.tenant_id}/${clientId}/${crypto.randomUUID()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("client-documents").upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("documents").insert({
        tenant_id: client.tenant_id,
        client_id: clientId,
        file_name: file.name,
        file_type: file.type,
        file_size_bytes: file.size,
        storage_path: path,
        uploaded_by: me?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("הקובץ הועלה"); invalidate(clientId); },
    onError: (e: Error) => toast.error("שגיאת העלאה", { description: e.message }),
    onSettled: () => setUploading(false),
  });

  const del = useMutation({
    mutationFn: async (doc: { id: string; storage_path: string }) => {
      await supabase.storage.from("client-documents").remove([doc.storage_path]);
      const { error } = await supabase.from("documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("נמחק"); invalidate(clientId); },
  });

  async function openDoc(path: string) {
    const { data, error } = await supabase.storage.from("client-documents").createSignedUrl(path, 60);
    if (error) { toast.error(error.message); return; }
    window.open(data.signedUrl, "_blank");
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>מסמכים</CardTitle>
        <div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ""; }}
          />
          <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin ms-2" /> : <Upload className="h-4 w-4 ms-2" />}
            העלה קובץ
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {docs.length === 0 && <div className="text-center text-muted-foreground py-12">אין מסמכים</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {docs.map((d) => (
            <Card key={d.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <FileText className="h-8 w-8 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{d.file_name}</div>
                    <div className="text-xs text-muted-foreground">{formatDateTimeHe(d.created_at)}{d.file_size_bytes ? ` · ${(d.file_size_bytes / 1024).toFixed(0)} KB` : ""}</div>
                    {(d as { uploader?: { full_name: string } | null }).uploader?.full_name && (
                      <div className="text-xs text-muted-foreground">הועלה ע"י {(d as { uploader?: { full_name: string } | null }).uploader?.full_name}</div>
                    )}
                  </div>
                </div>
                {(d.requires_signature || d.processing_status !== "pending" || (d.file_type && FILE_TAGS[d.file_type])) && (
                  <div className="flex flex-wrap gap-1.5">
                    {d.file_type && FILE_TAGS[d.file_type] && <Badge variant="outline">{FILE_TAGS[d.file_type]}</Badge>}
                    {d.requires_signature && sigBadge(d.signature_status)}
                    {d.processing_status !== "pending" && processingBadge(d.processing_status)}
                  </div>
                )}
                {d.signed_at && (
                  <div className="text-xs text-muted-foreground">נחתם: {formatDateTimeHe(d.signed_at)}</div>
                )}
                <div className="flex gap-1 justify-end pt-1">
                  <Button variant="ghost" size="icon" onClick={() => openDoc(d.storage_path)}><Download className="h-4 w-4" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent dir="rtl">
                      <AlertDialogHeader><AlertDialogTitle>למחוק את {d.file_name}?</AlertDialogTitle></AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>ביטול</AlertDialogCancel>
                        <AlertDialogAction onClick={() => del.mutate({ id: d.id, storage_path: d.storage_path })}>מחק</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
