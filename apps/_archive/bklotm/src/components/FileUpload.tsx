import { useState, useRef } from "react";
import { Upload, X, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FileUploadProps {
  onFilesUploaded: (urls: string[]) => void;
  maxFiles?: number;
}

const FileUpload = ({ onFilesUploaded, maxFiles = 3 }: FileUploadProps) => {
  const [files, setFiles] = useState<{ name: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    setUploading(true);
    const newFiles: { name: string; url: string }[] = [];

    for (let i = 0; i < Math.min(selected.length, maxFiles - files.length); i++) {
      const file = selected[i];
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage
        .from("lead-documents")
        .upload(path, file);

      if (!error) {
        const { data: urlData } = supabase.storage
          .from("lead-documents")
          .getPublicUrl(path);
        newFiles.push({ name: file.name, url: urlData.publicUrl });
      }
    }

    const allFiles = [...files, ...newFiles];
    setFiles(allFiles);
    onFilesUploaded(allFiles.map(f => f.url));
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeFile = (idx: number) => {
    const updated = files.filter((_, i) => i !== idx);
    setFiles(updated);
    onFilesUploaded(updated.map(f => f.url));
  };

  return (
    <div className="space-y-2">
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted text-xs">
              <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="flex-1 truncate text-foreground">{f.name}</span>
              <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      {files.length < maxFiles && (
        <label className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-border hover:border-primary/40 cursor-pointer transition-colors">
          <Upload className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {uploading ? "מעלה..." : "צירוף מסמכים (לא חובה)"}
          </span>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={handleUpload}
            className="sr-only"
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
};

export default FileUpload;
