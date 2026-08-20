import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, MapPin, Mail, BookOpen, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  subject: string;
  style: string;
  notes: string;
  source: "site" | "nedarim";
  created_at: string;
}

function normalize(s: string) { return (s || "").trim().toLowerCase(); }

function findMatches(teachers: Lead[], seekers: Lead[]) {
  const matches: { teacherId: string; seekerId: string; score: number; fields: string[] }[] = [];
  for (const t of teachers) {
    for (const s of seekers) {
      const fields: string[] = [];
      if (normalize(t.city) && normalize(t.city) === normalize(s.city)) fields.push("עיר");
      if (normalize(t.subject) && normalize(s.subject) && normalize(t.subject).includes(normalize(s.subject))) fields.push("נושא");
      if (normalize(t.style) && normalize(s.style) && normalize(t.style).includes(normalize(s.style))) fields.push("סגנון");
      if (fields.length >= 2) matches.push({ teacherId: t.id, seekerId: s.id, score: fields.length, fields });
    }
  }
  return matches;
}

const LeadCard = ({ lead, matchBadge }: { lead: Lead; matchBadge?: string[] }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div layout className="bg-card rounded-xl border border-border p-4 hover:border-primary/20 transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="font-display text-sm font-bold text-card-foreground">{lead.name}</h4>
            <Badge variant="outline" className="text-[10px] font-body">{lead.source === "nedarim" ? "נדרים" : "אתר"}</Badge>
            {matchBadge && (
              <Badge className="bg-gradient-teal text-primary-foreground text-[10px] font-body gap-1">
                <Sparkles className="w-3 h-3" /> התאמה: {matchBadge.join(", ")}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-body text-muted-foreground">
            {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> <span dir="ltr">{lead.phone}</span></span>}
            {lead.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {lead.city}</span>}
            {lead.subject && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {lead.subject}</span>}
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border text-xs font-body text-muted-foreground space-y-1">
          {lead.email && <p><Mail className="w-3 h-3 inline mr-1" /><span dir="ltr">{lead.email}</span></p>}
          {lead.style && <p>סגנון: {lead.style}</p>}
          {lead.notes && <p>הערות: {lead.notes}</p>}
          <p className="text-muted-foreground/60">{new Date(lead.created_at).toLocaleDateString("he-IL")}</p>
        </div>
      )}
    </motion.div>
  );
};

export default function MatchingTab() {
  const [teachers, setTeachers] = useState<Lead[]>([]);
  const [seekers, setSeekers] = useState<Lead[]>([]);

  useEffect(() => {
    const load = async () => {
      const [tRes, sRes, nRes] = await Promise.all([
        supabase.from("teacher_leads").select("*").order("created_at", { ascending: false }),
        supabase.from("seeker_leads").select("*").order("created_at", { ascending: false }),
        supabase.from("nedarim_submissions").select("*").order("created_at", { ascending: false }),
      ]);

      const tLeads: Lead[] = (tRes.data || []).map((t: any) => ({
        id: t.id, name: t.full_name, phone: t.phone || "", email: t.email || "",
        city: t.city || "", subject: (t.subjects || []).join(", "), style: t.experience || "",
        notes: t.notes || "", source: "site" as const, created_at: t.created_at,
      }));
      const sLeads: Lead[] = (sRes.data || []).map((s: any) => ({
        id: s.id, name: s.contact_name, phone: s.phone || "", email: s.email || "",
        city: s.city || "", subject: s.subject || "", style: s.lesson_type || "",
        notes: s.notes || "", source: "site" as const, created_at: s.created_at,
      }));

      // Add nedarim submissions
      for (const n of (nRes.data || [])) {
        const type = (n.submission_type || "").toLowerCase();
        const lead: Lead = {
          id: n.id, name: n.name || "", phone: n.phone || "", email: "",
          city: n.city || "", subject: n.subject || "", style: "",
          notes: n.notes || "", source: "nedarim", created_at: n.created_at,
        };
        if (type.includes("teacher")) tLeads.push(lead);
        else if (type.includes("seeker")) sLeads.push(lead);
      }

      setTeachers(tLeads);
      setSeekers(sLeads);
    };
    load();
  }, []);

  const matches = findMatches(teachers, seekers);
  const teacherMatches = new Map<string, string[]>();
  const seekerMatches = new Map<string, string[]>();
  for (const m of matches) {
    teacherMatches.set(m.teacherId, m.fields);
    seekerMatches.set(m.seekerId, m.fields);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="font-display text-lg font-bold text-card-foreground mb-4 flex items-center gap-2">
          🎤 רבנים המעוניינים להצטרף ({teachers.length})
        </h3>
        <div className="space-y-3">
          {teachers.map(t => (
            <LeadCard key={t.id} lead={t} matchBadge={teacherMatches.get(t.id)} />
          ))}
          {teachers.length === 0 && <p className="text-center font-body text-muted-foreground py-8">אין רבנים עדיין</p>}
        </div>
      </div>
      <div>
        <h3 className="font-display text-lg font-bold text-card-foreground mb-4 flex items-center gap-2">
          🔍 מחפשי שיעור ({seekers.length})
        </h3>
        <div className="space-y-3">
          {seekers.map(s => (
            <LeadCard key={s.id} lead={s} matchBadge={seekerMatches.get(s.id)} />
          ))}
          {seekers.length === 0 && <p className="text-center font-body text-muted-foreground py-8">אין בקשות עדיין</p>}
        </div>
      </div>
    </div>
  );
}
