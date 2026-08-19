import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ArrowRight, Plus, Check, Clock, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Category { id: string; name: string; parent_group: string; budget: number; spent: number; sort_order: number; }
interface Task { id: string; title: string; status: string; due_date: string | null; notes: string; show_in_calendar: boolean; }
interface Transaction { id: string; category_id: string | null; amount: number; description: string; date: string; }
interface Project { id: string; name: string; total_budget: number; spent: number; template: string; }

export default function ProjectDetailPage({ projectId, onBack }: { projectId: string; onBack: () => void }) {
  const [project, setProject] = useState<Project | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [expenseDialog, setExpenseDialog] = useState(false);
  const [expAmount, setExpAmount] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expCatId, setExpCatId] = useState("");

  const load = async () => {
    const [pRes, cRes, tRes, trRes] = await Promise.all([
      supabase.from("projects").select("*").eq("id", projectId).single(),
      supabase.from("project_categories").select("*").eq("project_id", projectId).order("sort_order"),
      supabase.from("project_tasks").select("*").eq("project_id", projectId).order("created_at"),
      supabase.from("project_transactions").select("*").eq("project_id", projectId).order("date", { ascending: false }),
    ]);
    if (pRes.data) setProject(pRes.data as any);
    if (cRes.data) setCategories(cRes.data as any);
    if (tRes.data) setTasks(tRes.data as any);
    if (trRes.data) setTransactions(trRes.data as any);
  };

  useEffect(() => { load(); }, [projectId]);

  const totalSpent = useMemo(() => transactions.reduce((s, t) => s + Number(t.amount), 0), [transactions]);
  const pct = project && project.total_budget > 0 ? (totalSpent / project.total_budget) * 100 : 0;
  const overBudget = pct > 100;

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;
    await supabase.from("project_tasks").insert({ project_id: projectId, title: newTaskTitle.trim() } as any);
    setNewTaskTitle("");
    load();
  };

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === "done" ? "pending" : "done";
    await supabase.from("project_tasks").update({ status: newStatus } as any).eq("id", task.id);
    load();
  };

  const addExpense = async () => {
    const amt = Number(expAmount);
    if (!amt) return;
    await supabase.from("project_transactions").insert({
      project_id: projectId,
      category_id: expCatId || null,
      amount: amt,
      description: expDesc,
    } as any);
    // Update project spent
    await supabase.from("projects").update({ spent: totalSpent + amt } as any).eq("id", projectId);
    if (expCatId) {
      const cat = categories.find(c => c.id === expCatId);
      if (cat) {
        await supabase.from("project_categories").update({ spent: cat.spent + amt } as any).eq("id", expCatId);
      }
    }
    setExpAmount("");
    setExpDesc("");
    setExpCatId("");
    setExpenseDialog(false);
    toast({ title: "הוצאה נרשמה" });
    load();
  };

  const grouped = useMemo(() => {
    const groups: Record<string, Category[]> = {};
    categories.forEach(c => {
      const g = c.parent_group || "כללי";
      if (!groups[g]) groups[g] = [];
      groups[g].push(c);
    });
    return groups;
  }, [categories]);

  if (!project) return <div className="p-8 text-center text-muted-foreground">טוען...</div>;

  return (
    <div dir="rtl" className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center hover:bg-accent/20 transition">
          <ArrowRight className="w-4 h-4 text-foreground" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-foreground">{project.name}</h1>
          <p className="text-xs text-muted-foreground">תקציב כולל: ₪{project.total_budget.toLocaleString()}</p>
        </div>
      </div>

      {/* Health Bar */}
      <motion.div
        className={`bento-card p-5 border-2 transition-colors ${overBudget ? "border-destructive bg-destructive/5" : "border-accent/20"}`}
        animate={overBudget ? { scale: [1, 1.01, 1] } : {}}
        transition={{ repeat: overBudget ? Infinity : 0, duration: 2 }}
      >
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-bold text-foreground">מדד בריאות התקציב</span>
          <span className={`text-lg font-black ${overBudget ? "text-destructive" : "text-accent"}`}>
            {pct.toFixed(0)}%
          </span>
        </div>
        <div className="h-4 rounded-full bg-secondary overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(pct, 100)}%` }}
            transition={{ duration: 0.8 }}
            className={`h-full rounded-full ${overBudget ? "bg-destructive" : pct > 80 ? "bg-orange-500" : "bg-accent"}`}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>הוצא: ₪{totalSpent.toLocaleString()}</span>
          <span>נותר: ₪{Math.max(0, project.total_budget - totalSpent).toLocaleString()}</span>
        </div>
        {overBudget && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mt-3 text-sm font-black text-destructive text-center">
            🚨 חריגה מהתקציב ב-₪{(totalSpent - project.total_budget).toLocaleString()}!
          </motion.p>
        )}
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Categories */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">קטגוריות</h2>
            <Dialog open={expenseDialog} onOpenChange={setExpenseDialog}>
              <DialogTrigger asChild>
                <button className="btn-clay-gold px-4 py-2 rounded-xl text-xs flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> הוצאה
                </button>
              </DialogTrigger>
              <DialogContent dir="rtl">
                <DialogHeader><DialogTitle>רישום הוצאה</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-3">
                  <select value={expCatId} onChange={e => setExpCatId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground">
                    <option value="">ללא קטגוריה</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.parent_group} → {c.name}</option>)}
                  </select>
                  <Input placeholder="סכום (₪)" type="number" value={expAmount} onChange={e => setExpAmount(e.target.value)} />
                  <Input placeholder="תיאור" value={expDesc} onChange={e => setExpDesc(e.target.value)} />
                  <button onClick={addExpense} className="btn-clay-gold w-full py-2.5 rounded-xl text-sm">שמור</button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {Object.entries(grouped).map(([group, cats]) => (
            <div key={group} className="bento-card p-4 space-y-2">
              <h3 className="text-xs font-bold text-accent uppercase tracking-wide">{group}</h3>
              {cats.map(cat => {
                const catPct = cat.budget > 0 ? (cat.spent / cat.budget) * 100 : 0;
                return (
                  <div key={cat.id} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-foreground">{cat.name}</span>
                    <span className={`text-xs font-bold ${catPct > 100 ? "text-destructive" : "text-muted-foreground"}`}>
                      ₪{cat.spent.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Tasks */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">משימות פרויקט</h2>
          <div className="flex gap-2">
            <Input placeholder="משימה חדשה..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addTask()} className="flex-1" />
            <button onClick={addTask} className="btn-clay-gold px-4 py-2 rounded-xl">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {tasks.map(task => (
              <motion.div key={task.id}
                className={`bento-card p-3 flex items-center gap-3 cursor-pointer ${task.status === "done" ? "opacity-60" : ""}`}
                onClick={() => toggleTask(task)}
                whileHover={{ scale: 1.01 }}>
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
                  task.status === "done" ? "bg-accent border-accent" : "border-border"
                }`}>
                  {task.status === "done" && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                </div>
                <span className={`text-sm flex-1 ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {task.title}
                </span>
                {task.due_date && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {task.due_date}
                  </span>
                )}
              </motion.div>
            ))}
            {tasks.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">אין משימות עדיין</p>
            )}
          </div>

          {/* Recent Transactions */}
          <h2 className="text-lg font-bold text-foreground pt-4">הוצאות אחרונות</h2>
          <div className="space-y-2">
            {transactions.slice(0, 10).map(tr => (
              <div key={tr.id} className="bento-card p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">{tr.description || "הוצאה"}</p>
                  <p className="text-[10px] text-muted-foreground">{tr.date}</p>
                </div>
                <span className="text-sm font-bold text-foreground">₪{Number(tr.amount).toLocaleString()}</span>
              </div>
            ))}
            {transactions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">אין הוצאות עדיין</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
