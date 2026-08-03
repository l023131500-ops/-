import { useState } from "react";
import { motion } from "framer-motion";
import { Webhook, Play, CheckCircle2, AlertTriangle, Copy } from "lucide-react";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

interface WebhookLog {
  id: string;
  timestamp: string;
  method: string;
  payload: string;
  status: "success" | "error";
  inputType: string;
}

const samplePayloads: Record<string, string> = {
  TEXT_INPUT: JSON.stringify({
    userId: "c1",
    timestamp: new Date().toISOString(),
    inputType: "TEXT_INPUT",
    category: "auto_detect",
    rawText: "שילמתי 500 שח על אוכל",
    parsedAmount: 500,
    parsedCategory: "food",
  }, null, 2),
  AUDIO_BLOB: JSON.stringify({
    userId: "c1",
    timestamp: new Date().toISOString(),
    inputType: "AUDIO_BLOB",
    category: "auto_detect",
    audioUrl: "blob:audio/webm;base64...",
    transcription: "דלק 250 שקל",
    parsedAmount: 250,
    parsedCategory: "car",
  }, null, 2),
  STRUCTURED_DATA: JSON.stringify({
    userId: "c1",
    timestamp: new Date().toISOString(),
    inputType: "STRUCTURED_DATA",
    category: "housing",
    data: {
      type: "expense",
      amount: 4200,
      description: "שכר דירה חודשי",
      isRecurring: true,
    },
  }, null, 2),
};

export default function AdminWebhookTester() {
  const [selectedType, setSelectedType] = useState<string>("TEXT_INPUT");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [payload, setPayload] = useState(samplePayloads["TEXT_INPUT"]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    const log: WebhookLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      method: "POST",
      payload,
      status: "success",
      inputType: selectedType,
    };

    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          mode: "no-cors",
          body: payload,
        });
        log.status = "success";
      } catch {
        log.status = "error";
      }
    }

    setLogs(prev => [log, ...prev].slice(0, 20));
    setTesting(false);
  };

  const copyPayload = () => navigator.clipboard.writeText(payload);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <motion.div variants={item}>
        <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-3">
          <Webhook className="w-6 h-6 text-accent" />
          בודק Webhooks
        </h1>
        <p className="text-sm text-muted-foreground mt-1">בדקו כיצד נתונים מ-Zapier/Make נכנסים למערכת</p>
      </motion.div>

      {/* Input Type Selector */}
      <motion.div variants={item} className="flex gap-3">
        {Object.keys(samplePayloads).map(type => (
          <button key={type} onClick={() => { setSelectedType(type); setPayload(samplePayloads[type]); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
              selectedType === type ? "bg-accent/15 text-accent border border-accent/30" : "bg-secondary/50 text-muted-foreground border border-border/30 hover:border-accent/20"
            }`}>
            {type}
          </button>
        ))}
      </motion.div>

      {/* Webhook URL */}
      <motion.div variants={item} className="glass-card-gold rounded-2xl p-5 space-y-4">
        <label className="text-xs font-semibold text-muted-foreground">כתובת Webhook (אופציונלי)</label>
        <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
          placeholder="https://hooks.zapier.com/hooks/catch/..."
          dir="ltr"
          className="w-full h-10 rounded-xl bg-secondary/50 border border-border/50 px-4 text-sm text-foreground font-mono placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent/50" />
      </motion.div>

      {/* Payload Editor */}
      <motion.div variants={item} className="glass-card-gold rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/30">
          <span className="text-xs font-bold text-muted-foreground">PAYLOAD — {selectedType}</span>
          <div className="flex gap-2">
            <button onClick={copyPayload} className="p-1.5 rounded-lg hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors">
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleTest} disabled={testing}
              className="btn-clay-gold px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
              <Play className="w-3 h-3" />
              {testing ? "שולח..." : "שלח טסט"}
            </button>
          </div>
        </div>
        <textarea value={payload} onChange={e => setPayload(e.target.value)}
          dir="ltr"
          rows={12}
          className="w-full bg-transparent p-5 text-xs text-foreground/80 font-mono leading-relaxed focus:outline-none resize-none" />
      </motion.div>

      {/* Logs */}
      <motion.div variants={item} className="space-y-3">
        <h2 className="text-sm font-bold text-foreground">לוג בדיקות ({logs.length})</h2>
        {logs.length === 0 ? (
          <div className="glass-card-gold rounded-xl p-6 text-center">
            <p className="text-xs text-muted-foreground">עדיין לא בוצעו בדיקות</p>
          </div>
        ) : (
          logs.map(log => (
            <div key={log.id} className="glass-card-gold rounded-xl p-4 flex items-center gap-4">
              {log.status === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-accent/10 text-accent">{log.inputType}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString("he-IL")}</span>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                log.status === "success" ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
              }`}>
                {log.status === "success" ? "הצלחה" : "שגיאה"}
              </span>
            </div>
          ))
        )}
      </motion.div>
    </motion.div>
  );
}
