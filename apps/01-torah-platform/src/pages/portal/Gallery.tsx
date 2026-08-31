import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

export default function Gallery() {
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data } = useQuery({
    queryKey: ["gallery", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase.from("gallery_images").select("*").eq("tenant_id", tenant!.id).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const openCreate = () => {
    setCaption("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setOpen(true);
  };

  const upload = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("חסר ארגון");
      if (!file) throw new Error("יש לבחור תמונה");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `gallery/${tenant.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("portal-assets").upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("portal-assets").getPublicUrl(path);
      const { error } = await supabase.from("gallery_images").insert({
        tenant_id: tenant.id,
        image_url: urlData.publicUrl,
        caption: caption || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("התמונה הועלתה");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["gallery"] });
    },
    onError: (e: Error) => toast.error("שגיאה בהעלאה: " + e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gallery_images").delete().eq("id", id).eq("tenant_id", tenant!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("התמונה נמחקה");
      qc.invalidateQueries({ queryKey: ["gallery"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl">גלריה</h1>
        <Button onClick={openCreate}>
          <Plus className="ml-2 h-4 w-4" />
          העלאת תמונה
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>העלאת תמונה לגלריה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>תמונה *</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <div>
              <Label>כיתוב</Label>
              <Input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="כיתוב לתמונה (אופציונלי)"
              />
            </div>
            <Button
              className="w-full"
              onClick={() => upload.mutate()}
              disabled={upload.isPending || !file}
            >
              {upload.isPending ? "מעלה..." : "העלה"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {(data || []).map((g: any) => (
          <div key={g.id} className="relative group">
            <img src={g.image_url} alt={g.caption || ""} className="aspect-square w-full object-cover rounded-md bg-muted" />
            <Button
              size="icon"
              variant="destructive"
              className="absolute top-2 left-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => del.mutate(g.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            {g.caption && <div className="text-xs text-muted-foreground mt-1 truncate">{g.caption}</div>}
          </div>
        ))}
      </div>
      {(data?.length || 0) === 0 && <div className="text-muted-foreground">אין תמונות עדיין</div>}
    </div>
  );
}
