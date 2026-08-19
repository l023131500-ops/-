import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Sparkles, User, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getPhoneError, getEmailError } from "@/lib/validation";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rights-agent`;

const LEAD_TAG_RE = /\[LEAD_FORM:([^\]]+)\]/;

const InlineLeadForm = ({ topic, onDone }: { topic: string; onDone: () => void }) => {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneErr = getPhoneError(phone);
    const emailErr = getEmailError(email);
    if (!name.trim()) { toast({ title: "נא למלא שם", variant: "destructive" }); return; }
    if (phoneErr) { toast({ title: phoneErr, variant: "destructive" }); return; }
    if (emailErr) { toast({ title: emailErr, variant: "destructive" }); return; }

    setSubmitting(true);
    const { error } = await supabase.from("leads").insert({
      source: "ai-agent",
      request_type: "topic_not_found",
      service_type: "free_info",
      name: name.trim(),
      phone: phone.replace(/\D/g, ""),
      email: email.trim(),
      selected_right: topic,
      category: "פנייה דרך הסוכן החכם",
      details: details.trim() || `המשתמש חיפש: ${topic}`,
    });
    setSubmitting(false);

    if (error) {
      toast({ title: "שגיאה בשליחה", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "✅ קיבלנו את הפנייה!", description: "נחזור אליך בהקדם 💚" });
    onDone();
  };

  return (
    <form onSubmit={submit} className="mt-3 p-3 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-2">
      <p className="text-xs font-bold text-primary mb-2">📝 השאר פרטים ונחזור אליך:</p>
      <Input value={name} onChange={e => setName(e.target.value)} placeholder="שם מלא *" className="h-9 text-sm" />
      <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="טלפון (10 ספרות) *" className="h-9 text-sm" maxLength={10} />
      <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="מייל *" type="email" className="h-9 text-sm" />
      <Textarea value={details} onChange={e => setDetails(e.target.value)} placeholder="פירוט נוסף (לא חובה)" className="text-sm min-h-[60px]" />
      <Button type="submit" disabled={submitting} className="w-full h-9 text-sm">
        {submitting ? "שולח..." : "שליחת פנייה"}
      </Button>
      <div className="flex justify-center gap-3 pt-1 text-[11px] text-muted-foreground">
        <a href="tel:02-3131500" className="flex items-center gap-1 hover:text-primary"><Phone className="w-3 h-3" /> 02-3131500</a>
        <a href="mailto:L023131500@gmail.com" className="flex items-center gap-1 hover:text-primary"><Mail className="w-3 h-3" /> מייל</a>
      </div>
    </form>
  );
};

const AssistantMessage = ({ content }: { content: string }) => {
  const [formClosed, setFormClosed] = useState(false);
  const match = content.match(LEAD_TAG_RE);
  const cleanContent = content.replace(LEAD_TAG_RE, "").trim();
  const topic = match?.[1]?.trim();

  return (
    <div className="text-foreground text-sm leading-relaxed prose prose-sm max-w-none [&_p]:mb-1 [&_li]:mb-0.5 [&_ul]:mb-1 [&_strong]:text-primary">
      <ReactMarkdown>{cleanContent}</ReactMarkdown>
      {topic && !formClosed && (
        <InlineLeadForm topic={topic} onDone={() => setFormClosed(true)} />
      )}
    </div>
  );
};

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
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-gradient-to-l from-primary to-primary/80 text-primary-foreground shadow-2xl group"
            style={{ boxShadow: "0 0 40px hsl(var(--primary) / 0.4)" }}
          >
            <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="text-right">
              <p className="font-bold text-sm leading-tight">יש לכם משהו שמעניין אותכם?</p>
              <p className="text-xs text-primary-foreground/80">מוזמנים לדבר איתי במילים שלכם 💬</p>
            </div>
            <span className="absolute -top-1 -left-1 w-4 h-4 bg-secondary rounded-full animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

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
            <div className="bg-gradient-to-l from-primary to-primary/80 px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-primary-foreground font-bold text-sm">הנציג של בקלות</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <p className="text-primary-foreground/70 text-xs">מחובר ומוכן לעזור</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

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
                      <AssistantMessage content={msg.content} />
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
