import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { UploadCloud, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  appendUploadedDocument,
  DOCUMENT_CATEGORIES,
  type DocumentCategory,
} from "@/lib/client.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ACCEPTED = ["application/pdf", "image/png", "image/jpeg"];
const MAX_SIZE = 5 * 1024 * 1024;

export function DocumentDropzone({ userId }: { userId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<DocumentCategory | "">("");
  const [pending, setPending] = useState(false);
  const qc = useQueryClient();
  const appendFn = useServerFn(appendUploadedDocument);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!ACCEPTED.includes(file.type)) {
        throw new Error("פורמט קובץ לא נתמך. ניתן להעלות PDF, PNG או JPEG בלבד.");
      }
      if (file.size > MAX_SIZE) {
        throw new Error("הקובץ חורג מ-5 מגה־בייט.");
      }

      const id = crypto.randomUUID();
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${userId}/${id}-${safeName}`;

      const { error: upErr } = await supabase.storage
        .from("client-documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw new Error(upErr.message);

      await appendFn({
        data: {
          id,
          name: label.trim() || file.name,
          path,
          mime: file.type as any,
          size: file.size,
          category: category || null,
        },
      });
    },
    onSuccess: () => {
      toast.success("הקובץ הועלה בהצלחה");
      setLabel("");
      setCategory("");
      qc.invalidateQueries({ queryKey: ["clientDashboard"] });
    },
    onError: (e: Error) => {
      toast.error(e.message || "שגיאה בהעלאת הקובץ");
    },
    onSettled: () => setPending(false),
  });

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setPending(true);
    uploadMutation.mutate(files[0]);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <Card className="p-6 space-y-4" dir="rtl">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="doc-label">תיאור המסמך (אופציונלי)</Label>
          <Input
            id="doc-label"
            placeholder="לדוגמה: תלוש שכר אפריל 2026"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={120}
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="doc-category">סיווג מסמך (אופציונלי)</Label>
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as DocumentCategory)}
            disabled={pending}
          >
            <SelectTrigger id="doc-category" dir="rtl">
              <SelectValue placeholder="בחר קטגוריה" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              {DOCUMENT_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border bg-muted/20",
          pending && "opacity-60 pointer-events-none",
        )}
      >
        {pending ? (
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
        ) : (
          <UploadCloud className="h-10 w-10 text-primary" />
        )}
        <div>
          <p className="text-base font-medium text-foreground">
            גרור ושחרר קובץ כאן, או בחר מהמחשב
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            נתמכים: PDF, PNG, JPEG · עד 5 מגה־בייט
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
        >
          {pending ? "מעלה..." : "בחירת קובץ"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ACCEPTED.join(",")}
          onChange={onChange}
        />
      </div>
    </Card>
  );
}
