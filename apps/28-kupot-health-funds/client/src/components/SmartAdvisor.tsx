import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";

const SUGGESTIONS = [
  "איזו קופה מתאימה לי לנושא הזה?",
  "מה חשוב לבדוק לפני מעבר?",
  "אילו מסלולים כוללים את ההטבה?",
];

export function SmartAdvisor({
  topicId,
  topicName,
}: {
  topicId: number;
  topicName: string;
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask(q: string) {
    const query = q.trim();
    if (!query || loading) return;
    setLoading(true);
    setError("");
    setAnswer("");
    try {
      const res = await apiRequest("POST", "/api/agent", {
        topicId,
        question: query,
      });
      const data = await res.json();
      setAnswer(data.answer || "");
    } catch (e: any) {
      setError(
        "היועץ החכם אינו זמין כרגע. ניתן להשאיר פרטים דרך טופס מעבר קופה ונחזור אליך."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/[0.03] p-3">
      {!open ? (
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-primary hover:bg-primary/5"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          data-testid={`button-advisor-open-${topicId}`}
        >
          <Sparkles className="h-4 w-4" />
          שאל/י את היועץ החכם על נושא זה
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" />
            היועץ החכם — {topicName}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setQuestion(s);
                  ask(s);
                }}
                disabled={loading}
                className="rounded-full border border-primary/30 bg-background px-3 py-1 text-xs text-primary transition hover:bg-primary/10 disabled:opacity-50"
                data-testid={`chip-suggestion-${topicId}`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-end gap-2">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask(question);
                }
              }}
              rows={2}
              placeholder="כתוב/י שאלה על הנושא..."
              aria-label={`שאלה ליועץ החכם על ${topicName}`}
              className="resize-none text-sm"
              data-testid={`input-advisor-${topicId}`}
            />
            <Button
              size="icon"
              onClick={() => ask(question)}
              disabled={loading || !question.trim()}
              data-testid={`button-advisor-send-${topicId}`}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          <AnimatePresence>
            {(answer || error || loading) && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-md bg-background p-3 text-sm leading-relaxed"
                role="status"
                aria-live="polite"
                data-testid={`text-advisor-answer-${topicId}`}
              >
                {loading && (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    היועץ מנסח תשובה...
                  </span>
                )}
                {!loading && error && (
                  <span className="text-destructive">{error}</span>
                )}
                {!loading && answer && (
                  <span className="whitespace-pre-wrap">{answer}</span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-[11px] text-muted-foreground">
            המידע כללי ומבוסס על נתונים ציבוריים בלבד. לפרטים מדויקים יש לפנות
            ישירות לקופה.
          </p>
        </div>
      )}
    </div>
  );
}
