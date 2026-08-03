import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, Sparkles, Lightbulb, TrendingUp, Shield, PiggyBank } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useFinancial } from "@/contexts/FinancialContext";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const tips = [
  { icon: TrendingUp, text: "הוצאות המזון שלך גבוהות ב-15% מהממוצע. נסה לקנות בשוק בתחילת השבוע." },
  { icon: Shield, text: "כדאי לבדוק זכאות להנחת ארנונה – עם 3 ילדים ייתכן שאתה זכאי ל-40% הנחה." },
  { icon: PiggyBank, text: "הפקדה חודשית של ₪500 לקרן השתלמות תניב לך פטור ממס של ₪2,700 בשנה." },
  { icon: Lightbulb, text: "שים לב: תשלום הליסינג שלך נגמר בעוד 22 חודשים. כדאי לתכנן מראש." },
  { icon: TrendingUp, text: "שיעור החיסכון שלך החודש: 28%. מצוין! ממוצע ארצי: 18%." },
];

const expertResponses: Record<string, string> = {
  "זכויות": "בהתבסס על הפרופיל שלך (שוכר, 3 ילדים, הכנסה ₪22,000):\n\n✅ זכאי לסיוע בשכר דירה - עד ₪1,100/חודש\n✅ קצבת ילדים - ₪564/חודש\n✅ מענק לימודים - ₪3,150/שנה\n✅ הנחת ארנונה - עד 40%\n✅ סבסוד צהרון לאיתי (גיל 5)\n\nלחץ על לשונית 'זכויות והטבות' לפרטים מלאים.",
  "חיסכון": "המלצות חיסכון מותאמות אישית:\n\n💰 הפחת הוצאות מזון ב-₪400 (קניות בשוק)\n💰 עבור לתוכנית סלולר זולה יותר (חיסכון ₪50/חודש)\n💰 בדוק מחיר ביטוח רכב מול חברות מתחרות\n💰 הפקד ₪500/חודש לקרן השתלמות\n\nסה״כ חיסכון פוטנציאלי: ~₪1,200/חודש",
  "בר מצווה": "תכנון בר מצווה ליונתן (בעוד שנה):\n\n📋 תקציב מומלץ: ₪50,000-80,000\n📋 חסכת עד כה: ₪36,000\n📋 נדרש חיסכון חודשי: ₪2,000\n\n✅ שלבים הבאים:\n1. סגירת אולם (2-3 חודשים הבאים)\n2. צלם + DJ (4 חודשים לפני)\n3. הזמנות (3 חודשים לפני)\n4. תפריט סופי (חודש לפני)",
  "default": "תודה על הפנייה! אני כאן לעזור בכל נושא פיננסי.\n\nתחומי ההתמחות שלי:\n• ניתוח הוצאות והכנסות\n• בדיקת זכאות להטבות\n• תכנון אירועים ותקציב\n• ייעוץ חיסכון והשקעות\n• ניהול חובות ותשלומים\n\nספר לי במה אוכל לעזור 😊",
};

export default function ExpertChatPage() {
  const { language, profile } = useApp();
  const { chatMessages, addChatMessage, transactions } = useFinancial();
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTip((p) => (p + 1) % tips.length), 8000);
    return () => clearInterval(interval);
  }, []);

  const getResponse = (msg: string): string => {
    const lower = msg.toLowerCase();
    if (lower.includes("זכויות") || lower.includes("הטבות") || lower.includes("זכאות")) return expertResponses["זכויות"];
    if (lower.includes("חיסכון") || lower.includes("לחסוך") || lower.includes("כסף")) return expertResponses["חיסכון"];
    if (lower.includes("בר מצווה") || lower.includes("אירוע") || lower.includes("חתונה")) return expertResponses["בר מצווה"];
    return expertResponses["default"];
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    addChatMessage({ role: "user", content: userMsg, timestamp: new Date().toISOString() });
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      addChatMessage({ role: "expert", content: getResponse(userMsg), timestamp: new Date().toISOString() });
      setIsTyping(false);
    }, 1200);
  };

  const tip = tips[currentTip];
  const TipIcon = tip.icon;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="p-6 md:p-8 max-w-4xl mx-auto space-y-6 flex flex-col" style={{ height: "calc(100vh - 3.5rem)" }}>
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
          <MessageCircle className="w-7 h-7 inline-block me-2 gold-text" />
          צ׳אט עם מומחה
        </h1>
        <p className="text-sm text-muted-foreground">שירות ייעוץ פיננסי אישי פרימיום</p>
      </motion.div>

      {/* Daily Tip */}
      <motion.div variants={itemVariants} className="glass-card-gold rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 gold-text" />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">טיפ יומי</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={currentTip}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-accent/10 shrink-0">
              <TipIcon className="w-4 h-4 gold-text" />
            </div>
            <p className="text-sm text-foreground leading-relaxed">{tip.text}</p>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Chat Area */}
      <div className="flex-1 glass-card-gold rounded-xl flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {chatMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                msg.role === "user"
                  ? "gold-gradient text-card rounded-ee-sm shadow-md"
                  : "bg-secondary text-foreground rounded-es-sm"
              }`}>
                {msg.role === "expert" && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="w-3 h-3 text-accent" />
                    <span className="text-[10px] font-semibold gold-text">יועץ פיננסי</span>
                  </div>
                )}
                {msg.content}
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="bg-secondary rounded-2xl px-4 py-3 rounded-es-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick suggestions */}
        <div className="px-4 py-2 border-t border-border/30 flex gap-2 overflow-x-auto">
          {["מה הזכויות שלי?", "איך לחסוך?", "תכנון בר מצווה"].map((q) => (
            <button key={q} onClick={() => { setInput(q); }}
              className="shrink-0 px-3 py-1.5 rounded-full text-[10px] font-medium bg-accent/10 gold-text border border-accent/20 hover:bg-accent/20 transition-all">
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border/30">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="שאל את המומחה..."
              className="flex-1 px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button onClick={handleSend} disabled={!input.trim()}
              className="px-4 py-3 rounded-xl gold-gradient text-card transition-all hover:shadow-lg active:scale-[0.95] disabled:opacity-50">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
