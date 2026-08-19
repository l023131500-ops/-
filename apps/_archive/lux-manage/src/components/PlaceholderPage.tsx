import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  icon: LucideIcon;
  description?: string;
}

export default function PlaceholderPage({ title, icon: Icon, description }: PlaceholderPageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 md:p-8 max-w-4xl mx-auto"
    >
      <div className="glass-card-gold rounded-xl p-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl gold-gradient flex items-center justify-center mx-auto shadow-lg">
          <Icon className="w-7 h-7 text-sidebar-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {description || "This section is coming soon. Stay tuned for updates."}
        </p>
      </div>
    </motion.div>
  );
}
