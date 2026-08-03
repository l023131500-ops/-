import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Sparkles, ArrowLeft, User } from "lucide-react";


interface Message {
  id: string;
  role: "bot" | "user";
  content: string;
  options?: ChatOption[];
}

interface ChatOption {
  label: string;
  action: string;
}

const MAIN_MENU: ChatOption[] = [
  { label: "🔍 מה המערכת עושה?", action: "faq_features" },
  { label: "💡 טיפ פיננסי", action: "tip" },
  { label: "📞 בקשת הדגמה", action: "demo_request" },
  { label: "❓ שאלות נפוצות", action: "faq_general" },
];

const TIPS = [
  "בדקו את כל חשבונות הביטוח שלכם אחת לשנה — רוב המשפחות משלמות על כפילויות מיותרות שעולות מעל ₪1,200 בשנה.",
  "הגדירו הוראת קבע אוטומטית של 10% מהמשכורת לחיסכון נפרד — תוך שנה לא תרגישו את ההפרש.",
  "בקשו הנחה על ארנונה — אם ההכנסה שלכם מתחת לסף, אתם עשויים לקבל עד 70% הנחה.",
  "עברו על כל המנויים החודשיים — ספוטיפיי, נטפליקס, אפליקציות שנשכחו. משפחה ממוצעת חוסכת ₪150/חודש.",
  "השתמשו בכרטיס אשראי אחד בלבד לרכישות יומיות — כך קל הרבה יותר לעקוב אחרי הוצאות.",
];

const FAQ_FEATURES: Message = {
  id: "faq_features",
  role: "bot",
  content: `**Lux Manage** היא פלטפורמה פיננסית חכמה שמשלבת:

🛡️ **מנוע זכויות אוטומטי** — סורק את הפרופיל שלך ומזהה הטבות, הנחות ומענקים שמגיעים לך.

📊 **תקציב יומי חי** — מעקב בזמן אמת אחרי הוצאות עם התראות חכמות.

💼 **ניהול עסקי + ביתי** — חשבון אחד עם שתי פלטפורמות מופרדות.

🔒 **אבטחת מידע** — כל הנתונים מוצפנים ומאובטחים ברמה בנקאית.`,
  options: [
    { label: "🚀 אני רוצה להירשם", action: "signup" },
    { label: "↩️ חזרה לתפריט", action: "menu" },
  ],
};

const FAQ_GENERAL_ITEMS: Message = {
  id: "faq_general",
  role: "bot",
  content: `**שאלות נפוצות:**

**כמה זה עולה?**
ההרשמה חינמית לחלוטין. תוכניות פרימיום זמינות עם תקופת ניסיון.

**האם המידע שלי מוגן?**
בהחלט. אנחנו משתמשים בהצפנה מקצה לקצה ואבטחת Supabase ברמה הגבוהה ביותר.

**איך מתחילים?**
נרשמים עם Google או Apple בלחיצה אחת, עונים על שאלון קצר, והמערכת מתחילה לעבוד בשבילכם.

**אפשר לנהל גם עסק?**
כן! המערכת תומכת בניהול ביתי ועסקי במקביל.`,
  options: [
    { label: "🚀 אני רוצה להירשם", action: "signup" },
    { label: "↩️ חזרה לתפריט", action: "menu" },
  ],
};

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function PublicConciergeBot({ onGetStarted }: { onGetStarted: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [leadStep, setLeadStep] = useState<null | "name" | "contact" | "done">(null);
  const [leadData, setLeadData] = useState({ name: "", email: "", message: "" });
  const [tipIndex, setTipIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function openChat() {
    setIsOpen(true);
    if (messages.length === 0) {
      setMessages([
        {
          id: generateId(),
          role: "bot",
          content: "שלום! 👋 אני העוזר הדיגיטלי של **Lux Manage**.\nאיך אפשר לעזור לך היום?",
          options: MAIN_MENU,
        },
      ]);
    }
  }

  function addBotMessage(msg: Omit<Message, "id">) {
    setMessages((prev) => [...prev, { ...msg, id: generateId() }]);
  }

  function addUserMessage(text: string) {
    setMessages((prev) => [...prev, { id: generateId(), role: "user", content: text }]);
  }

  async function saveLead(data: typeof leadData, source = "concierge_bot") {
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/leads-api`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            phone: "",
            message: data.message,
            source,
          }),
        }
      );
      if (!res.ok) console.error("Lead save error:", await res.text());
    } catch (e) {
      console.error("Lead save failed:", e);
    }
  }

  function handleOption(action: string) {
    switch (action) {
      case "faq_features":
        addUserMessage("מה המערכת עושה?");
        setTimeout(() => addBotMessage(FAQ_FEATURES), 400);
        break;

      case "faq_general":
        addUserMessage("שאלות נפוצות");
        setTimeout(() => addBotMessage(FAQ_GENERAL_ITEMS), 400);
        break;

      case "tip": {
        addUserMessage("תן לי טיפ פיננסי");
        const tip = TIPS[tipIndex % TIPS.length];
        setTipIndex((i) => i + 1);
        setTimeout(() => {
          addBotMessage({
            role: "bot",
            content: `💡 **טיפ היום:**\n\n${tip}`,
            options: [
              { label: "💡 טיפ נוסף", action: "tip" },
              { label: "🚀 אני רוצה להירשם", action: "signup" },
              { label: "↩️ חזרה לתפריט", action: "menu" },
            ],
          });
        }, 400);
        break;
      }

      case "demo_request":
        addUserMessage("אני רוצה הדגמה");
        setLeadStep("name");
        setTimeout(() => {
          addBotMessage({
            role: "bot",
            content: "מעולה! נשמח להכיר 😊\nמה השם שלך?",
          });
        }, 400);
        break;

      case "signup":
        addUserMessage("אני רוצה להירשם!");
        setTimeout(() => {
          addBotMessage({
            role: "bot",
            content: "מצוין! לוחץ על הכפתור למטה כדי להירשם בלחיצה אחת 🚀",
            options: [{ label: "🚀 הרשמה עכשיו", action: "do_signup" }],
          });
        }, 400);
        break;

      case "do_signup":
        onGetStarted();
        setIsOpen(false);
        break;

      case "menu":
        addBotMessage({
          role: "bot",
          content: "בחר/י נושא:",
          options: MAIN_MENU,
        });
        break;
    }
  }

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    addUserMessage(text);

    if (leadStep === "name") {
      setLeadData((d) => ({ ...d, name: text }));
      setLeadStep("contact");
      setTimeout(() => {
        addBotMessage({
          role: "bot",
          content: `נעים מאוד, ${text}! 🤝\nמה האימייל או הטלפון שלך כדי שנחזור אליך?`,
        });
      }, 400);
      return;
    }

    if (leadStep === "contact") {
      const finalData = { ...leadData, email: text, message: "Demo request" };
      setLeadData(finalData);
      setLeadStep("done");
      saveLead(finalData);
      setTimeout(() => {
        addBotMessage({
          role: "bot",
          content: "תודה רבה! 🎉 נציג שלנו יחזור אליך בהקדם.\nבינתיים, אפשר להירשם ולהתחיל בחינם:",
          options: [
            { label: "🚀 הרשמה עכשיו", action: "do_signup" },
            { label: "↩️ חזרה לתפריט", action: "menu" },
          ],
        });
      }, 400);
      return;
    }

    // Free text — give a helpful default
    setTimeout(() => {
      addBotMessage({
        role: "bot",
        content: "תודה על ההודעה! הנה כמה אפשרויות שאולי יעזרו:",
        options: MAIN_MENU,
      });
    }, 500);
  }

  return (
    <>
      {/* Floating Bubble */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={openChat}
            className="fixed bottom-6 left-6 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-accent to-amber-600 flex items-center justify-center shadow-[0_8px_32px_hsl(38_92%_50%/0.35)] hover:shadow-[0_12px_40px_hsl(38_92%_50%/0.5)] transition-shadow duration-300 group"
            aria-label="Open chat"
          >
            <MessageCircle className="w-7 h-7 text-primary-foreground group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-6 left-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] h-[560px] max-h-[calc(100vh-6rem)] rounded-3xl overflow-hidden flex flex-col border border-white/[0.08] shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
            style={{ backdropFilter: "blur(24px)", background: "hsla(222, 50%, 6%, 0.92)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent to-amber-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Lux Manage</p>
                  <p className="text-[11px] text-muted-foreground">העוזר הדיגיטלי שלך</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/[0.06] transition-colors">
                <X className="w-4.5 h-4.5 text-muted-foreground" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[85%] space-y-2 ${msg.role === "user" ? "order-last" : ""}`}>
                    <div
                      className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                        msg.role === "user"
                          ? "bg-accent/15 text-foreground rounded-br-lg"
                          : "bg-white/[0.05] text-foreground/90 rounded-bl-lg border border-white/[0.05]"
                      }`}
                      dangerouslySetInnerHTML={{
                        __html: msg.content
                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(/\n/g, "<br/>"),
                      }}
                    />
                    {msg.options && (
                      <div className="flex flex-wrap gap-1.5">
                        {msg.options.map((opt) => (
                          <button
                            key={opt.action}
                            onClick={() => handleOption(opt.action)}
                            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 border border-accent/15 transition-colors duration-200 active:scale-[0.97]"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-white/[0.06]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={leadStep ? "הקלד/י כאן..." : "שאל/י אותי משהו..."}
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent/30 transition-colors"
                />
                <button
                  type="submit"
                  className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center hover:bg-accent/25 transition-colors active:scale-95"
                >
                  <Send className="w-4 h-4 text-accent" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
