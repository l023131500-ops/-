import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Calendar, ChevronDown, ChevronUp, BookOpen, ImageDown } from "lucide-react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// study_schedules: id, tenant_id, title, start_date, end_date, source_book, daily_amount, owner_user_id
// study_daily: id, schedule_id, tenant_id, date, content, notes, is_special, color

type Schedule = {
  id: string;
  tenant_id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  source_book: string | null;
  daily_amount: string | null;
  owner_user_id: string | null;
  created_at: string;
};

type DailyEntry = {
  id: string;
  schedule_id: string;
  tenant_id: string;
  date: string;
  content: string;
  notes: string | null;
  is_special: boolean | null;
  color: string | null;
};

const emptySchedule = { title: "", start_date: "", end_date: "", source_book: "", daily_amount: "" };
const emptyEntry = { date: "", content: "", notes: "", is_special: false };

export default function StudySchedule() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editSchedule, setEditSchedule] = useState<Schedule | null>(null);
  const [schedForm, setSchedForm] = useState(emptySchedule);

  const [entryOpen, setEntryOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<DailyEntry | null>(null);
  const [entryForm, setEntryForm] = useState(emptyEntry);
  const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [exportTarget, setExportTarget] = useState<Schedule | null>(null);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["study-schedules", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_schedules")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Schedule[];
    },
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["study-daily", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_daily")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("date", { ascending: true });
      if (error) throw error;
      return (data || []) as DailyEntry[];
    },
  });

  const getScheduleEntries = (scheduleId: string) =>
    entries.filter((e) => e.schedule_id === scheduleId);

  // Schedule CRUD
  const saveSchedule = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("חסר ארגון");
      if (editSchedule) {
        const { error } = await supabase
          .from("study_schedules")
          .update({
            title: schedForm.title,
            start_date: schedForm.start_date || null,
            end_date: schedForm.end_date || null,
            source_book: schedForm.source_book || null,
            daily_amount: schedForm.daily_amount || null,
          })
          .eq("id", editSchedule.id)
          .eq("tenant_id", tenant.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("study_schedules").insert({
          tenant_id: tenant.id,
          title: schedForm.title,
          start_date: schedForm.start_date || null,
          end_date: schedForm.end_date || null,
          source_book: schedForm.source_book || null,
          daily_amount: schedForm.daily_amount || null,
          owner_user_id: user?.id || null,
          meta: {},
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editSchedule ? "לוח לימוד עודכן" : "לוח לימוד נוסף");
      setScheduleOpen(false);
      qc.invalidateQueries({ queryKey: ["study-schedules"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("study_schedules")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenant!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("נמחק");
      qc.invalidateQueries({ queryKey: ["study-schedules"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Entry CRUD
  const saveEntry = useMutation({
    mutationFn: async () => {
      if (!tenant?.id || !activeScheduleId) throw new Error("חסר נתונים");
      if (editEntry) {
        const { error } = await supabase
          .from("study_daily")
          .update({
            date: entryForm.date,
            content: entryForm.content,
            notes: entryForm.notes || null,
            is_special: entryForm.is_special,
          })
          .eq("id", editEntry.id)
          .eq("tenant_id", tenant.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("study_daily").insert({
          tenant_id: tenant.id,
          schedule_id: activeScheduleId,
          date: entryForm.date,
          content: entryForm.content,
          notes: entryForm.notes || null,
          is_special: entryForm.is_special,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editEntry ? "רשומה עודכנה" : "רשומה נוספה");
      setEntryOpen(false);
      qc.invalidateQueries({ queryKey: ["study-daily"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("study_daily")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenant!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("נמחק");
      qc.invalidateQueries({ queryKey: ["study-daily"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openNewSchedule = () => {
    setEditSchedule(null);
    setSchedForm(emptySchedule);
    setScheduleOpen(true);
  };

  const openEditSchedule = (s: Schedule) => {
    setEditSchedule(s);
    setSchedForm({
      title: s.title,
      start_date: s.start_date || "",
      end_date: s.end_date || "",
      source_book: s.source_book || "",
      daily_amount: s.daily_amount || "",
    });
    setScheduleOpen(true);
  };

  const openNewEntry = (scheduleId: string) => {
    setActiveScheduleId(scheduleId);
    setEditEntry(null);
    setEntryForm(emptyEntry);
    setEntryOpen(true);
  };

  const openEditEntry = (e: DailyEntry) => {
    setActiveScheduleId(e.schedule_id);
    setEditEntry(e);
    setEntryForm({
      date: e.date,
      content: e.content,
      notes: e.notes || "",
      is_special: e.is_special ?? false,
    });
    setEntryOpen(true);
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("he-IL", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return d;
    }
  };

  // Branded PNG export (spec §5.2 מגיד שיעור עצמאי: "ייצוא PNG ממותג")
  const handleExportPng = (sched: Schedule) => {
    setExportTarget(sched);
  };

  useEffect(() => {
    if (!exportTarget || !exportRef.current) return;
    // give the off-screen node a render pass before capturing it
    const timer = setTimeout(async () => {
      if (!exportRef.current) return;
      setExporting(true);
      try {
        const dataUrl = await toPng(exportRef.current, {
          pixelRatio: 2,
          backgroundColor: "#ffffff",
          width: exportRef.current.offsetWidth,
          height: exportRef.current.offsetHeight,
        });
        const link = document.createElement("a");
        const safeName = exportTarget.title.replace(/[^\w\u0590-\u05FF]+/g, "_") || "לוח_לימוד";
        link.download = `${safeName}.png`;
        link.href = dataUrl;
        link.click();
        toast.success("התמונה יוצאה בהצלחה");
      } catch {
        toast.error("שגיאה בייצוא התמונה");
      } finally {
        setExporting(false);
        setExportTarget(null);
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [exportTarget]);

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl">לוחות לימוד יומיים</h1>
        <Button onClick={openNewSchedule}>
          <Plus className="ml-2 h-4 w-4" />
          לוח לימוד חדש
        </Button>
      </div>

      {/* Schedule dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editSchedule ? "עריכת לוח לימוד" : "לוח לימוד חדש"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>כותרת *</Label>
              <Input
                value={schedForm.title}
                onChange={(e) => setSchedForm({ ...schedForm, title: e.target.value })}
                placeholder="שם לוח הלימוד"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>תחילה</Label>
                <Input
                  type="date"
                  value={schedForm.start_date}
                  onChange={(e) => setSchedForm({ ...schedForm, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>סיום</Label>
                <Input
                  type="date"
                  value={schedForm.end_date}
                  onChange={(e) => setSchedForm({ ...schedForm, end_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>מקור (ספר / מסכת)</Label>
              <Input
                value={schedForm.source_book}
                onChange={(e) => setSchedForm({ ...schedForm, source_book: e.target.value })}
                placeholder="מסכת ברכות / בראשית..."
              />
            </div>
            <div>
              <Label>כמות יומית</Label>
              <Input
                value={schedForm.daily_amount}
                onChange={(e) => setSchedForm({ ...schedForm, daily_amount: e.target.value })}
                placeholder="דף א' / פרק א'..."
              />
            </div>
            <Button
              className="w-full"
              disabled={!schedForm.title || saveSchedule.isPending}
              onClick={() => saveSchedule.mutate()}
            >
              {saveSchedule.isPending ? "שומר..." : "שמור"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Entry dialog */}
      <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editEntry ? "עריכת רשומה" : "רשומה חדשה"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>תאריך *</Label>
              <Input
                type="date"
                value={entryForm.date}
                onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })}
              />
            </div>
            <div>
              <Label>תוכן *</Label>
              <Input
                value={entryForm.content}
                onChange={(e) => setEntryForm({ ...entryForm, content: e.target.value })}
                placeholder="דף / פרק / נושא..."
              />
            </div>
            <div>
              <Label>הערות</Label>
              <Input
                value={entryForm.notes}
                onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })}
                placeholder="הערות..."
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="special-check"
                checked={entryForm.is_special}
                onChange={(e) => setEntryForm({ ...entryForm, is_special: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="special-check" className="cursor-pointer">
                יום מיוחד (חג / שבת)
              </Label>
            </div>
            <Button
              className="w-full"
              disabled={!entryForm.date || !entryForm.content || saveEntry.isPending}
              onClick={() => saveEntry.mutate()}
            >
              {saveEntry.isPending ? "שומר..." : "שמור"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedules list */}
      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">טוען...</div>
      ) : schedules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            אין לוחות לימוד. צור לוח ראשון!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {schedules.map((sched) => {
            const schedEntries = getScheduleEntries(sched.id);
            const isExpanded = expanded.has(sched.id);
            return (
              <Card key={sched.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div
                      className="flex items-center gap-2 cursor-pointer flex-1"
                      onClick={() => toggleExpanded(sched.id)}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <CardTitle className="text-lg">{sched.title}</CardTitle>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {sched.source_book && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <BookOpen className="h-3 w-3" />
                              {sched.source_book}
                            </span>
                          )}
                          {sched.start_date && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {formatDate(sched.start_date)}
                              {sched.end_date && ` – ${formatDate(sched.end_date)}`}
                            </span>
                          )}
                          {sched.daily_amount && (
                            <Badge variant="outline" className="text-xs">
                              {sched.daily_amount} ליום
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary" className="mr-2">
                        {schedEntries.length} רשומות
                      </Badge>
                    </div>
                    <div className="flex gap-1 mr-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openNewEntry(sched.id)}
                      >
                        <Plus className="h-4 w-4 ml-1" />
                        רשומה
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={exporting && exportTarget?.id === sched.id}
                        onClick={() => handleExportPng(sched)}
                      >
                        <ImageDown className="h-4 w-4 ml-1" />
                        ייצוא PNG
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openEditSchedule(sched)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteSchedule.mutate(sched.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    {schedEntries.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        אין רשומות. לחץ "רשומה" להוספה.
                      </p>
                    ) : (
                      <div className="space-y-1.5 mt-2">
                        {schedEntries
                          .sort((a, b) => a.date.localeCompare(b.date))
                          .map((entry) => (
                            <div
                              key={entry.id}
                              className={`flex items-center gap-3 p-2.5 rounded-lg ${
                                entry.is_special ? "bg-yellow-50/70 dark:bg-yellow-950/20 border border-yellow-200" : "bg-muted/40"
                              }`}
                            >
                              <span className="text-xs text-muted-foreground font-mono shrink-0 w-24">
                                {formatDate(entry.date)}
                              </span>
                              <span className="flex-1 text-sm font-medium">{entry.content}</span>
                              {entry.is_special && (
                                <Badge className="text-xs bg-yellow-500">מיוחד</Badge>
                              )}
                              {entry.notes && (
                                <span className="text-xs text-muted-foreground hidden md:block max-w-[150px] truncate">
                                  {entry.notes}
                                </span>
                              )}
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => openEditEntry(entry)}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => deleteEntry.mutate(entry.id)}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Off-screen branded card, captured to PNG on export */}
      {exportTarget && (
        <div style={{ position: "fixed", top: -10000, left: -10000, pointerEvents: "none" }}>
          <div
            ref={exportRef}
            dir="rtl"
            style={{
              width: 800,
              padding: 40,
              background: "#ffffff",
              fontFamily: "Heebo, Rubik, Arial, sans-serif",
              color: "#1f2937",
              borderTop: `8px solid ${tenant?.branding?.primary_color || "#2563eb"}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {tenant?.branding?.logo_url && (
                  <img src={tenant.branding.logo_url} alt="" style={{ height: 48, width: 48, objectFit: "contain", borderRadius: 8 }} />
                )}
                <span style={{ fontSize: 18, fontWeight: 600 }}>
                  {tenant?.branding?.site_name || tenant?.name || "איגוד השיעורים"}
                </span>
              </div>
            </div>

            <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 8px" }}>{exportTarget.title}</h1>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24, fontSize: 14, color: "#4b5563" }}>
              {exportTarget.source_book && <span>📖 {exportTarget.source_book}</span>}
              {exportTarget.start_date && (
                <span>
                  📅 {formatDate(exportTarget.start_date)}
                  {exportTarget.end_date ? ` – ${formatDate(exportTarget.end_date)}` : ""}
                </span>
              )}
              {exportTarget.daily_amount && <span>🔖 {exportTarget.daily_amount} ליום</span>}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {getScheduleEntries(exportTarget.id)
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: entry.is_special ? "#fef9c3" : "#f3f4f6",
                    }}
                  >
                    <span style={{ fontSize: 12, color: "#6b7280", minWidth: 110 }}>{formatDate(entry.date)}</span>
                    <span style={{ fontSize: 15, fontWeight: 500, flex: 1 }}>{entry.content}</span>
                    {entry.notes && <span style={{ fontSize: 12, color: "#6b7280" }}>{entry.notes}</span>}
                  </div>
                ))}
            </div>

            <div style={{ marginTop: 32, paddingTop: 16, borderTop: "1px solid #e5e7eb", textAlign: "center", fontSize: 12, color: "#9ca3af" }}>
              בסיוע איגוד השיעורים · 02-3131600
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
