import { motion, useScroll, useTransform } from "framer-motion";
import { HeartHandshake, Gift, Users, ArrowLeft, Sparkles, X } from "lucide-react";
import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import UnifiedLeadForm from "@/components/UnifiedLeadForm";

const communityStyles = ["חרדי", "דתי", "חסידי", "תימני", "בני תורה", "ספרדי", "מסורתי", "חילוני"];
const cooperationTypes = [
  "מכירות מוזלות לקהילה",
  "סיוע במיצוי זכויות",
  "מידע לקהילה",
  "הרצאות והדרכות",
  "אירועי קהילה",
];

const CommunitySection = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const xCards = useTransform(scrollYProgress, [0, 0.4], [80, 0]);

  const [open, setOpen] = useState(false);
  const [community, setCommunity] = useState({
    community_name: "",
    city: "",
    style: "",
    families_count: "",
    cooperation: [] as string[],
  });

  const toggleCoop = (item: string) => {
    setCommunity((prev) => ({
      ...prev,
      cooperation: prev.cooperation.includes(item)
        ? prev.cooperation.filter((c) => c !== item)
        : [...prev.cooperation, item],
    }));
  };

  return (
    <section className="py-24 bg-emerald-light overflow-hidden" ref={ref}>
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-5xl mx-auto"
        >
          <div className="text-center mb-14">
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", bounce: 0.4 }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary flex items-center justify-center"
            >
              <HeartHandshake className="w-10 h-10 text-primary-foreground" />
            </motion.div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4">
              🤝 נותנים יד לקהילה
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              מיזם ייחודי שמביא לקהילות שלכם מכירות מסובסדות, הטבות בלעדיות,
              וליווי מקצועי למשפחות - כי ביחד אנחנו חזקים יותר.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[
              { icon: Gift, title: "מכירות מסובסדות", desc: "מוצרי בית, מזון ואלקטרוניקה - במחירים שלא תמצאו בשום מקום אחר" },
              { icon: Users, title: "הטבות לקהילה", desc: "סדנאות מקצועיות, הרצאות, ייעוץ כלכלי וליווי ברמה אחרת" },
              { icon: Sparkles, title: "סיוע למשפחות", desc: "כל משפחה שמצטרפת מקבלת בדיקה מקיפה של זכויות וליווי אישי - בחינם" },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                style={{ x: xCards }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                whileHover={{ scale: 1.04, y: -6 }}
                className="p-6 rounded-2xl bg-card border border-border/50 card-elevated text-center"
              >
                <item.icon className="w-10 h-10 mx-auto mb-4 text-primary" />
                <h3 className="font-bold text-lg text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <motion.button
              onClick={() => setOpen(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg shadow-lg hover:shadow-xl transition-all"
            >
              הצטרפו ללא עלות
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          </div>
        </motion.div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-center">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <HeartHandshake className="w-7 h-7 text-primary" />
            </div>
            <DialogTitle className="text-xl">הצטרפות לקהילה</DialogTitle>
            <DialogDescription>ספרו לנו על הקהילה שלכם — ונחזור אליכם עם הצעות שיתוף פעולה</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2.5">
              <p className="text-xs font-bold text-foreground">🏘️ פרטי הקהילה</p>
              <Input
                placeholder="שם הקהילה / בית כנסת"
                value={community.community_name}
                onChange={(e) => setCommunity({ ...community, community_name: e.target.value })}
                className="text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="עיר / יישוב"
                  value={community.city}
                  onChange={(e) => setCommunity({ ...community, city: e.target.value })}
                  className="text-sm"
                />
                <Input
                  type="number"
                  min={0}
                  placeholder="מספר משפחות"
                  value={community.families_count}
                  onChange={(e) => setCommunity({ ...community, families_count: e.target.value })}
                  className="text-sm"
                />
              </div>
              <select
                value={community.style}
                onChange={(e) => setCommunity({ ...community, style: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">סגנון הקהילה</option>
                {communityStyles.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">סוגי שיתוף פעולה רצויים:</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {cooperationTypes.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleCoop(t)}
                      className={`text-right p-2 rounded-lg border text-xs transition-all ${
                        community.cooperation.includes(t)
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <UnifiedLeadForm
              source="community-join"
              category="קהילה"
              communityData={community}
              prefill={{
                extra_details: `קהילה: ${community.community_name || "—"} | יישוב: ${community.city || "—"} | סגנון: ${community.style || "—"} | משפחות: ${community.families_count || "—"} | שת"פ: ${community.cooperation.join(", ") || "—"}`,
              }}
              onSuccess={() => setTimeout(() => setOpen(false), 2400)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default CommunitySection;
