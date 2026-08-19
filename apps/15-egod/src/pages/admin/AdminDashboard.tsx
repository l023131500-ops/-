import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, BookOpen, MessageSquare, UserCheck, Lightbulb, FileText, Building2, Mail, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    teachers: 0, teachersPending: 0, lessons: 0, leads: 0, leadsNew: 0,
    participants: 0, synagogues: 0, messages: 0, tips: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [t, tp, l, ld, ldn, p, syn, m, tips] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_approved", false),
        supabase.from("lessons").select("*", { count: "exact", head: true }),
        supabase.from("leads").select("*", { count: "exact", head: true }),
        supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("participants").select("*", { count: "exact", head: true }),
        supabase.from("synagogues").select("*", { count: "exact", head: true }),
        supabase.from("portal_messages").select("*", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("tips").select("*", { count: "exact", head: true }).eq("is_active", true),
      ]);
      setStats({
        teachers: t.count || 0, teachersPending: tp.count || 0,
        lessons: l.count || 0, leads: ld.count || 0, leadsNew: ldn.count || 0,
        participants: p.count || 0, synagogues: syn.count || 0,
        messages: m.count || 0, tips: tips.count || 0,
      });
    };
    fetchStats();
  }, []);

  const cards = [
    { icon: Users, label: "מגידי שיעורים", value: stats.teachers, sub: stats.teachersPending ? `${stats.teachersPending} ממתינים לאישור` : "", color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: BookOpen, label: "שיעורים פעילים", value: stats.lessons, sub: "", color: "text-green-500", bg: "bg-green-500/10" },
    { icon: MessageSquare, label: "לידים", value: stats.leads, sub: stats.leadsNew ? `${stats.leadsNew} חדשים` : "", color: "text-orange-500", bg: "bg-orange-500/10" },
    { icon: UserCheck, label: "משתתפים", value: stats.participants, sub: "", color: "text-purple-500", bg: "bg-purple-500/10" },
    { icon: Building2, label: "בתי כנסת", value: stats.synagogues, sub: "", color: "text-cyan-500", bg: "bg-cyan-500/10" },
    { icon: Mail, label: "פניות חדשות", value: stats.messages, sub: "", color: "text-rose-500", bg: "bg-rose-500/10" },
    { icon: Lightbulb, label: "טיפים פעילים", value: stats.tips, sub: "", color: "text-yellow-500", bg: "bg-yellow-500/10" },
  ];

  const quickActions = [
    { label: "אישור מגידי שיעור", path: "/admin/teachers", icon: UserCheck, badge: stats.teachersPending },
    { label: "ניהול לידים", path: "/admin/leads", icon: MessageSquare, badge: stats.leadsNew },
    { label: "ניהול פניות", path: "/admin/messages", icon: Mail, badge: stats.messages },
    { label: "ניהול טיפים", path: "/admin/tips", icon: Lightbulb },
    { label: "ניהול תכנים", path: "/admin/content", icon: FileText },
  ];

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2">ממשק ניהול</h1>
          <p className="text-muted-foreground">סקירה כללית של המערכת</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card, i) => (
            <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="bg-card rounded-2xl p-5 border border-border">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <span className="text-muted-foreground text-sm">{card.label}</span>
              </div>
              <p className="font-heading text-3xl font-bold text-foreground">{card.value}</p>
              {card.sub && <p className="text-xs text-orange-500 mt-1">{card.sub}</p>}
            </motion.div>
          ))}
        </div>

        <div>
          <h2 className="font-heading text-lg font-bold text-foreground mb-3">פעולות מהירות</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {quickActions.map((a) => (
              <Link key={a.path} to={a.path}
                className="bg-card border border-border rounded-xl p-4 flex items-center justify-between hover:border-secondary transition-colors">
                <div className="flex items-center gap-3">
                  <a.icon className="w-5 h-5 text-secondary" />
                  <span className="font-medium text-foreground">{a.label}</span>
                  {a.badge ? <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">{a.badge}</span> : null}
                </div>
                <ArrowLeft className="w-4 h-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;