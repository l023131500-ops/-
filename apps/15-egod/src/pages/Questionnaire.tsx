import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserRole } from "@/types/questionnaire";
import RoleSelection from "@/components/questionnaire/RoleSelection";
import TeacherForm from "@/components/questionnaire/TeacherForm";
import SeekerForm from "@/components/questionnaire/SeekerForm";
import Layout from "@/components/Layout";

const Questionnaire = () => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  return (
    <Layout>
      <div className="min-h-[80vh] pt-8 pb-16">
        <AnimatePresence mode="wait">
          {!role ? (
            <motion.div key="role" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="container mx-auto px-6 py-12">
              <RoleSelection onSelect={setRole} />
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container mx-auto px-6 py-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-heading text-3xl font-bold text-foreground">
                  {role === "teacher" ? <>רישום כ<span className="text-secondary">מגיד שיעור</span></> : <>בקשת <span className="text-secondary">מגיד שיעור</span></>}
                </h2>
                <button onClick={() => { setRole(null); setFormData({}); }} className="text-muted-foreground hover:text-secondary text-sm transition-colors">
                  ← חזרה לבחירה
                </button>
              </div>
              <div className="max-w-3xl mx-auto">
                {role === "teacher" ? <TeacherForm data={formData} onChange={setFormData} /> : <SeekerForm data={formData} onChange={setFormData} />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
};

export default Questionnaire;