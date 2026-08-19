import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { Heart, Home, Hammer, GraduationCap, PartyPopper, Sparkles, X, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ConditionRule {
  id: string;
  field: string;
  operator: string;
  value: number;
  value_to: number | null;
  alert_title: string;
  alert_message: string;
  category: string | null;
  tip_content: string | null;
  tip_type: string | null;
  target_segment: string | null;
}

const topicIcons: Record<string, any> = {
  wedding: PartyPopper,
  apartment: Home,
  renovation: Hammer,
  education: GraduationCap,
  health: Heart,
  general: Sparkles,
};

const topicLabels: Record<string, string> = {
  wedding: "חתונה",
  apartment: "דירה",
  renovation: "שיפוצים",
  education: "חינוך",
  health: "בריאות",
  general: "כללי",
};

const topicColors: Record<string, string> = {
  wedding: "from-pink-500/20 to-rose-500/20 border-pink-500/30 text-pink-400",
  apartment: "from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400",
  renovation: "from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400",
  education: "from-violet-500/20 to-purple-500/20 border-violet-500/30 text-violet-400",
  health: "from-emerald-500/20 to-green-500/20 border-emerald-500/30 text-emerald-400",
  general: "from-accent/20 to-accent/10 border-accent/30 text-accent",
};

export default function SpecialTipsWidget() {
  const { profile } = useApp();
  const navigate = useNavigate();
  const [matchedRules, setMatchedRules] = useState<ConditionRule[]>([]);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadRules();
  }, [profile]);

  async function loadRules() {
    const { data } = await supabase
      .from("condition_rules")
      .select("*")
      .in("tip_type", ["button", "popup", "banner"]);

    if (data) {
      // Filter rules that match user profile
      const matched = (data as ConditionRule[]).filter(rule => evaluateRule(rule, profile));
      setMatchedRules(matched);
    }
  }

  function evaluateRule(rule: ConditionRule, p: any): boolean {
    const fieldValue = getFieldValue(rule.field, p);
    if (fieldValue === null || fieldValue === undefined) return false;
    const v = rule.value;
    switch (rule.operator) {
      case ">": return fieldValue > v;
      case "<": return fieldValue < v;
      case ">=": return fieldValue >= v;
      case "<=": return fieldValue <= v;
      case "==": return fieldValue === v;
      case "!=": return fieldValue !== v;
      case "between": return rule.value_to != null && fieldValue >= v && fieldValue <= rule.value_to;
      default: return false;
    }
  }

  function getFieldValue(field: string, p: any): number | null {
    const map: Record<string, any> = {
      monthly_income: p.monthlyIncome,
      children_count: p.childrenCount,
      rent_amount: p.rentAmount,
      mortgage_monthly: p.mortgageMonthly,
      credit_card_debt: p.creditCardDebt,
      car_year: p.carYear,
    };
    const val = map[field];
    return typeof val === "number" ? val : null;
  }

  // Group by category
  const grouped = matchedRules
    .filter(r => !dismissed.has(r.id))
    .reduce((acc, rule) => {
      const cat = rule.category || "general";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(rule);
      return acc;
    }, {} as Record<string, ConditionRule[]>);

  const topics = Object.keys(grouped);
  if (topics.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-accent" />
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">טיפים מיוחדים לפי נושא</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {topics.map(topic => {
          const Icon = topicIcons[topic] || Sparkles;
          const colors = topicColors[topic] || topicColors.general;
          return (
            <motion.button
              key={topic}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setExpandedTopic(expandedTopic === topic ? null : topic)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-br border transition-all ${colors} ${expandedTopic === topic ? "ring-2 ring-accent/40" : ""}`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs font-bold">{topicLabels[topic] || topic}</span>
              <span className="text-[10px] opacity-60">({grouped[topic].length})</span>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {expandedTopic && grouped[expandedTopic] && (
          <motion.div
            key={expandedTopic}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            {grouped[expandedTopic].map(rule => (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bento-card p-4 flex items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{rule.alert_title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{rule.alert_message}</p>
                  {rule.tip_content && (
                    <p className="text-xs text-foreground/80 mt-2 leading-relaxed">{rule.tip_content}</p>
                  )}
                </div>
                <button
                  onClick={() => setDismissed(prev => new Set([...prev, rule.id]))}
                  className="p-1 rounded-lg hover:bg-secondary transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
