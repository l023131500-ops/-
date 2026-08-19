import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";

type DocItem = { label: string; required?: boolean };
type Question = { id: string; question: string; type: "yes_no" | "text" | "number"; qualifying_answer?: string; enabled?: boolean };

interface Props {
  value: {
    client_message_template?: string | null;
    required_docs_list?: DocItem[] | null;
    qualification_questions?: Question[] | null;
  };
  onChange: (patch: Partial<Props["value"]>) => void;
}

export const ClientMessageEditor = ({ value, onChange }: Props) => {
  const docs: DocItem[] = value.required_docs_list || [];
  const questions: Question[] = value.qualification_questions || [];

  const updateDoc = (i: number, patch: Partial<DocItem>) => {
    const next = [...docs];
    next[i] = { ...next[i], ...patch };
    onChange({ required_docs_list: next });
  };
  const addDoc = () => onChange({ required_docs_list: [...docs, { label: "", required: true }] });
  const removeDoc = (i: number) => onChange({ required_docs_list: docs.filter((_, idx) => idx !== i) });

  const updateQ = (i: number, patch: Partial<Question>) => {
    const next = [...questions];
    next[i] = { ...next[i], ...patch };
    onChange({ qualification_questions: next });
  };
  const addQ = () => onChange({ qualification_questions: [...questions, { id: crypto.randomUUID(), question: "", type: "yes_no", qualifying_answer: "כן", enabled: true }] });
  const removeQ = (i: number) => onChange({ qualification_questions: questions.filter((_, idx) => idx !== i) });

  return (
    <div className="border-t border-border pt-3 mt-2 space-y-4">
      <div>
        <label className="text-xs font-semibold text-blue-600 flex items-center gap-1">
          ✉️ 16. נוסח אישי לשליחה ללקוח
        </label>
        <Textarea
          value={value.client_message_template || ""}
          onChange={(e) => onChange({ client_message_template: e.target.value })}
          className="text-sm mt-1"
          rows={8}
          placeholder="ניתן להשתמש בתגיות: {client_name}, {topic_name}, {eligibility}, {documents}, {intake_link}"
          dir="rtl"
        />
        <p className="text-[10px] text-muted-foreground mt-1">תגיות זמינות: {"{client_name}"}, {"{topic_name}"}, {"{eligibility}"}, {"{documents}"}, {"{intake_link}"}</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold">📄 רשימת מסמכים נדרשים בטופס</label>
          <Button size="sm" variant="outline" type="button" onClick={addDoc} className="h-7 gap-1 text-xs">
            <Plus className="w-3 h-3" /> מסמך
          </Button>
        </div>
        <div className="space-y-1.5">
          {docs.map((d, i) => (
            <div key={i} className="flex gap-1 items-center">
              <Input value={d.label} onChange={(e) => updateDoc(i, { label: e.target.value })} placeholder="שם המסמך *" className="text-xs text-right" dir="rtl" />
              <label className="flex items-center gap-1 text-[10px] whitespace-nowrap">
                <input type="checkbox" checked={d.required !== false} onChange={(e) => updateDoc(i, { required: e.target.checked })} />
                חובה
              </label>
              <Button size="sm" variant="ghost" type="button" onClick={() => removeDoc(i)} className="h-7 w-7 p-0">
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
          {docs.length === 0 && <p className="text-[10px] text-muted-foreground">אין מסמכים. הוסף לפי הצורך.</p>}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold">❓ שאלות זכאות בטופס</label>
          <Button size="sm" variant="outline" type="button" onClick={addQ} className="h-7 gap-1 text-xs">
            <Plus className="w-3 h-3" /> שאלה
          </Button>
        </div>
        <div className="space-y-2">
          {questions.map((q, i) => (
            <div key={q.id} className="border border-border rounded-md p-2 space-y-1.5 bg-muted/20">
              <div className="flex gap-1 items-center">
                <Input value={q.question} onChange={(e) => updateQ(i, { question: e.target.value })} placeholder="נוסח השאלה *" className="text-xs text-right" dir="rtl" />
                <Button size="sm" variant="ghost" type="button" onClick={() => removeQ(i)} className="h-7 w-7 p-0">
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <div className="flex gap-1 text-[10px]">
                <select value={q.type} onChange={(e) => updateQ(i, { type: e.target.value as any })} className="border border-input rounded px-1 py-0.5 bg-background">
                  <option value="yes_no">כן/לא</option>
                  <option value="text">טקסט</option>
                  <option value="number">מספר</option>
                </select>
                <Input value={q.qualifying_answer || ""} onChange={(e) => updateQ(i, { qualifying_answer: e.target.value })}
                  placeholder={q.type === "yes_no" ? "תשובה מזכה: כן/לא" : q.type === "number" ? "מינימום מזכה" : "טקסט מזכה"} className="text-[10px] h-7" />
                <label className="flex items-center gap-1 whitespace-nowrap">
                  <input type="checkbox" checked={q.enabled !== false} onChange={(e) => updateQ(i, { enabled: e.target.checked })} />
                  פעיל
                </label>
              </div>
            </div>
          ))}
          {questions.length === 0 && <p className="text-[10px] text-muted-foreground">אין שאלות. הוסף לפי הצורך.</p>}
        </div>
      </div>
    </div>
  );
};
