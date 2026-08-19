import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, Sparkles, X, Minimize2, CheckCircle2, AlertCircle } from "lucide-react";
import { useFinancial } from "@/contexts/FinancialContext";
import { useApp } from "@/contexts/AppContext";
import { useBudgetItems, SUBCATEGORIES_FIXED, SUBCATEGORIES_ONE_TIME, PAYMENT_METHODS } from "@/hooks/useBudgetItems";

type ActionStep = "idle" | "choose_action" | "choose_type" | "choose_category" | "enter_amount" | "choose_payment" | "confirm";

interface PendingEntry {
  action: "expense" | "income" | "task" | "reminder";
  type: "fixed_monthly" | "one_time";
  subcategory: string;
  amount: number;
  paymentMethod: string;
  description: string;
}

const ACTION_OPTIONS = [
  { key: "expense", label: "💸 הוצאה", desc: "הוספת הוצאה קבועה או חד פעמית" },
  { key: "income", label: "💰 הכנסה", desc: "הוספת הכנסה קבועה או חד פעמית" },
  { key: "task", label: "📋 משימה", desc: "יצירת תזכורת / משימה" },
  { key: "chat", label: "💬 שיחה חופשית", desc: "דברו איתי על כל נושא" },
];

export default function FloatingExpertChat() {
  const [isOpen, setIsOpen] = useState(false);
  const { chatMessages, addChatMessage } = useFinancial();
  const { userId } = useApp();
  const { addItem } = useBudgetItems();
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [step, setStep] = useState<ActionStep>("idle");
  const [pending, setPending] = useState<Partial<PendingEntry>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isTyping]);

  const addBotMessage = (content: string) => {
    addChatMessage({ role: "expert", content, timestamp: new Date().toISOString() });
  };

  const addUserMessage = (content: string) => {
    addChatMessage({ role: "user", content, timestamp: new Date().toISOString() });
  };

  const handleActionSelect = (action: string) => {
    if (action === "chat") {
      setStep("idle");
      addUserMessage("שיחה חופשית");
      addBotMessage("בשמחה! ספר לי במה אוכל לעזור 😊\n\nאני יכול לסייע ב:\n• ניתוח הוצאות והכנסות\n• בדיקת זכאות להטבות\n• תכנון אירועים ותקציב\n• ייעוץ חיסכון");
      return;
    }
    if (action === "task") {
      setStep("idle");
      addUserMessage("יצירת משימה");
      addBotMessage("כתוב את תוכן המשימה ואני אוסיף אותה ליומן שלך.\n\nלדוגמה: ״להתקשר לביטוח לאומי ביום ראשון״");
      return;
    }
    setPending({ action: action as "expense" | "income" });
    setStep("choose_type");
    addUserMessage(action === "expense" ? "הוצאה" : "הכנסה");
    addBotMessage(`בחר סוג ${action === "expense" ? "הוצאה" : "הכנסה"}:`);
  };

  const handleTypeSelect = (type: "fixed_monthly" | "one_time") => {
    setPending((p) => ({ ...p, type }));
    setStep("choose_category");
    addUserMessage(type === "fixed_monthly" ? "קבועה" : "חד פעמית");
    addBotMessage("בחר קטגוריה:");
  };

  const handleCategorySelect = (sub: string) => {
    setPending((p) => ({ ...p, subcategory: sub, description: sub }));
    setStep("enter_amount");
    addUserMessage(sub);
    addBotMessage(`כמה ₪ עבור ${sub}?`);
  };

  const handleAmountSubmit = () => {
    const amt = parseFloat(input);
    if (isNaN(amt) || amt <= 0) return;
    setPending((p) => ({ ...p, amount: amt }));
    setInput("");
    setStep("choose_payment");
    addUserMessage(`₪${amt.toLocaleString()}`);
    addBotMessage("באיזה אמצעי תשלום?");
  };

  const handlePaymentSelect = (method: string) => {
    const label = PAYMENT_METHODS.find((m) => m.value === method)?.label || method;
    setPending((p) => ({ ...p, paymentMethod: method }));
    setStep("confirm");
    addUserMessage(label);

    const p = { ...pending, paymentMethod: method };
    const typeLabel = p.type === "fixed_monthly" ? "קבועה" : "חד פעמית";
    addBotMessage(
      `📋 סיכום לפני שליחה:\n\n` +
      `• סוג: ${p.action === "income" ? "הכנסה" : "הוצאה"} ${typeLabel}\n` +
      `• קטגוריה: ${p.subcategory}\n` +
      `• סכום: ₪${p.amount?.toLocaleString()}\n` +
      `• תשלום: ${label}\n\n` +
      `לאשר?`
    );
  };

  const handleConfirm = async (confirmed: boolean) => {
    if (!confirmed) {
      addUserMessage("ביטול");
      addBotMessage("בוטל. מה תרצה לעשות?");
      setStep("choose_action");
      setPending({});
      return;
    }
    addUserMessage("✅ מאושר");
    const p = pending as PendingEntry;
    try {
      await addItem({
        type: p.action as "income" | "expense",
        category: p.type,
        subcategory: p.subcategory,
        description: p.description || p.subcategory,
        amount: p.amount,
        is_business: false,
        is_active: true,
        due_month: null,
        due_date: null,
        start_date: new Date().toISOString().split("T")[0],
        duration_months: null,
        end_date: null,
        payment_method: p.paymentMethod,
        installments: 1,
      });
      addBotMessage(`✅ ${p.action === "income" ? "ההכנסה" : "ההוצאה"} נוספה בהצלחה!\n\n${p.subcategory} — ₪${p.amount.toLocaleString()}`);
    } catch {
      addBotMessage("❌ שגיאה בשמירה, נסה שוב.");
    }
    setStep("idle");
    setPending({});
  };

  const handleFreeText = () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    addUserMessage(text);
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const lower = text.toLowerCase();
      if (lower.includes("זכויות") || lower.includes("הטבות") || lower.includes("זכאות")) {
        addBotMessage("בדוק את עמוד הזכויות וההטבות שלך — שם תראה את כל הזכויות המותאמות לפרופיל.\n\nלחץ על 'זכויות והטבות' בתפריט.");
      } else if (lower.includes("חיסכון") || lower.includes("לחסוך")) {
        addBotMessage("כדי לחסוך, בדוק את ההוצאות הקבועות שלך ונסה לזהות הוצאות שניתן להפחית.\n\nעבור ל'ניהול תקציב' לפירוט מלא.");
      } else {
        addBotMessage("הבנתי! אם תרצה להוסיף הוצאה או הכנסה, לחץ על אחת האפשרויות למטה 👇");
        setStep("choose_action");
      }
    }, 1000);
  };

  const handleSend = () => {
    if (step === "enter_amount") {
      handleAmountSubmit();
    } else {
      handleFreeText();
    }
  };

  const getCategories = () => {
    const action = pending.action || "expense";
    const type = pending.type || "fixed_monthly";
    if (type === "one_time") {
      return SUBCATEGORIES_ONE_TIME[action] || SUBCATEGORIES_ONE_TIME.expense;
    }
    return SUBCATEGORIES_FIXED[action] || SUBCATEGORIES_FIXED.expense;
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => { setIsOpen(true); if (chatMessages.length === 0) { setStep("choose_action"); addBotMessage("שלום! 👋 את/ה מוזמן/ת לדבר איתי.\n\nבחר מה תרצה לעשות:"); } }}
            className="btn-clay fixed bottom-6 start-6 z-50 w-14 h-14 rounded-2xl gold-gradient flex items-center justify-center group"
            style={{ boxShadow: "0 8px 32px hsl(38 92% 50% / 0.2), inset 0 2px 4px hsl(0 0% 0% / 0.15)" }}
          >
            <MessageCircle className="w-6 h-6 text-primary-foreground" />
            <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full border-2 border-background animate-pulse" style={{ backgroundColor: "hsl(var(--accent))" }} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-6 start-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] h-[520px] max-h-[calc(100vh-6rem)] rounded-bento overflow-hidden flex flex-col glass-card"
            style={{ border: "1px solid hsl(var(--gold) / 0.1)" }}
          >
            {/* Header */}
            <div className="gold-gradient px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-bold text-primary-foreground">הסוכן החכם שלך</p>
                  <p className="text-[10px] text-primary-foreground/60">מוזמן/ת לדבר איתי</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setIsOpen(false)} className="btn-clay p-2 rounded-xl bg-primary-foreground/10">
                  <Minimize2 className="w-4 h-4 text-primary-foreground/80" />
                </button>
                <button onClick={() => setIsOpen(false)} className="btn-clay p-2 rounded-xl bg-primary-foreground/10">
                  <X className="w-4 h-4 text-primary-foreground/80" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {chatMessages.map((msg) => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-line ${
                    msg.role === "user"
                      ? "gold-gradient text-primary-foreground rounded-ee-sm"
                      : "bg-secondary text-foreground rounded-es-sm border border-border/30"
                  }`}>
                    {msg.role === "expert" && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Sparkles className="w-2.5 h-2.5 text-accent" />
                        <span className="text-[9px] font-bold gold-text">יועץ פיננסי</span>
                      </div>
                    )}
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {isTyping && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-secondary rounded-2xl px-4 py-3 rounded-es-sm border border-border/30">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-muted-foreground">מקליד...</span>
                      <div className="flex gap-0.5">
                        {[0, 150, 300].map((d) => (
                          <span key={d} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Dynamic Action Buttons */}
            <div className="px-3 py-2 border-t border-border/20 space-y-2 shrink-0 max-h-[200px] overflow-y-auto">
              {step === "choose_action" && (
                <div className="grid grid-cols-2 gap-1.5">
                  {ACTION_OPTIONS.map((opt) => (
                    <button key={opt.key} onClick={() => handleActionSelect(opt.key)}
                      className="px-3 py-2.5 rounded-xl text-[10px] font-bold bg-secondary/60 border border-border/40 hover:border-accent/40 hover:bg-accent/5 transition-all text-right">
                      <div className="text-foreground">{opt.label}</div>
                      <div className="text-muted-foreground text-[8px] mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              )}

              {step === "choose_type" && (
                <div className="flex gap-2">
                  <button onClick={() => handleTypeSelect("fixed_monthly")}
                    className="flex-1 px-3 py-2.5 rounded-xl text-[10px] font-bold bg-secondary/60 border border-border/40 hover:border-accent/40 text-foreground">
                    📅 קבועה חודשית
                  </button>
                  <button onClick={() => handleTypeSelect("one_time")}
                    className="flex-1 px-3 py-2.5 rounded-xl text-[10px] font-bold bg-secondary/60 border border-border/40 hover:border-accent/40 text-foreground">
                    1️⃣ חד פעמית
                  </button>
                </div>
              )}

              {step === "choose_category" && (
                <div className="flex flex-wrap gap-1.5">
                  {getCategories().map((cat) => (
                    <button key={cat} onClick={() => handleCategorySelect(cat)}
                      className="px-2.5 py-1.5 rounded-lg text-[9px] font-bold bg-accent/8 gold-text border border-accent/15 hover:bg-accent/15 transition-all">
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {step === "choose_payment" && (
                <div className="flex flex-wrap gap-1.5">
                  {PAYMENT_METHODS.map((pm) => (
                    <button key={pm.value} onClick={() => handlePaymentSelect(pm.value)}
                      className="px-2.5 py-1.5 rounded-lg text-[9px] font-bold bg-secondary/60 border border-border/40 hover:border-accent/40 text-foreground">
                      {pm.label}
                    </button>
                  ))}
                </div>
              )}

              {step === "confirm" && (
                <div className="flex gap-2">
                  <button onClick={() => handleConfirm(true)}
                    className="flex-1 px-3 py-2.5 rounded-xl text-xs font-bold gold-gradient text-primary-foreground flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> אישור
                  </button>
                  <button onClick={() => handleConfirm(false)}
                    className="flex-1 px-3 py-2.5 rounded-xl text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> ביטול
                  </button>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border/20 shrink-0">
              <div className="flex gap-2">
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder={step === "enter_amount" ? "הזן סכום..." : "כתוב הודעה..."}
                  className="flex-1 px-4 py-3 rounded-2xl bg-secondary border border-border/30 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
                <button onClick={handleSend} disabled={!input.trim()}
                  className="btn-clay-gold px-4 py-3 rounded-2xl disabled:opacity-50">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
              {step === "idle" && (
                <button onClick={() => { setStep("choose_action"); addBotMessage("מה תרצה לעשות?"); }}
                  className="mt-2 w-full py-2 rounded-xl text-[10px] font-bold bg-accent/8 gold-text border border-accent/15 hover:bg-accent/15 transition-all">
                  + פעולה חדשה
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
