import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, User, Search, FileText, Mic, PlusCircle, RefreshCw, ArrowLeft, RotateCcw, MapPin, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AIIcon from "@/components/ui/AIIcon";

interface Message {
  role: "bot" | "user";
  content: string;
  buttons?: { label: string; icon: string; link?: string; action?: string }[];
  formLink?: string;
}

type BotState = "home" | "search-prompt" | "searching" | "search-results";

const SEARCH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-lessons`;

const INITIAL_OPTIONS: { label: string; icon: string; link?: string; action?: string }[] = [
  { label: "חיפוש שיעורי תורה, בתי כנסת וארגונים", icon: "search", action: "search" },
  { label: "רישום כרב מגיד שיעור", icon: "teach", link: "/teachers" },
  { label: "בקשת מגיד שיעור", icon: "establish", link: "/request-lesson" },
];

const SEARCH_FOLLOW_UP: { label: string; icon: string; action: string }[] = [
  { label: "שיעור נוסף בנושא הזה", icon: "more", action: "more-same" },
  { label: "חידוד לפי עיר / רב / זמן", icon: "refine", action: "refine" },
  { label: "חיפוש נושא חדש", icon: "new-search", action: "new-search" },
  { label: "חזרה לתפריט הראשי", icon: "home", action: "go-home" },
];

const FloatingChatBot = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getInitialMessage = (): Message => ({
    role: "bot",
    content: "שלום וברכה! 😊 אני כאן לעזור לכם למצוא שיעורי תורה, בתי כנסת וארגונים מכל הארץ.\nבמה אוכל לסייע?",
    buttons: INITIAL_OPTIONS,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([getInitialMessage()]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [botState, setBotState] = useState<BotState>("home");
  const [stateHistory, setStateHistory] = useState<BotState[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setMessages([getInitialMessage()]);
    setBotState("home");
    setStateHistory([]);
  }, [location.pathname]);

  const pushState = (newState: BotState) => {
    setStateHistory(prev => [...prev, botState]);
    setBotState(newState);
  };

  const streamResponse = async (allMessages: Message[]) => {
    setIsTyping(true);
    pushState("searching");
    let assistantContent = "";
    try {
      const resp = await fetch(SEARCH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: allMessages }),
      });
      if (!resp.ok || !resp.body) { toast.error("שגיאה בשירות"); setIsTyping(false); return; }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "bot" && prev.length > allMessages.length) {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev.slice(0, allMessages.length), { role: "bot", content: assistantContent }];
              });
            }
          } catch { buffer = line + "\n" + buffer; break; }
        }
      }
      // Parse and handle ACTION tags
      const actionMatch = assistantContent.match(/\[ACTION:(submit_lesson|submit_seeker|submit_teacher)\](\{.*?\})/);
      if (actionMatch) {
        try {
          const actionType = actionMatch[1];
          const actionData = JSON.parse(actionMatch[2]);
          if (actionType === "submit_lesson") {
            await supabase.from("lessons").insert({ ...actionData, status: "pending", is_approved: false });
          } else if (actionType === "submit_seeker") {
            await supabase.from("seeker_leads").insert({ ...actionData, status: "new" });
          } else if (actionType === "submit_teacher") {
            await supabase.from("teacher_leads").insert({ ...actionData, status: "new" });
          }
          toast.success("הפרטים נשמרו בהצלחה!");
        } catch { /* silent */ }
        // Remove the ACTION tag from displayed content
        assistantContent = assistantContent.replace(/\[ACTION:.*?\]\{.*?\}/, "").trim();
        setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m));
      }

      // After streaming done, add follow-up options
      setBotState("search-results");
      setMessages(prev => [
        ...prev,
        {
          role: "bot",
          content: "מעוניינים בשיעור נוסף או חיפוש אחר?",
          buttons: SEARCH_FOLLOW_UP,
        },
      ]);
    } catch { toast.error("שגיאה בחיבור"); }
    setIsTyping(false);
  };

  const goBack = () => {
    if (stateHistory.length > 0) {
      const prevState = stateHistory[stateHistory.length - 1];
      setStateHistory(prev => prev.slice(0, -1));
      if (prevState === "home") {
        setBotState("home");
        setMessages([getInitialMessage()]);
      } else if (prevState === "search-prompt") {
        setBotState("search-prompt");
        // Remove last exchange pair
        setMessages(prev => {
          let lastUserIdx = -1;
          for (let i = prev.length - 2; i >= 0; i--) {
            if (prev[i].role === "user") { lastUserIdx = i; break; }
          }
          if (lastUserIdx > 0) return prev.slice(0, lastUserIdx);
          return prev;
        });
      } else {
        setBotState(prevState);
      }
    } else {
      setBotState("home");
      setMessages([getInitialMessage()]);
    }
  };

  const handleInitialChoice = (opt: { label: string; icon: string; link?: string; action?: string }) => {
    const userMsg: Message = { role: "user", content: opt.label };
    if (opt.action === "search") {
      pushState("search-prompt");
      setMessages(prev => [...prev, userMsg, {
        role: "bot",
        content: "מעולה! כתבו מה אתם מחפשים — נושא, עיר, רב, שפה, או כל פרט אחר ואמצא לכם שיעור מתאים מהמאגר 🔍",
      }]);
    } else if (opt.link) {
      setMessages(prev => [...prev, userMsg, {
        role: "bot",
        content: "מעולה! מעביר אותך לטופס המתאים...",
        formLink: opt.link,
      }]);
      setTimeout(() => navigate(opt.link!), 800);
    }
  };

  const handleSearchFollowUp = (opt: { label: string; icon: string; action: string }) => {
    if (opt.action === "go-home") {
      setBotState("home");
      setStateHistory([]);
      setMessages([getInitialMessage()]);
      return;
    }

    const userMsg: Message = { role: "user", content: opt.label };

    if (opt.action === "new-search") {
      // Clear conversation but stay in search mode
      pushState("search-prompt");
      setMessages([
        getInitialMessage(),
        { role: "user", content: "חיפוש חכם מהמאגר" },
        { role: "bot", content: "בוודאי! על מה תרצו לחפש הפעם? 🔍" },
      ]);
      return;
    }

    if (opt.action === "more-same") {
      // Continue in same context - ask AI for more
      const updated = [...messages, userMsg];
      setMessages(updated);
      streamResponse(updated);
      return;
    }

    if (opt.action === "refine") {
      pushState("search-prompt");
      setMessages(prev => [...prev, userMsg, {
        role: "bot",
        content: "בשמחה! ציינו עיר, שם רב, או זמן מועדף ואמצא לכם בדיוק 🎯",
      }]);
      return;
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    if (botState === "home") {
      pushState("search-prompt");
    }
    streamResponse(updated);
  };

  const getIconForButton = (icon: string) => {
    switch (icon) {
      case "search": return <Search className="w-5 h-5 text-teal flex-shrink-0" />;
      case "teach": return <Mic className="w-5 h-5 text-gold flex-shrink-0" />;
      case "establish": return <PlusCircle className="w-5 h-5 text-magenta flex-shrink-0" />;
      case "form": return <RefreshCw className="w-5 h-5 text-gold flex-shrink-0" />;
      case "more": return <Plus className="w-5 h-5 text-teal flex-shrink-0" />;
      case "refine": return <MapPin className="w-5 h-5 text-gold flex-shrink-0" />;
      case "new-search": return <Search className="w-5 h-5 text-magenta flex-shrink-0" />;
      case "home": return <RotateCcw className="w-5 h-5 text-muted-foreground flex-shrink-0" />;
      default: return <FileText className="w-5 h-5 text-gold flex-shrink-0" />;
    }
  };

  const lastMessage = messages[messages.length - 1];
  const showButtons = lastMessage?.buttons && !isTyping;
  const isFollowUp = botState === "search-results" && showButtons;

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [1, 1.08, 1], opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ scale: { repeat: Infinity, duration: 2 } }}
            whileHover={{ scale: 1.15 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 left-6 z-50 w-16 h-16 rounded-full bg-navy flex items-center justify-center shadow-2xl glow-gold"
          >
            <AIIcon size={42} variant="navy" />
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute -top-2 -right-2 px-2.5 py-1 rounded-full bg-teal text-primary-foreground text-[10px] font-bold whitespace-nowrap shadow-lg"
            >
              אני כאן לעזור!
            </motion.span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 left-6 z-50 w-[380px] h-[550px] max-h-[80vh] rounded-3xl overflow-hidden shadow-2xl border-2 border-gold/30"
          >
            <div className="absolute -inset-0.5 bg-gradient-gold rounded-3xl opacity-20 blur-sm" />
            <div className="relative z-10 flex flex-col h-full bg-card rounded-3xl overflow-hidden">
              {/* Header */}
              <div className="relative p-4 flex items-center gap-3">
                <div className="absolute inset-0 bg-gradient-to-l from-gold/20 via-secondary/10 to-teal/10" />
                <div className="absolute inset-0 bg-card/60 backdrop-blur-sm" />
                <div className="relative z-10 flex items-center gap-3 w-full">
                  <AIIcon size={40} variant="primary" />
                  <div className="flex-1">
                    <h3 className="font-display text-base font-bold text-foreground flex items-center gap-1.5">
                      איגוד השיעורים
                    </h3>
                    <p className="font-body text-[10px] text-muted-foreground">סוכן AI חכם — כאן לעזור</p>
                  </div>
                  {botState !== "home" && (
                    <button onClick={goBack} className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-gold/20 transition-colors" title="חזרה">
                      <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                  <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <AnimatePresence>
                  {messages.map((msg, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className="flex-shrink-0">
                        {msg.role === "bot"
                          ? <AIIcon size={28} variant="primary" />
                          : <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center"><User className="w-3.5 h-3.5 text-foreground" /></div>}
                      </div>
                      <div className={`max-w-[80%] rounded-2xl px-3 py-2 font-body text-xs leading-relaxed whitespace-pre-wrap ${
                        msg.role === "bot" ? "bg-muted/80 text-foreground rounded-tr-sm border border-border/50" : "bg-gold/10 text-foreground rounded-tl-sm border border-gold/20"
                      }`}>
                        {msg.content}
                        {msg.formLink && (
                          <a href={msg.formLink} className="mt-2 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-gold text-navy text-xs font-bold hover:opacity-90 transition-opacity w-fit">
                            <FileText className="w-3.5 h-3.5" />
                            פתח טופס
                          </a>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {showButtons && (
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 pr-9">
                    {lastMessage.buttons!.map((opt, idx) => (
                      <motion.button key={opt.label} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}
                        onClick={() => {
                          if (isFollowUp) {
                            handleSearchFollowUp(opt as any);
                          } else {
                            handleInitialChoice(opt as any);
                          }
                        }}
                        className={`w-full px-4 py-3 rounded-xl border-2 font-body text-sm font-medium text-right transition-all active:scale-95 flex items-center gap-3 text-foreground ${
                          opt.icon === "search" || opt.icon === "more"
                            ? "border-teal/40 bg-teal/10 hover:border-teal/70 hover:bg-teal/20 hover:shadow-[0_0_20px_-5px_hsl(var(--teal)/0.4)]"
                            : opt.icon === "home"
                              ? "border-border bg-muted/30 hover:border-muted-foreground/30 hover:bg-muted/50"
                              : "border-gold/30 bg-gold/5 hover:border-gold/60 hover:bg-gold/15 hover:shadow-[0_0_20px_-5px_hsl(var(--gold)/0.4)]"
                        }`}
                      >
                        {getIconForButton(opt.icon)}
                        <span>{opt.label}</span>
                      </motion.button>
                    ))}
                  </motion.div>
                )}

                {isTyping && messages[messages.length - 1]?.role !== "bot" && (
                  <div className="flex gap-2">
                    <AIIcon size={28} variant="primary" />
                    <div className="bg-muted/80 border border-border/50 rounded-2xl rounded-tr-sm px-3 py-2">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-gold animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-teal animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-border/50">
                <div className="flex gap-2">
                  <input value={input} onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="חפשו שיעור, נושא, רב, עיר..."
                    disabled={isTyping}
                    className="flex-1 bg-muted/50 rounded-xl px-3 py-2.5 font-body text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-teal/30 border border-border/50 transition-all disabled:opacity-50" />
                  <button onClick={sendMessage} disabled={!input.trim() || isTyping}
                    className="w-10 h-10 rounded-xl bg-gradient-teal flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-30">
                    <Send className="w-4 h-4 text-primary-foreground" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingChatBot;
