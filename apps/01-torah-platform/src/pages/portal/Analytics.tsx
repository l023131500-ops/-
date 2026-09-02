import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { formatILS, localDateString } from "@/lib/utils";

const MONTH_LABEL: Record<string, string> = {
  "01": "ינו׳", "02": "פבר׳", "03": "מרץ", "04": "אפר׳", "05": "מאי", "06": "יוני",
  "07": "יולי", "08": "אוג׳", "09": "ספט׳", "10": "אוק׳", "11": "נוב׳", "12": "דצמ׳",
};

function monthLabel(yyyyMm: string) {
  const [, mm] = yyyyMm.split("-");
  return MONTH_LABEL[mm] || yyyyMm;
}

/** architecture.md §5.1 "מודולים משותפים": דשבורד עם widgets ← Dashboard.tsx (4
 * stat cards) covers that bullet; this is the separate "דוחות ואנליטיקס
 * בסיסיים" bullet, which had no screen at all — the only chart in the whole
 * app is admin/Analytics.tsx, cross-tenant and super-admin-only. Every query
 * here relies on the same tenant-scoped RLS the rest of the portal already
 * uses (lessons/leads/participants: any tenant member; donations/orders:
 * tenant_admin, mirroring Dashboard.tsx's own donations/orders reads), so a
 * plain member sees lesson/lead/attendance trends and a tenant_admin
 * additionally sees the donations chart — no new grant, no new policy. */
export default function Analytics() {
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const { data: lessonsByMonth } = useQuery({
    queryKey: ["portal-analytics-lessons", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("created_at")
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      const buckets: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        const month = String(r.created_at).slice(0, 7);
        buckets[month] = (buckets[month] || 0) + 1;
      });
      return Object.entries(buckets)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, count]) => ({ month: monthLabel(month), count }));
    },
  });

  const { data: leadsByStatus } = useQuery({
    queryKey: ["portal-analytics-leads", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("status")
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      const buckets: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        const status = r.status || "לא ידוע";
        buckets[status] = (buckets[status] || 0) + 1;
      });
      return Object.entries(buckets).map(([status, count]) => ({ status, count }));
    },
  });

  const { data: attendanceRate } = useQuery({
    queryKey: ["portal-analytics-attendance", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("date, is_present")
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      const buckets: Record<string, { present: number; total: number }> = {};
      (data || []).forEach((r: any) => {
        const day = String(r.date);
        if (!buckets[day]) buckets[day] = { present: 0, total: 0 };
        buckets[day].total += 1;
        if (r.is_present) buckets[day].present += 1;
      });
      return Object.entries(buckets)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([day, v]) => ({ day, rate: Math.round((v.present / v.total) * 100) }));
    },
  });

  // Mirrors Dashboard.tsx's own donations query (tenant_admin-scoped by RLS —
  // a plain member's read returns zero rows here, same as on the dashboard).
  const { data: donationsByDay } = useQuery({
    queryKey: ["portal-analytics-donations", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donations")
        .select("amount_ils, created_at")
        .eq("tenant_id", tenantId!)
        .eq("payment_status", "captured");
      if (error) throw error;
      const buckets: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        const day = localDateString(new Date(r.created_at));
        buckets[day] = (buckets[day] || 0) + Number(r.amount_ils || 0);
      });
      return Object.entries(buckets)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([day, total]) => ({ day, total }));
    },
  });

  return (
    <div>
      <h1 className="font-heading text-3xl mb-6">דוחות ואנליטיקס</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>שיעורים לפי חודש</CardTitle></CardHeader>
          <CardContent className="h-64">
            {(lessonsByMonth?.length || 0) === 0 ? (
              <p className="text-muted-foreground text-sm">אין עדיין נתונים להצגה</p>
            ) : (
              <ResponsiveContainer>
                <BarChart data={lessonsByMonth}>
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <RTooltip />
                  <Bar dataKey="count" name="שיעורים" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>פניות לפי סטטוס</CardTitle></CardHeader>
          <CardContent className="h-64">
            {(leadsByStatus?.length || 0) === 0 ? (
              <p className="text-muted-foreground text-sm">אין עדיין פניות</p>
            ) : (
              <ResponsiveContainer>
                <BarChart data={leadsByStatus}>
                  <XAxis dataKey="status" />
                  <YAxis allowDecimals={false} />
                  <RTooltip />
                  <Bar dataKey="count" name="פניות" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>אחוז נוכחות לפי יום</CardTitle></CardHeader>
          <CardContent className="h-64">
            {(attendanceRate?.length || 0) === 0 ? (
              <p className="text-muted-foreground text-sm">אין עדיין רישומי נוכחות</p>
            ) : (
              <ResponsiveContainer>
                <BarChart data={attendanceRate}>
                  <XAxis dataKey="day" />
                  <YAxis unit="%" domain={[0, 100]} />
                  <RTooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="rate" name="אחוז נוכחות" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>תרומות לפי יום</CardTitle></CardHeader>
          <CardContent className="h-64">
            {(donationsByDay?.length || 0) === 0 ? (
              <p className="text-muted-foreground text-sm">אין עדיין תרומות, או שאין הרשאת ניהול לצפייה</p>
            ) : (
              <ResponsiveContainer>
                <BarChart data={donationsByDay}>
                  <XAxis dataKey="day" />
                  <YAxis />
                  <RTooltip formatter={(v: number) => formatILS(v)} />
                  <Bar dataKey="total" name="תרומות" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
