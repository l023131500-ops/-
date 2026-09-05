// ═══════════════════════════════════════════════════════════════════════════
// מחלקת הפרסום — גלריית מאות סגנונות. סינון לפי משרד (חתימה) + מצב-רוח + חיפוש.
// כל כרטיס = פריסט חי (CanvasStage). לחיצה → render מלא → פתיחה בעורך.
// ═══════════════════════════════════════════════════════════════════════════
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Crown, ArrowLeft, Search, Home as HomeIcon, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import CanvasStage from "@/components/CanvasStage";
import { useTemplateContext } from "@/lib/templateContext";
import { useToast } from "@/hooks/use-toast";
import type { TemplateDoc } from "@shared/layers";
import { ORNAMENT_LEVEL_LABELS } from "@shared/styles";

interface PresetMeta {
  key: string;
  name: string;
  studio: string;
  mood: string[];
  ornamentLevel: "high" | "medium" | "low" | "none";
}
interface Meta {
  studios: string[];
  moods: string[];
  presetCount: number;
}

const STUDIO_DESC: Record<string, string> = {
  "מלכות": "הידור מלכותי · מסגרות זהב",
  "חסידי": "בורדו וזהב עתיק · אווירה חמה",
  "בוסטון": "נקי וטיפוגרפי · מודרני-מכובד",
  "פוטנציאל": "צבעוני ודינמי · מסחרי",
  "סטודיו 7": "מינימליזם פרימיום · טיפוגרפיה גדולה",
  "מודרני": "מוסדי נקי",
  "קלאסי": "עיתונאי מסורתי",
  "אבל": "מודעות אבל מכובדות",
};

export default function Studio() {
  const [, navigate] = useLocation();
  const { setSelected } = useTemplateContext();
  const { toast } = useToast();
  const [studio, setStudio] = useState("הכל");
  const [mood, setMood] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [visible, setVisible] = useState(24);

  const { data: meta } = useQuery<Meta>({ queryKey: ["/api/meta"] });
  const { data: presets, isLoading } = useQuery<PresetMeta[]>({
    queryKey: ["/api/presets", studio, mood],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (studio && studio !== "הכל") params.set("studio", studio);
      if (mood) params.set("mood", mood);
      const res = await apiRequest("GET", `/api/presets?${params.toString()}`);
      return res.json();
    },
  });

  const filtered = useMemo(() => {
    if (!presets) return [];
    const s = q.trim();
    if (!s) return presets;
    return presets.filter(
      (p) => p.name.includes(s) || p.studio.includes(s) || p.mood.some((m) => m.includes(s)),
    );
  }, [presets, q]);

  const shown = filtered.slice(0, visible);

  async function openPreset(p: PresetMeta) {
    setLoadingKey(p.key);
    try {
      const res = await apiRequest("POST", `/api/presets/${encodeURIComponent(p.key)}/render`, {
        width: 1080,
        height: 1350,
        withPhoto: false,
      });
      const { doc } = (await res.json()) as { doc: TemplateDoc };
      setSelected({ doc, category: "shiur_gemara", style: "custom", format: "square", name: p.name });
      navigate("/editor");
    } catch (e) {
      toast({ title: "שגיאה בפתיחת הסגנון", description: String(e), variant: "destructive" });
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#F5EEDD]" dir="rtl">
      <div
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 20% 0%, rgba(201,162,39,0.12), transparent 45%), radial-gradient(circle at 85% 20%, rgba(201,162,39,0.08), transparent 40%)",
        }}
      />
      <header className="relative z-10 border-b border-[#C9A227]/20 bg-[#0B1220]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <Crown className="h-6 w-6 text-[#C9A227]" />
            <h1 className="text-xl font-bold tracking-wide">
              מחלקת הפרסום <span className="text-[#C9A227]">·</span> גלריית הסגנונות
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-[#C9A227]/40 text-[#C9A227] hover:bg-[#C9A227] hover:text-[#0B1220]"
            onClick={() => navigate("/")}
            data-testid="link-home"
          >
            <HomeIcon className="h-4 w-4" /> דף הבית
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-10">
        <section className="mb-8 text-center">
          <p className="mb-2 text-sm font-medium tracking-wide text-[#C9A227]">
            {meta?.presetCount ?? "מאות"} סגנונות מעוצבים — חתימות של משרדי הפרסום המובילים
          </p>
          <h2 className="mx-auto max-w-3xl text-xl font-bold leading-relaxed">
            כל סגנון נראה כמו יצירה של משרד אחר — בחר חתימה, סנן לפי אווירה, ופתח עריכה חיה
          </h2>
        </section>

        {/* סינון משרד */}
        <div className="mb-4 flex flex-wrap justify-center gap-2">
          {(meta?.studios ?? ["הכל"]).map((s) => (
            <button
              key={s}
              onClick={() => { setStudio(s); setVisible(24); }}
              data-testid={`filter-studio-${s}`}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                studio === s
                  ? "border-[#C9A227] bg-[#C9A227] text-[#0B1220]"
                  : "border-[#C9A227]/30 text-[#F5EEDD]/80 hover:border-[#C9A227]/60"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* סינון מצב-רוח + חיפוש */}
        <div className="mb-3 flex flex-wrap justify-center gap-1.5">
          <button
            onClick={() => setMood(null)}
            className={`rounded-full px-3 py-1 text-xs transition ${
              !mood ? "bg-[#C9A227]/20 text-[#C9A227]" : "text-[#F5EEDD]/50 hover:text-[#F5EEDD]/80"
            }`}
          >
            כל האווירות
          </button>
          {(meta?.moods ?? []).map((m) => (
            <button
              key={m}
              onClick={() => setMood(mood === m ? null : m)}
              data-testid={`filter-mood-${m}`}
              className={`rounded-full px-3 py-1 text-xs transition ${
                mood === m ? "bg-[#C9A227]/20 text-[#C9A227]" : "text-[#F5EEDD]/50 hover:text-[#F5EEDD]/80"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="mx-auto mb-8 flex max-w-md items-center gap-2 rounded-lg border border-[#C9A227]/25 bg-[#101B32] px-3">
          <Search className="h-4 w-4 text-[#C9A227]/70" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="חיפוש חופשי בסגנונות..."
            data-testid="input-search"
            className="border-0 bg-transparent text-[#F5EEDD] placeholder:text-[#F5EEDD]/40 focus-visible:ring-0"
          />
        </div>

        {studio !== "הכל" && (
          <p className="mb-6 text-center text-sm text-[#F5EEDD]/60">{STUDIO_DESC[studio]}</p>
        )}

        {isLoading && (
          <p className="text-center text-[#F5EEDD]/60">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#C9A227]" />
          </p>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => (
            <PresetCard
              key={p.key}
              preset={p}
              loading={loadingKey === p.key}
              onOpen={() => openPreset(p)}
            />
          ))}
        </div>

        {!isLoading && shown.length < filtered.length && (
          <div className="mt-10 text-center">
            <Button
              variant="outline"
              className="border-[#C9A227]/40 text-[#C9A227] hover:bg-[#C9A227] hover:text-[#0B1220]"
              onClick={() => setVisible((v) => v + 24)}
              data-testid="button-load-more"
            >
              טען עוד סגנונות ({filtered.length - shown.length} נוספים)
            </Button>
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <p className="text-center text-[#F5EEDD]/60">לא נמצאו סגנונות בסינון הנוכחי.</p>
        )}
      </main>
    </div>
  );
}

// כרטיס פריסט — טוען render חי בעצלתיים כשנכנס לתצוגה
function PresetCard({ preset, loading, onOpen }: { preset: PresetMeta; loading: boolean; onOpen: () => void }) {
  const { data } = useQuery<{ doc: TemplateDoc }>({
    queryKey: ["/api/presets", preset.key, "preview"],
    queryFn: async () => {
      const res = await apiRequest("POST", `/api/presets/${encodeURIComponent(preset.key)}/render`, {
        width: 1080,
        height: 1350,
        withPhoto: false,
      });
      return res.json();
    },
    staleTime: Infinity,
  });

  return (
    <Card
      className="group cursor-pointer overflow-hidden border-[#C9A227]/20 bg-[#101B32] transition hover:border-[#C9A227]/60 hover:shadow-[0_0_30px_rgba(201,162,39,0.15)]"
      onClick={onOpen}
      data-testid={`card-preset-${preset.key}`}
    >
      <div className="flex min-h-[300px] items-center justify-center bg-[#0B1220] py-5">
        {data?.doc ? (
          <CanvasStage doc={data.doc} interactive={false} maxDisplayWidth={220} />
        ) : (
          <Loader2 className="h-6 w-6 animate-spin text-[#C9A227]/60" />
        )}
      </div>
      <CardContent className="p-4">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-[#F5EEDD]">{preset.name}</h4>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#C9A227]" />
          ) : (
            <ArrowLeft className="h-4 w-4 text-[#C9A227] opacity-0 transition group-hover:opacity-100" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="border-[#C9A227]/40 text-[10px] text-[#C9A227]">
            {preset.studio}
          </Badge>
          <Badge variant="outline" className="border-[#F5EEDD]/20 text-[10px] text-[#F5EEDD]/70">
            עיטור: {ORNAMENT_LEVEL_LABELS[preset.ornamentLevel]}
          </Badge>
          {preset.mood.map((m) => (
            <Badge key={m} variant="outline" className="border-[#F5EEDD]/20 text-[10px] text-[#F5EEDD]/70">
              {m}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
