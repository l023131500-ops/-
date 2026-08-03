import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import Navbar from "@/components/Navbar";

interface FormContainerProps {
  icon: LucideIcon;
  badge: string;
  title: React.ReactNode;
  subtitle: string;
  inspirationalText?: string;
  children: React.ReactNode;
}

const FormContainer = ({ icon: Icon, badge, title, subtitle, inspirationalText, children }: FormContainerProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-28 pb-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-secondary/4 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-body mb-6">
              <Icon className="w-4 h-4" />
              {badge}
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-black text-foreground mb-4">
              {title}
            </h1>
            <p className="font-body text-lg text-muted-foreground max-w-xl mx-auto">
              {subtitle}
            </p>
            {inspirationalText && (
              <p className="font-body text-sm text-secondary mt-3 max-w-lg mx-auto italic">
                {inspirationalText}
              </p>
            )}
          </motion.div>

          <div className="max-w-2xl mx-auto">
            <div className="bg-card rounded-3xl border border-border shadow-elegant p-8 md:p-10">
              {children}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FormContainer;
