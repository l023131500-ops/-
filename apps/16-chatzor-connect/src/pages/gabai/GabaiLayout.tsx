import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Building2, Clock, Inbox, Megaphone } from "lucide-react";
import type { Synagogue } from "@/lib/types";
import { listManagedSynagogues } from "@/data/repositories";
import { PortalShell, type NavItem } from "@/components/portal/PortalShell";

interface GabaiCtx {
  synagogue: Synagogue | null;
  managed: Synagogue[];
  /* ‏שלושת אלה קיימים כדי שהמסכים יבחינו בין "לא שויך בית כנסת" — טענה על
     ‏העולם — לבין "לא הצלחנו לקרוא איזה בית כנסת שויך". בכשל `managed` נשאר
     ‏מערך ריק, ובלעדיהם כל מסך גבאי מודיע לגבאי שהוא לא מנהל שום בית כנסת. */
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}
const GabaiContext = createContext<GabaiCtx>({
  synagogue: null,
  managed: [],
  isLoading: false,
  isError: false,
  refetch: () => {},
});
export const useGabai = () => useContext(GabaiContext);

const NAV: NavItem[] = [
  { to: "/gabai", label: "פרטי בית הכנסת", icon: Building2, end: true },
  { to: "/gabai/prayers", label: "זמני תפילה", icon: Clock },
  { to: "/gabai/lessons", label: "שיעורים", icon: BookOpen },
  { to: "/gabai/announcements", label: "מודעות", icon: Megaphone },
  { to: "/gabai/inbox", label: "פניות", icon: Inbox },
];

const STORAGE_KEY = "chatzor-gabai-syn";

export function GabaiLayout() {
  const { data: managed = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["managed-synagogues"],
    queryFn: listManagedSynagogues,
  });
  const [selectedId, setSelectedId] = useState<string>(() => window.localStorage.getItem(STORAGE_KEY) ?? "");

  useEffect(() => {
    if (managed.length > 0 && !managed.some((s) => s.id === selectedId)) {
      setSelectedId(managed[0]!.id);
    }
  }, [managed, selectedId]);

  useEffect(() => {
    if (selectedId) window.localStorage.setItem(STORAGE_KEY, selectedId);
  }, [selectedId]);

  const synagogue = useMemo(() => managed.find((s) => s.id === selectedId) ?? null, [managed, selectedId]);

  const selector = isError ? (
    /* ‏בורר שנעלם בכשל נראה כמו גבאי של בית כנסת אחד. */
    <p role="alert" className="rounded-lg border border-red-400/50 bg-red-500/5 px-3 py-2 text-xs text-red-500">
      רשימת בתי הכנסת שלכם אינה זמינה כרגע.
    </p>
  ) : managed.length > 0 ? (
      <div>
        <label htmlFor="syn-select" className="mb-1 block px-1 text-xs font-medium text-muted-foreground">בית הכנסת שלי</label>
        <select
          id="syn-select"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full cursor-pointer rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {managed.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
    ) : null;

  return (
    <GabaiContext.Provider value={{ synagogue, managed, isLoading, isError, refetch }}>
      <PortalShell title="פורטל גבאים" subtitle="חצור הגלילית" nav={NAV} loginPath="/gabai/login" sidebarExtra={selector} />
    </GabaiContext.Provider>
  );
}
