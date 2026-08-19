import { motion } from "framer-motion";
import { Users, Crown, TrendingUp, Shield, UserCheck } from "lucide-react";
import { useAdminClients } from "@/hooks/useAdminData";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function AdminDashboard() {
  const { clients, loading } = useAdminClients();

  if (loading) return <div className="p-8 text-center text-muted-foreground">טוען נתונים...</div>;

  const totalClients = clients.length;
  const premiumClients = clients.filter((c) => c.tier === "premium").length;
  const completedProfiles = clients.filter(c => c.profile_complete).length;
  const completionRate = totalClients > 0 ? Math.round((completedProfiles / totalClients) * 100) : 0;

  const cards = [
    { label: "סה״כ לקוחות", value: totalClients, icon: Users, accent: "bg-blue-500/10 text-blue-500" },
    { label: "לקוחות פרימיום", value: premiumClients, icon: Crown, accent: "bg-accent/10 text-accent" },
    { label: "פרופיל מלא", value: `${completionRate}%`, icon: TrendingUp, accent: "bg-emerald-500/10 text-emerald-500" },
    { label: "אונבורדינג הושלם", value: clients.filter(c => c.onboarding_complete).length, icon: Shield, accent: "bg-purple-500/10 text-purple-500" },
  ];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          שלום, <span className="text-destructive">מנהל</span>
        </h1>
        <p className="text-sm text-muted-foreground">סקירת מערכת כללית</p>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="glass-card-gold rounded-xl p-5">
            <div className={`p-2 rounded-lg ${card.accent} w-fit mb-3`}>
              <card.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Profile Completion Overview */}
      <motion.div variants={itemVariants} className="glass-card-gold rounded-xl p-5">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-accent" />
          השלמת פרופיל — {completedProfiles}/{totalClients} הושלמו
        </h2>
        <div className="space-y-3">
          {clients.map((client) => {
            const completion = client.profile_complete ? 100 : client.onboarding_complete ? 50 : 10;
            return (
              <div key={client.id} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent shrink-0">
                  {client.name?.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-foreground truncate">{client.name || "ללא שם"}</p>
                    <span className="text-xs font-bold text-foreground">{completion}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${completion}%`,
                        background: completion >= 80 ? "hsl(142 71% 45%)" : completion >= 50 ? "hsl(var(--gold))" : "hsl(0 72% 51%)",
                      }} />
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ${
                  client.onboarding_complete ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                }`}>
                  {client.onboarding_complete ? "הושלם" : "ממתין"}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Recent clients */}
      <motion.div variants={itemVariants} className="glass-card-gold rounded-xl p-5">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">לקוחות אחרונים</h2>
        <div className="space-y-2">
          {clients.slice(0, 5).map((client) => (
            <div key={client.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">
                  {client.name?.charAt(0) || "?"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{client.name || "ללא שם"}</p>
                  <p className="text-[10px] text-muted-foreground">{client.family_status || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                  client.tier === "premium" ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"
                }`}>
                  {client.tier === "premium" ? "⭐ פרימיום" : "סטנדרט"}
                </span>
                <span className="text-xs text-muted-foreground">₪{(client.monthly_income || 0).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
