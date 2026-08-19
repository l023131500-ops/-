import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  ChevronLeft, ChevronDown, ArrowRight, Search,
  Shield, Receipt, Home, Landmark, Briefcase, Heart, Building2, Zap,
  Droplets, Wallet, Baby, Users, FileText, Scale, GraduationCap,
  Stethoscope, Plane, Car, HandHeart, Gift, Globe, BookOpen,
  HardHat, Laptop, Banknote, PiggyBank, Sparkles, CreditCard,
  Flame, Phone, Accessibility, Gavel, ShieldCheck, Building,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import UnifiedLeadForm from "@/components/UnifiedLeadForm";

// ── DB Row shape ─────────────────────────────────────────────────────────────
interface DbRight {
  id: string;
  topic_name: string;
  category: string;
  subcategory: string | null;
  priority_order: number | null;
  target_audience: string | null;
  what_you_get: string | null;
  eligibility_criteria: string | null;
  public_description: string | null;
  plain_description: string | null;
  eligibility_questions: any;
  required_documents: string | null;
  service_cost: string | null;
}

interface EligQuestion {
  question: string;
  type?: string;
  field?: string;
  id?: string;
  options?: string[];
}

interface CatGroup {
  name: string;
  icon: LucideIcon;
  gradient: string;
  subcategories: { name: string; topics: DbRight[] }[];
  totalTopics: number;
}

// ── Category → icon/gradient mapping (keyword-based, order matters) ──────────
const CAT_STYLES: { match: RegExp; icon: LucideIcon; gradient: string }[] = [
  // Specific combos first
  { match: /ניצול.*שואה|ותיק/, icon: Users, gradient: "from-indigo-500 to-violet-600" },
  { match: /נפגעי פעולות איבה|שכול/, icon: ShieldCheck, gradient: "from-stone-600 to-stone-800" },
  { match: /חייל.*משוחרר|שירות לאומי|מילואים/, icon: HardHat, gradient: "from-stone-600 to-stone-800" },
  { match: /סיעוד|עובד זר/, icon: HandHeart, gradient: "from-teal-500 to-emerald-600" },
  { match: /מוגבלות|ראייה|שיקום/, icon: Accessibility, gradient: "from-violet-500 to-purple-600" },
  { match: /ניידות.*רכב/, icon: Car, gradient: "from-sky-500 to-cyan-600" },
  { match: /סיוע משפטי|מיצוי זכויות/, icon: Gavel, gradient: "from-slate-500 to-slate-700" },
  { match: /מזונות|הוצאה לפועל|חובות|קנסות|שיקום כלכלי/, icon: Scale, gradient: "from-slate-600 to-slate-800" },
  { match: /משפט|משפחה ומזונות/, icon: Scale, gradient: "from-slate-500 to-slate-700" },
  { match: /משרד הרווחה|רווחה|סעד/, icon: Heart, gradient: "from-rose-500 to-pink-600" },
  // Family / kids
  { match: /חינוך|תלמיד|גיל הרך/, icon: GraduationCap, gradient: "from-violet-500 to-purple-600" },
  { match: /משפחה|ילד|הורות|לידה|אמהות/, icon: Baby, gradient: "from-pink-500 to-fuchsia-600" },
  // Insurance / Pension / Banking
  { match: /ביטוח לאומי/, icon: Shield, gradient: "from-emerald-500 to-emerald-700" },
  { match: /ביטוח.*פנסיה|פנסיה|גמל/, icon: PiggyBank, gradient: "from-emerald-600 to-teal-700" },
  { match: /ביטוחים/, icon: Shield, gradient: "from-emerald-500 to-teal-600" },
  { match: /כרטיסי אשראי/, icon: CreditCard, gradient: "from-indigo-500 to-blue-700" },
  { match: /בנקאות|אשראי/, icon: Landmark, gradient: "from-blue-600 to-indigo-700" },
  // Tax
  { match: /רשות המסים|מס הכנסה|החזרי מס|מיסוי|הטבות מס|מסים/, icon: Receipt, gradient: "from-amber-500 to-orange-600" },
  // Housing
  { match: /דיור|משכנת|שכירות|מקרקעין/, icon: Home, gradient: "from-rose-500 to-pink-600" },
  // Health
  { match: /בריאות|קופ.*חולים|רפואה/, icon: Stethoscope, gradient: "from-red-500 to-rose-600" },
  // Utilities
  { match: /חשמל/, icon: Zap, gradient: "from-yellow-500 to-amber-600" },
  { match: /גז ביתי|גז/, icon: Flame, gradient: "from-orange-500 to-red-600" },
  { match: /מים|תאגיד.*מים/, icon: Droplets, gradient: "from-cyan-500 to-blue-600" },
  { match: /תקשורת|ניוד/, icon: Phone, gradient: "from-blue-500 to-indigo-600" },
  // Employment
  { match: /זכויות עובדים|תעסוקה|עבודה/, icon: Briefcase, gradient: "from-cyan-500 to-blue-600" },
  { match: /עסקים קטנים|עסק/, icon: Building, gradient: "from-slate-500 to-slate-700" },
  // Consumer & discounts
  { match: /הנחות|חיסכון בעלויות|חיובים|החזרים צרכניים|צרכנות/, icon: Wallet, gradient: "from-green-500 to-emerald-600" },
  { match: /מענק|הטב|גמלה/, icon: Gift, gradient: "from-fuchsia-500 to-pink-600" },
  // Public bodies / fallback geo
  { match: /ארנונה|רשות מקומית|עירייה/, icon: Building2, gradient: "from-blue-500 to-indigo-600" },
  { match: /עמותות/, icon: HandHeart, gradient: "from-teal-500 to-emerald-600" },
  { match: /הקמת גופים|פעילות ציבורית/, icon: Building2, gradient: "from-slate-500 to-slate-700" },
];

const styleForCategory = (name: string): { icon: LucideIcon; gradient: string } => {
  for (const s of CAT_STYLES) if (s.match.test(name)) return { icon: s.icon, gradient: s.gradient };
  return { icon: Sparkles, gradient: "from-primary to-secondary" };
};

const truncate = (s: string | null, n: number) =>
  !s ? "" : s.length > n ? s.slice(0, n).trim() + "…" : s;

const RightsCategories = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rights, setRights] = useState<DbRight[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<DbRight | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("rights_reference")
        .select("id, topic_name, category, subcategory, priority_order, target_audience, what_you_get, eligibility_criteria, public_description, plain_description, eligibility_questions, required_documents, service_cost")
        .order("priority_order", { ascending: true, nullsFirst: false })
        .limit(1000);
      if (data) setRights(data as DbRight[]);
      setLoading(false);
    })();
  }, []);

  // Group into categories → subcategories
  const groups = useMemo<CatGroup[]>(() => {
    const map = new Map<string, Map<string, DbRight[]>>();
    rights.forEach(r => {
      if (!map.has(r.category)) map.set(r.category, new Map());
      const sub = r.subcategory || "כללי";
      const subMap = map.get(r.category)!;
      if (!subMap.has(sub)) subMap.set(sub, []);
      subMap.get(sub)!.push(r);
    });
    return Array.from(map.entries()).map(([name, subMap]) => {
      const style = styleForCategory(name);
      const subcategories = Array.from(subMap.entries()).map(([sname, topics]) => ({ name: sname, topics }));
      const totalTopics = subcategories.reduce((s, x) => s + x.topics.length, 0);
      return { name, ...style, subcategories, totalTopics };
    });
  }, [rights]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim();
    if (q.length < 2) return [];
    const ql = q.toLowerCase();
    return rights.filter(r =>
      r.topic_name.toLowerCase().includes(ql) ||
      r.category.toLowerCase().includes(ql) ||
      (r.subcategory || "").toLowerCase().includes(ql) ||
      (r.public_description || "").toLowerCase().includes(ql) ||
      (r.eligibility_criteria || "").toLowerCase().includes(ql)
    ).slice(0, 30);
  }, [rights, searchQuery]);

  const resetTopic = () => { setSelectedTopic(null); setAnswers({}); };

  // Eligibility questions (array form)
  const topicQuestions: EligQuestion[] = useMemo(() => {
    if (!selectedTopic) return [];
    const q = selectedTopic.eligibility_questions;
    if (Array.isArray(q)) return q as EligQuestion[];
    return [];
  }, [selectedTopic]);

  const calculateEligibility = (): "high" | "medium" | "low" => {
    const yn = topicQuestions.filter(q => q.type === "yes_no");
    if (yn.length === 0) return "medium";
    const yes = yn.filter(q => answers[q.field || q.id || q.question] === true).length;
    const pct = yes / yn.length;
    if (pct >= 0.6) return "high";
    if (pct >= 0.3) return "medium";
    return "low";
  };

  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start end", "end start"] });
  const gridX = useTransform(scrollYProgress, [0, 0.3], [60, 0]);

  // Build inline-accordion layout: render category grid, but inject expanded panel
  // as a full-width row right after the clicked category in document order.
  const renderInlineRows = () => {
    const cols = 4; // lg
    const rows: JSX.Element[] = [];
    for (let i = 0; i < groups.length; i += cols) {
      const slice = groups.slice(i, i + cols);
      const expandedInRow = slice.find(c => c.name === expandedCat);
      rows.push(
        <div key={`row-${i}`} className="contents">
          {slice.map((cat, idx) => {
            const isOpen = cat.name === expandedCat;
            const CatIcon = cat.icon;
            return (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: (i + idx) * 0.03, duration: 0.4 }}
                layout
              >
                <motion.div
                  whileHover={{ scale: 1.05, y: -6 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setExpandedCat(isOpen ? null : cat.name)}
                  className={`group p-5 rounded-2xl border cursor-pointer h-full flex flex-col items-center text-center gap-3 transition-all duration-300 ${
                    isOpen
                      ? "bg-primary/5 border-primary/40 shadow-xl ring-2 ring-primary/20"
                      : "bg-card border-border/50 card-elevated"
                  }`}
                >
                  <motion.div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center shadow-lg`}
                    animate={isOpen ? { scale: [1, 1.2, 1], rotate: [0, 12, -12, 0] } : {}}
                    transition={{ duration: 0.6 }}
                  >
                    <CatIcon className="w-7 h-7 text-white" />
                  </motion.div>
                  <h3 className="font-bold text-sm text-foreground leading-tight">{cat.name}</h3>
                  <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
                    <ChevronDown className="w-4 h-4 text-primary" />
                  </motion.div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      );

      if (expandedInRow) {
        rows.push(
          <motion.div
            key={`panel-${expandedInRow.name}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="col-span-full overflow-hidden"
          >
            <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-card to-secondary/5 p-6 shadow-xl mt-2">
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${expandedInRow.gradient} flex items-center justify-center shadow-md`}>
                  <expandedInRow.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-foreground text-lg">{expandedInRow.name}</h3>
              </div>

              <div className="space-y-6">
                {expandedInRow.subcategories.map((sub) => (
                  <div key={sub.name}>
                    {expandedInRow.subcategories.length > 1 && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-px flex-1 bg-border" />
                        <Badge variant="secondary" className="text-xs font-bold">{sub.name}</Badge>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {sub.topics.map((topic, tIdx) => (
                        <motion.button
                          key={topic.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: tIdx * 0.02, duration: 0.25 }}
                          whileHover={{ scale: 1.03, x: 4 }}
                          onClick={() => setSelectedTopic(topic)}
                          className="flex items-start gap-3 p-3.5 rounded-xl border border-border/50 bg-card/90 hover:border-primary/50 hover:bg-primary/5 transition-all text-right group"
                        >
                          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${expandedInRow.gradient} flex items-center justify-center shrink-0 opacity-90`}>
                            <expandedInRow.icon className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{topic.topic_name}</p>
                            {(topic.plain_description || topic.public_description || topic.what_you_get) && (
                              <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                                {truncate(topic.plain_description || topic.public_description || topic.what_you_get, 110)}
                              </p>
                            )}
                          </div>
                          <ChevronLeft className="w-4 h-4 text-primary/40 group-hover:text-primary shrink-0 mt-1" />
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        );
      }
    }
    return rows;
  };

  return (
    <>
      <section className="py-24 overflow-hidden" ref={containerRef}>
        <div className="container mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4">💰 גלו את הזכויות שמגיעות לכם</h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">מאות זכויות, מענקים והטבות - בחרו קטגוריה לפתיחה</p>
          </motion.div>

          {/* Search bar */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }} className="max-w-xl mx-auto mb-12">
            <div className="relative group">
              <motion.div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/30 via-secondary/30 to-primary/30 opacity-50 blur-md group-hover:opacity-80 transition-opacity duration-500"
                animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
              <div className="relative flex items-center bg-card rounded-xl border-2 border-primary/20 shadow-lg group-hover:border-primary/40 transition-all duration-300">
                <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} className="pr-4 pl-2">
                  <Search className="w-6 h-6 text-primary" />
                </motion.div>
                <Input placeholder="🔍 חפשו זכות - ארנונה, פנסיה, לידה, נכות..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-0 bg-transparent text-base py-4 pr-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60" />
              </div>
            </div>
          </motion.div>

          {/* Search results */}
          {searchQuery.trim().length >= 2 && (
            <div className="max-w-3xl mx-auto mb-10">
              <p className="text-sm text-muted-foreground mb-3">{searchResults.length > 0 ? `נמצאו ${searchResults.length} תוצאות:` : "לא נמצאו תוצאות. נסו מילה אחרת."}</p>
              <div className="space-y-2">
                {searchResults.map((topic, idx) => {
                  const style = styleForCategory(topic.category);
                  return (
                    <motion.button key={topic.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      onClick={() => setSelectedTopic(topic)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-right">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${style.gradient} flex items-center justify-center shrink-0`}>
                        <style.icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground">{topic.topic_name}</p>
                        <p className="text-xs text-muted-foreground">{topic.category}{topic.subcategory ? ` › ${topic.subcategory}` : ""}</p>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Categories grid + inline accordion */}
          {loading ? (
            <p className="text-center text-muted-foreground py-12">טוען מאגר זכויות...</p>
          ) : (
            <motion.div
              className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
              style={{ x: gridX }}
            >
              <AnimatePresence>
                {renderInlineRows()}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </section>

      {/* Topic detail modal */}
      <Dialog open={!!selectedTopic} onOpenChange={(open) => !open && resetTopic()}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedTopic && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg text-right">{selectedTopic.topic_name}</DialogTitle>
                <DialogDescription className="text-right">
                  {selectedTopic.category}{selectedTopic.subcategory ? ` › ${selectedTopic.subcategory}` : ""}
                </DialogDescription>
              </DialogHeader>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 mt-2">
                {selectedTopic.target_audience && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-xs font-bold text-primary mb-1">👥 למי מיועד</p>
                    <p className="text-sm text-foreground whitespace-pre-line">{truncate(selectedTopic.target_audience, 220)}</p>
                  </div>
                )}

                {selectedTopic.eligibility_criteria && (
                  <div className="p-3 rounded-lg bg-muted/40">
                    <p className="text-xs font-bold text-foreground mb-1">✅ תנאי זכאות</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{truncate(selectedTopic.eligibility_criteria, 260)}</p>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-gradient-to-br from-secondary/15 to-primary/10 border border-secondary/30">
                  <p className="text-sm font-semibold text-foreground leading-relaxed">
                    📩 רוצים לקבל מידע מדויק, מפורט ועדכני?
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    שלחו לנו פנייה ונחזיר אליכם את המידע בדרך שתבחרו - מייל, וואטסאפ, SMS או הודעה קולית.
                  </p>
                </div>

                <div className="border-t border-border pt-4">
                  <UnifiedLeadForm
                    source="category"
                    category={selectedTopic.category}
                    selectedRight={selectedTopic.topic_name}
                    relevanceScore={calculateEligibility()}
                    prefill={{
                      extra_details: topicQuestions.length > 0
                        ? `שאלות זכאות:\n${topicQuestions.map((q, i) => {
                            const key = q.field || q.id || `q${i}`;
                            const a = answers[key];
                            const v = a === true ? "כן" : a === false ? "לא" : a !== undefined ? String(a) : "—";
                            return `• ${q.question}: ${v}`;
                          }).join("\n")}`
                        : "",
                    }}
                    showTopicHeader
                    onSuccess={() => setTimeout(() => resetTopic(), 2400)}
                  />
                </div>
              </motion.div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RightsCategories;
