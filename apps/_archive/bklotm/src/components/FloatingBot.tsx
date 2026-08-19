import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, X, Send, Sparkles, CheckCircle, Loader2,
  Mail, Bell, Star, Plus, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { mainCategories, type MainCategory, type RightTopic } from "@/data/rightsData";
import { getPhoneError, getEmailError } from "@/lib/validation";

type Msg = {
  id: string;
  role: "bot" | "user";
  text?: string;
  ui?: React.ReactNode;
};

type RequestType = "info" | "reminders" | "full" | "another";

const requestOptions: { id: RequestType; icon: typeof Mail; title: string; gradient: string }[] = [
  { id: "info", icon: Mail, title: "📩 מידע מעודכן ומפורט", gradient: "from-blue-500 to-indigo-600" },
  { id: "reminders", icon: Bell, title: "🔔 תזכורות שוטפות", gradient: "from-secondary to-amber-500" },
  { id: "full", icon: Star, title: "⭐ טיפול מלא במימוש", gradient: "from-primary to-emerald-600" },
  { id: "another", icon: Plus, title: "➕ מידע על נושא נוסף", gradient: "from-pink-500 to-rose-500" },
];

const requestLabel: Record<RequestType, string> = {
  info: "מידע מפורט",
  reminders: "תזכורות",
  full: "טיפול מלא",
  another: "נושא נוסף",
};

const uid = () => Math.random().toString(36).slice(2);

const FloatingBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [stage, setStage] = useState<"intro" | "name" | "phone" | "email" | "choice" | "pick-cat" | "pick-topic" | "topic-q" | "submitting" | "done">("intro");
  const [profile, setProfile] = useState<{ name: string; phone: string; email: string }>({ name: "", phone: "", email: "" });
  const [input, setInput] = useState("");
  const [requestType, setRequestType] = useState<RequestType>("info");
  const [cat, setCat] = useState<MainCategory | null>(null);
  const [topic, setTopic] = useState<RightTopic | null>(null);
  const [qIdx, setQIdx] = useState(0);
  const [qAnswers, setQAnswers] = useState<boolean[]>([]);
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && msgs.length === 0) {
      addBot("שלום! 👋 אני הנציג של בקלות. אשמח לעזור לך לגלות אילו זכויות וכספים מגיעים לך. אפשר להתחיל?");
      setTimeout(() => askName(), 700);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const addBot = (text: string, ui?: React.ReactNode) =>
    setMsgs((m) => [...m, { id: uid(), role: "bot", text, ui }]);
  const addUser = (text: string) =>
    setMsgs((m) => [...m, { id: uid(), role: "user", text }]);

  const askName = () => {
    setStage("name");
    addBot("איך קוראים לך? (שם מלא)");
  };

  const handleSendInput = () => {
    const v = input.trim();
    if (!v) return;
    if (stage === "name") {
      if (v.length < 2) return toast({ title: "שם קצר מדי", variant: "destructive" });
      setProfile((p) => ({ ...p, name: v }));
      addUser(v);
      setInput("");
      setStage("phone");
      setTimeout(() => addBot(`נעים מאוד, ${v}! מה מספר הטלפון שלך?`), 400);
    } else if (stage === "phone") {
      const err = getPhoneError(v);
      if (err) return toast({ title: err, variant: "destructive" });
      setProfile((p) => ({ ...p, phone: v.replace(/\D/g, "") }));
      addUser(v);
      setInput("");
      setStage("email");
      setTimeout(() => addBot("מצוין! ומה כתובת המייל שלך?"), 400);
    } else if (stage === "email") {
      const err = getEmailError(v);
      if (err) return toast({ title: err, variant: "destructive" });
      setProfile((p) => ({ ...p, email: v.trim().toLowerCase() }));
      addUser(v);
      setInput("");
      goToChoice();
    }
  };

  const goToChoice = () => {
    setStage("choice");
    setTimeout(() => {
      addBot("מעולה! 🎉 איך אוכל לעזור לך עכשיו?", <ChoiceButtons onPick={handlePickRequest} />);
    }, 400);
  };

  const handlePickRequest = (t: RequestType) => {
    setRequestType(t);
    addUser(requestOptions.find((o) => o.id === t)!.title);
    if (t === "another") {
      setTimeout(() => {
        addBot("איזה נושא מעניין אותך? בחר/י קטגוריה:", <CategoryButtons onPick={handlePickCat} />);
        setStage("pick-cat");
      }, 400);
    } else {
      setTimeout(() => {
        addBot("בחר/י את הנושא שמעניין אותך - ונבדוק יחד את הזכאות:", <CategoryButtons onPick={handlePickCat} />);
        setStage("pick-cat");
      }, 400);
    }
  };

  const handlePickCat = (c: MainCategory) => {
    setCat(c);
    addUser(c.label);
    setTimeout(() => {
      addBot(`נהדר. איזה נושא ב"${c.label}"?`, <TopicButtons cat={c} onPick={handlePickTopic} />);
      setStage("pick-topic");
    }, 300);
  };

  const handlePickTopic = async (t: RightTopic) => {
    setTopic(t);
    setQAnswers([]);
    setQIdx(0);
    addUser(t.label);
    setStage("topic-q");

    // Fetch ONLY basic info from DB: target audience + basic eligibility.
    // Full details (financial potential, documents, how-to-apply, etc.) are
    // intentionally NOT shown here — they are sent to the user via the
    // chosen delivery channel (email/WhatsApp/SMS) after the lead is created,
    // exactly like in the topic forms across the site.
    let basicInfo = "";
    try {
      const { data } = await supabase
        .from("rights_reference")
        .select("target_audience, eligibility_criteria")
        .ilike("topic_name", t.label)
        .limit(1)
        .maybeSingle();
      const ta = (data?.target_audience || "").trim();
      const ec = (data?.eligibility_criteria || "").trim();
      const parts: string[] = [];
      if (ta) parts.push(`👥 למי זה מיועד:\n${ta}`);
      if (ec) parts.push(`✅ תנאי זכאות בסיסיים:\n${ec}`);
      basicInfo = parts.join("\n\n");
    } catch {/* ignore */}

    setTimeout(() => {
      if (basicInfo) addBot(basicInfo);
      setTimeout(() => {
        addBot("המידע המלא והמעודכן יישלח אליך לפי הערוץ שתבחר בסוף 📩\n\nנשאל אותך כמה שאלות קצרות לבדיקת פוטנציאל זכאות 🎯");
        setTimeout(() => askTopicQ(t, 0, []), 500);
      }, basicInfo ? 600 : 0);
    }, 300);
  };

  const askTopicQ = (t: RightTopic, idx: number, answers: boolean[]) => {
    if (idx >= t.questions.length) {
      finishTopic(t, answers);
      return;
    }
    addBot(
      `שאלה ${idx + 1}/${t.questions.length}: ${t.questions[idx]}`,
      <YesNoButtons onPick={(yes) => handleQAnswer(t, idx, yes, answers)} />,
    );
  };

  const handleQAnswer = (t: RightTopic, idx: number, yes: boolean, prev: boolean[]) => {
    const next = [...prev, yes];
    setQAnswers(next);
    addUser(yes ? "כן ✓" : "לא ✗");
    setQIdx(idx + 1);
    setTimeout(() => askTopicQ(t, idx + 1, next), 350);
  };

  const finishTopic = async (t: RightTopic, answers: boolean[]) => {
    setStage("submitting");
    const yesCount = answers.filter(Boolean).length;
    const total = t.questions.length || 1;
    const pct = yesCount / total;
    const eligibility = pct >= 0.6 ? "high" : pct >= 0.3 ? "medium" : "low";

    const verdict =
      eligibility === "high"
        ? "🟢 פוטנציאל זכאות גבוה! יש סיכוי טוב שמגיע לך."
        : eligibility === "medium"
        ? "🟡 פוטנציאל בינוני - שווה לבדוק לעומק."
        : "🔴 פוטנציאל נמוך - אבל עדיין כדאי להתייעץ.";

    addBot(verdict);

    const qDetails = t.questions
      .map((q, i) => `${q}: ${answers[i] ? "כן" : "לא"}`)
      .join("\n");

    const serviceType = requestType === "full" ? "paid" : "free";
    const payload: Record<string, any> = {
      source: "floating-bot",
      service_type: serviceType,
      request_type: requestType,
      name: profile.name,
      phone: profile.phone,
      email: profile.email,
      category: cat?.label || null,
      selected_right: t.label,
      eligibility_score: eligibility,
      details: `סוג בקשה: ${requestLabel[requestType]}\nנושא: ${t.label}\n\n--- שאלות פוטנציאל ---\n${qDetails}`,
    };

    // Dedup
    let existingId: string | null = null;
    if (profile.phone.length === 10) {
      const { data: found } = await supabase
        .from("leads")
        .select("id, document_urls")
        .eq("phone", profile.phone)
        .limit(1);
      if (found && found.length > 0) existingId = found[0].id;
    }

    let ok = false;
    if (existingId) {
      const { error } = await supabase
        .from("leads")
        .update({
          request_type: payload.request_type,
          service_type: payload.service_type,
          category: payload.category,
          selected_right: payload.selected_right,
          eligibility_score: payload.eligibility_score,
          details: payload.details,
        } as any)
        .eq("id", existingId);
      ok = !error;
    } else {
      const { error } = await supabase.from("leads").insert(payload as any);
      ok = !error;
    }

    if (!ok) {
      toast({ title: "שגיאה בשליחה", variant: "destructive" });
      return;
    }

    setTimeout(() => {
      addBot(
        `הפנייה נשלחה ✅ ניצור איתך קשר בקרוב ${
          requestType === "full"
            ? "לטיפול מלא"
            : requestType === "reminders"
            ? "עם תזכורות שוטפות"
            : "עם המידע המבוקש"
        }.\n\nתרצה/י לקבל סיוע בנושא נוסף?`,
        <AnotherTopicButtons onYes={handleAnother} onNo={handleClose} />,
      );
      setStage("done");
    }, 600);
  };

  const handleAnother = () => {
    addUser("כן, נושא נוסף");
    setCat(null);
    setTopic(null);
    setQAnswers([]);
    setQIdx(0);
    setTimeout(() => {
      addBot("מעולה! אין צורך למלא פרטים שוב 😊 איך אוכל לעזור?", <ChoiceButtons onPick={handlePickRequest} />);
      setStage("choice");
    }, 300);
  };

  const handleClose = () => {
    addUser("תודה, סיימתי");
    setTimeout(() => {
      addBot("תודה רבה! נהיה בקשר 💚");
    }, 300);
  };

  const handleReset = () => {
    setMsgs([]);
    setProfile({ name: "", phone: "", email: "" });
    setStage("intro");
    setCat(null);
    setTopic(null);
    setQAnswers([]);
    setQIdx(0);
    setInput("");
  };

  const showInput = ["name", "phone", "email"].includes(stage);

  return (
    <>
      {/* Floating trigger */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 left-6 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-primary to-emerald-600 shadow-2xl flex items-center justify-center text-white"
            aria-label="פתח צ'אט"
          >
            <MessageCircle className="w-7 h-7" />
            <motion.span
              animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-primary/40"
            />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", damping: 24 }}
            className="fixed bottom-6 left-6 z-50 w-[92vw] max-w-[400px] h-[600px] max-h-[85vh] rounded-2xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-emerald-700 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">הנציג של בקלות</p>
                  <p className="text-[11px] opacity-80 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
                    מחובר וזמין לעזור
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {msgs.length > 1 && (
                  <button
                    onClick={handleReset}
                    className="text-[11px] px-2 py-1 rounded hover:bg-white/10"
                    title="התחלה מחדש"
                  >
                    איפוס
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="p-1.5 rounded hover:bg-white/10">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-muted/30">
              {msgs.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed shadow-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-bl-sm"
                        : "bg-card text-foreground rounded-br-sm border border-border"
                    }`}
                  >
                    {m.text && <div>{m.text}</div>}
                    {m.ui && <div className="mt-2">{m.ui}</div>}
                  </div>
                </motion.div>
              ))}
              {stage === "submitting" && (
                <div className="flex justify-end">
                  <div className="bg-card border border-border rounded-2xl px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> שולח...
                  </div>
                </div>
              )}
            </div>

            {/* Input area (only when text input expected) */}
            {showInput && (
              <div className="border-t border-border p-2.5 bg-card flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendInput()}
                  placeholder={
                    stage === "name"
                      ? "שם מלא..."
                      : stage === "phone"
                      ? "מספר טלפון (10 ספרות)..."
                      : "כתובת מייל..."
                  }
                  className="text-sm"
                  dir={stage === "name" ? "rtl" : "ltr"}
                  type={stage === "email" ? "email" : stage === "phone" ? "tel" : "text"}
                  autoFocus
                />
                <Button onClick={handleSendInput} size="icon" className="shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/* ---------- Inline UI helpers ---------- */

const ChoiceButtons = ({ onPick }: { onPick: (t: RequestType) => void }) => (
  <div className="grid grid-cols-1 gap-1.5 mt-1">
    {requestOptions.map((o) => (
      <button
        key={o.id}
        onClick={() => onPick(o.id)}
        className={`text-right flex items-center gap-2 p-2.5 rounded-lg bg-gradient-to-r ${o.gradient} text-white text-xs font-bold shadow-sm hover:shadow-md transition-all hover:scale-[1.01]`}
      >
        <o.icon className="w-4 h-4 shrink-0" />
        <span className="flex-1">{o.title}</span>
        <ChevronRight className="w-3 h-3 rotate-180 opacity-70" />
      </button>
    ))}
  </div>
);

const CategoryButtons = ({ onPick }: { onPick: (c: MainCategory) => void }) => (
  <div className="grid grid-cols-2 gap-1.5 mt-1 max-h-64 overflow-y-auto pr-1">
    {mainCategories.map((c) => (
      <button
        key={c.id}
        onClick={() => onPick(c)}
        className="text-right p-2 rounded-lg border border-border bg-background hover:border-primary hover:bg-primary/5 text-xs font-medium transition-all"
      >
        {c.label}
      </button>
    ))}
  </div>
);

const TopicButtons = ({ cat, onPick }: { cat: MainCategory; onPick: (t: RightTopic) => void }) => (
  <div className="grid grid-cols-1 gap-1.5 mt-1 max-h-64 overflow-y-auto pr-1">
    {cat.topics.map((t) => (
      <button
        key={t.id}
        onClick={() => onPick(t)}
        className="text-right p-2 rounded-lg border border-border bg-background hover:border-primary hover:bg-primary/5 text-xs transition-all"
      >
        <p className="font-bold text-foreground">{t.label}</p>
        <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{t.desc}</p>
      </button>
    ))}
  </div>
);

const YesNoButtons = ({ onPick }: { onPick: (yes: boolean) => void }) => (
  <div className="grid grid-cols-2 gap-2 mt-1">
    <button
      onClick={() => onPick(true)}
      className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-all"
    >
      ✓ כן
    </button>
    <button
      onClick={() => onPick(false)}
      className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-all"
    >
      ✗ לא
    </button>
  </div>
);

const AnotherTopicButtons = ({ onYes, onNo }: { onYes: () => void; onNo: () => void }) => (
  <div className="grid grid-cols-2 gap-2 mt-1">
    <button
      onClick={onYes}
      className="px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold flex items-center justify-center gap-1.5"
    >
      <Plus className="w-3.5 h-3.5" /> כן, נושא נוסף
    </button>
    <button
      onClick={onNo}
      className="px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium"
    >
      תודה, סיימתי
    </button>
  </div>
);

export default FloatingBot;
