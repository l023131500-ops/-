import Layout from "@/components/Layout";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HandHeart, Send, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const RequestLesson = () => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", area: "", preferred_subject: "", preferred_times: "", notes: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("leads").insert({
      full_name: form.full_name,
      phone: form.phone,
      area: form.area,
      preferred_subject: form.preferred_subject,
      preferred_times: form.preferred_times,
      notes: form.notes,
    });
    setLoading(false);
    if (error) { toast.error("שגיאה בשליחה: " + error.message); return; }
    setSubmitted(true);
    toast.success("הפנייה נשלחה בהצלחה!");
  };

  if (submitted) return (
    <Layout><section className="py-20 bg-background"><div className="container mx-auto px-4 text-center">
      <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
      <h1 className="font-heading text-3xl font-bold text-foreground mb-4">הפנייה נשלחה בהצלחה!</h1>
      <p className="text-muted-foreground text-lg">נציג מאיגוד השיעורים ייצור איתך קשר בהקדם.</p>
    </div></section></Layout>
  );

  return (
    <Layout>
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-10">
            <HandHeart className="w-12 h-12 text-secondary mx-auto mb-4" />
            <h1 className="font-heading text-4xl font-bold text-foreground mb-4">הקם שיעור באזורך</h1>
            <p className="text-muted-foreground text-lg">מלא את הטופס ונדאג לחבר אותך עם מגיד שיעור מתאים.</p>
          </div>
          <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-8 shadow-sm border border-border space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label htmlFor="requestlesson-fullname" className="text-sm font-medium text-foreground mb-1 block">שם מלא *</label><Input id="requestlesson-fullname" required aria-required="true" placeholder="ישראל ישראלי" value={form.full_name} onChange={e => setForm(p => ({...p, full_name: e.target.value}))} /></div>
              <div><label htmlFor="requestlesson-phone" className="text-sm font-medium text-foreground mb-1 block">טלפון *</label><Input id="requestlesson-phone" required aria-required="true" type="tel" inputMode="tel" autoComplete="tel" placeholder="050-0000000" value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} /></div>
            </div>
            <div><label htmlFor="requestlesson-area" className="text-sm font-medium text-foreground mb-1 block">אזור מגורים *</label><Input id="requestlesson-area" required aria-required="true" placeholder="עיר ושכונה" value={form.area} onChange={e => setForm(p => ({...p, area: e.target.value}))} /></div>
            <div><label htmlFor="requestlesson-subject" className="text-sm font-medium text-foreground mb-1 block">נושא מועדף</label>
              <Select value={form.preferred_subject} onValueChange={v => setForm(p => ({...p, preferred_subject: v}))}>
                <SelectTrigger id="requestlesson-subject"><SelectValue placeholder="בחר נושא" /></SelectTrigger>
                <SelectContent>{["גמרא","הלכה","פרשת שבוע","דף יומי","מוסר","חסידות","אחר"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label htmlFor="requestlesson-times" className="text-sm font-medium text-foreground mb-1 block">זמנים מועדפים</label><Input id="requestlesson-times" placeholder="למשל: ערבי ראשון-רביעי, 20:00" value={form.preferred_times} onChange={e => setForm(p => ({...p, preferred_times: e.target.value}))} /></div>
            <div><label htmlFor="requestlesson-notes" className="text-sm font-medium text-foreground mb-1 block">הערות</label><Textarea id="requestlesson-notes" placeholder="ספר לנו עוד..." rows={3} value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} /></div>
            <Button type="submit" size="lg" disabled={loading} className="w-full bg-secondary text-secondary-foreground hover:bg-gold-dark text-lg py-6 rounded-xl">
              <Send className="w-5 h-5 ml-2" />{loading ? "שולח..." : "שלח פנייה"}
            </Button>
          </form>
        </div>
      </section>
    </Layout>
  );
};

export default RequestLesson;