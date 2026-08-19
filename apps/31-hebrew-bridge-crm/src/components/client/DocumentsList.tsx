import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Image as ImageIcon, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  removeUploadedDocument,
  DOCUMENT_CATEGORIES,
  type UploadedDocument,
} from "@/lib/client.functions";

const categoryLabelMap = new Map(DOCUMENT_CATEGORIES.map((c) => [c.value, c.label]));
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const dateFmt = new Intl.DateTimeFormat("he-IL", {
  dateStyle: "medium",
  timeStyle: "short",
});

function StatusBadge({ status }: { status: UploadedDocument["status"] }) {
  if (status === "approved") {
    return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">אושר</Badge>;
  }
  if (status === "rejected") {
    return <Badge variant="destructive">נדחה - נדרש להעלות שנית</Badge>;
  }
  return <Badge variant="secondary">במתנה לבדיקה</Badge>;
}

function FileTypeIcon({ mime }: { mime: string }) {
  if (mime === "application/pdf") {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-red-500/10 text-red-600">
        <FileText className="h-5 w-5" />
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-blue-600">
      <ImageIcon className="h-5 w-5" />
    </div>
  );
}

export function DocumentsList({ documents }: { documents: UploadedDocument[] }) {
  const qc = useQueryClient();
  const removeFn = useServerFn(removeUploadedDocument);
  const [pendingDelete, setPendingDelete] = useState<UploadedDocument | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => {
      toast.success("המסמך נמחק");
      qc.invalidateQueries({ queryKey: ["clientDashboard"] });
    },
    onError: (e: Error) => toast.error(e.message || "שגיאה במחיקת המסמך"),
    onSettled: () => setPendingDelete(null),
  });

  if (documents.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground" dir="rtl">
        עדיין לא הועלו מסמכים. ניתן להעלות מסמך ראשון באמצעות אזור הגרירה למעלה.
      </Card>
    );
  }

  const sorted = [...documents].sort(
    (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime(),
  );

  return (
    <>
      <Card dir="rtl" className="divide-y">
        {sorted.map((doc) => (
          <div key={doc.id} className="flex items-center gap-4 p-4">
            <FileTypeIcon mime={doc.mime} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{doc.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                הועלה ב־{dateFmt.format(new Date(doc.uploaded_at))}
              </p>
            </div>
            {doc.category && categoryLabelMap.has(doc.category) && (
              <Badge variant="outline" className="border-primary/30 text-primary">
                {categoryLabelMap.get(doc.category)}
              </Badge>
            )}
            <StatusBadge status={doc.status} />
            <Button
              variant="ghost"
              size="icon"
              aria-label="מחיקת מסמך"
              onClick={() => setPendingDelete(doc)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && pendingDelete?.id === doc.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 text-destructive" />
              )}
            </Button>
          </div>
        ))}
      </Card>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת מסמך</AlertDialogTitle>
            <AlertDialogDescription>
              האם למחוק את "{pendingDelete?.name}"? פעולה זו אינה הפיכה.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              מחיקה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
