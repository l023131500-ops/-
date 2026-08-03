import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AdminGate } from "@/components/admin-gate";
import { Bell, CalendarDays, CheckCircle2, Clock, HeartHandshake, Sparkles } from "lucide-react";

interface ReminderResponse {
  id: number;
  topicId: number;
  topicTitle: string | null;
  response: "yes" | "not_yet" | "not_eligible" | string;
  contactName: string | null;
  contactPhone: string | null;
  nextReminderDate: string | null;
  wantsService: number;
  note: string | null;
  createdAt: string;
}

function responseLabel(value: string) {
  switch (value) {
    case "yes":
      return { label: "בוצע", color: "text-emerald-600", Icon: CheckCircle2 };
    case "not_yet":
      return { label: "עדיין לא", color: "text-amber-600", Icon: Clock };
    case "not_eligible":
      return { label: "כנראה לא זכאי", color: "text-slate-600", Icon: HeartHandshake };
    default:
      return { label: value, color: "text-muted-foreground", Icon: Bell };
  }
}

export default function RemindersPage() {
  const { data, isLoading } = useQuery<ReminderResponse[]>({
    queryKey: ["/api/admin/reminder-responses"],
  });

  return (
    <AdminGate>
      <div className="space-y-6" data-testid="page-reminders">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight inline-flex items-center gap-2">
            <Bell className="w-6 h-6" />
            תזכורות לקוחות
          </h1>
          <p className="text-sm text-muted-foreground">
            תשובות שהתקבלו ממסך התזכורת הציבורי <code dir="ltr">/#/r/:topicId</code>. רשומות חדשות בראש.
          </p>
        </header>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : !data || data.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">עדיין לא התקבלו תשובות תזכורת. שלח את קישור התזכורת מהכרטיס "נוסח תזכורת" בדף הנושא.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {data.map((row) => {
              const meta = responseLabel(row.response);
              const Icon = meta.Icon;
              return (
                <Card key={row.id} className="p-4 space-y-2" data-testid={`reminder-${row.id}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${meta.color}`} />
                      <Badge variant="secondary">{meta.label}</Badge>
                      <span className="text-sm font-semibold">{row.topicTitle || `נושא #${row.topicId}`}</span>
                      <span className="text-xs text-muted-foreground" dir="ltr">
                        #{row.topicId}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground" dir="ltr">
                      {row.createdAt}
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-2 text-sm">
                    {(row.contactName || row.contactPhone) && (
                      <div className="md:col-span-2">
                        <div className="text-xs text-muted-foreground">פרטי קשר</div>
                        <div>
                          {row.contactName || "—"}
                          {row.contactPhone ? ` · ${row.contactPhone}` : ""}
                        </div>
                      </div>
                    )}
                    {row.nextReminderDate && (
                      <div>
                        <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5" /> תזכורת הבאה
                        </div>
                        <div>{row.nextReminderDate}</div>
                      </div>
                    )}
                    {row.wantsService === 1 && (
                      <div className="md:col-span-3">
                        <span className="inline-flex items-center gap-1 text-amber-700 text-sm font-semibold">
                          <Sparkles className="w-3.5 h-3.5" />
                          הלקוח ביקש שאנחנו נטפל עבורו בפעולה
                        </span>
                      </div>
                    )}
                    {row.note && (
                      <div className="md:col-span-3">
                        <div className="text-xs text-muted-foreground">הערה</div>
                        <div className="text-sm whitespace-pre-wrap">{row.note}</div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminGate>
  );
}
