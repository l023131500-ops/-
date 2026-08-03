import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import {
  MessageCircle,
  X,
  Send,
  HelpCircle,
  HeartHandshake,
  Phone,
  Mail,
  Loader2,
  ChevronRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Public floating chatbot for the Bkalut marketing site.
//
// Visible only on public routes (mounted from App.tsx) and only when the
// admin has enabled it via /api/public/chatbot/config. Strict separation:
//   - never fetches /api/rights (admin-only).
//   - never renders full topic content — only short safe snippets returned
//     from /api/public/chatbot/answer.
//   - never writes to localStorage / sessionStorage / cookies — pure React state.
// ---------------------------------------------------------------------------

interface PublicChatbotConfig {
  enabled: boolean;
  intro: string;
  ctaText: string;
  closingText: string;
  contact: { phone: string; email: string; whatsapp: string };
}

interface AnswerResponse {
  answer: string;
  suggestions: Array<{ id: number; topic: string; category: string }>;
  matched: boolean;
  sensitive: boolean;
  cta: string;
}

type Mode = "menu" | "info" | "help_topic" | "help_contact" | "info_followup" | "closed";

interface ChatMessage {
  id: number;
  role: "bot" | "user";
  text: string;
  suggestions?: Array<{ id: number; topic: string; category: string }>;
  showCta?: boolean;
  options?: Array<{ label: string; value: string; testId?: string }>;
}

let msgCounter = 1;
function nextId() {
  msgCounter += 1;
  return msgCounter;
}

export default function PublicChatbot() {
  const { data: config } = useQuery<PublicChatbotConfig>({
    queryKey: ["/api/public/chatbot/config"],
  });

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("menu");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Help-flow form state
  const [helpTopic, setHelpTopic] = useState("");
  const [helpRequestType, setHelpRequestType] = useState<"info" | "reminder" | "treatment">("info");
  const [helpName, setHelpName] = useState("");
  const [helpPhone, setHelpPhone] = useState("");
  const [helpEmail, setHelpEmail] = useState("");
  const [helpMessage, setHelpMessage] = useState("");
  const [helpDone, setHelpDone] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const intro = config?.intro || "שלום! אני העוזר של ארגון בקלות.";
  const contact = config?.contact || { phone: "02-3131500", email: "l023131500@gmail.com", whatsapp: "" };

  function reset() {
    setMode("menu");
    setMessages([
      {
        id: nextId(),
        role: "bot",
        text: intro,
        options: [
          { label: "שאלות על זכויות והטבות", value: "info", testId: "chatbot-option-info" },
          { label: "סיוע מארגון בקלות", value: "help", testId: "chatbot-option-help" },
        ],
      },
    ]);
    setInput("");
    setHelpTopic("");
    setHelpRequestType("info");
    setHelpName("");
    setHelpPhone("");
    setHelpEmail("");
    setHelpMessage("");
    setHelpDone(false);
  }

  // Open => seed conversation. Avoid re-seeding while already populated.
  useEffect(() => {
    if (open && messages.length === 0) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Auto-scroll to bottom on new message.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pending, mode]);

  if (!config?.enabled) return null;

  function pushBot(text: string, extra?: Partial<ChatMessage>) {
    setMessages((m) => [...m, { id: nextId(), role: "bot", text, ...extra }]);
  }
  function pushUser(text: string) {
    setMessages((m) => [...m, { id: nextId(), role: "user", text }]);
  }

  function handleMenuChoice(value: string) {
    if (value === "info") {
      pushUser("שאלות על זכויות והטבות");
      setMode("info");
      pushBot("מצוין. כתבו לי במשפט קצר על מה תרצו לדעת — למשל קצבת ילדים, הנחה בארנונה, סיוע בריאות וכו׳.");
    } else if (value === "help") {
      pushUser("סיוע מארגון בקלות");
      setMode("help_topic");
      pushBot("בשמחה. באיזה תחום נשמח לעזור לכם? אפשר לכתוב בקצרה, או לבחור אחת מהקטגוריות הנפוצות.", {
        options: [
          { label: "בריאות", value: "topic:בריאות" },
          { label: "ילדים ומשפחה", value: "topic:ילדים ומשפחה" },
          { label: "דיור והנחות", value: "topic:דיור והנחות" },
          { label: "כספי / חובות", value: "topic:כספי" },
          { label: "אחר", value: "topic:אחר" },
        ],
      });
    }
  }

  function handleHelpTopicChoice(value: string) {
    if (value.startsWith("topic:")) {
      const t = value.slice("topic:".length);
      pushUser(t);
      setHelpTopic(t);
      setMode("help_contact");
      pushBot(
        "תודה. כדי לפתוח עבורכם פנייה אצל צוות בקלות, נשמח לקבל פרטי התקשרות, ולבחור איזה שירות מעוניינים — מידע בלבד, תזכורת לביצוע, או טיפול מלא.",
      );
    }
  }

  async function submitFreeQuestion(rawQ: string) {
    const q = rawQ.trim();
    if (!q || pending) return;
    pushUser(q);
    setInput("");
    setPending(true);
    try {
      const r = await apiRequest("POST", "/api/public/chatbot/answer", { question: q });
      const data: AnswerResponse = await r.json();
      const sensitive = data.sensitive;
      const text = sensitive
        ? `${data.answer} זהו נושא רגיש — נשמח לתת ליווי אישי דרך צוות בקלות.`
        : data.answer;
      pushBot(text, {
        suggestions: data.suggestions,
        showCta: data.matched,
      });
      setMode("info_followup");
      pushBot(data.cta || config?.ctaText || "מעניין לקבל את פרטי הנושא המלאים? אפשר לפתוח לכם פנייה ללא עלות.", {
        options: [
          { label: "כן, רוצה לקבל פרטים מלאים", value: "open_lead" },
          { label: "שאלה נוספת", value: "another" },
          { label: "סיימתי, תודה", value: "end" },
        ],
      });
    } catch (err: any) {
      pushBot("מצטערים, התרחשה תקלה זמנית. אפשר לנסות שוב או לפנות אלינו בטלפון 02-3131500.");
    } finally {
      setPending(false);
    }
  }

  function handleInfoFollowup(value: string) {
    if (value === "open_lead") {
      pushUser("רוצה לקבל פרטים מלאים");
      setHelpTopic(helpTopic || "פרטי הנושא מהשאלה הקודמת");
      setMode("help_contact");
      pushBot("מעולה. רק נצטרך פרטי קשר קצרים כדי לחזור אליכם.");
    } else if (value === "another") {
      pushUser("שאלה נוספת");
      setMode("info");
      pushBot("בבקשה, כתבו את השאלה הבאה.");
    } else if (value === "end") {
      pushUser("סיימתי, תודה");
      setMode("closed");
      pushBot(config?.closingText || "שמחנו שפנית אלינו! צוות בקלות תמיד כאן עבורך.");
    }
  }

  async function submitHelpLead() {
    if (submitting) return;
    if (!helpName.trim() || !helpPhone.trim()) {
      pushBot("כדי שנוכל לחזור אליכם נדרש לפחות שם וטלפון.");
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/public/chatbot/lead", {
        fullName: helpName.trim(),
        phone: helpPhone.trim(),
        email: helpEmail.trim() || undefined,
        topic: helpTopic || "פנייה מהבוט הציבורי",
        category: "",
        requestType: helpRequestType,
        message: helpMessage.trim() || undefined,
        page: typeof window !== "undefined" ? window.location.hash || "/" : "/",
        answers: {
          source: "chatbot",
          topic: helpTopic,
          requestType: helpRequestType,
          freeText: helpMessage,
        },
      });
      setHelpDone(true);
      setMode("closed");
      pushUser(`${helpName.trim()} · ${helpPhone.trim()}`);
      pushBot(config?.closingText || "שמחנו שפניתם! צוות בקלות יחזור אליכם בהקדם.");
    } catch (err: any) {
      pushBot("השליחה נכשלה. אפשר לנסות שוב, או לפנות אלינו ישירות בטלפון 02-3131500.");
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- Render ----------
  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          aria-label="פתיחת צ׳אט בקלות"
          data-testid="chatbot-open"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 left-5 z-50 rounded-full w-14 h-14 bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          dir="rtl"
          data-testid="chatbot-panel"
          className="fixed bottom-5 left-5 z-50 w-[min(380px,calc(100vw-2rem))] max-h-[80vh] flex flex-col rounded-2xl shadow-2xl border border-border bg-card overflow-hidden"
        >
          <header className="flex items-center justify-between gap-2 px-4 py-3 bg-sidebar text-sidebar-foreground">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-sidebar-primary/15 w-8 h-8 flex items-center justify-center">
                <MessageCircle className="w-4 h-4" />
              </span>
              <div className="text-sm">
                <div className="font-bold leading-tight">צ׳אט עזרה · ארגון בקלות</div>
                <div className="text-[11px] opacity-75">תשובות קצרות · ללא עלות</div>
              </div>
            </div>
            <button
              aria-label="סגירת צ׳אט"
              data-testid="chatbot-close"
              onClick={() => setOpen(false)}
              className="rounded p-1 hover:bg-sidebar-foreground/10"
            >
              <X className="w-4 h-4" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-background">
            {messages.map((m) => (
              <ChatBubble
                key={m.id}
                msg={m}
                onOption={(v) => {
                  if (mode === "menu") return handleMenuChoice(v);
                  if (mode === "help_topic") return handleHelpTopicChoice(v);
                  if (mode === "info_followup") return handleInfoFollowup(v);
                }}
              />
            ))}
            {pending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> הבוט חושב...
              </div>
            )}

            {mode === "help_contact" && !helpDone && (
              <HelpContactForm
                topic={helpTopic}
                setTopic={setHelpTopic}
                requestType={helpRequestType}
                setRequestType={setHelpRequestType}
                name={helpName}
                setName={setHelpName}
                phone={helpPhone}
                setPhone={setHelpPhone}
                email={helpEmail}
                setEmail={setHelpEmail}
                message={helpMessage}
                setMessage={setHelpMessage}
                submitting={submitting}
                onSubmit={submitHelpLead}
              />
            )}
          </div>

          {/* Input row — only show when in free-text question mode. */}
          {mode === "info" && (
            <form
              className="flex items-center gap-2 px-3 py-2 border-t border-border bg-card"
              onSubmit={(e) => {
                e.preventDefault();
                submitFreeQuestion(input);
              }}
            >
              <Input
                data-testid="chatbot-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="כתבו שאלה..."
                className="flex-1 text-sm"
                disabled={pending}
              />
              <Button type="submit" size="icon" disabled={pending || !input.trim()} data-testid="chatbot-send">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          )}

          {(mode === "closed" || mode === "help_contact") && (
            <div className="border-t border-border bg-card px-3 py-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <Phone className="w-3 h-3" /> {contact.phone}
                <Mail className="w-3 h-3" /> {contact.email}
              </div>
              <button
                className="underline"
                onClick={reset}
                data-testid="chatbot-restart"
              >
                התחל שיחה חדשה
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function ChatBubble({
  msg,
  onOption,
}: {
  msg: ChatMessage;
  onOption: (value: string) => void;
}) {
  const isBot = msg.role === "bot";
  return (
    <div className={`flex ${isBot ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
          isBot
            ? "bg-muted text-foreground"
            : "bg-primary text-primary-foreground"
        }`}
        data-testid={isBot ? "chatbot-bot-msg" : "chatbot-user-msg"}
      >
        <div>{msg.text}</div>
        {msg.suggestions && msg.suggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {msg.suggestions.map((s) => (
              <Badge key={s.id} variant="secondary" className="text-[10px]">
                {s.topic}
              </Badge>
            ))}
          </div>
        )}
        {msg.options && (
          <div className="mt-2 flex flex-col gap-1.5">
            {msg.options.map((opt) => (
              <button
                key={opt.value}
                className="text-right text-xs bg-background hover:bg-accent text-foreground rounded-lg px-3 py-2 border border-border flex items-center justify-between gap-2"
                onClick={() => onOption(opt.value)}
                data-testid={opt.testId || `chatbot-opt-${opt.value}`}
              >
                <span>{opt.label}</span>
                <ChevronRight className="w-3 h-3 opacity-50" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HelpContactForm(props: {
  topic: string;
  setTopic: (v: string) => void;
  requestType: "info" | "reminder" | "treatment";
  setRequestType: (v: "info" | "reminder" | "treatment") => void;
  name: string;
  setName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  message: string;
  setMessage: (v: string) => void;
  submitting: boolean;
  onSubmit: () => void;
}) {
  const requestOptions: Array<{ value: typeof props.requestType; label: string }> = [
    { value: "info", label: "מידע בלבד" },
    { value: "reminder", label: "תזכורת לביצוע" },
    { value: "treatment", label: "טיפול מלא של בקלות" },
  ];
  return (
    <Card className="p-3 mt-1 space-y-2 border border-primary/30 bg-primary/5">
      <div className="text-xs font-semibold flex items-center gap-1">
        <HeartHandshake className="w-3 h-3" /> פרטי פנייה
      </div>
      <Input
        data-testid="chatbot-help-topic"
        value={props.topic}
        onChange={(e) => props.setTopic(e.target.value)}
        placeholder="הנושא או הבקשה"
        className="text-sm"
      />
      <div className="flex flex-wrap gap-1">
        {requestOptions.map((o) => (
          <button
            key={o.value}
            data-testid={`chatbot-request-${o.value}`}
            type="button"
            onClick={() => props.setRequestType(o.value)}
            className={`text-[11px] rounded-full px-2 py-1 border ${
              props.requestType === o.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <Input
        data-testid="chatbot-help-name"
        value={props.name}
        onChange={(e) => props.setName(e.target.value)}
        placeholder="שם מלא *"
        className="text-sm"
      />
      <Input
        data-testid="chatbot-help-phone"
        value={props.phone}
        onChange={(e) => props.setPhone(e.target.value)}
        placeholder="טלפון *"
        className="text-sm"
        inputMode="tel"
      />
      <Input
        data-testid="chatbot-help-email"
        value={props.email}
        onChange={(e) => props.setEmail(e.target.value)}
        placeholder="מייל (לא חובה)"
        className="text-sm"
        inputMode="email"
      />
      <Textarea
        data-testid="chatbot-help-message"
        value={props.message}
        onChange={(e) => props.setMessage(e.target.value)}
        placeholder="פרטים נוספים (אופציונלי)"
        className="text-sm min-h-[60px]"
      />
      <Button
        type="button"
        data-testid="chatbot-help-submit"
        onClick={props.onSubmit}
        disabled={props.submitting}
        className="w-full text-sm"
      >
        {props.submitting ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin mr-1" /> שולח...
          </>
        ) : (
          <>
            <HelpCircle className="w-3 h-3 mr-1" /> שליחה לצוות בקלות
          </>
        )}
      </Button>
    </Card>
  );
}
