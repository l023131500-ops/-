import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Send, Check, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const FEATURE_OPTIONS: { id: string; label: string; emoji: string }[] = [
  { id: "prayer_times", label: "זמני תפילות", emoji: "🕯️" },
  { id: "zmanim", label: "זמני היום (זריחה / שקיעה / שבת)", emoji: "🌅" },
  { id: "announcements", label: "העלאת מודעות למתפללים", emoji: "📣" },
  { id: "member_inquiries", label: "קבלת פניות ממתפללים", emoji: "📩" },
  { id: "simchas", label: "הודעות על שמחות בקהילה", emoji: "🎉" },
  { id: "community_messages", label: "הודעות מציבור המתפללים", emoji: "💬" },
  { id: "org_benefits", label: "הצטרפות לארגון – הטבות, מכירות מוזלות, מיצוי זכויות", emoji: "🤝" },
];

interface Props {
  portalId: string;
  synagogueName: string;
  city?: string | null;
  defaultContactName?: string;
  defaultContactPhone?: string;
  defaultContactEmail?: string;
}

export default function SynagogueFullAccessRequest({
  portalId,
  synagogueName,
  city,
  defaultContactName = "",
  defaultContactPhone = "",
  defaultContactEmail = "",
}: Props) {
  const [existing, setExisting] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [contactName, setContactName] = useState(defaultContactName);
  const [contactPhone, setContactPhone] = useState(defaultContactPhone);
  const [contactEmail, setContactEmail] = useState(defaultContactEmail);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("synagogue_full_access_requests")
        .select("*")
        .eq("synagogue_portal_id", portalId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setExisting(data);
      setLoading(false);
    })();
  }, [portalId]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async () => {
    if (selected.length === 0) return toast.error("בחרו לפחות פיצ׳ר אחד");
    if (!contactName.trim() || !contactPhone.trim()) return toast.error("נא למלא שם וטלפון ליצירת קשר");
    setSubmitting(true);
    const { data, error } = await supabase
      .from("synagogue_full_access_requests")
      .insert({
        synagogue_portal_id: portalId,
        synagogue_name: synagogueName,
        city: city ?? "",
        contact_name: contactName.trim(),
        contact_phone: contactPhone.trim(),
        contact_email: contactEmail.trim(),
        note: note.trim(),
        requested_features: selected,
        status: "pending",
      })
      .select()
      .single();
    setSubmitting(false);
    if (error) return toast.error("שגיאה בשליחת הבקשה");
    setExisting(data);
    toast.success("הבקשה נשלחה לאיגוד השיעורים! ניצור קשר בקרוב 🙏");
  };

  if (loading) return null;

  // Already submitted view
  if (existing) {
    const approved: string[] = existing.approved_features ?? [];
    const requested: string[] = existing.requested_features ?? [];
    const reviewed = existing.status === "reviewed";
    return (
      <div
        className="rounded-2xl p-5 border-2 shadow-md"
        style={{
          background: "linear-gradient(135deg, hsl(40 80% 96%), hsl(180 35% 95%))",
          borderColor: "hsl(40 80% 60%)",
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          {reviewed ? (
            <Check className="w-5 h-5 text-[hsl(180_45%_30%)]" />
          ) : (
            <Clock className="w-5 h-5 text-[hsl(40_80%_45%)] animate-pulse" />
          )}
          <h3 className="font-display text-lg font-bold" style={{ color: "hsl(180 45% 25%)" }}>
            {reviewed ? "הבקשה נבדקה" : "בקשתכם להרחבת הממשק התקבלה — ממתינה לאישור"}
          </h3>
        </div>
        <div className="text-sm text-foreground/75 mb-3">
          ביקשתם: {requested.map((id) => FEATURE_OPTIONS.find((f) => f.id === id)?.label).filter(Boolean).join(" • ") || "—"}
        </div>
        {reviewed && (
          <div className="text-sm font-bold text-[hsl(180_45%_25%)]">
            ✅ אושרו: {approved.map((id) => FEATURE_OPTIONS.find((f) => f.id === id)?.label).filter(Boolean).join(" • ") || "אף פיצ׳ר לא אושר"}
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-6 border-2 shadow-lg overflow-hidden relative"
      style={{
        background: "linear-gradient(135deg, hsl(40 80% 94%) 0%, hsl(180 40% 92%) 100%)",
        borderColor: "hsl(40 80% 55%)",
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-5 h-5 text-[hsl(40_80%_45%)]" />
        <h3 className="font-display text-xl font-black" style={{ color: "hsl(180 45% 25%)" }}>
          מעוניינים להצטרף לממשק המלא של בתי הכנסת?
        </h3>
      </div>
      <p className="text-sm text-foreground/75 mb-4">
        סמנו את הפיצ׳רים שיעניינו אתכם, ונחזור אליכם בהקדם להפעלה ללא עלות.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-5">
        {FEATURE_OPTIONS.map((f) => (
          <label
            key={f.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/70 hover:bg-white cursor-pointer border transition"
            style={{ borderColor: "hsl(180 45% 30% / 0.15)" }}
          >
            <Checkbox checked={selected.includes(f.id)} onCheckedChange={() => toggle(f.id)} />
            <span className="text-sm font-bold text-foreground/85">
              <span className="ml-1">{f.emoji}</span>
              {f.label}
            </span>
          </label>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div>
          <Label htmlFor="full-access-contact-name" className="text-xs font-bold mb-1 block">שם איש קשר *</Label>
          <Input id="full-access-contact-name" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="שם מלא" />
        </div>
        <div>
          <Label htmlFor="full-access-contact-phone" className="text-xs font-bold mb-1 block">טלפון *</Label>
          <Input id="full-access-contact-phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="05X-XXXXXXX" />
        </div>
        <div>
          <Label htmlFor="full-access-contact-email" className="text-xs font-bold mb-1 block">אימייל</Label>
          <Input id="full-access-contact-email" type="email" inputMode="email" autoComplete="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="email@example.com" />
        </div>
      </div>
      <div className="mb-4">
        <Label htmlFor="full-access-note" className="text-xs font-bold mb-1 block">הערה (אופציונלי)</Label>
        <Textarea id="full-access-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="פרטים נוספים שתרצו לשתף..." />
      </div>

      <motion.div
        animate={{
          boxShadow: [
            "0 0 0 0 hsl(40 80% 55% / 0.45)",
            "0 0 0 14px hsl(40 80% 55% / 0)",
          ],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
        className="rounded-full inline-block"
      >
        <Button
          onClick={submit}
          disabled={submitting}
          size="lg"
          className="gap-2 font-bold text-white shadow-md"
          style={{ background: "linear-gradient(135deg, hsl(40 80% 50%), hsl(180 45% 35%))" }}
        >
          <Send className="w-4 h-4" />
          {submitting ? "שולח..." : "שלח בקשה לאיגוד השיעורים"}
        </Button>
      </motion.div>
    </motion.div>
  );
}
