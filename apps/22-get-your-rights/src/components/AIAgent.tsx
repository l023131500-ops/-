import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

// ברירת המחדל היא ה-Edge Function של הפרויקט. בפריסה תחת more30.com הסוכן
// מתארח באותו origin (VITE_AGENT_URL=/zchuyot/api/agent), כי ה-Edge Function
// דורש LOVABLE_API_KEY שאינו זמין שם.
const CHAT_URL =
  (import.meta.env.VITE_AGENT_URL as string | undefined)?.trim() ||
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rights-agent`;

const AIAgent = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Msg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error("Failed to connect");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

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
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: "assistant", content: "מצטער, נתקלתי בבעיה. נסו שוב או התקשרו ל-02-3131500 💚" }]);
    }

    setIsLoading(false);
  };

  return (
    <>
      {/* Floating Agent Button - RIGHT side */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            /* ‎bg-primary‎ מתחת לגרדיאנט: ‎bg-gradient-*‎ הוא
               ‎background-image‎ בלבד, ולכן הכפתור נמדד כשקוף וכיתובו הלבן
               נספר מול הלבן של העמוד. */
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-primary bg-gradient-to-l from-primary to-primary/80 text-primary-foreground shadow-2xl group"
            style={{ boxShadow: "0 0 40px hsl(var(--primary) / 0.4)" }}
          >
            <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="text-right">
              <p className="font-bold text-sm leading-tight">יש לכם משהו שמעניין אותכם?</p>
              {/* ה-💬 חזר על ‎MessageCircle‎ שכבר יושב במשגר, בהפרש של כארבעים
                  פיקסל ובאותו פקד. DESIGN_STANDARD §2 אוסר אמוג׳י בממשק. */}
              <p className="text-xs text-primary-foreground">מוזמנים לדבר איתי במילים שלכם</p>
            </div>
            <span className="absolute -top-1 -left-1 w-4 h-4 bg-secondary rounded-full animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-[400px] h-[650px] max-h-[85vh] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden"
            style={{ boxShadow: "0 25px 60px -12px hsl(var(--primary) / 0.3)" }}
          >
            {/* Header */}
            <div className="bg-primary bg-gradient-to-l from-primary to-primary/80 px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-primary-foreground font-bold text-sm">הנציג של בקלות</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <p className="text-primary-foreground text-xs">מחובר ומוכן לעזור</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} aria-label="סגור" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="bg-muted rounded-2xl rounded-tr-sm p-4">
                  <p className="text-foreground text-sm leading-relaxed">
                    שלום! 👋 אני הנציג של <strong>בקלות</strong>. ספרו לי מה המצב שלכם ואני אחפש עבורכם את כל הזכויות שמגיעות לכם - מהמאגר המלא שלנו.
                    <br /><br />
                    💡 <em>נסו למשל: "אני שכיר עם 3 ילדים ואחוזי נכות"</em>
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3.5 ${
                    msg.role === "user"
                      ? "bg-primary/10 rounded-tl-sm"
                      : "bg-muted rounded-tr-sm"
                  }`}>
                    {msg.role === "user" ? (
                      <div className="flex items-start gap-2">
                        <User className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-foreground text-sm">{msg.content}</p>
                      </div>
                    ) : (
                      <div className="text-foreground text-sm leading-relaxed prose prose-sm max-w-none [&_p]:mb-1 [&_li]:mb-0.5 [&_ul]:mb-1 [&_strong]:text-primary">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-end">
                  <div className="bg-muted rounded-2xl rounded-tr-sm p-3.5">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border bg-muted/30 shrink-0">
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="ספרו לי מה מעניין אתכם..."
                  className="text-sm flex-1"
                  disabled={isLoading}
                />
                <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              <p className="text-[10px] text-muted-foreground text-center mt-2">בקלות - מיצוי זכויות חכם 💚 | טלפון 02-3131500</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIAgent;
