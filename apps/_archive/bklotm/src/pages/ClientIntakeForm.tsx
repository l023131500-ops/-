import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Upload, FileText, Loader2 } from "lucide-react";
import { RequiredMark } from "@/components/ui/required-mark";

type DocItem = { label: string; required?: boolean };
type Question = { id: string; question: string; type: "yes_no" | "text" | "number"; qualifying_answer?: string; enabled?: boolean };

const FP_KEY = "bklot_intake_fp";
const getFingerprint = () => {
  let fp = localStorage.getItem(FP_KEY);
  if (!fp) { fp = crypto.randomUUID(); localStorage.setItem(FP_KEY, fp); }
  return fp;
};

const ClientIntakeForm = () => {
  const { rightId } = useParams();
  const [params] = useSearchParams();
  const emailFromLink = params.get("email") || "";
  const { toast } = useToast();
  const [right, setRight] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const [clientEmail, setClientEmail] = useState(emailFromLink);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [answers, setAnswers] = useState<Record<string, { answer: string; qualifies: boolean }>>({});
  const [uploadedDocs, setUploadedDocs] = useState<Array<{ label: string; url: string; uploaded_at: string }>>([]);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  useEffect(() => {
    if (!rightId) return;
    (async () => {
      const { data } = await supabase.from("rights_reference").select("*").eq("id", rightId).maybeSingle();
      setRight(data);
      setLoading(false);
      // Try to load existing submission for this email/fingerprint
      const fp = getFingerprint();
      const lastEmail = localStorage.getItem("bklot_intake_email") || emailFromLink;
      if (lastEmail) {
        setClientEmail(lastEmail);
        const { data: existing } = await supabase
          .from("client_intake_submissions")
          .select("*")
          .eq("right_id", rightId)
          .eq("client_email", lastEmail)
          .maybeSingle();
        if (existing) {
          setSubmissionId(existing.id);
          setClientName(existing.client_name || "");
          setClientPhone(existing.client_phone || "");
          setAnswers((existing.answers as any) || {});
          setUploadedDocs((existing.uploaded_documents as any) || []);
        }
      }
    })();
  }, [rightId, emailFromLink]);

  const docsList: DocItem[] = (right?.required_docs_list as DocItem[]) || [];
  const questions: Question[] = ((right?.qualification_questions as Question[]) || []).filter(q => q.enabled !== false);

  const evaluateQualifies = (q: Question, answer: string): boolean => {
    if (!q.qualifying_answer) return true;
    if (q.type === "yes_no") return answer.trim() === q.qualifying_answer.trim();
    if (q.type === "number") {
      const n = parseFloat(answer);
      const target = parseFloat(q.qualifying_answer);
      return !isNaN(n) && !isNaN(target) && n >= target;
    }
    return answer.trim().toLowerCase().includes(q.qualifying_answer.trim().toLowerCase());
  };

  const updateAnswer = (q: Question, value: string) => {
    setAnswers(prev => ({ ...prev, [q.id]: { answer: value, qualifies: evaluateQualifies(q, value) } }));
  };

  const persist = async (markComplete = false) => {
    if (!clientEmail.trim() || !rightId) {
      toast({ title: "חסר מייל", description: "נא להזין כתובת מייל לפני שמירה", variant: "destructive" });
      return null;
    }
    setSaving(true);
    localStorage.setItem("bklot_intake_email", clientEmail);
    const qualified = questions.filter(q => answers[q.id]?.qualifies).length;
    const score = questions.length === 0 ? "qualified" : qualified === questions.length ? "qualified" : qualified > 0 ? "partial" : "not_qualified";
    const payload: any = {
      right_id: rightId,
      right_topic_name: right?.topic_name,
      client_email: clientEmail.trim(),
      client_name: clientName.trim() || null,
      client_phone: clientPhone.trim() || null,
      browser_fingerprint: getFingerprint(),
      answers,
      uploaded_documents: uploadedDocs,
      qualification_score: score,
      is_complete: markComplete,
    };
    let id = submissionId;
    if (id) {
      await supabase.from("client_intake_submissions").update(payload).eq("id", id);
    } else {
      const { data: existing } = await supabase
        .from("client_intake_submissions")
        .select("id")
        .eq("right_id", rightId)
        .eq("client_email", clientEmail.trim())
        .maybeSingle();
      if (existing) {
        id = existing.id;
        await supabase.from("client_intake_submissions").update(payload).eq("id", id);
      } else {
        const { data: ins } = await supabase.from("client_intake_submissions").insert(payload).select("id").single();
        id = ins?.id || null;
      }
      setSubmissionId(id);
    }
    setSaving(false);
    return id;
  };

  const handleFileUpload = async (label: string, file: File) => {
    if (!clientEmail.trim()) {
      toast({ title: "הזן מייל קודם", description: "כדי שנשמור לך את המסמכים", variant: "destructive" });
      return;
    }
    setSaving(true);
    const ext = file.name.split(".").pop() || "bin";
    const path = `${rightId}/${clientEmail.trim().replace(/[^a-z0-9]/gi, "_")}/${Date.now()}-${label.replace(/\s+/g, "_")}.${ext}`;
    const { error } = await supabase.storage.from("client-intake-docs").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "שגיאה בהעלאה", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }
    const newDocs = [...uploadedDocs.filter(d => d.label !== label), { label, url: path, uploaded_at: new Date().toISOString() }];
    setUploadedDocs(newDocs);
    setSaving(false);
    toast({ title: "הקובץ הועלה", description: label });
  };

  const handleSubmit = async () => {
    const id = await persist(true);
    if (id) {
      // Also create a lead so it shows in admin leads dashboard
      await supabase.from("leads").insert({
        source: "intake-form",
        request_type: "intake",
        service_type: "intake",
        name: clientName || null,
        phone: clientPhone || null,
        email: clientEmail || null,
        selected_right: right?.topic_name || null,
        category: right?.category || null,
        details: `הוגש טופס לזכות "${right?.topic_name}". מזהה סבמישן: ${id}`,
        eligibility_score: answers && Object.values(answers).every(a => a.qualifies) ? "high" : "partial",
      } as any);
      setDone(true);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center" dir="rtl"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!right) return <div className="min-h-screen flex items-center justify-center text-muted-foreground" dir="rtl">הזכות לא נמצאה</div>;

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6" dir="rtl">
        <div className="max-w-md w-full text-center bg-card rounded-2xl border border-border p-8 shadow-lg">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">הטופס נשלח בהצלחה!</h1>
          <p className="text-muted-foreground">צוות בקלות יחזור אליך בהקדם. תודה.</p>
          <p className="text-xs text-muted-foreground mt-4">📞 02-3131500</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-6 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">{right.category}</p>
          <h1 className="text-2xl font-bold text-foreground">{right.topic_name}</h1>
          <p className="text-sm text-muted-foreground mt-2">מלא את הטופס בקצרה. הנתונים נשמרים אוטומטית - אפשר לחזור ולעדכן בכל עת.</p>
        </div>

        {/* Client identity */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <h2 className="font-bold">פרטים אישיים</h2>
          <div>
            <label className="text-xs text-muted-foreground">שם מלא</label>
            <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="שם פרטי ושם משפחה" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground flex items-center gap-0.5">מייל <RequiredMark /></label>
            <Input dir="ltr" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="email@example.com" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">טלפון</label>
            <Input dir="ltr" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="0501234567" />
          </div>
        </div>

        {/* Questionnaire */}
        {questions.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <h2 className="font-bold">שאלות זכאות</h2>
            {questions.map(q => {
              const a = answers[q.id];
              return (
                <div key={q.id} className={`rounded-lg p-3 border ${a ? (a.qualifies ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300") : "border-border"}`}>
                  <p className="text-sm font-medium mb-2">{q.question}</p>
                  {q.type === "yes_no" ? (
                    <div className="flex gap-2">
                      {["כן", "לא"].map(opt => (
                        <Button key={opt} type="button" size="sm"
                          variant={a?.answer === opt ? "default" : "outline"}
                          className={a?.answer === opt ? (opt === "כן" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700") : ""}
                          onClick={() => updateAnswer(q, opt)}>
                          {opt}
                        </Button>
                      ))}
                    </div>
                  ) : q.type === "number" ? (
                    <Input type="number" value={a?.answer || ""} onChange={e => updateAnswer(q, e.target.value)} />
                  ) : (
                    <Textarea value={a?.answer || ""} onChange={e => updateAnswer(q, e.target.value)} rows={2} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Documents */}
        {docsList.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
            <h2 className="font-bold">העלאת מסמכים</h2>
            {docsList.map((d, i) => {
              const uploaded = uploadedDocs.find(u => u.label === d.label);
              return (
                <div key={i} className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{d.label}</span>
                    {d.required && <span className="text-xs text-red-500">*</span>}
                    {uploaded && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                  </div>
                  <label className="cursor-pointer">
                    <input type="file" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(d.label, f); }} />
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">
                      <Upload className="w-3 h-3" /> {uploaded ? "החלף" : "העלה"}
                    </span>
                  </label>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-2 sticky bottom-2">
          <Button variant="outline" className="flex-1" disabled={saving} onClick={() => persist(false)}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "שמירת טיוטה"}
          </Button>
          <Button className="flex-1" disabled={saving || !clientEmail.trim()} onClick={handleSubmit}>
            שליחה סופית
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ClientIntakeForm;
