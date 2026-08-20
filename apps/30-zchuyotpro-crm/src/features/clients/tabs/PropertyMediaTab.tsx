import { useEffect, useRef, useState } from "react";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, Trash2, Image as ImageIcon, Video as VideoIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { propertyMediaQuery, housingQuery, clientQuery, meProfileQuery, useInvalidateClient } from "@/features/clients/queries";
import { formatDateTimeHe } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const GENERAL_LABEL = "__general__";

type PropertyMedia = {
  id: string;
  property_label: string | null;
  media_type: "photo" | "video";
  file_name: string;
  storage_path: string;
  created_at: string;
};

function MediaThumb({ item }: { item: PropertyMedia }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.storage.from("property-media").createSignedUrl(item.storage_path, 3600).then(({ data }) => {
      if (!cancelled && data) setUrl(data.signedUrl);
    });
    return () => { cancelled = true; };
  }, [item.storage_path]);

  if (!url) {
    return <div className="aspect-video bg-muted flex items-center justify-center rounded-md"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }
  return item.media_type === "video" ? (
    <video src={url} controls className="w-full aspect-video rounded-md bg-black object-contain" />
  ) : (
    <img src={url} alt={item.file_name} className="w-full aspect-video rounded-md object-cover" />
  );
}

export function PropertyMediaTab({ clientId }: { clientId: string }) {
  const { data: client } = useSuspenseQuery(clientQuery(clientId));
  const { data: me } = useSuspenseQuery(meProfileQuery());
  const { data: housing } = useSuspenseQuery(housingQuery(clientId));
  const { data: media } = useSuspenseQuery(propertyMediaQuery(clientId));
  const invalidate = useInvalidateClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const propertyOptions = [
    ...(housing?.property_address ? [housing.property_address as string] : []),
    ...(((housing?.additional_properties as { address: string }[] | null) ?? [])
      .map((p) => p.address)
      .filter(Boolean)),
  ];
  const [label, setLabel] = useState<string>(propertyOptions[0] ?? GENERAL_LABEL);
  useEffect(() => {
    if (propertyOptions.length && label === GENERAL_LABEL) setLabel(propertyOptions[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [housing?.property_address]);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      setUploading(true);
      const mediaType: "photo" | "video" = file.type.startsWith("video/") ? "video" : "photo";
      const path = `${client.tenant_id}/${clientId}/${crypto.randomUUID()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("property-media").upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("property_media").insert({
        tenant_id: client.tenant_id,
        client_id: clientId,
        property_label: label === GENERAL_LABEL ? null : label,
        media_type: mediaType,
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
    mutationFn: async (item: { id: string; storage_path: string }) => {
      await supabase.storage.from("property-media").remove([item.storage_path]);
      const { error } = await supabase.from("property_media").delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("נמחק"); invalidate(clientId); },
  });

  const groups = new Map<string, PropertyMedia[]>();
  for (const m of media as PropertyMedia[]) {
    const key = m.property_label ?? GENERAL_LABEL;
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
        <CardTitle>תמונות ווידאו של הנכס</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={label} onValueChange={setLabel}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {propertyOptions.map((addr) => <SelectItem key={addr} value={addr}>{addr}</SelectItem>)}
              <SelectItem value={GENERAL_LABEL}>כללי (לא משויך לכתובת)</SelectItem>
            </SelectContent>
          </Select>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ""; }}
          />
          <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin ms-2" /> : <Upload className="h-4 w-4 ms-2" />}
            העלה תמונה/וידאו
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {media.length === 0 && <div className="text-center text-muted-foreground py-12">אין עדיין תמונות או וידאו של הנכס</div>}
        {[...groups.entries()].map(([key, items]) => (
          <div key={key} className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              {key === GENERAL_LABEL ? "כללי" : key}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((m) => (
                <Card key={m.id} className="overflow-hidden">
                  <MediaThumb item={m} />
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 text-xs text-muted-foreground">
                        {m.media_type === "video" ? <VideoIcon className="h-3.5 w-3.5 shrink-0" /> : <ImageIcon className="h-3.5 w-3.5 shrink-0" />}
                        <span className="truncate">{m.file_name}</span>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive h-7 w-7"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir="rtl">
                          <AlertDialogHeader><AlertDialogTitle>למחוק את {m.file_name}?</AlertDialogTitle></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>ביטול</AlertDialogCancel>
                            <AlertDialogAction onClick={() => del.mutate({ id: m.id, storage_path: m.storage_path })}>מחק</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDateTimeHe(m.created_at)}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
