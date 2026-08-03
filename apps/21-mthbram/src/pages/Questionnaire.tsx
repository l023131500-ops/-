import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserRole } from "@/types/questionnaire";
import RoleSelection from "@/components/questionnaire/RoleSelection";
import TeacherForm from "@/components/questionnaire/TeacherForm";
import SeekerForm from "@/components/questionnaire/SeekerForm";
import AIChatBot from "@/components/questionnaire/AIChatBot";
import Navbar from "@/components/Navbar";

const Questionnaire = () => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  return (
    <div className="min-h-screen bg-background relative">
      <Navbar />
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-teal/3 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-magenta/3 rounded-full blur-[120px]" />
      </div>

      <div className="pt-20 relative z-10">
        <AnimatePresence mode="wait">
          {!role ? (
            <motion.div
              key="role-selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="container mx-auto px-6 py-12"
            >
              <RoleSelection onSelect={setRole} />
            </motion.div>
          ) : (
            <motion.div
              key="form-and-bot"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="container mx-auto px-6 py-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-display text-3xl font-bold text-foreground">
                  {role === "teacher" ? (
                    <>רישום כ<span className="text-gradient-brand">מגיד שיעור</span></>
                  ) : (
                    <>בקשת <span className="text-gradient-brand">מגיד שיעור</span></>
                  )}
                </h2>
                <button
                  onClick={() => { setRole(null); setFormData({}); }}
                  className="text-muted-foreground hover:text-teal font-body text-sm transition-colors"
                >
                  ← חזרה לבחירה
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="order-1">
                  {role === "teacher" ? (
                    <TeacherForm data={formData} onChange={setFormData} />
                  ) : (
                    <SeekerForm data={formData} onChange={setFormData} />
                  )}
                </div>
                <div className="order-2 lg:sticky lg:top-24 lg:self-start">
                  <AIChatBot role={role} formData={formData} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Questionnaire;
