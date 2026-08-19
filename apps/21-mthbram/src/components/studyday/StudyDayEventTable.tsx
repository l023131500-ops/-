import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Download, Send, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { copyEventToClipboard, downloadEventAsText } from "@/lib/studyDayShare";
import { normalizeToBlocks, blockLabel } from "@/lib/studyDayLessons";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type Event = Tables<"study_day_events">;

interface Props {
  events: Event[];
  onChanged: () => void;
}

function formatSchedule(e: Event) {
  const blocks = normalizeToBlocks(e.lessons, {
    schedule_type: e.schedule_type,
    event_date: e.event_date,
    schedule_days: e.schedule_days,
  });
  if (blocks.length === 0) return "—";
  const first = blockLabel(blocks[0]);
  return blocks.length > 1 ? `${first} +${blocks.length - 1}` : first;
}

function lessonsCount(e: Event): number {
  const blocks = normalizeToBlocks(e.lessons, {
    schedule_type: e.schedule_type,
    event_date: e.event_date,
    schedule_days: e.schedule_days,
  });
  return blocks.reduce((sum, b) => sum + b.items.length, 0);
}

export default function StudyDayEventTable({ events, onChanged }: Props) {
  const handleSend = async (id: string) => {
    const { error } = await supabase
      .from("study_day_events")
      .update({ is_sent: true, status: "pending" })
      .eq("id", id);
    if (error) { toast.error("שגיאה בשליחה"); return; }
    toast.success("נשלח לאישור");
    onChanged();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("למחוק את יום העיון?")) return;
    const { error } = await supabase.from("study_day_events").delete().eq("id", id);
    if (error) { toast.error("שגיאה במחיקה"); return; }
    toast.success("נמחק");
    onChanged();
  };

  const handleSendAll = async () => {
    const unsent = events.filter((e) => !e.is_sent);
    if (!unsent.length) { toast.info("אין ימי עיון חדשים"); return; }
    if (!confirm(`לשלוח ${unsent.length} ימי עיון לאישור?`)) return;
    const { error } = await supabase
      .from("study_day_events")
      .update({ is_sent: true, status: "pending" })
      .in("id", unsent.map((e) => e.id));
    if (error) { toast.error("שגיאה"); return; }
    toast.success(`נשלחו ${unsent.length}`);
    onChanged();
  };

  if (!events.length) {
    return (
      <div className="bg-white border border-foreground/10 rounded-xl p-10 text-center text-muted-foreground">
        עדיין לא נוספו ימי עיון. הוסף ידנית למעלה או יבא מקובץ Excel.
      </div>
    );
  }

  const unsentCount = events.filter((e) => !e.is_sent).length;

  return (
    <div className="bg-white border border-foreground/10 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-foreground/10">
        <h3 className="font-display text-lg text-[hsl(180_45%_30%)]">רשימת ימי עיון ({events.length})</h3>
        {unsentCount > 0 && (
          <Button onClick={handleSendAll} size="sm" className="bg-[hsl(180_45%_30%)] hover:bg-[hsl(180_45%_25%)] text-white gap-2">
            <Send className="w-4 h-4" /> שלח הכל ({unsentCount})
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">בית כנסת</TableHead>
              <TableHead className="text-right">עיר</TableHead>
              <TableHead className="text-right">מועד</TableHead>
              <TableHead className="text-right">שיעורים</TableHead>
              <TableHead className="text-right">קהל</TableHead>
              <TableHead className="text-right">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((e) => (
              <TableRow key={e.id} className={cn(e.is_sent && "bg-muted/40 text-muted-foreground")}>
                <TableCell className="font-medium">{e.synagogue_name}</TableCell>
                <TableCell className="text-xs">{e.city}</TableCell>
                <TableCell className="text-xs">{formatSchedule(e)}</TableCell>
                <TableCell className="text-xs">{lessonsCount(e)}</TableCell>
                <TableCell className="text-xs">{e.target_audience?.join(", ") || "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="העתק"
                      onClick={async () => { await copyEventToClipboard(e); toast.success("הועתק"); }}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="הורד"
                      onClick={() => downloadEventAsText(e)}>
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                    {e.is_sent ? (
                      <span className="inline-flex items-center gap-1 text-xs text-primary px-2">
                        <CheckCircle2 className="w-4 h-4" /> נשלח
                      </span>
                    ) : (
                      <>
                        <Button size="icon" variant="ghost"
                          className="h-8 w-8 text-[hsl(180_45%_30%)]"
                          title="שלח לאישור"
                          onClick={() => handleSend(e.id)}>
                          <Send className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title="מחק"
                          onClick={() => handleDelete(e.id)}>
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
