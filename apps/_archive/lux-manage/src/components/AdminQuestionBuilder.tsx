import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Bell, Save, HelpCircle, AlertTriangle, ChevronDown, ChevronUp, Zap, Tag, Sparkles } from "lucide-react";
import { useAdminQuestions, useConditionRules } from "@/hooks/useAdminData";
import { Button } from "@/components/ui/button";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

type QuestionType = "text" | "number" | "select" | "boolean";
type TargetSegment = "all" | "household" | "business";

interface ConditionAlert {
  field: string;
  operator: "lt" | "gt" | "between" | "eq" | "gte" | "lte" | "neq";
  value: number;
  valueTo?: number;
  alertTitle: string;
  alertMessage: string;
}

interface NewQuestion {
  text: string;
  type: QuestionType;
  options: string[];
  targetSegment: TargetSegment;
  conditionAlerts: ConditionAlert[];
  required: boolean;
}

const emptyQuestion: NewQuestion = {
  text: "", type: "text", options: [], targetSegment: "all", conditionAlerts: [], required: false,
};

const emptyAlert: ConditionAlert = {
  field: "monthlyIncome", operator: "between", value: 0, valueTo: 0, alertTitle: "", alertMessage: "",
};

// Expanded field options
const fieldOptions = [
  { value: "monthlyIncome", label: "הכנסה חודשית" },
  { value: "childrenCount", label: "מספר ילדים" },
  { value: "creditCardDebt", label: "חוב כרטיסי אשראי" },
  { value: "familyStatus", label: "מצב משפחתי" },
  { value: "residentialStatus", label: "סטטוס מגורים" },
  { value: "city", label: "עיר מגורים" },
  { value: "sector", label: "מגזר" },
  { value: "healthFund", label: "קופת חולים" },
  { value: "mortgageMonthly", label: "משכנתא חודשית" },
  { value: "rentAmount", label: "שכר דירה" },
  { value: "yearlyBonus", label: "בונוס שנתי" },
  { value: "passiveIncome", label: "הכנסה פסיבית" },
  { value: "dailyExpenses", label: "הוצאות יומיות" },
  { value: "weeklyExpenses", label: "הוצאות שבועיות" },
  { value: "monthlyFixedExpenses", label: "הוצאות קבועות חודשיות" },
  { value: "carYear", label: "שנת רכב" },
  { value: "businessDividends", label: "דיבידנדים עסקיים" },
];

// Expanded operator options
const operatorOptions = [
  { value: "lt", label: "פחות מ (<)" },
  { value: "lte", label: "פחות או שווה (≤)" },
  { value: "gt", label: "גדול מ (>)" },
  { value: "gte", label: "גדול או שווה (≥)" },
  { value: "eq", label: "שווה ל (=)" },
  { value: "neq", label: "שונה מ (≠)" },
  { value: "between", label: "בין טווח" },
];

// Rule categories
const ruleCategoryOptions = [
  { value: "rights", label: "⚖️ זכויות" },
  { value: "benefits", label: "🎁 הטבות" },
  { value: "optimization", label: "📊 ייעול" },
  { value: "alert", label: "🔔 התראה" },
  { value: "tip", label: "💡 טיפ מיוחד" },
];

// Tip type options
const tipTypeOptions = [
  { value: "alert", label: "התראה רגילה" },
  { value: "popup", label: "חלון קופץ" },
  { value: "banner", label: "באנר" },
  { value: "button", label: "כפתור פעולה" },
];

// Target topic for tips
const tipTopicOptions = [
  { value: "general", label: "כללי" },
  { value: "wedding", label: "💒 חתונה" },
  { value: "apartment", label: "🏠 דירה" },
  { value: "renovation", label: "🔨 שיפוצים" },
  { value: "savings", label: "💰 חיסכון" },
  { value: "business", label: "💼 עסקים" },
  { value: "family", label: "👨‍👩‍👧‍👦 משפחה" },
];

export default function AdminQuestionBuilder() {
  const { questions: dynamicQuestions, addQuestion: addDynamicQuestion, removeQuestion: removeDynamicQuestion } = useAdminQuestions();
  const { rules, addRule, removeRule: removeConditionRule } = useConditionRules();
  const [draft, setDraft] = useState<NewQuestion>({ ...emptyQuestion });
  const [newOption, setNewOption] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const [customFields, setCustomFields] = useState<{ value: string; label: string }[]>([]);

  const allFields = [...fieldOptions, ...customFields];

  const [ruleDraft, setRuleDraft] = useState({
    field: "monthlyIncome", operator: "between" as string, value: 0, valueTo: 0,
    alertTitle: "", alertMessage: "", targetSegment: "all" as TargetSegment,
    category: "rights", tipType: "alert", tipContent: "",
  });

  const addCustomField = () => {
    if (!newFieldLabel.trim() || !newFieldValue.trim()) return;
    setCustomFields(prev => [...prev, { value: newFieldValue.trim(), label: newFieldLabel.trim() }]);
    setNewFieldLabel(""); setNewFieldValue("");
  };

  const saveRule = () => {
    if (!ruleDraft.alertTitle.trim()) return;
    addRule({
      field: ruleDraft.field, operator: ruleDraft.operator, value: ruleDraft.value,
      value_to: ruleDraft.valueTo || null, alert_title: ruleDraft.alertTitle,
      alert_message: ruleDraft.alertMessage, target_segment: ruleDraft.targetSegment,
      category: ruleDraft.category, tip_type: ruleDraft.tipType, tip_content: ruleDraft.tipContent,
    });
    setRuleDraft({ field: "monthlyIncome", operator: "between", value: 0, valueTo: 0, alertTitle: "", alertMessage: "", targetSegment: "all", category: "rights", tipType: "alert", tipContent: "" });
  };

  const handleSave = () => {
    if (!draft.text.trim()) return;
    addDynamicQuestion({
      text: draft.text, type: draft.type,
      options: draft.type === "select" ? draft.options : [],
      target_segment: draft.targetSegment,
      condition_alerts: draft.conditionAlerts.length > 0 ? draft.conditionAlerts.map(a => ({
        field: a.field || draft.text, operator: a.operator, value: a.value, valueTo: a.valueTo,
        alertTitle: a.alertTitle, alertMessage: a.alertMessage,
      })) : [],
      required: draft.required,
    });
    setDraft({ ...emptyQuestion });
  };

  const addOption = () => {
    if (!newOption.trim()) return;
    setDraft(d => ({ ...d, options: [...d.options, newOption.trim()] }));
    setNewOption("");
  };

  const addAlert = () => {
    setDraft(d => ({ ...d, conditionAlerts: [...d.conditionAlerts, { ...emptyAlert }] }));
  };

  const updateAlert = (idx: number, updates: Partial<ConditionAlert>) => {
    setDraft(d => ({ ...d, conditionAlerts: d.conditionAlerts.map((a, i) => i === idx ? { ...a, ...updates } : a) }));
  };

  const removeAlert = (idx: number) => {
    setDraft(d => ({ ...d, conditionAlerts: d.conditionAlerts.filter((_, i) => i !== idx) }));
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <motion.div variants={item}>
        <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-3">
          <HelpCircle className="w-6 h-6 text-accent" />
          בונה שאלות וכללי התראה
        </h1>
        <p className="text-sm text-muted-foreground mt-1">צרו שאלות פרופיל, כללי התראה וכללי זכויות אוטומטיים עם פרמטרים מורחבים</p>
      </motion.div>

      {/* ─── Custom Field Builder ─── */}
      <motion.div variants={item} className="glass-card-gold rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-accent" />
          <h2 className="text-sm font-bold text-foreground">הוסף שדה סינון חדש</h2>
        </div>
        <p className="text-xs text-muted-foreground">הוסף פרמטרים נוספים מעבר לברירות המחדל (הכנסה, ילדים וכו׳)</p>
        <div className="flex gap-3">
          <input value={newFieldLabel} onChange={e => setNewFieldLabel(e.target.value)} placeholder="שם השדה (עברית)"
            className="flex-1 h-10 rounded-xl bg-secondary/50 border border-border/50 px-3 text-sm text-foreground focus:outline-none" />
          <input value={newFieldValue} onChange={e => setNewFieldValue(e.target.value)} placeholder="מזהה (אנגלית)"
            className="flex-1 h-10 rounded-xl bg-secondary/50 border border-border/50 px-3 text-sm text-foreground focus:outline-none" dir="ltr" />
          <Button onClick={addCustomField} variant="outline" size="sm" disabled={!newFieldLabel.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {customFields.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {customFields.map((f, i) => (
              <span key={i} className="px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold flex items-center gap-1.5">
                {f.label}
                <button onClick={() => setCustomFields(prev => prev.filter((_, j) => j !== i))} className="hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        )}
      </motion.div>

      {/* ─── Condition Rules Engine ─── */}
      <motion.div variants={item} className="glass-card-gold rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-accent" />
          <h2 className="text-sm font-bold text-foreground">כללי התראה אוטומטיים</h2>
        </div>
        <p className="text-xs text-muted-foreground">הגדר כללים שיפעילו משימות/התראות/טיפים אוטומטית על סמך נתוני הפרופיל</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">שדה</label>
            <select value={ruleDraft.field} onChange={e => setRuleDraft(d => ({ ...d, field: e.target.value }))}
              className="w-full h-10 rounded-xl bg-secondary/50 border border-border/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50">
              {allFields.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">אופרטור</label>
            <select value={ruleDraft.operator} onChange={e => setRuleDraft(d => ({ ...d, operator: e.target.value }))}
              className="w-full h-10 rounded-xl bg-secondary/50 border border-border/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50">
              {operatorOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">קטגוריה</label>
            <select value={ruleDraft.category} onChange={e => setRuleDraft(d => ({ ...d, category: e.target.value }))}
              className="w-full h-10 rounded-xl bg-secondary/50 border border-border/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50">
              {ruleCategoryOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input type="number" value={ruleDraft.value || ""} onChange={e => setRuleDraft(d => ({ ...d, value: Number(e.target.value) }))}
            placeholder="ערך" className="h-10 rounded-xl bg-secondary/50 border border-border/50 px-3 text-sm text-foreground focus:outline-none" />
          {ruleDraft.operator === "between" && (
            <input type="number" value={ruleDraft.valueTo || ""} onChange={e => setRuleDraft(d => ({ ...d, valueTo: Number(e.target.value) }))}
              placeholder="עד" className="h-10 rounded-xl bg-secondary/50 border border-border/50 px-3 text-sm text-foreground focus:outline-none" />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">סוג הצגה</label>
            <select value={ruleDraft.tipType} onChange={e => setRuleDraft(d => ({ ...d, tipType: e.target.value }))}
              className="w-full h-10 rounded-xl bg-secondary/50 border border-border/50 px-3 text-sm text-foreground focus:outline-none">
              {tipTypeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">קהל יעד</label>
            <select value={ruleDraft.targetSegment} onChange={e => setRuleDraft(d => ({ ...d, targetSegment: e.target.value as TargetSegment }))}
              className="w-full h-10 rounded-xl bg-secondary/50 border border-border/50 px-3 text-sm text-foreground focus:outline-none">
              <option value="all">כולם</option>
              <option value="household">משק בית בלבד</option>
              <option value="business">עסקי בלבד</option>
            </select>
          </div>
        </div>

        <input value={ruleDraft.alertTitle} onChange={e => setRuleDraft(d => ({ ...d, alertTitle: e.target.value }))}
          placeholder='כותרת (לדוגמה: "זכאות למענק עבודה")' className="w-full h-10 rounded-xl bg-secondary/50 border border-border/50 px-4 text-sm text-foreground focus:outline-none" />
        <input value={ruleDraft.alertMessage} onChange={e => setRuleDraft(d => ({ ...d, alertMessage: e.target.value }))}
          placeholder="הודעה שתוצג למשתמש..." className="w-full h-10 rounded-xl bg-secondary/50 border border-border/50 px-4 text-sm text-foreground focus:outline-none" />
        
        {(ruleDraft.tipType === "popup" || ruleDraft.tipType === "button") && (
          <textarea value={ruleDraft.tipContent} onChange={e => setRuleDraft(d => ({ ...d, tipContent: e.target.value }))}
            placeholder="תוכן הטיפ המיוחד / טקסט הכפתור..." rows={2}
            className="w-full rounded-xl bg-secondary/50 border border-border/50 px-4 py-3 text-sm text-foreground focus:outline-none resize-none" />
        )}

        <button onClick={saveRule} disabled={!ruleDraft.alertTitle.trim()}
          className="btn-clay-gold px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-40">
          <Save className="w-4 h-4" /> שמור כלל
        </button>

        {rules.length > 0 && (
          <div className="space-y-2 pt-4 border-t border-border/20">
            <p className="text-xs font-bold text-muted-foreground">כללים פעילים ({rules.length})</p>
            {rules.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/20">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-bold text-foreground">{r.alert_title}</p>
                    {r.category && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                        {ruleCategoryOptions.find(c => c.value === r.category)?.label || r.category}
                      </span>
                    )}
                    {r.tip_type && r.tip_type !== "alert" && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {tipTypeOptions.find(t => t.value === r.tip_type)?.label || r.tip_type}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {allFields.find(f => f.value === r.field)?.label || r.field}: {r.operator === "between" ? `${r.value}–${r.value_to}` : `${operatorOptions.find(o => o.value === r.operator)?.label || r.operator} ${r.value}`}
                  </p>
                </div>
                <button onClick={() => removeConditionRule(r.id)} className="text-xs text-destructive hover:underline">מחק</button>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ─── Dynamic Question Builder ─── */}
      <motion.div variants={item} className="glass-card-gold rounded-2xl p-6 space-y-5">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" /> שאלה חדשה ללקוחות
        </h2>
        <p className="text-xs text-muted-foreground">הגדר שאלות שהלקוחות יענו עליהן — על פי התשובות ניתן לקבוע קריטריונים לזכויות, הטבות וייעול</p>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">טקסט השאלה</label>
            <input value={draft.text} onChange={e => setDraft(d => ({ ...d, text: e.target.value }))}
              placeholder='לדוגמה: "האם ההכנסה שלך ירדה בעקבות המלחמה?"'
              className="w-full h-10 rounded-xl bg-secondary/50 border border-border/50 px-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/50" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">סוג שאלה</label>
              <select value={draft.type} onChange={e => setDraft(d => ({ ...d, type: e.target.value as QuestionType }))}
                className="w-full h-10 rounded-xl bg-secondary/50 border border-border/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50">
                <option value="text">טקסט חופשי</option>
                <option value="number">מספר</option>
                <option value="select">בחירה מרשימה</option>
                <option value="boolean">כן/לא</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">קהל יעד</label>
              <select value={draft.targetSegment} onChange={e => setDraft(d => ({ ...d, targetSegment: e.target.value as TargetSegment }))}
                className="w-full h-10 rounded-xl bg-secondary/50 border border-border/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50">
                <option value="all">כולם</option>
                <option value="household">משק בית בלבד</option>
                <option value="business">עסקי בלבד</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={draft.required} onChange={e => setDraft(d => ({ ...d, required: e.target.checked }))} className="rounded border-border/50" />
                <span className="text-xs font-semibold text-muted-foreground">שדה חובה</span>
              </label>
            </div>
          </div>

          {draft.type === "select" && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">אפשרויות בחירה</label>
              <div className="flex gap-2 mb-2">
                <input value={newOption} onChange={e => setNewOption(e.target.value)} onKeyDown={e => e.key === "Enter" && addOption()}
                  placeholder="הוסף אפשרות..." className="flex-1 h-9 rounded-lg bg-secondary/50 border border-border/50 px-3 text-sm text-foreground focus:outline-none" />
                <button onClick={addOption} className="btn-clay px-3 py-1 rounded-lg text-xs font-semibold text-accent border border-accent/30"><Plus className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex flex-wrap gap-2">
                {draft.options.map((opt, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold flex items-center gap-1.5">
                    {opt}
                    <button onClick={() => setDraft(d => ({ ...d, options: d.options.filter((_, j) => j !== i) }))} className="hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Condition Alerts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-accent" /> התראות מותנות
              </label>
              <button onClick={addAlert} className="btn-clay px-3 py-1 rounded-lg text-xs font-semibold text-accent border border-accent/30 flex items-center gap-1">
                <Plus className="w-3 h-3" /> הוסף תנאי
              </button>
            </div>
            <AnimatePresence>
              {draft.conditionAlerts.map((alert, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl bg-secondary/30 border border-border/30 p-4 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <select value={alert.field} onChange={e => updateAlert(idx, { field: e.target.value })}
                      className="h-9 rounded-lg bg-secondary/50 border border-border/50 px-2 text-xs text-foreground focus:outline-none">
                      {allFields.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                    <select value={alert.operator} onChange={e => updateAlert(idx, { operator: e.target.value as any })}
                      className="h-9 rounded-lg bg-secondary/50 border border-border/50 px-2 text-xs text-foreground focus:outline-none">
                      {operatorOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <input type="number" value={alert.value} onChange={e => updateAlert(idx, { value: Number(e.target.value) })}
                      placeholder="ערך" className="h-9 rounded-lg bg-secondary/50 border border-border/50 px-2 text-xs text-foreground focus:outline-none" />
                    <button onClick={() => removeAlert(idx)} className="h-9 w-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {alert.operator === "between" && (
                    <input type="number" value={alert.valueTo} onChange={e => updateAlert(idx, { valueTo: Number(e.target.value) })}
                      placeholder="עד" className="w-32 h-9 rounded-lg bg-secondary/50 border border-border/50 px-2 text-xs text-foreground focus:outline-none" />
                  )}
                  <input value={alert.alertTitle} onChange={e => updateAlert(idx, { alertTitle: e.target.value })}
                    placeholder='כותרת ההתראה' className="w-full h-9 rounded-lg bg-secondary/50 border border-border/50 px-3 text-xs text-foreground focus:outline-none" />
                  <input value={alert.alertMessage} onChange={e => updateAlert(idx, { alertMessage: e.target.value })}
                    placeholder="תוכן ההתראה..." className="w-full h-9 rounded-lg bg-secondary/50 border border-border/50 px-3 text-xs text-foreground focus:outline-none" />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <button onClick={handleSave} disabled={!draft.text.trim()}
            className="btn-clay-gold px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none">
            <Save className="w-4 h-4" /> שמור שאלה
          </button>
        </div>
      </motion.div>

      {/* Existing Questions */}
      <motion.div variants={item} className="space-y-4">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Bell className="w-4 h-4 text-accent" /> שאלות קיימות ({dynamicQuestions.length})
        </h2>
        {dynamicQuestions.length === 0 ? (
          <div className="glass-card-gold rounded-xl p-8 text-center">
            <p className="text-sm text-muted-foreground">עדיין לא נוצרו שאלות דינמיות</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dynamicQuestions.map((q) => (
              <motion.div key={q.id} layout className="glass-card-gold rounded-xl overflow-hidden">
                <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setExpanded(expanded === q.id ? null : q.id)}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                      q.target_segment === "household" ? "bg-accent/10 text-accent" : q.target_segment === "business" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                    }`}>
                      {q.target_segment === "all" ? "כולם" : q.target_segment === "household" ? "ביתי" : "עסקי"}
                    </span>
                    <p className="text-sm font-semibold text-foreground truncate">{q.text}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-semibold text-muted-foreground">{q.type}</span>
                    {expanded === q.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
                <AnimatePresence>
                  {expanded === q.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="px-4 pb-4 space-y-2">
                      {q.options?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {q.options.map((o: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px]">{o}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex justify-end">
                        <button onClick={() => removeDynamicQuestion(q.id)} className="text-xs text-destructive hover:underline flex items-center gap-1">
                          <Trash2 className="w-3 h-3" /> מחק שאלה
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
