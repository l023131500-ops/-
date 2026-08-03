import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Download, Send, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { copyLessonToClipboard, downloadLessonAsText } from "@/lib/lessonShare";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type Lesson = Tables<"lessons">;

interface Props {
  lessons: Lesson[];
  onChanged: () => void;
}

function formatLocation(l: Lesson) {
  return [l.city, l.neighborhood, l.street, l.street_number].filter(Boolean).join(" ");
}

function formatTime(l: Lesson) {
  if (l.specific_date) return l.specific_date;
  const days = (l.schedule_days as Array<{ day?: string; time?: string }> | null) ?? [];
  if (Array.isArray(days) && days.length) {
    return days.map((d) => `${d.day ?? ""} ${d.time ?? ""}`.trim()).filter(Boolean).join(", ");
  }
  return l.schedule_notes || "—";
}

export default function BulkLessonTable({ lessons, onChanged }: Props) {
  const handleSend = async (id: string) => {
    const { error } = await supabase
      .from("lessons")
      .update({ is_sent: true, status: "pending" })
      .eq("id", id);
    if (error) {
      toast.error("שגיאה בשליחה");
      return;
    }
    toast.success("השיעור נשלח לאישור");
    onChanged();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("למחוק את השיעור?")) return;
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) {
      toast.error("שגיאה במחיקה");
      return;
    }
    toast.success("השיעור נמחק");
    onChanged();
  };

  const handleSendAll = async () => {
    const unsent = lessons.filter((l) => !l.is_sent);
    if (!unsent.length) {
      toast.info("אין שיעורים חדשים לשליחה");
      return;
    }
    if (!confirm(`לשלוח ${unsent.length} שיעורים לאישור?`)) return;
    const { error } = await supabase
      .from("lessons")
      .update({ is_sent: true, status: "pending" })
      .in("id", unsent.map((l) => l.id));
    if (error) {
      toast.error("שגיאה בשליחה כללית");
      return;
    }
    toast.success(`נשלחו ${unsent.length} שיעורים`);
    onChanged();
  };

  if (!lessons.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
        עדיין לא נוספו שיעורים. הוסף ידנית למעלה או יבא מקובץ Excel.
      </div>
    );
  }

  const unsentCount = lessons.filter((l) => !l.is_sent).length;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-display text-lg">רשימת שיעורים ({lessons.length})</h3>
        {unsentCount > 0 && (
          <Button
            onClick={handleSendAll}
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-2"
            size="sm"
          >
            <Send className="w-4 h-4" />
            שלח הכל ({unsentCount})
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">שם הרב</TableHead>
              <TableHead className="text-right">נושא</TableHead>
              <TableHead className="text-right">שפה</TableHead>
              <TableHead className="text-right">קהל</TableHead>
              <TableHead className="text-right">מיקום</TableHead>
              <TableHead className="text-right">בית כנסת</TableHead>
              <TableHead className="text-right">זמן</TableHead>
              <TableHead className="text-right">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lessons.map((l) => (
              <TableRow
                key={l.id}
                className={cn(l.is_sent && "bg-muted/40 text-muted-foreground")}
              >
                <TableCell className="font-medium">{l.rabbi_name}</TableCell>
                <TableCell>{l.subject}</TableCell>
                <TableCell>{l.language}</TableCell>
                <TableCell className="text-xs">
                  <div>{l.audience_type?.join(", ")}</div>
                  {l.target_audience?.length ? (
                    <div className="opacity-70">{l.target_audience.join(", ")}</div>
                  ) : null}
                </TableCell>
                <TableCell className="text-xs">{formatLocation(l) || "—"}</TableCell>
                <TableCell className="text-xs">{l.synagogue_name || "—"}</TableCell>
                <TableCell className="text-xs">{formatTime(l)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="icon" variant="ghost" className="h-8 w-8"
                      title="העתק"
                      onClick={async () => {
                        await copyLessonToClipboard(l);
                        toast.success("הועתק");
                      }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon" variant="ghost" className="h-8 w-8"
                      title="הורד"
                      onClick={() => downloadLessonAsText(l)}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                    {l.is_sent ? (
                      <span className="inline-flex items-center gap-1 text-xs text-primary px-2">
                        <CheckCircle2 className="w-4 h-4" />
                        נשלח
                      </span>
                    ) : (
                      <>
                        <Button
                          size="icon" variant="ghost"
                          className="h-8 w-8 text-secondary hover:text-secondary"
                          title="שלח לאישור"
                          onClick={() => handleSend(l.id)}
                        >
                          <Send className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon" variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title="מחק"
                          onClick={() => handleDelete(l.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
