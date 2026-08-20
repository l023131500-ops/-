import { useState, useRef, useMemo } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  ChevronLeft, ChevronDown, Send, CheckCircle, ArrowRight, Search, Wand2,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { mainCategories, type MainCategory, type RightTopic } from "@/data/rightsData";
import FileUpload from "@/components/FileUpload";
import { validateIdNumber, validatePhone, getIdError, getPhoneError } from "@/lib/validation";

const INITIAL_VISIBLE = 8;

/** נספר מהקטלוג כדי שהמספר שבכותרת לא יוכל להיות שגוי. */
const rightsCount = mainCategories.reduce((n, c) => n + c.topics.length, 0);

const genderOptions = ["זכר", "נקבה", "אחר"];
const maritalOptions = ["רווק/ה", "נשוי/אה", "גרוש/ה", "אלמן/ה"];
const healthOptions = ["תקין", "מוגבלות קלה", "מוגבלות בינונית", "מוגבלות קשה"];
const childrenHealthOptions = ["כולם בריאים", "ילד עם מוגבלות קלה", "ילד עם מוגבלות משמעותית", "ילד עם מחלה כרונית"];

/** תגיות אשף "מצאו לי זכויות" — כל תגית ממופה למילות מפתח שנבדקות מול
 * הכותרת/התיאור/שאלות הזכאות של כל זכות בקטלוג. אין כאן סכום כספי משוער —
 * רק הקטלוג האמיתי עצמו, כי אין במודל הנתונים שדה סכום לכל זכות (נתוני אמת בלבד). */
const wizardTags = [
  { id: "children", label: "הורה לילד/ה", keywords: ["ילד", "לידה", "הורה", "תינוק"] },
  { id: "disability", label: "מוגבלות / נכות", keywords: ["נכות", "מוגבלות", "נכה"] },
  { id: "senior", label: "גיל פרישה / קשיש", keywords: ["פרישה", "זקנה", "קשיש", "סיעוד"] },
  { id: "unemployed", label: "מובטל/ת", keywords: ["אבטלה", "מעסיק", "פוטר"] },
  { id: "selfEmployed", label: "עצמאי/ת", keywords: ["עצמאי"] },
  { id: "reserve", label: "מילואים", keywords: ["מילואים"] },
  { id: "lowIncome", label: "הכנסה נמוכה", keywords: ["הכנסה", "השלמת הכנסה", "הבטחת הכנסה"] },
  { id: "newImmigrant", label: "עולה חדש/ה", keywords: ["עולה", "עלייה"] },
] as const;

const RightsCategories = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  // Personal-situation wizard ("אשף זכויות לפי מצב אישי")
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const toggleTag = (id: string) =>
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));

  // Modal state
  const [openCat, setOpenCat] = useState<MainCategory | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<RightTopic | null>(null);
  const [answers, setAnswers] = useState<Record<string, boolean | undefined>>({});
  const [formData, setFormData] = useState({
    name: "", phone: "", details: "", id_number: "", date_of_birth: "",
    gender: "", marital_status: "",
    children_count: "0", children_ages: "", children_health: "",
    spouse_name: "", spouse_id_number: "", spouse_health: "", spouse_employment: "",
  });
  const [documentUrls, setDocumentUrls] = useState<string[]>([]);
  const [serviceChoice, setServiceChoice] = useState<"free" | "paid" | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetModal = () => {
    setOpenCat(null); setSelectedTopic(null); setAnswers({});
    setFormData({ name: "", phone: "", details: "", id_number: "", date_of_birth: "", gender: "", marital_status: "", children_count: "0", children_ages: "", children_health: "", spouse_name: "", spouse_id_number: "", spouse_health: "", spouse_employment: "" });
    setDocumentUrls([]); setServiceChoice(null); setSubmitted(false);
  };

  const goBackToTopics = () => { setSelectedTopic(null); setAnswers({}); setServiceChoice(null); setSubmitted(false); };

  const calculateEligibility = (): string => {
    const yesCount = Object.values(answers).filter(v => v === true).length;
    const totalQ = selectedTopic?.questions.length || 1;
    const pct = yesCount / totalQ;
    if (pct >= 0.6) return "high";
    if (pct >= 0.3) return "medium";
    return "low";
  };

  const handleSubmit = async (type: "free" | "paid") => {
    if (!formData.name.trim()) { toast({ title: "שדות חובה", description: "נא למלא שם מלא", variant: "destructive" }); return; }
    const phoneErr = getPhoneError(formData.phone);
    if (phoneErr) { toast({ title: "שגיאה בטלפון", description: phoneErr, variant: "destructive" }); return; }
    if (formData.id_number && !validateIdNumber(formData.id_number)) { toast({ title: "שגיאה בת.ז", description: "תעודת זהות חייבת להכיל 9 ספרות", variant: "destructive" }); return; }
    setIsSubmitting(true);
    const answeredQuestions = selectedTopic?.questions.map((q, i) => `${q}: ${answers[`q${i}`] === true ? "כן" : answers[`q${i}`] === false ? "לא" : "לא ענה"}`).join("\n");
    const eligibility = calculateEligibility();
    const isMarried = formData.marital_status === "נשוי/אה";
    const { error } = await supabase.from("leads").insert({
      source: "category", service_type: type, name: formData.name, phone: formData.phone,
      id_number: formData.id_number || null, date_of_birth: formData.date_of_birth || null,
      gender: formData.gender || null, marital_status: formData.marital_status || null,
      children_count: parseInt(formData.children_count) || 0, children_ages: formData.children_ages || null,
      children_health_details: formData.children_health || null,
      spouse_name: isMarried ? formData.spouse_name || null : null,
      spouse_id_number: isMarried ? formData.spouse_id_number || null : null,
      spouse_health: isMarried ? formData.spouse_health || null : null,
      spouse_employment: isMarried ? formData.spouse_employment || null : null,
      details: `${formData.details}\n\nשאלות שסומנו: ${answeredQuestions || "אין"}`,
      category: openCat?.label ?? null, selected_right: selectedTopic?.label ?? null,
      document_urls: documentUrls.length > 0 ? documentUrls : null, eligibility_score: eligibility,
    } as any);
    setIsSubmitting(false);
    if (error) { toast({ title: "שגיאה", description: "לא הצלחנו לשמור. נסו שוב.", variant: "destructive" }); return; }
    setServiceChoice(type); setSubmitted(true);
  };

  const showTopicDetail = !!selectedTopic;

  const searchResults = searchQuery.trim().length >= 2
    ? mainCategories.flatMap((cat) =>
        cat.topics.filter((t) => t.label.includes(searchQuery) || t.desc.includes(searchQuery) || t.questions.some((q) => q.includes(searchQuery)))
          .map((topic) => ({ cat, topic }))
      )
    : [];

  const visibleCategories = showAll ? mainCategories : mainCategories.slice(0, INITIAL_VISIBLE);
  const hasMore = mainCategories.length > INITIAL_VISIBLE;

  const wizardMatches = useMemo(() => {
    const keywords = selectedTagIds.flatMap((id) => wizardTags.find((t) => t.id === id)?.keywords ?? []);
    if (keywords.length === 0) return [];
    const seen = new Set<string>();
    const scored: { cat: MainCategory; topic: RightTopic; score: number }[] = [];
    for (const cat of mainCategories) {
      for (const topic of cat.topics) {
        if (seen.has(topic.id)) continue;
        const haystack = `${topic.label} ${topic.desc} ${topic.questions.join(" ")}`;
        const score = keywords.reduce((n, kw) => (haystack.includes(kw) ? n + 1 : n), 0);
        if (score > 0) { seen.add(topic.id); scored.push({ cat, topic, score }); }
      }
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, 12);
  }, [selectedTagIds]);

  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start end", "end start"] });
  const gridX = useTransform(scrollYProgress, [0, 0.3], [60, 0]);
  const gridRotate = useTransform(scrollYProgress, [0, 0.3], [2, 0]);

  return (
    <>
      <section className="py-24 overflow-hidden" ref={containerRef}>
        <div className="container mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4">גלו את הזכויות שמגיעות לכם</h2>
            {/* ⚠️ כאן היה כתוב "מעל 200 זכויות". בקטלוג יש 194 — כלומר המספר
                פשוט לא היה נכון. באתר שהכלל שלו הוא "נתוני אמת בלבד; אין נתון
                → לא זמין", מספר מנופח בכותרת הוא ליקוי ולא ניסוח.

                לכן הוא נספר מהקטלוג עצמו ולא נכתב ביד: כך הוא נכון היום, וימשיך
                להיות נכון כשיתווספו זכויות — במקום להתיישן בשקט כפי שקרה. */}
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              {rightsCount} זכויות, מענקים והטבות ב-{mainCategories.length} קטגוריות — מביטוח לאומי,
              רשויות המס, בנקים ועוד. חפשו או בחרו קטגוריה
            </p>
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
                {/* type=search so the browser treats it as one (and offers the clear
                    control); aria-label because the only name it had was a placeholder,
                    which vanishes as soon as the visitor types. */}
                <Input type="search" aria-label="חיפוש זכות"
                  placeholder="חפשו זכות — ארנונה, פנסיה, לידה, נכות…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-0 bg-transparent text-base py-4 pr-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60" />
              </div>
            </div>
          </motion.div>

          {/* Personal-situation wizard trigger */}
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 }} className="max-w-xl mx-auto mb-10 text-center">
            <Button variant="outline" onClick={() => setWizardOpen(true)} className="gap-2 rounded-xl border-primary/30 hover:border-primary/60 hover:bg-primary/5">
              <Wand2 className="w-4 h-4 text-primary" /> אשף התאמה אישית — 30 שניות, בלי טופס
            </Button>
          </motion.div>

          {/* Search results */}
          {searchQuery.trim().length >= 2 && (
            <div className="max-w-3xl mx-auto mb-10">
              <p className="text-sm text-muted-foreground mb-3">{searchResults.length > 0 ? `נמצאו ${searchResults.length} תוצאות:` : "לא נמצאו תוצאות. נסו מילה אחרת."}</p>
              <div className="space-y-2">
                {searchResults.slice(0, 15).map(({ cat, topic }, idx) => (
                  <motion.button key={topic.id} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    onClick={() => { setOpenCat(cat); setSelectedTopic(topic); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-right">
                    <div className={`w-8 h-8 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15 flex items-center justify-center shrink-0`}>
                      <cat.icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">{topic.label}</p>
                      <p className="text-xs text-muted-foreground">{cat.label}</p>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Categories grid with scroll-based horizontal motion */}
          <div className="max-w-5xl mx-auto space-y-4">
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
              style={{ x: gridX, rotateY: gridRotate }}
            >
              <AnimatePresence>
                {visibleCategories.map((cat, i) => {
                  const row = Math.floor(i / 4);
                  const isEvenRow = row % 2 === 0;
                  return (
                    <motion.div
                      key={cat.id}
                      initial={{ opacity: 0, y: 40, x: isEvenRow ? -30 : 30, rotateZ: isEvenRow ? -3 : 3 }}
                      whileInView={{ opacity: 1, y: 0, x: 0, rotateZ: 0 }}
                      viewport={{ once: true, margin: "-50px" }}
                      transition={{ delay: i * 0.06, duration: 0.5, type: "spring", stiffness: 120 }}
                      layout
                    >
                      <motion.div
                        whileHover={{ scale: 1.06, y: -8, rotateZ: 1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpandedCat(expandedCat === cat.id ? null : cat.id); } }}
                        role="button"
                        tabIndex={0}
                        aria-expanded={expandedCat === cat.id}
                        aria-label={cat.label}
                        className={`group p-5 rounded-2xl border cursor-pointer h-full flex flex-col items-center text-center gap-3 transition-all duration-300 ${
                          expandedCat === cat.id
                            ? "bg-primary/5 border-primary/40 shadow-xl ring-2 ring-primary/20"
                            : "bg-card border-border/50 card-elevated"
                        }`}
                      >
                        <motion.div
                          className={`w-14 h-14 rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15 flex items-center justify-center shadow-lg`}
                          animate={expandedCat === cat.id
                            ? { scale: [1, 1.25, 1], rotate: [0, 15, -15, 0] }
                            : {}
                          }
                          whileHover={{ rotate: [0, -10, 10, 0], transition: { duration: 0.5 } }}
                          transition={{ duration: 0.6 }}
                        >
                          <cat.icon className="w-7 h-7 text-white" />
                        </motion.div>
                        <h3 className="font-bold text-sm text-foreground leading-tight">{cat.label}</h3>
                        <p className="text-xs text-muted-foreground leading-snug line-clamp-2">{cat.desc}</p>
                        <motion.div className="flex items-center gap-1">
                          <span className="text-[10px] text-primary font-medium">{cat.topics.length} נושאים</span>
                          <motion.div
                            animate={{ rotate: expandedCat === cat.id ? 180 : 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <ChevronDown className="w-4 h-4 text-primary" />
                          </motion.div>
                        </motion.div>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>

            {/* Expanded subcategories panel - enhanced */}
            <AnimatePresence>
              {expandedCat && (() => {
                const cat = mainCategories.find(c => c.id === expandedCat);
                if (!cat) return null;
                return (
                  <motion.div
                    key={expandedCat}
                    initial={{ opacity: 0, height: 0, scale: 0.97 }}
                    animate={{ opacity: 1, height: "auto", scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.97 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-card to-secondary/5 p-6 shadow-xl relative">
                      {/* Decorative corner dots */}
                      <motion.div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-secondary/40"
                        animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0.8, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity }} />
                      <motion.div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-primary/40"
                        animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0.8, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 1 }} />

                      <div className="flex items-center gap-3 mb-5">
                        <motion.div
                          className={`w-11 h-11 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 flex items-center justify-center shadow-md`}
                          animate={{ rotate: [0, 5, -5, 0] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <cat.icon className="w-5 h-5 text-white" />
                        </motion.div>
                        <div>
                          <h3 className="font-bold text-foreground text-lg">{cat.label}</h3>
                          <p className="text-xs text-muted-foreground">{cat.topics.length} נושאים זמינים</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {/* ‎backdrop-blur-sm‎ מאחורי ‎bg-card/90‎ מעל רקע אטום מטשטש
                            10% שקיפות מול משטח בצבע אחיד — עלות ציור בכל אחד
                            מעשרות הכרטיסים, בלי הבדל נראה. הוסר. */}
                        {cat.topics.map((topic, tIdx) => (
                          <motion.button
                            key={topic.id}
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{
                              delay: tIdx * 0.04,
                              duration: 0.4,
                              type: "spring",
                              stiffness: 150,
                            }}
                            whileHover={{
                              scale: 1.04,
                              x: 6,
                              boxShadow: "0 8px 25px -5px hsl(152 45% 38% / 0.15)",
                            }}
                            onClick={() => { setOpenCat(cat); setSelectedTopic(topic); }}
                            className="flex items-center gap-3 p-3.5 rounded-xl border border-border/50 bg-card/90 hover:border-primary/50 hover:bg-primary/5 transition-all text-right group"
                          >
                            <motion.div
                              className={`w-9 h-9 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15 flex items-center justify-center shrink-0`}
                              whileHover={{ rotate: 20, scale: 1.15 }}
                              transition={{ type: "spring", stiffness: 300 }}
                            >
                              <CheckCircle className="w-4 h-4 text-primary" />
                            </motion.div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{topic.label}</p>
                              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{topic.desc}</p>
                            </div>
                            <motion.div
                              className="shrink-0"
                              animate={{ x: [0, -3, 0] }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            >
                              <ChevronLeft className="w-4 h-4 text-primary/40 group-hover:text-primary transition-colors" />
                            </motion.div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </div>

          {/* Show more button */}
          {hasMore && (
            <motion.div
              className="text-center mt-8"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" onClick={() => setShowAll(!showAll)} className="gap-2 px-8 py-3 rounded-xl text-sm font-bold">
                  <motion.div animate={{ rotate: showAll ? 180 : 0 }} transition={{ duration: 0.3 }}>
                    <ChevronDown className="w-4 h-4" />
                  </motion.div>
                  {showAll ? "הצג פחות" : `עוד ${mainCategories.length - INITIAL_VISIBLE} קטגוריות`}
                </Button>
              </motion.div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Modal */}
      <Dialog open={!!openCat} onOpenChange={(open) => !open && resetModal()}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {openCat && !showTopicDetail && (
            <>
              <DialogHeader className="text-center">
                <div className={`w-14 h-14 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 flex items-center justify-center mx-auto mb-2`}>
                  <openCat.icon className="w-7 h-7 text-white" />
                </div>
                <DialogTitle className="text-xl">{openCat.label}</DialogTitle>
                <DialogDescription>{openCat.desc}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 mt-3">
                {openCat.topics.map((topic) => (
                  <motion.button key={topic.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    onClick={() => setSelectedTopic(topic)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-right">
                    <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{topic.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{topic.desc}</p>
                    </div>
                    <ChevronLeft className="w-3 h-3 text-muted-foreground shrink-0" />
                  </motion.button>
                ))}
              </div>
            </>
          )}

          {showTopicDetail && selectedTopic && (
            <>
              <DialogHeader>
                <button onClick={goBackToTopics} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors">
                  <ArrowRight className="w-3 h-3" />חזרה
                </button>
                <DialogTitle className="text-lg">{selectedTopic.label}</DialogTitle>
                <DialogDescription>{selectedTopic.desc}</DialogDescription>
              </DialogHeader>

              {!submitted ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mt-2">
                  <div>
                    <p className="text-sm font-medium text-foreground mb-3">שאלות לבדיקת זכאות:</p>
                    <div className="space-y-3">
                      {selectedTopic.questions.map((q, i) => {
                        const answer = answers[`q${i}`];
                        const answered = answer !== undefined;
                        return (
                          <div key={i} className={`p-3 rounded-lg border transition-all ${answered ? answer ? "border-primary bg-primary/5" : "border-destructive/30 bg-destructive/5" : "border-border"}`}>
                            <p className="text-sm text-foreground mb-2">{q}</p>
                            <div className="flex gap-2">
                              <button onClick={() => setAnswers({ ...answers, [`q${i}`]: true })}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${answer === true ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-primary/10"}`}>כן</button>
                              <button onClick={() => setAnswers({ ...answers, [`q${i}`]: false })}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${answer === false ? "bg-destructive text-destructive-foreground" : "bg-muted text-foreground hover:bg-destructive/10"}`}>לא</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-border pt-4 space-y-3">
                    <p className="text-sm font-medium text-foreground">פרטים אישיים:</p>
                    {/* Every field here was named only by its placeholder — or, for the
                        date of birth, by nothing at all. The selects were named by their
                        own first option, which stops being visible the moment a value is
                        chosen. aria-label gives each one a name that survives both. */}
                    <Input placeholder="שם מלא *" aria-label="שם מלא (חובה)" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="text-sm" />
                    <Input placeholder="טלפון (10 ספרות) *" aria-label="טלפון, 10 ספרות (חובה)" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="text-sm" dir="ltr" />
                    <Input placeholder="תעודת זהות (9 ספרות)" aria-label="תעודת זהות, 9 ספרות" value={formData.id_number} onChange={(e) => setFormData({ ...formData, id_number: e.target.value })} className="text-sm" dir="ltr" />
                    <Input type="date" aria-label="תאריך לידה" value={formData.date_of_birth} onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} className="text-sm" dir="ltr" />
                    <div className="grid grid-cols-2 gap-2">
                      <select aria-label="מגדר" value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option value="">מגדר</option>
                        {genderOptions.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <select aria-label="מצב משפחתי" value={formData.marital_status} onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
                        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option value="">מצב משפחתי</option>
                        {maritalOptions.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>

                    {formData.marital_status === "נשוי/אה" && (
                      <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-border">
                        <p className="text-xs font-medium text-foreground">פרטי בן/בת זוג:</p>
                        <Input placeholder="שם בן/בת זוג" aria-label="שם בן/בת זוג" value={formData.spouse_name} onChange={(e) => setFormData({ ...formData, spouse_name: e.target.value })} className="text-sm" />
                        <Input placeholder="ת.ז בן/בת זוג" aria-label="תעודת זהות של בן/בת זוג" value={formData.spouse_id_number} onChange={(e) => setFormData({ ...formData, spouse_id_number: e.target.value })} className="text-sm" dir="ltr" />
                        <select aria-label="מצב בריאותי של בן/בת זוג" value={formData.spouse_health} onChange={(e) => setFormData({ ...formData, spouse_health: e.target.value })}
                          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                          <option value="">מצב בריאותי</option>
                          {healthOptions.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <Input placeholder="סטטוס תעסוקתי" aria-label="סטטוס תעסוקתי של בן/בת זוג" value={formData.spouse_employment} onChange={(e) => setFormData({ ...formData, spouse_employment: e.target.value })} className="text-sm" />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <Input type="number" min={0} placeholder="מספר ילדים" aria-label="מספר ילדים" value={formData.children_count} onChange={(e) => setFormData({ ...formData, children_count: e.target.value })} className="text-sm" />
                      <Input placeholder="גילאי ילדים" aria-label="גילאי ילדים" value={formData.children_ages} onChange={(e) => setFormData({ ...formData, children_ages: e.target.value })} className="text-sm" />
                    </div>
                    <select aria-label="מצב בריאותי של הילדים" value={formData.children_health} onChange={(e) => setFormData({ ...formData, children_health: e.target.value })}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="">מצב בריאותי ילדים</option>
                      {childrenHealthOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>

                    <Textarea placeholder="פרטים נוספים (אופציונלי)" aria-label="פרטים נוספים (לא חובה)" value={formData.details} onChange={(e) => setFormData({ ...formData, details: e.target.value })} className="text-sm min-h-[60px]" />
                    <FileUpload onFilesUploaded={setDocumentUrls} />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button onClick={() => handleSubmit("free")} disabled={isSubmitting} variant="outline" className="flex-1 gap-2">
                      <Send className="w-4 h-4" /> {isSubmitting ? "שולח..." : "שלח (חינם)"}
                    </Button>
                    <Button onClick={() => handleSubmit("paid")} disabled={isSubmitting} className="flex-1 gap-2 bg-gradient-to-r from-primary to-secondary text-primary-foreground">
                      <Send className="w-4 h-4" /> {isSubmitting ? "שולח..." : "שירות מלא"}
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 space-y-4">
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }}>
                    <CheckCircle className="w-16 h-16 text-primary mx-auto" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-foreground">
                    {serviceChoice === "paid" ? "הפנייה התקבלה!" : "הפנייה נשלחה!"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {serviceChoice === "paid" ? "נציג מיומן ייצור איתך קשר בהקדם לטיפול מלא בזכויותיך." : "קיבלנו את הפרטים. נבדוק ונחזור אליך בהקדם."}
                  </p>
                  <Button onClick={resetModal} variant="outline" className="gap-2"><ArrowRight className="w-4 h-4" /> חזרה לקטגוריות</Button>
                </motion.div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Personal-situation wizard modal — client-side keyword match against the
          real catalog only; no eligibility scoring, no fabricated potential sum. */}
      <Dialog open={wizardOpen} onOpenChange={(open) => { setWizardOpen(open); if (!open) setSelectedTagIds([]); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader className="text-center">
            <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 flex items-center justify-center mx-auto mb-2">
              <Wand2 className="w-7 h-7 text-primary" />
            </div>
            <DialogTitle className="text-xl">מה מתאר את המצב שלכם?</DialogTitle>
            <DialogDescription>בחרו כל מה שרלוונטי — נציג רק זכויות מהקטלוג שמתאימות</DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2 justify-center mt-3">
            {wizardTags.map((tag) => (
              <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  selectedTagIds.includes(tag.id)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-foreground border-border hover:border-primary/40"
                }`}>
                {tag.label}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-2">
            {selectedTagIds.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">בחרו לפחות תגית אחת כדי לראות זכויות מותאמות</p>
            )}
            {selectedTagIds.length > 0 && wizardMatches.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">לא נמצאה התאמה בקטלוג למצב שנבחר. נסו תגית אחרת או חפשו למעלה.</p>
            )}
            {wizardMatches.length > 0 && (
              <p className="text-xs text-muted-foreground mb-2">{wizardMatches.length} זכויות מתאימות:</p>
            )}
            {wizardMatches.map(({ cat, topic }) => (
              <button key={topic.id} type="button"
                onClick={() => { setOpenCat(cat); setSelectedTopic(topic); setWizardOpen(false); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-right">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15 flex items-center justify-center shrink-0">
                  <cat.icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{topic.label}</p>
                  <p className="text-xs text-muted-foreground">{cat.label}</p>
                </div>
                <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RightsCategories;
