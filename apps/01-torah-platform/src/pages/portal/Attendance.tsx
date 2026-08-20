import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Square, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

type LessonRow = { id: string; title: string; rabbi_name: string | null; time_hhmm: string | null };
type ParticipantRow = { id: string; full_name: string; phone: string | null };

export default function Attendance() {
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});

  const { data: lessons = [] } = useQuery({
    queryKey: ["attendance-lessons", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, rabbi_name, time_hhmm")
        .eq("tenant_id", tenant!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as LessonRow[];
    },
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["attendance-participants", tenant?.id, selectedLesson],
    enabled: !!tenant?.id && !!selectedLesson,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("participants")
        .select("id, full_name, phone")
        .eq("tenant_id", tenant!.id)
        .eq("lesson_id", selectedLesson!);
      if (error) throw error;
      return (data || []) as ParticipantRow[];
    },
  });

  useQuery({
    queryKey: ["attendance-records", tenant?.id, selectedLesson],
    enabled: !!tenant?.id && !!selectedLesson,
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("attendance")
        .select("participant_id, is_present")
        .eq("tenant_id", tenant!.id)
        .eq("lesson_id", selectedLesson!)
        .eq("date", today);
      if (error) throw error;
      const map: Record<string, boolean> = {};
      (data || []).forEach((r) => {
        map[r.participant_id] = r.is_present;
      });
      setAttendance(map);
      return data || [];
    },
  });

  const saveAttendance = useMutation({
    mutationFn: async () => {
      if (!selectedLesson || !tenant?.id) throw new Error("חסר נתונים");
      const today = new Date().toISOString().split("T")[0];
      const rows = participants.map((p) => ({
        tenant_id: tenant!.id,
        lesson_id: selectedLesson,
        participant_id: p.id,
        date: today,
        is_present: attendance[p.id] ?? false,
      }));
      const { error } = await supabase
        .from("attendance")
        .upsert(rows, { onConflict: "tenant_id,lesson_id,participant_id,date" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("נוכחות נשמרה בהצלחה");
      qc.invalidateQueries({ queryKey: ["attendance-records"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleParticipant = (id: string) => {
    setAttendance((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const presentCount = Object.values(attendance).filter(Boolean).length;
  const totalCount = participants.length;
  const rate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
  const selectedLessonData = lessons.find((l) => l.id === selectedLesson);

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl">ניהול נוכחות</h1>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="flex items-center gap-3 p-6">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <div className="text-2xl font-bold">{totalCount}</div>
              <div className="text-sm text-muted-foreground">סה"כ משתתפים</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3 p-6">
            <CheckSquare className="h-8 w-8 text-green-600" />
            <div>
              <div className="text-2xl font-bold">{presentCount}</div>
              <div className="text-sm text-muted-foreground">נוכחים היום</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3 p-6">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <div>
              <div className="text-2xl font-bold">{rate}%</div>
              <div className="text-sm text-muted-foreground">אחוז נוכחות</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Lesson list */}
        <div>
          <h2 className="font-semibold text-lg mb-3">שיעורים</h2>
          <div className="space-y-2">
            {lessons.map((l) => (
              <Card
                key={l.id}
                className={`cursor-pointer transition-colors ${selectedLesson === l.id ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}
                onClick={() => setSelectedLesson(l.id)}
              >
                <div className="p-3">
                  <div className="font-medium text-sm">{l.title}</div>
                  {l.rabbi_name && <div className="text-xs text-muted-foreground">{l.rabbi_name}</div>}
                  {l.time_hhmm && <div className="text-xs text-muted-foreground">{l.time_hhmm}</div>}
                </div>
              </Card>
            ))}
            {lessons.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">אין שיעורים</div>
            )}
          </div>
        </div>

        {/* Attendance list */}
        <div className="md:col-span-2">
          {selectedLesson ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-lg">
                  נוכחות: {selectedLessonData?.title}
                </h2>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const all: Record<string, boolean> = {};
                      participants.forEach((p) => (all[p.id] = true));
                      setAttendance(all);
                    }}
                  >
                    סמן הכל
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveAttendance.mutate()}
                    disabled={saveAttendance.isPending}
                  >
                    שמור נוכחות
                  </Button>
                </div>
              </div>

              {participants.length === 0 ? (
                <Card>
                  <div className="py-8 text-center text-muted-foreground">
                    אין משתתפים רשומים לשיעור זה
                  </div>
                </Card>
              ) : (
                <div className="space-y-2">
                  {participants.map((p) => (
                    <Card
                      key={p.id}
                      className={`cursor-pointer transition-colors ${attendance[p.id] ? "border-green-400 bg-green-50/50 dark:bg-green-950/20" : ""}`}
                      onClick={() => toggleParticipant(p.id)}
                    >
                      <div className="p-3 flex items-center gap-3">
                        {attendance[p.id] ? (
                          <CheckSquare className="h-5 w-5 text-green-600 shrink-0" />
                        ) : (
                          <Square className="h-5 w-5 text-muted-foreground shrink-0" />
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-sm">{p.full_name}</div>
                          {p.phone && <div className="text-xs text-muted-foreground" dir="ltr">{p.phone}</div>}
                        </div>
                        <Badge variant={attendance[p.id] ? "default" : "secondary"} className="text-xs">
                          {attendance[p.id] ? "נוכח" : "נעדר"}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          ) : (
            <Card>
              <div className="py-12 text-center text-muted-foreground">
                בחר שיעור מהרשימה לניהול נוכחות
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
