import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// We store per-teacher feature overrides in user_roles.permissions JSON
// Teachers are users with role = 'member' or 'moderator' in any tenant,
// who also appear in profiles. We use user_roles to list them.

const FEATURES: { key: string; label: string; description: string }[] = [
  { key: "forums_access", label: "פורומים", description: "גישה לפורומים" },
  { key: "bulk_upload", label: "העלאה מרובה", description: "העלאת שיעורים בקובץ" },
  { key: "attendance", label: "נוכחות", description: "ניהול נוכחות" },
  { key: "materials_upload", label: "חומרים", description: "העלאת חומרי לימוד" },
  { key: "messaging", label: "הודעות", description: "שליחת הודעות" },
  { key: "analytics", label: "אנליטיקס", description: "גישה לנתונים" },
];

type UserRoleRow = {
  id: string;
  user_id: string;
  tenant_id: string | null;
  role: string;
  permissions: Record<string, unknown>;
  created_at: string;
  // joined from profiles
  full_name?: string | null;
  display_name?: string | null;
};

type FeatureMap = Record<string, Record<string, boolean>>; // role_id -> feature_key -> enabled

export default function TeacherFeatures() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [features, setFeatures] = useState<FeatureMap>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set()); // user_roles.id

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-teacher-roles"],
    queryFn: async () => {
      // Get all user_roles with profiles joined
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("id, user_id, tenant_id, role, permissions, created_at")
        .in("role", ["member", "moderator", "tenant_admin"])
        .order("created_at", { ascending: false })
        .limit(200);
      if (roleError) throw roleError;

      if (!roleData || roleData.length === 0) return [];

      // Get profiles for these users
      const userIds = [...new Set(roleData.map((r) => r.user_id))];
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, display_name")
        .in("id", userIds);

      const profileMap = new Map(
        (profileData || []).map((p) => [p.id, p])
      );

      const result: UserRoleRow[] = roleData.map((r) => ({
        ...r,
        permissions: (r.permissions as Record<string, unknown>) || {},
        full_name: profileMap.get(r.user_id)?.full_name || null,
        display_name: profileMap.get(r.user_id)?.display_name || null,
      }));

      // Seed feature state from permissions
      const map: FeatureMap = {};
      result.forEach((r) => {
        map[r.id] = {};
        FEATURES.forEach((f) => {
          map[r.id][f.key] = Boolean((r.permissions as Record<string, unknown>)?.[f.key]);
        });
      });
      setFeatures(map);
      setDirty(new Set());

      return result;
    },
  });

  const toggleFeature = (roleId: string, featureKey: string) => {
    setFeatures((prev) => ({
      ...prev,
      [roleId]: { ...prev[roleId], [featureKey]: !prev[roleId]?.[featureKey] },
    }));
    setDirty((prev) => new Set(prev).add(roleId));
  };

  const save = useMutation({
    mutationFn: async (roleId: string) => {
      const row = rows.find((r) => r.id === roleId);
      if (!row) throw new Error("שורה לא נמצאה");
      const newPermissions: Record<string, unknown> = { ...(row.permissions as Record<string, unknown>), ...features[roleId] };
      const { error } = await supabase
        .from("user_roles")
        .update({ permissions: newPermissions as import("@/integrations/supabase/types").Json })
        .eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: (_, roleId) => {
      toast.success("הגדרות שמורות");
      setDirty((prev) => {
        const next = new Set(prev);
        next.delete(roleId);
        return next;
      });
      qc.invalidateQueries({ queryKey: ["admin-teacher-roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveAll = useMutation({
    mutationFn: async () => {
      const dirtyIds = Array.from(dirty);
      for (const roleId of dirtyIds) {
        const row = rows.find((r) => r.id === roleId);
        if (!row) continue;
        const newPermissions: Record<string, unknown> = { ...(row.permissions as Record<string, unknown>), ...features[roleId] };
        const { error } = await supabase
          .from("user_roles")
          .update({ permissions: newPermissions as import("@/integrations/supabase/types").Json })
          .eq("id", roleId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("כל השינויים נשמרו");
      setDirty(new Set());
      qc.invalidateQueries({ queryKey: ["admin-teacher-roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return (
      !q ||
      r.full_name?.toLowerCase().includes(q) ||
      r.display_name?.toLowerCase().includes(q) ||
      r.user_id.toLowerCase().includes(q) ||
      r.tenant_id?.toLowerCase().includes(q)
    );
  });

  const enabledCount = (roleId: string) =>
    FEATURES.filter((f) => features[roleId]?.[f.key]).length;

  const ROLE_LABELS: Record<string, string> = {
    member: "חבר",
    moderator: "מנחה",
    tenant_admin: "מנהל ארגון",
    super_admin: "סופר אדמין",
    viewer: "צופה",
  };

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl">הגדרות הרשאות למשתמשים</h1>
        {dirty.size > 0 && (
          <Button onClick={() => saveAll.mutate()} disabled={saveAll.isPending}>
            <Save className="ml-2 h-4 w-4" />
            שמור הכל ({dirty.size} שינויים)
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{rows.length}</div>
                <div className="text-sm text-muted-foreground">משתמשים</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Save className="h-8 w-8 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold">{dirty.size}</div>
                <div className="text-sm text-muted-foreground">שינויים שלא נשמרו</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pr-9"
          placeholder="חיפוש לפי שם, ארגון..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">טוען...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">לא נמצאו משתמשים</div>
          ) : (
            <div className="divide-y min-w-[900px]">
              {/* Header */}
              <div className="grid gap-2 px-4 py-2 text-sm font-medium text-muted-foreground"
                style={{ gridTemplateColumns: `200px 100px repeat(${FEATURES.length}, 90px) 80px` }}>
                <span>משתמש</span>
                <span>תפקיד</span>
                {FEATURES.map((f) => (
                  <span key={f.key} className="text-center text-xs">{f.label}</span>
                ))}
                <span>פעולות</span>
              </div>

              {filtered.map((row) => {
                const isDirty = dirty.has(row.id);
                const displayName = row.full_name || row.display_name || row.user_id.slice(0, 8);
                return (
                  <div
                    key={row.id}
                    className={`grid gap-2 px-4 py-3 items-center ${isDirty ? "bg-yellow-50/50 dark:bg-yellow-950/20" : "hover:bg-muted/30"}`}
                    style={{ gridTemplateColumns: `200px 100px repeat(${FEATURES.length}, 90px) 80px` }}
                  >
                    <div>
                      <div className="font-medium text-sm">{displayName}</div>
                      <Badge variant="outline" className="text-xs mt-0.5">
                        {enabledCount(row.id)}/{FEATURES.length}
                      </Badge>
                    </div>
                    <Badge variant="secondary" className="text-xs w-fit">
                      {ROLE_LABELS[row.role] || row.role}
                    </Badge>
                    {FEATURES.map((f) => {
                      const enabled = features[row.id]?.[f.key] ?? false;
                      return (
                        <div key={f.key} className="flex justify-center">
                          <button
                            onClick={() => toggleFeature(row.id, f.key)}
                            className={`w-10 h-5 rounded-full transition-colors relative ${enabled ? "bg-primary" : "bg-muted-foreground/30"}`}
                            title={f.description}
                            aria-label={`${f.label} ${enabled ? "מופעל" : "כבוי"}`}
                          >
                            <span
                              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${enabled ? "right-0.5" : "right-5"}`}
                            />
                          </button>
                        </div>
                      );
                    })}
                    <Button
                      size="sm"
                      variant={isDirty ? "default" : "outline"}
                      disabled={!isDirty || save.isPending}
                      onClick={() => save.mutate(row.id)}
                      className="text-xs"
                    >
                      <Save className="h-3 w-3 ml-1" />
                      שמור
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
