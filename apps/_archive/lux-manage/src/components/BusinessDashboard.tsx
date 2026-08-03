import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Receipt, FileText, DollarSign, BarChart3, Plus,
  Clock, AlertTriangle, Building2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { useFinancial } from "@/contexts/FinancialContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import ExportButtons from "@/components/ExportButtons";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function BusinessDashboard() {
  const { profile } = useApp();
  const navigate = useNavigate();
  const { transactions, suppliers, tasks } = useFinancial();

  const now = new Date();
  const monthIncome = transactions
    .filter((tx) => { const d = new Date(tx.date); return tx.type === "income" && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); })
    .reduce((s, tx) => s + tx.amount, 0);
  const monthExpenses = transactions
    .filter((tx) => { const d = new Date(tx.date); return tx.type === "expense" && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); })
    .reduce((s, tx) => s + tx.amount, 0);

  const profit = monthIncome - monthExpenses;
  const margin = monthIncome > 0 ? ((profit / monthIncome) * 100).toFixed(1) : "0";
  const pendingTasks = tasks.filter((t) => t.status === "pending").length;

  const plData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const y = d.getFullYear();
    const m = d.getMonth();
    const income = transactions
      .filter((tx) => { const td = new Date(tx.date); return tx.type === "income" && td.getFullYear() === y && td.getMonth() === m; })
      .reduce((s, tx) => s + tx.amount, 0);
    const expense = transactions
      .filter((tx) => { const td = new Date(tx.date); return tx.type === "expense" && td.getFullYear() === y && td.getMonth() === m; })
      .reduce((s, tx) => s + tx.amount, 0);
    return { month: d.toLocaleDateString("he-IL", { month: "short" }), הכנסות: income, הוצאות: expense, רווח: income - expense };
  });

  const taxDeadlines = [
    { label: "דוח מע״מ חודשי", date: "2026-04-15", amount: `₪${Math.round(monthIncome * 0.17).toLocaleString()}` },
    { label: "מקדמות מס הכנסה", date: "2026-04-15", amount: "₪3,200" },
    { label: "דוח שנתי 2025", date: "2026-07-31", amount: "—" },
  ];

  const greeting = () => {
    const hour = now.getHours();
    if (hour < 12) return "בוקר טוב";
    if (hour < 17) return "צהריים טובים";
    return "ערב טוב";
  };

  const cards = [
    { label: "רווח נקי", value: `₪${profit.toLocaleString()}`, sub: `מרווח ${margin}%`, positive: profit >= 0, icon: TrendingUp },
    { label: "הכנסות עסקיות", value: `₪${monthIncome.toLocaleString()}`, sub: "החודש", positive: true, icon: DollarSign },
    { label: "הוצאות עסקיות", value: `₪${monthExpenses.toLocaleString()}`, sub: "החודש", positive: false, icon: TrendingDown },
    { label: "חשבוניות ממתינות", value: "3", sub: "₪14,500 סה״כ", positive: true, icon: FileText },
  ];

  const quickActions = [
    { label: "הוצאה עסקית", icon: Plus, cls: "btn-clay-indigo", path: "/expenses" },
    { label: "הכנסה עסקית", icon: DollarSign, cls: "btn-clay-ghost", path: "/expenses" },
    { label: "חשבונית חדשה", icon: Receipt, cls: "btn-clay-ghost", path: "/invoices" },
    { label: "דוח חודשי", icon: BarChart3, cls: "btn-clay-ghost", path: "/reports" },
  ];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="relative p-8 md:p-12 max-w-7xl mx-auto space-y-10">
      <div className="ambient-indigo w-[600px] h-[600px] top-0 end-0 -z-10" />

      {/* Header */}
      <motion.div variants={itemVariants} className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
          {greeting()}, <span className="business-accent-text">{profile.name}</span>
        </h1>
        <p className="text-muted-foreground text-sm tracking-editorial">
          מודול עסקי · רווח והפסד · {pendingTasks} משימות פתוחות
        </p>
        <div className="pt-2"><ExportButtons /></div>
      </motion.div>

      {/* Quick Actions — NOW FUNCTIONAL */}
      <motion.div variants={itemVariants}>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">פעולות מהירות</p>
        <div className="flex gap-4 flex-wrap">
          {quickActions.map((action) => (
            <button key={action.label} onClick={() => navigate(action.path)} className={`${action.cls} text-xs`}>
              <action.icon className="w-4 h-4" />
              {action.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card) => (
          <motion.div key={card.label} variants={itemVariants}
            className="bento-card-business group cursor-default hover:border-indigo/20 transition-all duration-500">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 rounded-2xl bg-indigo/8">
                <card.icon className="w-5 h-5 business-accent-text" />
              </div>
              {card.sub && (
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                  card.positive ? "bg-emerald-500/10 text-emerald-400" : "bg-destructive/10 text-destructive"
                }`}>
                  {card.sub}
                </span>
              )}
            </div>
            <p className="text-2xl font-extrabold text-foreground tracking-tight">{card.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5 tracking-wide">{card.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* P&L Chart + Tax Countdown */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <motion.div variants={itemVariants} className="lg:col-span-3 bento-card-business">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-5 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 business-accent-text" />
            רווח והפסד — 6 חודשים אחרונים
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={plData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "16px", fontSize: "11px" }}
                  formatter={(value: number) => [`₪${value.toLocaleString()}`, ""]}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="הכנסות" fill="hsl(142 71% 45%)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="הוצאות" fill="hsl(0 72% 51% / 0.7)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="lg:col-span-2 bento-card-business">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-5 flex items-center gap-2">
            <Clock className="w-4 h-4 business-accent-text" />
            לוח זמנים מס
          </h3>
          <div className="space-y-3">
            {taxDeadlines.map((deadline) => {
              const deadlineDate = new Date(deadline.date);
              const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const urgent = daysLeft <= 30;
              return (
                <div key={deadline.label} className={`p-4 rounded-2xl ${urgent ? "bg-destructive/5 border border-destructive/20" : "bg-secondary/40 border border-border/30"}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        {urgent && <AlertTriangle className="w-3 h-3 text-destructive" />}
                        {deadline.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{deadline.amount}</p>
                    </div>
                    <div className="text-left">
                      <p className={`text-xl font-extrabold ${urgent ? "text-destructive" : "business-accent-text"}`}>{daysLeft}</p>
                      <p className="text-[10px] text-muted-foreground">ימים</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Vendors + Tax Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div variants={itemVariants} className="bento-card-business">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 business-accent-text" />
            ספקים עסקיים
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-right py-3 text-muted-foreground font-medium">ספק</th>
                  <th className="text-right py-3 text-muted-foreground font-medium">קטגוריה</th>
                  <th className="text-right py-3 text-muted-foreground font-medium">שולם</th>
                  <th className="text-right py-3 text-muted-foreground font-medium">דירוג</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.slice(0, 5).map((s) => (
                  <tr key={s.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors">
                    <td className="py-3 font-bold text-foreground">{s.name}</td>
                    <td className="py-3 text-muted-foreground">{s.category}</td>
                    <td className="py-3 font-bold business-accent-text">₪{s.totalPaid.toLocaleString()}</td>
                    <td className="py-3">
                      <span className="text-accent">{"★".repeat(s.rating)}{"☆".repeat(5 - s.rating)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bento-card-business">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">סיכום מס ודיווחים</h3>
          <div className="space-y-3">
            {[
              { label: "מע״מ לתשלום (משוער)", value: `₪${Math.round(monthIncome * 0.17).toLocaleString()}`, status: "ממתין" },
              { label: "ביטוח לאומי (עצמאי)", value: "₪2,450", status: "שולם" },
              { label: "מקדמות מס הכנסה", value: "₪3,200", status: "ממתין" },
              { label: "דוח שנתי", value: "2025", status: "הוגש" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-4 rounded-2xl bg-secondary/40 border border-border/30">
                <div>
                  <p className="text-xs font-bold text-foreground">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.value}</p>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                  item.status === "שולם" || item.status === "הוגש" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                }`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
