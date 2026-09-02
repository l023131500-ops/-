import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

type AuditRow = {
  id: string;
  tenant_id: string | null;
  user_id: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  diff: unknown;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  tenants: { name: string } | null;
};

export default function AuditLog() {
  const [search, setSearch] = useState("");
  const [tenantFilter, setTenantFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-log-global"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("audit_log")
        .select("*, tenants(name)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;

      const userIds = Array.from(new Set((rows || []).map((r: any) => r.user_id).filter(Boolean)));
      const profileMap = new Map<string, string>();
      if (userIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name, display_name").in("id", userIds);
        (profs || []).forEach((p: any) => profileMap.set(p.id, p.display_name || p.full_name || p.id));
      }

      return (rows || []).map((r: any) => ({
        ...r,
        userLabel: r.user_id ? profileMap.get(r.user_id) || r.user_id : null,
      })) as (AuditRow & { userLabel: string | null })[];
    },
  });

  const tenantOptions = useMemo(() => {
    const seen = new Map<string, string>();
    (data || []).forEach((r) => {
      if (r.tenant_id) seen.set(r.tenant_id, r.tenants?.name || r.tenant_id);
    });
    return Array.from(seen.entries());
  }, [data]);

  const filtered = useMemo(() => {
    return (data || []).filter((r) => {
      if (tenantFilter !== "all" && r.tenant_id !== tenantFilter) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        r.action.toLowerCase().includes(q) ||
        (r.entity || "").toLowerCase().includes(q) ||
        (r.entity_id || "").toLowerCase().includes(q) ||
        (r.userLabel || "").toLowerCase().includes(q) ||
        (r.tenants?.name || "").toLowerCase().includes(q)
      );
    });
  }, [data, search, tenantFilter]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <ShieldAlert className="h-7 w-7 text-primary" />
        <h1 className="font-heading text-3xl">יומן ביקורת (Audit Log)</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          placeholder="חיפוש לפי פעולה, ישות, משתמש או ארגון..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-sm"
        />
        <Select value={tenantFilter} onValueChange={setTenantFilter}>
          <SelectTrigger className="sm:w-56"><SelectValue placeholder="כל הארגונים" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הארגונים</SelectItem>
            {tenantOptions.map(([id, name]) => (
              <SelectItem key={id} value={id}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div className="text-muted-foreground text-sm">טוען...</div>}

      {!isLoading && filtered.length === 0 && (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          {data && data.length > 0 ? "אין תוצאות תואמות לסינון" : "אין עדיין רשומות ביקורת במערכת"}
        </CardContent></Card>
      )}

      <div className="space-y-2">
        {filtered.map((r) => (
          <Card key={r.id}>
            <CardContent
              className="py-3 cursor-pointer"
              onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="font-medium flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">{r.action}</Badge>
                    {r.entity && <span className="text-sm text-muted-foreground">{r.entity}{r.entity_id ? ` · ${r.entity_id.slice(0, 8)}` : ""}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {r.tenants?.name && <>ארגון: {r.tenants.name} · </>}
                    {r.userLabel && <>משתמש: {r.userLabel} · </>}
                    {r.ip && <>IP: {r.ip} · </>}
                    {new Date(r.created_at).toLocaleString("he-IL")}
                  </div>
                </div>
              </div>
              {expandedId === r.id && (
                <pre className="text-xs bg-muted rounded p-2 overflow-x-auto mt-3">
                  {JSON.stringify({ diff: r.diff, user_agent: r.user_agent }, null, 2)}
                </pre>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
