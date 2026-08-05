import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, X, ArrowRight, Search, Users, List,
  Heart, CheckCircle, Send, Sparkles, ChevronRight, ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { mainCategories, type MainCategory, type RightTopic } from "@/data/rightsData";
import FileUpload from "@/components/FileUpload";
import { validateIdNumber, validatePhone, getIdError, getPhoneError } from "@/lib/validation";

type BotStep =
  | "choose"
  | "comprehensive"
  | "comprehensive-contact"
  | "family-form"
  | "topics"
  | "topics-detail"
  | "community"
  | "success";

type SuccessType = "free" | "paid" | null;

const helpPaths = [
  {
    id: "comprehensive" as const,
    icon: Search,
    title: "׳‘׳“׳™׳§׳” ׳׳§׳™׳₪׳”",
    desc: "׳ ׳¢׳‘׳•׳¨ ׳™׳—׳“ ׳¢׳ ׳›׳ ׳”׳×׳—׳•׳׳™׳ ׳•׳ ׳׳¦׳ ׳׳” ׳׳’׳™׳¢ ׳׳",
  },
  {
    id: "family-form" as const,
    icon: Users,
    title: "׳׳₪׳™ ׳׳¦׳‘ ׳׳©׳₪׳—׳×׳™",
    desc: "׳ ׳×׳׳™׳ ׳׳× ׳”׳–׳›׳•׳™׳•׳× ׳׳׳¦׳‘ ׳”׳׳™׳©׳™ ׳©׳׳",
  },
  {
    id: "topics" as const,
    icon: List,
    title: "׳‘׳—׳™׳¨׳” ׳׳₪׳™ ׳ ׳•׳©׳׳™׳",
    desc: "׳‘׳—׳¨ ׳ ׳•׳©׳ ׳¡׳₪׳¦׳™׳₪׳™ ׳©׳׳¢׳ ׳™׳™׳ ׳׳•׳×׳",
  },
  {
    id: "community" as const,
    icon: Heart,
    title: "׳”׳¦׳˜׳¨׳₪׳•׳× ׳׳§׳”׳™׳׳”",
    desc: "׳ ׳•׳×׳ ׳™׳ ׳™׳“ ׳׳§׳”׳™׳׳” - ׳”׳¦׳˜׳¨׳₪׳• ׳׳׳™׳–׳",
  },
];

const genderOptions = ["׳–׳›׳¨", "׳ ׳§׳‘׳”", "׳׳—׳¨"];
const maritalOptions = ["׳¨׳•׳•׳§/׳”", "׳ ׳©׳•׳™/׳׳”", "׳’׳¨׳•׳©/׳”", "׳׳׳׳/׳”"];
const healthOptions = ["׳×׳§׳™׳", "׳׳•׳’׳‘׳׳•׳× ׳§׳׳”", "׳׳•׳’׳‘׳׳•׳× ׳‘׳™׳ ׳•׳ ׳™׳×", "׳׳•׳’׳‘׳׳•׳× ׳§׳©׳”"];
const economicOptions = ["׳׳¦׳‘ ׳˜׳•׳‘", "׳׳¦׳‘ ׳‘׳™׳ ׳•׳ ׳™", "׳§׳•׳©׳™ ׳›׳׳›׳׳™", "׳׳¦׳•׳§׳” ׳›׳׳›׳׳™׳×"];

// Enhanced comprehensive check questions
const comprehensiveGroups = [
  {
    title: "נ‘₪ ׳₪׳¨׳˜׳™׳ ׳׳™׳©׳™׳™׳",
    message: "׳‘׳•׳ ׳ ׳×׳—׳™׳! ׳¡׳₪׳¨ ׳׳™ ׳§׳¦׳× ׳¢׳ ׳¢׳¦׳׳ - ׳–׳” ׳™׳¢׳–׳•׳¨ ׳׳™ ׳׳׳¦׳•׳ ׳‘׳“׳™׳•׳§ ׳׳” ׳׳’׳™׳¢ ׳׳.",
    fields: [
      { key: "id_number", label: "׳×׳¢׳•׳“׳× ׳–׳”׳•׳×", type: "text", placeholder: "׳׳¡׳₪׳¨ ׳×.׳–" },
      { key: "date_of_birth", label: "׳×׳׳¨׳™׳ ׳׳™׳“׳”", type: "date" },
      { key: "gender", label: "׳׳’׳“׳¨", type: "select", options: genderOptions },
      { key: "marital", label: "׳׳¦׳‘ ׳׳©׳₪׳—׳×׳™", type: "select", options: maritalOptions },
    ],
  },
  {
    title: "נ‘« ׳‘׳/׳‘׳× ׳–׳•׳’",
    message: "׳׳ ׳׳×/׳” ׳ ׳©׳•׳™/׳׳”, ׳¡׳₪׳¨/׳™ ׳׳ ׳• ׳¢׳ ׳‘׳/׳‘׳× ׳”׳–׳•׳’ - ׳–׳” ׳¢׳©׳•׳™ ׳׳–׳›׳•׳× ׳׳×׳›׳ ׳‘׳”׳˜׳‘׳•׳× ׳ ׳•׳¡׳₪׳•׳×.",
    showIf: (answers: Record<string, string>) => answers.marital === "׳ ׳©׳•׳™/׳׳”",
    fields: [
      { key: "spouse_name", label: "׳©׳ ׳‘׳/׳‘׳× ׳”׳–׳•׳’", type: "text", placeholder: "׳©׳ ׳׳׳" },
      { key: "spouse_id_number", label: "׳×.׳– ׳‘׳/׳‘׳× ׳”׳–׳•׳’", type: "text", placeholder: "׳׳¡׳₪׳¨ ׳×.׳–" },
      { key: "spouse_employment", label: "׳×׳¢׳¡׳•׳§׳× ׳‘׳/׳‘׳× ׳”׳–׳•׳’", type: "select", options: ["׳©׳›׳™׳¨/׳”", "׳¢׳¦׳׳׳™/׳×", "׳׳ ׳¢׳•׳‘׳“/׳×", "׳’׳׳׳׳™/׳×"] },
      { key: "spouse_health", label: "׳׳¦׳‘ ׳‘׳¨׳™׳׳•׳×׳™ ׳‘׳/׳‘׳× ׳”׳–׳•׳’", type: "select", options: healthOptions },
    ],
  },
  {
    title: "נ‘¶ ׳™׳׳“׳™׳",
    message: "׳¡׳₪׳¨/׳™ ׳׳ ׳• ׳¢׳ ׳”׳™׳׳“׳™׳ - ׳™׳© ׳”׳¨׳‘׳” ׳–׳›׳•׳™׳•׳× ׳׳‘׳•׳¡׳¡׳•׳× ׳׳¡׳₪׳¨ ׳™׳׳“׳™׳ ׳•׳׳¦׳‘׳.",
    fields: [
      { key: "children_count", label: "׳׳¡׳₪׳¨ ׳™׳׳“׳™׳", type: "select", options: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10+"] },
      { key: "children_ages", label: "׳’׳™׳׳׳™ ׳”׳™׳׳“׳™׳ (׳‘׳¢׳¨׳)", type: "text", placeholder: "׳׳“׳•׳’׳׳”: 2, 5, 8" },
      { key: "children_health", label: "׳׳¦׳‘ ׳‘׳¨׳™׳׳•׳×׳™ ׳™׳׳“׳™׳", type: "select", options: ["׳›׳•׳׳ ׳‘׳¨׳™׳׳™׳", "׳™׳׳“ ׳¢׳ ׳׳•׳’׳‘׳׳•׳× ׳§׳׳”", "׳™׳׳“ ׳¢׳ ׳׳•׳’׳‘׳׳•׳× ׳׳©׳׳¢׳•׳×׳™׳×", "׳™׳׳“ ׳¢׳ ׳׳—׳׳” ׳›׳¨׳•׳ ׳™׳×"] },
    ],
  },
  {
    title: "נ’¼ ׳×׳¢׳¡׳•׳§׳” ׳•׳”׳›׳ ׳¡׳”",
    message: "׳׳¦׳•׳™׳! ׳¢׳›׳©׳™׳• ׳ ׳‘׳“׳•׳§ ׳׳× ׳׳¦׳‘ ׳”׳×׳¢׳¡׳•׳§׳” ׳©׳׳ - ׳”׳¨׳‘׳” ׳–׳›׳•׳™׳•׳× ׳×׳׳•׳™׳•׳× ׳‘׳–׳”.",
    fields: [
      { key: "employment", label: "׳¡׳˜׳˜׳•׳¡ ׳×׳¢׳¡׳•׳§׳×׳™", type: "select", options: ["׳©׳›׳™׳¨", "׳¢׳¦׳׳׳™", "׳©׳›׳™׳¨ + ׳¢׳¦׳׳׳™", "׳׳ ׳¢׳•׳‘׳“", "׳¡׳˜׳•׳“׳ ׳˜", "׳’׳׳׳׳™"] },
      { key: "economic", label: "׳׳¦׳‘ ׳›׳׳›׳׳™", type: "select", options: economicOptions },
      { key: "changed_job", label: "׳”׳—׳׳₪׳× ׳¢׳‘׳•׳“׳” ׳‘-6 ׳©׳ ׳™׳?", type: "yesno" },
      { key: "pension_check", label: "׳‘׳“׳§׳× ׳“׳׳™ ׳ ׳™׳”׳•׳ ׳‘׳₪׳ ׳¡׳™׳”?", type: "yesno" },
    ],
  },
  {
    title: "נ¥ ׳‘׳¨׳™׳׳•׳×",
    message: "׳‘׳•׳׳• ׳ ׳‘׳“׳•׳§ ׳׳× ׳”׳¦׳“ ׳”׳‘׳¨׳™׳׳•׳×׳™ - ׳™׳© ׳”׳¨׳‘׳” ׳”׳˜׳‘׳•׳× ׳©׳׳ ׳©׳™׳ ׳׳ ׳™׳•׳“׳¢׳™׳ ׳¢׳׳™׳”׳.",
    fields: [
      { key: "health", label: "׳׳¦׳‘ ׳‘׳¨׳™׳׳•׳×׳™", type: "select", options: healthOptions },
      { key: "disability_pct", label: "׳׳—׳•׳–׳™ ׳ ׳›׳•׳× ׳׳•׳›׳¨׳™׳", type: "select", options: ["׳׳™׳", "׳¢׳“ 19%", "20-49%", "50-74%", "75-89%", "90%+"] },
      { key: "chronic", label: "׳׳—׳׳” ׳›׳¨׳•׳ ׳™׳×?", type: "yesno" },
      { key: "care_needed", label: "׳¦׳•׳¨׳ ׳‘׳¢׳–׳¨׳” ׳™׳•׳׳™׳•׳׳™׳×?", type: "yesno" },
    ],
  },
  {
    title: "נ  ׳“׳™׳•׳¨ ׳•׳׳’׳•׳¨׳™׳",
    message: "׳›׳׳¢׳˜ ׳¡׳™׳™׳׳ ׳•! ׳¢׳•׳“ ׳›׳׳” ׳©׳׳׳•׳× ׳¢׳ ׳”׳׳’׳•׳¨׳™׳ ׳©׳׳.",
    fields: [
      { key: "housing", label: "׳׳¦׳‘ ׳“׳™׳•׳¨", type: "select", options: ["׳©׳•׳›׳¨", "׳‘׳¢׳ ׳“׳™׳¨׳”", "׳’׳¨ ׳¢׳ ׳”׳•׳¨׳™׳", "׳“׳™׳•׳¨ ׳¦׳™׳‘׳•׳¨׳™", "׳—׳¡׳¨ ׳“׳™׳¨׳”"] },
      { key: "periphery", label: "׳’׳¨ ׳‘׳₪׳¨׳™׳₪׳¨׳™׳”?", type: "yesno" },
      { key: "arnona_discount", label: "׳׳§׳‘׳ ׳”׳ ׳—׳” ׳‘׳׳¨׳ ׳•׳ ׳”?", type: "yesno" },
      { key: "military", label: "׳©׳™׳¨׳×׳× ׳‘׳׳™׳׳•׳׳™׳ ׳”׳©׳ ׳”?", type: "yesno" },
    ],
  },
];

const communityStyles = ["׳—׳¨׳“׳™", "׳“׳×׳™", "׳—׳¡׳™׳“׳™", "׳×׳™׳׳ ׳™", "׳‘׳ ׳™ ׳×׳•׳¨׳”", "׳¡׳₪׳¨׳“׳™", "׳׳¡׳•׳¨׳×׳™", "׳—׳™׳׳•׳ ׳™"];
const cooperationTypes = [
  "׳׳›׳™׳¨׳•׳× ׳׳•׳–׳׳•׳× ׳׳§׳”׳™׳׳”",
  "׳¡׳™׳•׳¢ ׳‘׳׳™׳¦׳•׳™ ׳–׳›׳•׳™׳•׳×",
  "׳׳™׳“׳¢ ׳׳§׳”׳™׳׳”",
  "׳”׳¨׳¦׳׳•׳× ׳•׳”׳“׳¨׳›׳•׳×",
  "׳׳™׳¨׳•׳¢׳™ ׳§׳”׳™׳׳”",
];

// Calculate eligibility score based on answers
const calculateEligibilityScore = (answers: Record<string, string>): string => {
  let score = 0;
  let total = 0;

  // Economic status
  if (answers.economic) {
    total++;
    if (answers.economic === "׳׳¦׳•׳§׳” ׳›׳׳›׳׳™׳×" || answers.economic === "׳§׳•׳©׳™ ׳›׳׳›׳׳™") score += 2;
    else if (answers.economic === "׳׳¦׳‘ ׳‘׳™׳ ׳•׳ ׳™") score += 1;
  }

  // Health
  if (answers.health) {
    total++;
    if (answers.health !== "׳×׳§׳™׳") score += 2;
  }

  // Disability
  if (answers.disability_pct && answers.disability_pct !== "׳׳™׳") {
    total++;
    score += 2;
  }

  // Children
  const childCount = parseInt(answers.children_count || "0");
  if (childCount >= 3) { total++; score += 2; }
  else if (childCount >= 1) { total++; score += 1; }

  // Children health
  if (answers.children_health && answers.children_health !== "׳›׳•׳׳ ׳‘׳¨׳™׳׳™׳") {
    total++; score += 2;
  }

  // Housing
  if (answers.housing === "׳©׳•׳›׳¨" || answers.housing === "׳—׳¡׳¨ ׳“׳™׳¨׳”") {
    total++; score += 2;
  }

  // Employment
  if (answers.employment === "׳׳ ׳¢׳•׳‘׳“") { total++; score += 2; }
  else if (answers.employment === "׳¢׳¦׳׳׳™") { total++; score += 1; }

  // Periphery
  if (answers.periphery === "׳›׳") { total++; score += 1; }

  // Military service
  if (answers.military === "׳›׳") { total++; score += 1; }

  // Changed job
  if (answers.changed_job === "׳›׳") { total++; score += 1; }

  // Chronic disease
  if (answers.chronic === "׳›׳") { total++; score += 1; }

  // Care needed
  if (answers.care_needed === "׳›׳") { total++; score += 2; }

  if (total === 0) return "unknown";
  const pct = score / (total * 2);
  if (pct >= 0.5) return "high";
  if (pct >= 0.25) return "medium";
  return "low";
};

const FloatingBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<BotStep>("choose");
  const [successType, setSuccessType] = useState<SuccessType>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Comprehensive check
  const [compGroupIdx, setCompGroupIdx] = useState(0);
  const [compAnswers, setCompAnswers] = useState<Record<string, string>>({});

  // Topics
  const [selectedCat, setSelectedCat] = useState<MainCategory | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<RightTopic | null>(null);
  const [topicAnswers, setTopicAnswers] = useState<Record<string, boolean | undefined>>({});

  // Family form
  const [familyData, setFamilyData] = useState({
    name: "", gender: "", marital: "", children_count: "0",
    health: "", economic: "", phone: "", id_number: "",
    date_of_birth: "", children_ages: "", children_health: "",
  });

  // Community form
  const [communityData, setCommunityData] = useState({
    communityName: "", city: "", location: "", style: "",
    familyCount: "", cooperation: [] as string[],
    contactName: "", contactPhone: "",
  });

  // Contact form (shared for comprehensive & topics)
  const [contactForm, setContactForm] = useState({ name: "", phone: "", details: "" });
  const [botDocUrls, setBotDocUrls] = useState<string[]>([]);

  const handleReset = () => {
    setStep("choose");
    setSuccessType(null);
    setCompGroupIdx(0);
    setCompAnswers({});
    setSelectedCat(null);
    setSelectedTopic(null);
    setTopicAnswers({});
    setContactForm({ name: "", phone: "", details: "" });
    setBotDocUrls([]);
  };

  const saveLead = async (data: Record<string, any>) => {
    const payload = { ...data };
    if (botDocUrls.length > 0) payload.document_urls = botDocUrls;

    // Deduplication: check if lead exists by id_number or phone
    const phone = payload.phone?.replace(/\D/g, '');
    const idNumber = payload.id_number?.replace(/\D/g, '');

    let existingId: string | null = null;

    if (idNumber && idNumber.length === 9) {
      const { data: found } = await supabase.from("leads").select("id").eq("id_number", idNumber).limit(1);
      if (found && found.length > 0) existingId = found[0].id;
    }

    if (!existingId && phone && phone.length === 10) {
      const { data: found } = await supabase.from("leads").select("id").eq("phone", phone).limit(1);
      if (found && found.length > 0) existingId = found[0].id;
    }

    if (existingId) {
      // Update existing lead - only add new data, don't overwrite existing
      const { data: existing } = await supabase.from("leads").select("*").eq("id", existingId).single();
      if (existing) {
        const updatePayload: Record<string, any> = {};
        for (const [key, val] of Object.entries(payload)) {
          if (key === "source") continue; // don't overwrite source
          if (val !== null && val !== undefined && val !== "") {
            if (!(existing as any)[key] || (existing as any)[key] === "" || (existing as any)[key] === null) {
              updatePayload[key] = val;
            }
          }
        }
        // Always append document_urls
        if (payload.document_urls?.length) {
          const existingDocs = (existing as any).document_urls || [];
          updatePayload.document_urls = [...existingDocs, ...payload.document_urls];
        }
        if (Object.keys(updatePayload).length > 0) {
          await supabase.from("leads").update(updatePayload as any).eq("id", existingId);
        }
        return true;
      }
    }

    // New lead
    const { error } = await supabase.from("leads").insert(payload as any);
    if (error) {
      toast({ title: "׳©׳’׳™׳׳”", description: "׳׳ ׳”׳¦׳׳—׳ ׳• ׳׳©׳׳•׳¨ ׳׳× ׳”׳₪׳¨׳˜׳™׳. ׳ ׳¡׳• ׳©׳•׳‘.", variant: "destructive" });
      return false;
    }
    return true;
  };

  // Get active groups (skip spouse group if not married)
  const activeGroups = comprehensiveGroups.filter(
    (g) => !g.showIf || g.showIf(compAnswers)
  );

  const handleCompNext = () => {
    const currentActiveIdx = activeGroups.indexOf(comprehensiveGroups[compGroupIdx]);
    // Find next active group
    let nextIdx = compGroupIdx + 1;
    while (nextIdx < comprehensiveGroups.length) {
      const group = comprehensiveGroups[nextIdx];
      if (!group.showIf || group.showIf(compAnswers)) break;
      nextIdx++;
    }
    if (nextIdx < comprehensiveGroups.length) {
      setCompGroupIdx(nextIdx);
    } else {
      setStep("comprehensive-contact");
    }
  };

  const handleCompBack = () => {
    let prevIdx = compGroupIdx - 1;
    while (prevIdx >= 0) {
      const group = comprehensiveGroups[prevIdx];
      if (!group.showIf || group.showIf(compAnswers)) break;
      prevIdx--;
    }
    if (prevIdx >= 0) setCompGroupIdx(prevIdx);
    else setStep("choose");
  };

  const handleCompSubmit = async (type: "free" | "paid") => {
    if (!contactForm.name.trim()) {
      toast({ title: "׳©׳“׳•׳× ׳—׳•׳‘׳”", description: "׳ ׳ ׳׳׳׳ ׳©׳ ׳׳׳", variant: "destructive" });
      return;
    }
    const phoneErr = getPhoneError(contactForm.phone);
    if (phoneErr) {
      toast({ title: "׳©׳’׳™׳׳” ׳‘׳˜׳׳₪׳•׳", description: phoneErr, variant: "destructive" });
      return;
    }
    if (compAnswers.id_number && !validateIdNumber(compAnswers.id_number)) {
      toast({ title: "׳©׳’׳™׳׳” ׳‘׳×.׳–", description: "׳×׳¢׳•׳“׳× ׳–׳”׳•׳× ׳—׳™׳™׳‘׳× ׳׳”׳›׳™׳ 9 ׳¡׳₪׳¨׳•׳×", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const details = comprehensiveGroups.flatMap(g =>
      g.fields.map(f => `${f.label}: ${compAnswers[f.key] || "׳׳ ׳¦׳•׳™׳"}`)
    ).join("\n");

    const eligibility = calculateEligibilityScore(compAnswers);

    const ok = await saveLead({
      source: "bot-comprehensive",
      service_type: type,
      name: contactForm.name,
      phone: contactForm.phone,
      id_number: compAnswers.id_number || null,
      date_of_birth: compAnswers.date_of_birth || null,
      spouse_name: compAnswers.spouse_name || null,
      spouse_id_number: compAnswers.spouse_id_number || null,
      spouse_health: compAnswers.spouse_health || null,
      spouse_employment: compAnswers.spouse_employment || null,
      children_count: parseInt(compAnswers.children_count || "0") || 0,
      children_ages: compAnswers.children_ages || null,
      children_health_details: compAnswers.children_health || null,
      employment_status: compAnswers.employment || null,
      disability_percentage: compAnswers.disability_pct || null,
      housing_status: compAnswers.housing || null,
      eligibility_score: eligibility,
      details: `${contactForm.details}\n\n--- ׳×׳©׳•׳‘׳•׳× ׳”׳‘׳“׳™׳§׳” ---\n${details}`,
      gender: compAnswers.gender || null,
      marital_status: compAnswers.marital || null,
      children: compAnswers.children_count || null,
      health_status: compAnswers.health || null,
      economic_status: compAnswers.economic || null,
    });
    setIsSubmitting(false);
    if (ok) { setSuccessType(type); setStep("success"); }
  };

  // Topics flow
  const handleTopicSubmit = async (type: "free" | "paid") => {
    if (!contactForm.name.trim()) {
      toast({ title: "׳©׳“׳•׳× ׳—׳•׳‘׳”", description: "׳ ׳ ׳׳׳׳ ׳©׳ ׳׳׳", variant: "destructive" });
      return;
    }
    const phoneErr = getPhoneError(contactForm.phone);
    if (phoneErr) {
      toast({ title: "׳©׳’׳™׳׳” ׳‘׳˜׳׳₪׳•׳", description: phoneErr, variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const qDetails = selectedTopic?.questions
      .map((q, i) => `${q}: ${topicAnswers[`q${i}`] === true ? "׳›׳" : topicAnswers[`q${i}`] === false ? "׳׳" : "׳׳ ׳¢׳ ׳”"}`)
      .join("\n") || "";

    // Calculate topic eligibility based on yes answers
    const yesCount = Object.values(topicAnswers).filter(v => v === true).length;
    const totalQ = selectedTopic?.questions.length || 1;
    const eligibility = yesCount / totalQ >= 0.6 ? "high" : yesCount / totalQ >= 0.3 ? "medium" : "low";

    const ok = await saveLead({
      source: "bot-topics",
      service_type: type,
      name: contactForm.name,
      phone: contactForm.phone,
      details: `${contactForm.details}\n\n--- ׳©׳׳׳•׳× ׳–׳›׳׳•׳× ---\n${qDetails}`,
      category: selectedCat?.label || null,
      selected_right: selectedTopic?.label || null,
      eligibility_score: eligibility,
    });
    setIsSubmitting(false);
    if (ok) { setSuccessType(type); setStep("success"); }
  };

  const handleFamilySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyData.name.trim()) {
      toast({ title: "׳©׳“׳•׳× ׳—׳•׳‘׳”", description: "׳ ׳ ׳׳׳׳ ׳©׳ ׳׳׳", variant: "destructive" });
      return;
    }
    const phoneErr = getPhoneError(familyData.phone);
    if (phoneErr) {
      toast({ title: "׳©׳’׳™׳׳” ׳‘׳˜׳׳₪׳•׳", description: phoneErr, variant: "destructive" });
      return;
    }
    if (familyData.id_number && !validateIdNumber(familyData.id_number)) {
      toast({ title: "׳©׳’׳™׳׳” ׳‘׳×.׳–", description: "׳×׳¢׳•׳“׳× ׳–׳”׳•׳× ׳—׳™׳™׳‘׳× ׳׳”׳›׳™׳ 9 ׳¡׳₪׳¨׳•׳×", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const ok = await saveLead({
      source: "bot-family",
      name: familyData.name, phone: familyData.phone,
      id_number: familyData.id_number || null,
      date_of_birth: familyData.date_of_birth || null,
      gender: familyData.gender, marital_status: familyData.marital,
      children: familyData.children_count, health_status: familyData.health,
      economic_status: familyData.economic,
      children_count: parseInt(familyData.children_count) || 0,
      children_ages: familyData.children_ages || null,
      children_health_details: familyData.children_health || null,
    });
    setIsSubmitting(false);
    if (ok) setStep("success");
  };

  const handleCommunitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const ok = await saveLead({
      source: "bot-community",
      name: communityData.contactName, phone: communityData.contactPhone,
      details: `׳§׳”׳™׳׳”: ${communityData.communityName} | ׳¢׳™׳¨: ${communityData.city} | ׳׳™׳§׳•׳: ${communityData.location} | ׳¡׳’׳ ׳•׳: ${communityData.style} | ׳׳©׳₪׳—׳•׳×: ${communityData.familyCount} | ׳©׳™׳×׳•׳£ ׳₪׳¢׳•׳׳”: ${communityData.cooperation.join(", ")}`,
      category: "community",
    });
    setIsSubmitting(false);
    if (ok) setStep("success");
  };

  const toggleCooperation = (item: string) => {
    setCommunityData((prev) => ({
      ...prev,
      cooperation: prev.cooperation.includes(item)
        ? prev.cooperation.filter((c) => c !== item)
        : [...prev.cooperation, item],
    }));
  };

  const stepVariants = {
    initial: { opacity: 0, x: 40 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
  };

  const currentGroup = comprehensiveGroups[compGroupIdx];
  const activeGroupIndex = activeGroups.indexOf(currentGroup);

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            /* ׳׳™׳™׳§׳•׳ ׳‘׳׳‘׳“, ׳‘׳׳™ ׳˜׳§׳¡׳˜ ׳•׳‘׳׳™ aria-label ג€” ׳§׳•׳¨׳ ׳׳¡׳ ׳”׳›׳¨׳™׳– "׳׳—׳¦׳"
               ׳•׳×׳• ׳׳, ׳•׳–׳” ׳”-ג€button-nameג€ ׳©׳ ׳›׳©׳ ׳‘-Lighthouse. */
            aria-label="׳₪׳×׳™׳—׳× ׳‘׳•׳“׳§ ׳”׳–׳›׳•׳™׳•׳×"
            className="fixed bottom-6 left-6 z-50 w-16 h-16 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center"
            style={{ boxShadow: "0 0 30px hsl(var(--primary) / 0.5)" }}
          >
            <MessageCircle className="w-7 h-7" aria-hidden="true" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-secondary rounded-full animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 left-6 z-50 w-[380px] h-[620px] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden"
            style={{ boxShadow: "0 25px 60px -12px hsl(var(--primary) / 0.3)" }}
          >
            {/* Header */}
            <div className="bg-primary px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-primary-foreground font-bold text-sm">׳”׳¡׳•׳›׳ ׳”׳—׳›׳ ׳©׳ ׳‘׳§׳׳•׳×</h3>
                  <p className="text-primary-foreground text-xs">׳׳™׳¦׳•׳™ ׳–׳›׳•׳™׳•׳× ׳׳™׳©׳™</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4">
              <AnimatePresence mode="wait">
                {/* Choose */}
                {step === "choose" && (
                  <motion.div key="choose" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }}>
                    <BotMessage>
                      ׳©׳׳•׳! נ‘‹ ׳׳ ׳™ ׳›׳׳ ׳›׳“׳™ ׳׳¢׳–׳•׳¨ ׳׳ <strong>׳׳׳¦׳•׳× ׳׳× ׳›׳ ׳”׳–׳›׳•׳™׳•׳×</strong> ׳©׳׳’׳™׳¢׳•׳× ׳׳.
                      <br /><br />
                      ׳׳™׳ ׳ ׳×׳—׳™׳? נ˜
                    </BotMessage>
                    <div className="space-y-2.5 mt-4">
                      {helpPaths.map((path) => (
                        <motion.button
                          key={path.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setStep(path.id)}
                          className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border hover:border-primary/40 hover:shadow-md transition-all text-right"
                        >
                          <div className={`w-10 h-10 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15 flex items-center justify-center shrink-0`}>
                            <path.icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-foreground text-sm">{path.title}</p>
                            <p className="text-muted-foreground text-xs mt-0.5">{path.desc}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 rotate-180" />
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Comprehensive - Question Groups */}
                {step === "comprehensive" && (
                  <motion.div key={`comp-${compGroupIdx}`} variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }}>
                    <BotMessage>{currentGroup.message}</BotMessage>

                    <div className="mt-3 mb-3 flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{currentGroup.title}</span>
                      <span className="text-xs text-muted-foreground">{activeGroupIndex + 1}/{activeGroups.length}</span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-muted rounded-full mb-4">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${((activeGroupIndex + 1) / activeGroups.length) * 100}%` }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>

                    <div className="space-y-3">
                      {currentGroup.fields.map((field) => (
                        <div key={field.key}>
                          <label className="text-xs font-medium text-foreground mb-1.5 block">
                            {field.label} {field.key === "id_number" || field.key === "date_of_birth" ? <span className="text-destructive">*</span> : ""}
                          </label>
                          {field.type === "text" && (
                            <Input
                              value={compAnswers[field.key] || ""}
                              onChange={(e) => setCompAnswers({ ...compAnswers, [field.key]: e.target.value })}
                              placeholder={(field as any).placeholder || ""}
                              className="text-sm"
                            />
                          )}
                          {field.type === "date" && (
                            <Input
                              type="date"
                              value={compAnswers[field.key] || ""}
                              onChange={(e) => setCompAnswers({ ...compAnswers, [field.key]: e.target.value })}
                              className="text-sm"
                              dir="ltr"
                            />
                          )}
                          {field.type === "select" && (
                            <select
                              value={compAnswers[field.key] || ""}
                              onChange={(e) => setCompAnswers({ ...compAnswers, [field.key]: e.target.value })}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <option value="">׳‘׳—׳¨...</option>
                              {field.options!.map((o) => (
                                <option key={o} value={o}>{o}</option>
                              ))}
                            </select>
                          )}
                          {field.type === "yesno" && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setCompAnswers({ ...compAnswers, [field.key]: "׳›׳" })}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                                  compAnswers[field.key] === "׳›׳"
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "bg-muted text-muted-foreground hover:bg-primary/10"
                                }`}
                              >
                                ג“ ׳›׳
                              </button>
                              <button
                                type="button"
                                onClick={() => setCompAnswers({ ...compAnswers, [field.key]: "׳׳" })}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                                  compAnswers[field.key] === "׳׳"
                                    ? "bg-destructive/80 text-white shadow-sm"
                                    : "bg-muted text-muted-foreground hover:bg-destructive/10"
                                }`}
                              >
                                ג— ׳׳
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 mt-5">
                      <Button variant="ghost" size="sm" onClick={handleCompBack} className="gap-1">
                        <ArrowRight className="w-3 h-3" /> ׳—׳–׳¨׳”
                      </Button>
                      <Button onClick={handleCompNext} className="flex-1 gap-1">
                        {activeGroupIndex < activeGroups.length - 1 ? "׳”׳׳©׳" : "׳¡׳™׳•׳ ׳”׳‘׳“׳™׳§׳”"}
                        <ChevronLeft className="w-3 h-3" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Comprehensive - Contact Form */}
                {step === "comprehensive-contact" && (
                  <motion.div key="comp-contact" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }}>
                    <BotMessage>
                      ׳׳¢׳•׳׳”, ׳¡׳™׳™׳׳ ׳• ׳׳× ׳”׳‘׳“׳™׳§׳”! נ‰
                      <br /><br />
                      ׳”׳©׳׳™׳¨׳• ׳₪׳¨׳˜׳™׳ ׳•׳ ׳—׳–׳•׳¨ ׳׳׳™׳›׳ ׳¢׳ <strong>׳¡׳™׳›׳•׳ ׳׳׳ ׳©׳ ׳›׳ ׳”׳–׳›׳•׳™׳•׳×</strong> ׳©׳׳’׳™׳¢׳•׳× ׳׳›׳.
                    </BotMessage>

                    <ContactForm
                      contactForm={contactForm}
                      setContactForm={setContactForm}
                      isSubmitting={isSubmitting}
                      onSubmit={handleCompSubmit}
                      onDocsChange={setBotDocUrls}
                      requireFields
                    />
                    <BackButton onClick={() => { 
                      // Go back to last active group
                      let lastIdx = comprehensiveGroups.length - 1;
                      while (lastIdx >= 0) {
                        const g = comprehensiveGroups[lastIdx];
                        if (!g.showIf || g.showIf(compAnswers)) break;
                        lastIdx--;
                      }
                      setCompGroupIdx(lastIdx >= 0 ? lastIdx : 0);
                      setStep("comprehensive"); 
                    }} />
                  </motion.div>
                )}

                {/* Topics - Category List */}
                {step === "topics" && !selectedCat && (
                  <motion.div key="topics-list" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }}>
                    <BotMessage>
                      ׳‘׳׳™׳–׳” ׳ ׳•׳©׳ ׳×׳¨׳¦׳• ׳©׳ ׳‘׳“׳•׳§? נ”
                      <br />
                      ׳‘׳—׳¨׳• ׳§׳˜׳’׳•׳¨׳™׳” ׳•׳ ׳¦׳׳•׳ ׳₪׳ ׳™׳׳” ׳™׳—׳“.
                    </BotMessage>

                    <div className="space-y-1.5 mt-3 max-h-[380px] overflow-y-auto">
                      {mainCategories.map((cat) => (
                        <motion.button
                          key={cat.id}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => setSelectedCat(cat)}
                          className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-right"
                        >
                          <div className={`w-8 h-8 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15 flex items-center justify-center shrink-0`}>
                            <cat.icon className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-foreground text-xs">{cat.label}</p>
                            <p className="text-muted-foreground text-[10px]">{cat.topics.length} ׳ ׳•׳©׳׳™׳</p>
                          </div>
                          <ChevronLeft className="w-3 h-3 text-muted-foreground shrink-0" />
                        </motion.button>
                      ))}
                    </div>
                    <BackButton onClick={handleReset} />
                  </motion.div>
                )}

                {/* Topics - Topic List within Category */}
                {step === "topics" && selectedCat && !selectedTopic && (
                  <motion.div key="topics-cat" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }}>
                    <BotMessage>
                      ׳”׳ ׳” ׳”׳ ׳•׳©׳׳™׳ ׳‘<strong>{selectedCat.label}</strong> - ׳‘׳—׳¨׳• ׳׳× ׳׳” ׳©׳׳¢׳ ׳™׳™׳ ׳׳×׳›׳:
                    </BotMessage>

                    <div className="space-y-1.5 mt-3 max-h-[360px] overflow-y-auto">
                      {selectedCat.topics.map((topic) => (
                        <motion.button
                          key={topic.id}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => { setSelectedTopic(topic); setStep("topics-detail"); }}
                          className="w-full flex items-center gap-2.5 p-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-right"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground">{topic.label}</p>
                            <p className="text-[10px] text-muted-foreground">{topic.desc}</p>
                          </div>
                          <ChevronLeft className="w-3 h-3 text-muted-foreground shrink-0" />
                        </motion.button>
                      ))}
                    </div>
                    <BackButton onClick={() => setSelectedCat(null)} />
                  </motion.div>
                )}

                {/* Topics - Topic Detail with Questions */}
                {step === "topics-detail" && selectedTopic && (
                  <motion.div key="topics-detail" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }}>
                    <BotMessage>
                      ׳‘׳•׳׳• ׳ ׳‘׳“׳•׳§ ׳׳× ׳”׳–׳›׳׳•׳× ׳©׳׳ ׳<strong>{selectedTopic.label}</strong>.
                      <br />
                      ׳¢׳ ׳• ׳¢׳ ׳”׳©׳׳׳•׳× ׳”׳‘׳׳•׳×:
                    </BotMessage>

                    <div className="space-y-2.5 mt-3">
                      {selectedTopic.questions.map((q, i) => {
                        const answer = topicAnswers[`q${i}`];
                        return (
                          <div key={i} className={`p-2.5 rounded-lg border transition-all ${
                            answer !== undefined
                              ? answer ? "border-primary bg-primary/5" : "border-destructive/30 bg-destructive/5"
                              : "border-border"
                          }`}>
                            <p className="text-xs text-foreground leading-relaxed mb-2">{q}</p>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setTopicAnswers({ ...topicAnswers, [`q${i}`]: true })}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                  answer === true
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground hover:bg-primary/10"
                                }`}
                              >ג“ ׳›׳</button>
                              <button
                                type="button"
                                onClick={() => setTopicAnswers({ ...topicAnswers, [`q${i}`]: false })}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                  answer === false
                                    ? "bg-destructive/80 text-white"
                                    : "bg-muted text-muted-foreground hover:bg-destructive/10"
                                }`}
                              >ג— ׳׳</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Eligibility indicator */}
                    {Object.keys(topicAnswers).length > 0 && (
                      <div className="mt-3 p-2.5 rounded-lg border border-border bg-muted/50">
                        {(() => {
                          const yesCount = Object.values(topicAnswers).filter(v => v === true).length;
                          const totalQ = selectedTopic.questions.length;
                          const pct = yesCount / totalQ;
                          if (pct >= 0.6) return (
                            <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                              נ¢ ׳¡׳™׳›׳•׳™ ׳’׳‘׳•׳” ׳©׳׳’׳™׳¢׳” ׳׳ ׳”׳–׳›׳•׳×!
                            </p>
                          );
                          if (pct >= 0.3) return (
                            <p className="text-xs font-bold text-secondary flex items-center gap-1.5">
                              נ¡ ׳™׳™׳×׳›׳ ׳©׳׳’׳™׳¢׳” ׳׳ ׳”׳–׳›׳•׳× - ׳›׳“׳׳™ ׳׳‘׳“׳•׳§
                            </p>
                          );
                          return (
                            <p className="text-xs font-bold text-destructive flex items-center gap-1.5">
                              נ”´ ׳¡׳™׳›׳•׳™ ׳ ׳׳•׳ - ׳׳‘׳ ׳©׳•׳•׳” ׳׳‘׳“׳•׳§ ׳¢׳ ׳׳•׳׳—׳”
                            </p>
                          );
                        })()}
                      </div>
                    )}

                    <div className="border-t border-border mt-4 pt-3">
                      <BotMessage>
                        ׳׳¦׳•׳™׳! נ’× ׳”׳©׳׳™׳¨׳• ׳₪׳¨׳˜׳™׳ ׳•׳ ׳—׳–׳•׳¨ ׳׳׳™׳›׳ ׳¢׳ ׳×׳©׳•׳‘׳” ׳׳§׳¦׳•׳¢׳™׳×.
                      </BotMessage>
                      <ContactForm
                        contactForm={contactForm}
                        setContactForm={setContactForm}
                        isSubmitting={isSubmitting}
                        onSubmit={handleTopicSubmit}
                        onDocsChange={setBotDocUrls}
                        requireFields
                      />
                    </div>
                    <BackButton onClick={() => { setSelectedTopic(null); setTopicAnswers({}); setStep("topics"); }} />
                  </motion.div>
                )}

                {/* Family Form */}
                {step === "family-form" && (
                  <motion.div key="family" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }}>
                    <BotMessage>
                      נ‘¨ג€נ‘©ג€נ‘§ג€נ‘¦ ׳¡׳₪׳¨׳• ׳׳™ ׳¢׳ ׳¢׳¦׳׳›׳ - ׳›׳›׳ ׳©׳ ׳“׳¢ ׳™׳•׳×׳¨, ׳ ׳•׳›׳ ׳׳׳¦׳•׳ ׳™׳•׳×׳¨ ׳–׳›׳•׳™׳•׳× ׳©׳׳×׳׳™׳׳•׳× ׳‘׳“׳™׳•׳§ ׳׳›׳.
                    </BotMessage>
                    <form onSubmit={handleFamilySubmit} className="space-y-3 mt-3">
                      <Input placeholder="׳©׳ ׳׳׳ *" value={familyData.name} onChange={(e) => setFamilyData({ ...familyData, name: e.target.value })} required className="text-sm" />
                      <Input placeholder="׳×׳¢׳•׳“׳× ׳–׳”׳•׳× *" value={familyData.id_number} onChange={(e) => setFamilyData({ ...familyData, id_number: e.target.value })} required className="text-sm" />
                      <div>
                        <label className="text-xs font-medium text-foreground mb-1 block">׳×׳׳¨׳™׳ ׳׳™׳“׳” *</label>
                        <Input type="date" value={familyData.date_of_birth} onChange={(e) => setFamilyData({ ...familyData, date_of_birth: e.target.value })} required className="text-sm" dir="ltr" />
                      </div>
                      <SelectField value={familyData.gender} options={genderOptions} placeholder="׳׳’׳“׳¨ *" onChange={(v) => setFamilyData({ ...familyData, gender: v })} />
                      <SelectField value={familyData.marital} options={maritalOptions} placeholder="׳׳¦׳‘ ׳׳©׳₪׳—׳×׳™ *" onChange={(v) => setFamilyData({ ...familyData, marital: v })} />
                      <SelectField value={familyData.children_count} options={["0","1","2","3","4","5","6","7","8","9","10+"]} placeholder="׳׳¡׳₪׳¨ ׳™׳׳“׳™׳ *" onChange={(v) => setFamilyData({ ...familyData, children_count: v })} />
                      {parseInt(familyData.children_count) > 0 && (
                        <>
                          <Input placeholder="׳’׳™׳׳׳™ ׳”׳™׳׳“׳™׳ (׳׳“׳•׳’׳׳”: 2, 5, 8)" value={familyData.children_ages} onChange={(e) => setFamilyData({ ...familyData, children_ages: e.target.value })} className="text-sm" />
                          <SelectField value={familyData.children_health} options={["׳›׳•׳׳ ׳‘׳¨׳™׳׳™׳", "׳™׳׳“ ׳¢׳ ׳׳•׳’׳‘׳׳•׳× ׳§׳׳”", "׳™׳׳“ ׳¢׳ ׳׳•׳’׳‘׳׳•׳× ׳׳©׳׳¢׳•׳×׳™׳×", "׳™׳׳“ ׳¢׳ ׳׳—׳׳” ׳›׳¨׳•׳ ׳™׳×"]} placeholder="׳׳¦׳‘ ׳‘׳¨׳™׳׳•׳×׳™ ׳™׳׳“׳™׳" onChange={(v) => setFamilyData({ ...familyData, children_health: v })} />
                        </>
                      )}
                      <SelectField value={familyData.health} options={healthOptions} placeholder="׳׳¦׳‘ ׳‘׳¨׳™׳׳•׳×׳™ *" onChange={(v) => setFamilyData({ ...familyData, health: v })} />
                      <SelectField value={familyData.economic} options={economicOptions} placeholder="׳׳¦׳‘ ׳›׳׳›׳׳™ *" onChange={(v) => setFamilyData({ ...familyData, economic: v })} />
                      <Input placeholder="׳׳¡׳₪׳¨ ׳˜׳׳₪׳•׳ *" type="tel" value={familyData.phone} onChange={(e) => setFamilyData({ ...familyData, phone: e.target.value })} required className="text-sm" />
                      <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
                        <Send className="w-4 h-4" />
                        {isSubmitting ? "׳©׳•׳׳—..." : "׳©׳׳™׳—׳”"}
                      </Button>
                    </form>
                    <BackButton onClick={handleReset} />
                  </motion.div>
                )}

                {/* Community */}
                {step === "community" && (
                  <motion.div key="community" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }}>
                    <BotMessage>
                      נ’ ׳ ׳”׳“׳¨ ׳©׳׳×׳ ׳¨׳•׳¦׳™׳ ׳׳”׳¦׳˜׳¨׳£ ׳׳׳™׳–׳ <strong>"׳ ׳•׳×׳ ׳™׳ ׳™׳“ ׳׳§׳”׳™׳׳”"</strong>!
                      <br />׳¡׳₪׳¨׳• ׳׳ ׳• ׳¢׳ ׳”׳§׳”׳™׳׳” ׳©׳׳›׳.
                    </BotMessage>
                    <form onSubmit={handleCommunitySubmit} className="space-y-3 mt-3">
                      <Input placeholder="׳©׳ ׳”׳§׳”׳™׳׳”" value={communityData.communityName} onChange={(e) => setCommunityData({ ...communityData, communityName: e.target.value })} required className="text-sm" />
                      <Input placeholder="׳¢׳™׳¨" value={communityData.city} onChange={(e) => setCommunityData({ ...communityData, city: e.target.value })} required className="text-sm" />
                      <Input placeholder="׳׳™׳§׳•׳ (׳©׳›׳•׳ ׳”/׳¨׳—׳•׳‘)" value={communityData.location} onChange={(e) => setCommunityData({ ...communityData, location: e.target.value })} className="text-sm" />
                      <SelectField value={communityData.style} options={communityStyles} placeholder="׳¡׳’׳ ׳•׳ ׳”׳§׳”׳™׳׳”" onChange={(v) => setCommunityData({ ...communityData, style: v })} />
                      <SelectField value={communityData.familyCount} options={["׳¢׳“ 50", "50-100", "100-200", "200-500", "500+"]} placeholder="׳›׳׳•׳× ׳׳©׳₪׳—׳•׳×" onChange={(v) => setCommunityData({ ...communityData, familyCount: v })} />

                      <div>
                        <p className="text-xs font-medium text-foreground mb-2">׳¡׳•׳’ ׳©׳™׳×׳•׳£ ׳₪׳¢׳•׳׳”:</p>
                        <div className="space-y-1.5">
                          {cooperationTypes.map((item) => (
                            <label
                              key={item}
                              className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all text-right ${
                                communityData.cooperation.includes(item)
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/30"
                              }`}
                            >
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                communityData.cooperation.includes(item) ? "bg-primary border-primary" : "border-muted-foreground/30"
                              }`}>
                                {communityData.cooperation.includes(item) && <CheckCircle className="w-3 h-3 text-primary-foreground" />}
                              </div>
                              <span className="text-xs text-foreground">{item}</span>
                              <input type="checkbox" className="sr-only" checked={communityData.cooperation.includes(item)} onChange={() => toggleCooperation(item)} />
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-border pt-3">
                        <p className="text-xs text-muted-foreground mb-2">׳₪׳¨׳˜׳™ ׳§׳©׳¨:</p>
                        <div className="space-y-2">
                          <Input placeholder="׳©׳ ׳׳™׳© ׳§׳©׳¨" value={communityData.contactName} onChange={(e) => setCommunityData({ ...communityData, contactName: e.target.value })} required className="text-sm" />
                          <Input placeholder="׳˜׳׳₪׳•׳" type="tel" value={communityData.contactPhone} onChange={(e) => setCommunityData({ ...communityData, contactPhone: e.target.value })} required className="text-sm" />
                        </div>
                      </div>

                      <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
                        <Send className="w-4 h-4" />
                        {isSubmitting ? "׳©׳•׳׳—..." : "׳©׳׳™׳—׳× ׳‘׳§׳©׳× ׳”׳¦׳˜׳¨׳₪׳•׳×"}
                      </Button>
                    </form>
                    <BackButton onClick={handleReset} />
                  </motion.div>
                )}

                {/* Success */}
                {step === "success" && (
                  <motion.div key="success" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }}>
                    <div className="text-center py-4">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", damping: 10 }}
                        className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"
                      >
                        <CheckCircle className="w-9 h-9 text-primary" />
                      </motion.div>
                      <h4 className="text-foreground font-bold text-lg mb-2">׳”׳₪׳¨׳˜׳™׳ ׳”׳×׳§׳‘׳׳•</h4>
                      <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                        {successType === "free"
                          ? "׳׳¢׳•׳׳”! ׳ ׳©׳׳— ׳׳ ׳¡׳™׳›׳•׳ ׳׳§׳¦׳•׳¢׳™ ׳¢׳ ׳›׳ ׳”׳–׳›׳•׳™׳•׳× ׳©׳׳¦׳׳ ׳• ׳¢׳‘׳•׳¨׳."
                          : successType === "paid"
                          ? "׳ ׳”׳“׳¨! ׳ ׳¦׳™׳’ ׳׳•׳׳—׳” ׳©׳׳ ׳• ׳™׳™׳¦׳•׳¨ ׳׳™׳×׳ ׳§׳©׳¨ ׳‘׳”׳§׳“׳ ׳׳׳™׳•׳•׳™ ׳׳™׳©׳™."
                          : "׳×׳•׳“׳” ׳©׳₪׳ ׳™׳×׳! ׳ ׳—׳–׳•׳¨ ׳׳׳™׳›׳ ׳‘׳”׳§׳“׳."}
                      </p>
                      <Button onClick={handleReset} variant="outline" className="w-full text-sm">
                        ׳—׳–׳¨׳” ׳׳×׳₪׳¨׳™׳˜ ׳”׳¨׳׳©׳™
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border bg-muted/50 text-center shrink-0">
              <p className="text-xs text-muted-foreground">׳‘׳§׳׳•׳× - ׳׳™׳¦׳•׳™ ׳–׳›׳•׳™׳•׳× ׳—׳›׳ נ’</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/* Helper Components */

const BotMessage = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-muted rounded-2xl rounded-tr-sm p-3.5 mb-3">
    <p className="text-foreground text-sm leading-relaxed">{children}</p>
  </div>
);

const BackButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mt-4 mx-auto transition-colors"
  >
    <ArrowRight className="w-3.5 h-3.5" />
    ׳—׳–׳¨׳”
  </button>
);

const SelectField = ({
  value, options, placeholder, onChange,
}: {
  value: string; options: string[]; placeholder: string;
  onChange: (v: string) => void;
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    required
    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <option value="" disabled>{placeholder}</option>
    {options.map((o) => (
      <option key={o} value={o}>{o}</option>
    ))}
  </select>
);

const ContactForm = ({
  contactForm, setContactForm, isSubmitting, onSubmit, onDocsChange, requireFields,
}: {
  contactForm: { name: string; phone: string; details: string };
  setContactForm: (data: { name: string; phone: string; details: string }) => void;
  isSubmitting: boolean;
  onSubmit: (type: "free" | "paid") => void;
  onDocsChange?: (urls: string[]) => void;
  requireFields?: boolean;
}) => (
  <div className="space-y-3 mt-3">
    <Input
      placeholder="׳©׳ ׳׳׳ *"
      value={contactForm.name}
      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
      className="text-sm"
      required={requireFields}
    />
    <Input
      placeholder="׳׳¡׳₪׳¨ ׳˜׳׳₪׳•׳ *"
      type="tel"
      value={contactForm.phone}
      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
      className="text-sm"
      required={requireFields}
    />
    <Textarea
      placeholder="׳¨׳•׳¦׳™׳ ׳׳”׳•׳¡׳™׳£ ׳׳©׳”׳•? (׳׳ ׳—׳•׳‘׳”)"
      value={contactForm.details}
      onChange={(e) => setContactForm({ ...contactForm, details: e.target.value })}
      className="text-sm min-h-[60px]"
    />
    {onDocsChange && <FileUpload onFilesUploaded={onDocsChange} maxFiles={3} />}
    <div className="space-y-2">
      <Button onClick={() => onSubmit("free")} disabled={isSubmitting} className="w-full gap-2 bg-primary hover:bg-primary/90 text-sm">
        <Send className="w-4 h-4" />
        {isSubmitting ? "׳©׳•׳׳—..." : "׳©׳׳—׳• ׳׳™ ׳׳™׳“׳¢ ׳‘׳—׳™׳ ׳"}
      </Button>
      <Button onClick={() => onSubmit("paid")} disabled={isSubmitting} variant="secondary" className="w-full gap-2 text-sm">
        ׳׳ ׳™ ׳¨׳•׳¦׳” ׳׳™׳•׳•׳™ ׳׳§׳¦׳•׳¢׳™ ׳©׳ ׳ ׳¦׳™׳’
      </Button>
    </div>
  </div>
);

export default FloatingBot;
