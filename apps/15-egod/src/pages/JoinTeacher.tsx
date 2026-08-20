import Layout from "@/components/Layout";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { subjectOptions } from "@/types/questionnaire";
const subjects = subjectOptions;

const JoinTeacher = () => {
  const [submitted, setSubmitted] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [otherSubject, setOtherSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", area: "", experience: "", bio: "" });
  const toggleSubject = (s: string) => setSelectedSubjects((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const allSubjects = [...selectedSubjects, ...(otherSubject.trim() ? [`אחר: ${otherSubject.trim()}`] : [])];
    const { error } = await supabase.from("leads").insert({
      full_name: form.full_name,
      phone: form.phone,
      area: form.area,
      preferred_subject: allSubjects.join(", "),
      notes: `ניסיון: ${form.experience}\nמידע: ${form.bio}\nאימייל: ${form.email}`,
      status: "new",
      kind: "teacher_offer",
    });
    setLoading(false);
    if (error) { toast.error("שגיאה בשליחה: " + error.message); return; }
    setSubmitted(true);
    toast.success("ברוך הבא לאיגוד השיעורים!");
  };

  if (submitted) return (
    <Layout><section className="py-20 bg-background"><div className="container mx-auto px-4 text-center">
      <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
      <h1 className="font-heading text-3xl font-bold text-foreground mb-4">בקשת ההצטרפות נשלחה!</h1>
      <p className="text-muted-foreground text-lg">נבדוק את פרטיך וניצור קשר בהקדם.</p>
    </div></section></Layout>
  );

  return (
    <Layout>
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-12">
            <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-gold items-center justify-center mb-5 shadow-gold">
              <UserPlus className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">הצטרף ל<span className="text-gradient-gold">איגוד השיעורים</span></h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">מלא את הפרטים – נחזור אליך בהקדם ונפתח לך פורטל אישי עם כל הכלים.</p>
          </div>
          <form onSubmit={handleSubmit} className="bg-card rounded-3xl p-8 md:p-10 shadow-elegant border border-border space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="text-sm font-medium text-foreground mb-1 block">שם מלא *</label><Input required placeholder="הרב ישראל כהן" value={form.full_name} onChange={e => setForm(p => ({...p, full_name: e.target.value}))} /></div>
              <div><label className="text-sm font-medium text-foreground mb-1 block">טלפון *</label><Input required type="tel" inputMode="tel" autoComplete="tel" placeholder="050-0000000" value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} /></div>
            </div>
            <div><label className="text-sm font-medium text-foreground mb-1 block">דוא"ל *</label><Input required type="email" placeholder="email@example.com" dir="ltr" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} /></div>
            <div><label className="text-sm font-medium text-foreground mb-1 block">אזור פעילות *</label><Input required placeholder="עיר ושכונה" value={form.area} onChange={e => setForm(p => ({...p, area: e.target.value}))} /></div>
            <div><label className="text-sm font-medium text-foreground mb-1 block">ניסיון</label>
              <Select value={form.experience} onValueChange={v => setForm(p => ({...p, experience: v}))}>
                <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">חדש – רוצה להתחיל</SelectItem>
                  <SelectItem value="1-3">1-3 שנים</SelectItem>
                  <SelectItem value="3-10">3-10 שנים</SelectItem>
                  <SelectItem value="10+">מעל 10 שנים</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">נושאי לימוד</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {subjects.map((s) => (
                  <label key={s} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${selectedSubjects.includes(s) ? "border-secondary bg-secondary/10" : "border-border hover:border-secondary/30"}`}>
                    <Checkbox checked={selectedSubjects.includes(s)} onCheckedChange={() => toggleSubject(s)} />
                    <span className="text-sm">{s}</span>
                  </label>
                ))}
              </div>
              <div className="mt-3">
                <label className="text-sm font-medium text-foreground mb-1 block">נושא נוסף (כתיבה חופשית)</label>
                <Input value={otherSubject} onChange={(e) => setOtherSubject(e.target.value)} placeholder="למשל: מסילת ישרים, פרקי אבות..." />
              </div>
            </div>
            <div><label className="text-sm font-medium text-foreground mb-1 block">ספר לנו על עצמך</label><Textarea placeholder="ניסיון, סגנון הוראה..." rows={3} value={form.bio} onChange={e => setForm(p => ({...p, bio: e.target.value}))} /></div>
            <Button type="submit" size="lg" disabled={loading} className="w-full bg-gradient-gold text-primary font-bold hover:scale-[1.02] transition-smooth shadow-gold text-lg py-6 rounded-xl">
              <UserPlus className="w-5 h-5 ml-2" />{loading ? "שולח..." : "שלח בקשת הצטרפות"}
            </Button>
          </form>
        </div>
      </section>
    </Layout>
  );
};

export default JoinTeacher;