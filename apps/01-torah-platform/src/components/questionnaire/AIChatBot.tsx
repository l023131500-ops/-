import { useState, useRef, useEffect, useCallback } from "react";
import { Send, User, Zap } from "lucide-react";
import AIIcon from "@/components/ui/AIIcon";
import { motion, AnimatePresence } from "framer-motion";
import { UserRole } from "@/types/questionnaire";
import { toast } from "sonner";

interface Message {
  role: "bot" | "user";
  content: string;
}

interface AIChatBotProps {
  role: UserRole;
  formData: Record<string, any>;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const getInitialMessages = (role: UserRole): Message[] => {
  if (role === "teacher") {
    return [
      {
        role: "bot",
        content: "שלום! 👋 אני הסוכן החכם של מתחברים.\n\nאני כאן לעזור לך למצוא את קהל היעד המתאים ביותר לשיעורים שלך.\n\n🎯 ספר לי — מה המטרה של השיעורים שלך? האם אתה רוצה להגדיל את קהל הלומדים, להגיע לקהל חדש, או לחזק קהילה קיימת?",
      },
    ];
  }
  return [
    {
      role: "bot",
      content: "שלום! 👋 אני הסוכן החכם של מתחברים.\n\nאני כאן לעזור לך למצוא את מגיד השיעור המושלם.\n\n🎯 ספר לי — מה המטרה? האם אתה מחפש שיעור קבוע, הרצאה חד-פעמית, או אולי חברותא ללימוד משותף?",
    },
  ];
};

async function streamChat({
  messages,
  role,
  formData,
  onDelta,
  onDone,
  onError,
}: {
  messages: Message[];
  role: UserRole;
  formData: Record<string, any>;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  try {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages, role, formData }),
    });

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      onError(data.error || "שגיאה בשירות ה-AI");
      return;
    }

    if (!resp.body) { onError("No response body"); return; }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch { /* ignore */ }
      }
    }

    onDone();
  } catch (e) {
    console.error("Stream error:", e);
    onError("שגיאה בחיבור לשירות");
  }
}

const AIChatBot = ({ role, formData }: AIChatBotProps) => {
  const [messages, setMessages] = useState<Message[]>(getInitialMessages(role));
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevFormDataRef = useRef<string>("");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // React to form data changes - show what user selected
  useEffect(() => {
    const currentJson = JSON.stringify(formData);
    if (currentJson !== prevFormDataRef.current && currentJson !== "{}") {
      prevFormDataRef.current = currentJson;
      
      // Build a summary of recent changes
      const filledKeys = Object.entries(formData).filter(([, v]) => {
        if (Array.isArray(v)) return v.length > 0;
        return v && v !== "";
      });
      
      if (filledKeys.length > 0 && filledKeys.length % 3 === 0 && !isTyping) {
        // Every 3 fields, send a contextual update
        const summary = filledKeys
          .slice(-3)
          .map(([key, val]) => {
            const label = key;
            const value = Array.isArray(val) ? val.join(", ") : val;
            return `${label}: ${value}`;
          })
          .join("\n");
        
        // Don't auto-send, just show a hint
        setMessages(prev => [...prev, {
          role: "bot",
          content: `👀 אני רואה שמילאת עוד פרטים בשאלון! ממשיך לעקוב...\nתרגיש חופשי לשאול אותי שאלות על כל שלב.`
        }]);
      }
    }
  }, [formData, isTyping]);

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsTyping(true);

    let assistantContent = "";

    await streamChat({
      messages: updatedMessages,
      role,
      formData,
      onDelta: (chunk) => {
        assistantContent += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "bot" && prev.length > updatedMessages.length) {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: assistantContent } : m
            );
          }
          return [...prev.slice(0, updatedMessages.length), { role: "bot", content: assistantContent }];
        });
      },
      onDone: () => setIsTyping(false),
      onError: (error) => {
        toast.error(error);
        setIsTyping(false);
      },
    });
  };

  const quickQuestions = role === "teacher"
    ? ["מה הנושאים הכי מבוקשים?", "איך להגיע לקהל רחב?", "מה המטרה של השיעור שלי?"]
    : ["מה סוג השיעור שמתאים לי?", "איך בוחרים מגיד שיעור?", "מה המטרה של השיעור?"];

  return (
    <div className="bg-card rounded-2xl border border-border shadow-elegant overflow-hidden flex flex-col relative" style={{ height: "650px" }}>
      {/* Glow effect */}
      <div className="absolute -inset-0.5 bg-gradient-brand rounded-2xl opacity-20 blur-sm" />
      
      <div className="relative z-10 flex flex-col h-full bg-card rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="relative p-5 flex items-center gap-3 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-l from-teal/20 via-gold/10 to-magenta/20" />
          <div className="absolute inset-0 bg-card/60 backdrop-blur-sm" />
          <div className="relative z-10 flex items-center gap-3 w-full">
            <AIIcon size={44} variant="primary" />
            <div>
              <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                הסוכן החכם
                <Zap className="w-4 h-4 text-gold" />
              </h3>
              <p className="font-body text-xs text-muted-foreground">מופעל על ידי AI • רואה את מה שאתם בוחרים</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div className="flex-shrink-0">
                  {msg.role === "bot"
                    ? <AIIcon size={32} variant="primary" />
                    : <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><User className="w-4 h-4 text-foreground" /></div>}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 font-body text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "bot"
                    ? "bg-muted/80 text-foreground rounded-tr-sm border border-border/50"
                    : "bg-teal/10 text-foreground rounded-tl-sm border border-teal/20"
                }`}>
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && messages[messages.length - 1]?.role !== "bot" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <AIIcon size={32} variant="primary" />
              <div className="bg-muted/80 border border-border/50 rounded-2xl rounded-tr-sm px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-magenta animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick questions */}
        {messages.length <= 2 && (
          <div className="px-4 pb-2">
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="px-3 py-1.5 rounded-full border border-teal/20 bg-teal/5 text-teal text-xs font-body hover:bg-teal/10 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-border/50">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="שאלו אותי כל דבר..."
              disabled={isTyping}
              className="flex-1 bg-muted/50 rounded-xl px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-teal/30 border border-border/50 focus:border-teal/30 transition-all disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isTyping}
              className="w-11 h-11 rounded-xl bg-gradient-brand flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-30"
            >
              <Send className="w-4 h-4 text-background" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatBot;
