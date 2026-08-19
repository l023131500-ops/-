import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Send, CheckCircle2, Loader2, Zap, AlertCircle } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useBudgetItems, SUBCATEGORIES_FIXED, SUBCATEGORIES_ONE_TIME, PAYMENT_METHODS } from "@/hooks/useBudgetItems";
import { useFinancial, TransactionCategory } from "@/contexts/FinancialContext";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

type FlowStep = "idle" | "choose_action" | "choose_type" | "choose_category" | "enter_amount" | "choose_payment" | "confirm";

interface PendingEntry {
  action: "expense" | "income";
  type: "fixed_monthly" | "one_time";
  subcategory: string;
  amount: number;
  paymentMethod: string;
}

interface ChatBubble {
  id: string;
  role: "user" | "system";
  content: string;
  status?: "processing" | "success" | "error";
}

function WaveformAnimation({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-[2px] h-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div key={i} className="w-[3px] rounded-full bg-accent"
          animate={active ? { height: [4, 12 + Math.random() * 12, 4] } : { height: 4 }}
          transition={active ? { duration: 0.4 + Math.random() * 0.3, repeat: Infinity, repeatType: "mirror", delay: i * 0.05 } : {}} />
      ))}
    </div>
  );
}

// NLP parser
function parseMessage(text: string, mode: "household" | "business"): {
  type: "expense" | "income"; amount: number; category: TransactionCategory; description: string; categoryLabel: string;
} | null {
  const amountMatch = text.match(/(\d[\d,\.]*)\s*(?:₪|ש[״"]?ח|שקל)/);
  if (!amountMatch) {
    const numMatch = text.match(/ב[–\-]?(\d[\d,\.]*)/);
    if (!numMatch) return null;
    const amount = parseFloat(numMatch[1].replace(",", ""));
    if (isNaN(amount)) return null;
    return categorize(text, amount, mode);
  }
  const amount = parseFloat(amountMatch[1].replace(",", ""));
  if (isNaN(amount) || amount <= 0) return null;
  return categorize(text, amount, mode);
}

function categorize(text: string, amount: number, mode: "household" | "business") {
  const lower = text;
  let type: "expense" | "income" = "expense";
  let category: TransactionCategory = "other";
  let categoryLabel = "אחר";
  if (lower.includes("קיבלתי") || lower.includes("משכורת") || lower.includes("הכנסה")) {
    type = "income"; category = mode === "business" ? "business" : "other"; categoryLabel = "הכנסה";
  } else if (lower.includes("סופר") || lower.includes("מזון") || lower.includes("אוכל") || lower.includes("מסעדה")) {
    category = "food"; categoryLabel = "מזון";
  } else if (lower.includes("שכירות") || lower.includes("ארנונה") || lower.includes("חשמל")) {
    category = "housing"; categoryLabel = "דיור";
  } else if (lower.includes("דלק") || lower.includes("רכב")) {
    category = "car"; categoryLabel = "רכב";
  } else if (lower.includes("רופא") || lower.includes("בריאות")) {
    category = "health"; categoryLabel = "בריאות";
  }
  let description = text.replace(/(\d[\d,\.]*)\s*(?:₪|ש[״"]?ח|שקל)/g, "").trim();
  if (description.length < 3) description = `${categoryLabel} - ₪${amount}`;
  return { type, amount, category, description, categoryLabel };
}

const ACTION_OPTIONS = [
  { key: "expense", label: "💸 הוצאה", desc: "קבועה או חד פעמית" },
  { key: "income", label: "💰 הכנסה", desc: "קבועה או חד פעמית" },
  { key: "free", label: "✍️ טקסט חופשי", desc: "כתוב בשפה חופשית" },
];

export default function QuickEntryPage() {
  const { mode } = useApp();
  const { addTransaction } = useFinancial();
  const { addItem } = useBudgetItems();
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [step, setStep] = useState<FlowStep>("choose_action");
  const [pending, setPending] = useState<Partial<PendingEntry>>({});
  const [messages, setMessages] = useState<ChatBubble[]>([
    { id: "welcome", role: "system", content: "שלום! 👋\nבחר פעולה או כתוב הוצאה/הכנסה בשפה חופשית." },
  ]);

  const addMessage = useCallback((msg: ChatBubble) => setMessages((prev) => [...prev, msg]), []);
  const updateMessage = useCallback((id: string, updates: Partial<ChatBubble>) =>
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m))), []);

  const addSysMsg = (content: string, status?: ChatBubble["status"]) => {
    const id = `s-${Date.now()}-${Math.random()}`;
    addMessage({ id, role: "system", content, status });
    return id;
  };
  const addUserMsg = (content: string) => addMessage({ id: `u-${Date.now()}`, role: "user", content });

  const handleActionSelect = (action: string) => {
    if (action === "free") { setStep("idle"); addUserMsg("טקסט חופשי"); addSysMsg("כתוב הוצאה/הכנסה בשפה חופשית.\nלדוגמה: ״קניתי בסופר ב-450 ש״ח״"); return; }
    setPending({ action: action as "expense" | "income" });
    setStep("choose_type");
    addUserMsg(action === "expense" ? "הוצאה" : "הכנסה");
    addSysMsg("בחר סוג:");
  };

  const handleTypeSelect = (type: "fixed_monthly" | "one_time") => {
    setPending((p) => ({ ...p, type }));
    setStep("choose_category");
    addUserMsg(type === "fixed_monthly" ? "קבועה" : "חד פעמית");
    addSysMsg("בחר קטגוריה:");
  };

  const handleCategorySelect = (sub: string) => {
    setPending((p) => ({ ...p, subcategory: sub }));
    setStep("enter_amount");
    addUserMsg(sub);
    addSysMsg(`כמה ₪ עבור ${sub}?`);
  };

  const handleAmountSubmit = () => {
    const amt = parseFloat(input);
    if (isNaN(amt) || amt <= 0) return;
    setPending((p) => ({ ...p, amount: amt }));
    setInput("");
    setStep("choose_payment");
    addUserMsg(`₪${amt.toLocaleString()}`);
    addSysMsg("באיזה אמצעי תשלום?");
  };

  const handlePaymentSelect = (method: string) => {
    const label = PAYMENT_METHODS.find((m) => m.value === method)?.label || method;
    setPending((p) => ({ ...p, paymentMethod: method }));
    setStep("confirm");
    addUserMsg(label);
    const p = { ...pending, paymentMethod: method };
    addSysMsg(
      `📋 סיכום:\n• ${p.action === "income" ? "הכנסה" : "הוצאה"} ${p.type === "fixed_monthly" ? "קבועה" : "חד פעמית"}\n• ${p.subcategory}\n• ₪${p.amount?.toLocaleString()}\n• ${label}\n\nלאשר?`
    );
  };

  const handleConfirm = async (confirmed: boolean) => {
    if (!confirmed) {
      addUserMsg("ביטול");
      addSysMsg("בוטל. בחר פעולה חדשה:");
      setStep("choose_action");
      setPending({});
      return;
    }
    addUserMsg("✅ מאושר");
    const p = pending as PendingEntry;
    try {
      await addItem({
        type: p.action,
        category: p.type,
        subcategory: p.subcategory,
        description: p.subcategory,
        amount: p.amount,
        is_business: mode === "business",
        is_active: true,
        due_month: null,
        due_date: null,
        start_date: new Date().toISOString().split("T")[0],
        duration_months: null,
        end_date: null,
        payment_method: p.paymentMethod,
        installments: 1,
      });
      addSysMsg(`✅ ${p.action === "income" ? "ההכנסה" : "ההוצאה"} נוספה!\n${p.subcategory} — ₪${p.amount.toLocaleString()}`, "success");
    } catch {
      addSysMsg("❌ שגיאה בשמירה", "error");
    }
    setStep("choose_action");
    setPending({});
    addSysMsg("מה תרצה לעשות עכשיו?");
  };

  const handleFreeTextSend = () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    addUserMsg(text);
    const processingId = `p-${Date.now()}`;
    setTimeout(() => addMessage({ id: processingId, role: "system", content: "מעבד...", status: "processing" }), 300);
    setTimeout(() => {
      const parsed = parseMessage(text, mode);
      if (parsed) {
        addTransaction({ type: parsed.type, amount: parsed.amount, category: parsed.category, description: parsed.description, date: new Date().toISOString().split("T")[0], isRecurring: false, isInstallment: false });
        updateMessage(processingId, { content: `✅ ${parsed.type === "income" ? "הכנסה" : "הוצאה"}: ${parsed.categoryLabel} ₪${parsed.amount.toLocaleString()}`, status: "success" });
      } else {
        updateMessage(processingId, { content: "❌ לא זוהה סכום. נסה: ״קניתי בסופר ב-450 ש״ח״", status: "error" });
      }
    }, 1500);
  };

  const handleSend = () => {
    if (step === "enter_amount") handleAmountSubmit();
    else handleFreeTextSend();
  };

  const handleVoice = () => {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      const samples = ["שילמתי לחשמלאי 350 ש״ח", "קניתי בסופר ב-520 ש״ח", "דלק לרכב 280 ש״ח"];
      setInput(samples[Math.floor(Math.random() * samples.length)]);
    }, 2500);
  };

  const getCategories = () => {
    const action = pending.action || "expense";
    const type = pending.type || "fixed_monthly";
    return type === "one_time" ? (SUBCATEGORIES_ONE_TIME[action] || SUBCATEGORIES_ONE_TIME.expense) : (SUBCATEGORIES_FIXED[action] || SUBCATEGORIES_FIXED.expense);
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show"
      className="p-6 md:p-8 max-w-3xl mx-auto space-y-6 flex flex-col" style={{ height: "calc(100vh - 3.5rem)" }}>
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Zap className="w-7 h-7 gold-text" /> הזנה מהירה
        </h1>
        <p className="text-sm text-muted-foreground">בחר פעולה מהרשימה או הקלד בשפה חופשית</p>
      </motion.div>

      <div className="flex-1 glass-card-gold rounded-2xl flex flex-col overflow-hidden min-h-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3 }} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line shadow-sm ${
                  msg.role === "user" ? "gold-gradient text-primary-foreground rounded-ee-sm"
                    : msg.status === "processing" ? "bg-secondary/80 text-foreground rounded-es-sm border border-accent/20"
                    : msg.status === "success" ? "bg-emerald-500/10 text-foreground rounded-es-sm border border-emerald-500/20"
                    : msg.status === "error" ? "bg-destructive/10 text-foreground rounded-es-sm border border-destructive/20"
                    : "bg-secondary text-foreground rounded-es-sm"
                }`}>
                  {msg.status === "processing" && <div className="flex items-center gap-2 mb-1"><Loader2 className="w-3.5 h-3.5 text-accent animate-spin" /><span className="text-[10px] font-semibold gold-text">מעבד...</span></div>}
                  {msg.status === "success" && <div className="flex items-center gap-1.5 mb-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /><span className="text-[10px] font-semibold text-emerald-600">נוסף בהצלחה</span></div>}
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <div className="px-4 py-2 border-t border-border/20 space-y-2 shrink-0 max-h-[180px] overflow-y-auto">
          {step === "choose_action" && (
            <div className="flex gap-2">
              {ACTION_OPTIONS.map((opt) => (
                <button key={opt.key} onClick={() => handleActionSelect(opt.key)}
                  className="flex-1 px-3 py-2.5 rounded-xl text-[10px] font-bold bg-secondary/60 border border-border/40 hover:border-accent/40 hover:bg-accent/5 transition-all text-center">
                  <div className="text-foreground">{opt.label}</div>
                  <div className="text-muted-foreground text-[8px] mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          )}
          {step === "choose_type" && (
            <div className="flex gap-2">
              <button onClick={() => handleTypeSelect("fixed_monthly")} className="flex-1 px-3 py-2.5 rounded-xl text-xs font-bold bg-secondary/60 border border-border/40 hover:border-accent/40 text-foreground">📅 קבועה</button>
              <button onClick={() => handleTypeSelect("one_time")} className="flex-1 px-3 py-2.5 rounded-xl text-xs font-bold bg-secondary/60 border border-border/40 hover:border-accent/40 text-foreground">1️⃣ חד פעמית</button>
            </div>
          )}
          {step === "choose_category" && (
            <div className="flex flex-wrap gap-1.5">
              {getCategories().map((cat) => (
                <button key={cat} onClick={() => handleCategorySelect(cat)}
                  className="px-2.5 py-1.5 rounded-lg text-[9px] font-bold bg-accent/8 gold-text border border-accent/15 hover:bg-accent/15 transition-all">{cat}</button>
              ))}
            </div>
          )}
          {step === "choose_payment" && (
            <div className="flex flex-wrap gap-1.5">
              {PAYMENT_METHODS.map((pm) => (
                <button key={pm.value} onClick={() => handlePaymentSelect(pm.value)}
                  className="px-2.5 py-1.5 rounded-lg text-[9px] font-bold bg-secondary/60 border border-border/40 hover:border-accent/40 text-foreground">{pm.label}</button>
              ))}
            </div>
          )}
          {step === "confirm" && (
            <div className="flex gap-2">
              <button onClick={() => handleConfirm(true)} className="flex-1 px-3 py-2.5 rounded-xl text-xs font-bold gold-gradient text-primary-foreground flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> אישור
              </button>
              <button onClick={() => handleConfirm(false)} className="flex-1 px-3 py-2.5 rounded-xl text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> ביטול
              </button>
            </div>
          )}
        </div>

        {/* Voice Recording Overlay */}
        <AnimatePresence>
          {isRecording && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="px-4 py-3 border-t border-accent/20 bg-accent/5 flex items-center justify-center gap-3">
              <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
              <WaveformAnimation active={isRecording} />
              <span className="text-xs text-muted-foreground">מקליט...</span>
              <button onClick={() => setIsRecording(false)} className="text-xs text-destructive hover:text-destructive/80">ביטול</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="p-3 border-t border-border/30">
          <div className="flex gap-2 items-end">
            <button onClick={handleVoice} disabled={isRecording}
              className={`p-3 rounded-xl transition-all shrink-0 ${isRecording ? "bg-destructive/10 text-destructive" : "bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground"}`}>
              <Mic className="w-5 h-5" />
            </button>
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={step === "enter_amount" ? "הזן סכום ₪..." : "הקלד הוצאה/הכנסה..."}
              className="flex-1 px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <button onClick={handleSend} disabled={!input.trim()}
              className="p-3 rounded-xl gold-gradient text-white transition-all hover:shadow-lg active:scale-[0.95] disabled:opacity-50 shrink-0">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
