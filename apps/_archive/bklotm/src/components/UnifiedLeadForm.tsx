import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Bell, Sparkles, Send, ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RequiredMark } from "@/components/ui/required-mark";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  validateIdNumber,
  getIdError,
  getPhoneError,
  getEmailError,
} from "@/lib/validation";

export type RequestType = "info" | "info_reminders" | "full_handling";

export type UnifiedLeadPrefill = {
  name?: string;
  phone?: string;
  email?: string;
  id_number?: string;
  date_of_birth?: string;
  marital_status?: string;
  gender?: string;
  // Free-form extras for admin context (compactly serialized into details)
  extra_details?: string;
  // Direct-mapped fields (saved on the lead)
  spouse_name?: string;
  spouse_id_number?: string;
  spouse_health?: string;
  spouse_employment?: string;
  children_count?: number;
  children_ages?: string;
  children_health_details?: string;
  employment_status?: string;
  disability_percentage?: string;
  housing_status?: string;
  health_status?: string;
  economic_status?: string;
};

export type UnifiedLeadFormProps = {
  source: string;
  category?: string | null;
  selectedRight?: string | null;
  relevanceScore?: "high" | "medium" | "low" | "unknown";
  prefill?: UnifiedLeadPrefill;
  documentUrls?: string[];
  communityData?: Record<string, any> | null;
  // UI options
  defaultRequestType?: RequestType;
  compact?: boolean; // smaller layout for inline use (footer)
  showTopicHeader?: boolean;
  onSuccess?: (requestType: RequestType) => void;
};

const maritalOptions = ["רווק/ה", "נשוי/אה", "גרוש/ה", "אלמן/ה"];

const channelOptions = [
  { id: "email", label: "📧 מייל", short: "מייל" },
  { id: "whatsapp", label: "💬 וואטסאפ", short: "וואטסאפ" },
  { id: "sms", label: "📱 SMS", short: "SMS" },
  { id: "voice", label: "📞 הודעה קולית", short: "הודעה קולית" },
] as const;

const channelLabel = (id: string) =>
  channelOptions.find((c) => c.id === id)?.short || id;

const requestTypeOptions: {
  id: RequestType;
  icon: typeof Mail;
  title: string;
  short: string;
  desc: string;
  gradient: string;
  ring: string;
}[] = [
  {
    id: "info",
    icon: Mail,
    title: "📩 רק מידע",
    short: "מידע בלבד",
    desc: "נשלח לכם מייל מסודר עם המידע המקצועי על הזכות הזו — ללא התחייבות.",
    gradient: "from-blue-500 to-indigo-600",
    ring: "ring-blue-500/40",
  },
  {
    id: "info_reminders",
    icon: Bell,
    title: "🔔 מידע + תזכורות",
    short: "מידע ותזכורות",
    desc: "נשלח את המידע ונמשיך לעדכן אתכם בזכויות חדשות שעשויות להתאים לכם.",
    gradient: "from-secondary to-amber-500",
    ring: "ring-secondary/50",
  },
  {
    id: "full_handling",
    icon: Sparkles,
    title: "⭐ טיפול בפועל",
    short: "טיפול מלא",
    desc: "נציג מטעמנו ייצור איתכם קשר ויטפל בכל הבירוקרטיה עד למימוש מלא.",
    gradient: "from-primary to-emerald-600",
    ring: "ring-primary/50",
  },
];

const UnifiedLeadForm = ({
  source,
  category,
  selectedRight,
  relevanceScore,
  prefill,
  documentUrls,
  communityData,
  defaultRequestType,
  compact,
  showTopicHeader,
  onSuccess,
}: UnifiedLeadFormProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<"choose" | "form" | "success">(
    defaultRequestType ? "form" : "choose",
  );
  const [requestType, setRequestType] = useState<RequestType>(
    defaultRequestType || "info",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [data, setData] = useState({
    name: prefill?.name || "",
    phone: prefill?.phone || "",
    email: prefill?.email || "",
    id_number: prefill?.id_number || "",
    date_of_birth: prefill?.date_of_birth || "",
    marital_status: prefill?.marital_status || "",
    extra_notes: "",
  });
  const [deliveryChannels, setDeliveryChannels] = useState<string[]>(["email"]);

  const needsExtended = requestType !== "info";

  const handlePickType = (t: RequestType) => {
    setRequestType(t);
    setStep("form");
  };

  const saveLead = async (): Promise<boolean> => {
    // Validation
    if (!data.name.trim()) {
      toast({ title: "שדה חובה", description: "נא למלא שם מלא", variant: "destructive" });
      return false;
    }
    const phoneErr = getPhoneError(data.phone);
    if (phoneErr) {
      toast({ title: "שגיאה בטלפון", description: phoneErr, variant: "destructive" });
      return false;
    }
    const emailErr = getEmailError(data.email);
    if (emailErr) {
      toast({ title: "שגיאה במייל", description: emailErr, variant: "destructive" });
      return false;
    }
    if (needsExtended) {
      const idErr = getIdError(data.id_number);
      if (!data.id_number.trim() || idErr) {
        toast({
          title: "שדה חובה",
          description: idErr || "נא למלא תעודת זהות (9 ספרות)",
          variant: "destructive",
        });
        return false;
      }
      if (!data.date_of_birth) {
        toast({ title: "שדה חובה", description: "נא למלא תאריך לידה", variant: "destructive" });
        return false;
      }
      if (!data.marital_status) {
        toast({ title: "שדה חובה", description: "נא לבחור מצב משפחתי", variant: "destructive" });
        return false;
      }
    }
    if (deliveryChannels.length === 0) {
      toast({ title: "בחירה נדרשת", description: "נא לבחור לפחות ערוץ אחד לקבלת המידע", variant: "destructive" });
      return false;
    }

    // Build details summary for admin
    const detailParts: string[] = [];
    if (selectedRight) detailParts.push(`📌 זכות: ${selectedRight}`);
    if (category) detailParts.push(`📁 קטגוריה: ${category}`);
    detailParts.push(
      `🎯 רמת בקשה: ${requestTypeOptions.find((o) => o.id === requestType)?.short}`,
    );
    detailParts.push(`📡 ערוצי קבלת מידע: ${deliveryChannels.map(channelLabel).join(", ")}`);
    if (prefill?.extra_details) detailParts.push(prefill.extra_details);
    if (data.extra_notes.trim()) detailParts.push(`📝 הערות: ${data.extra_notes.trim()}`);

    const payload: Record<string, any> = {
      source,
      service_type: requestType === "full_handling" ? "paid" : "free",
      request_type: requestType,
      name: data.name.trim(),
      phone: data.phone.replace(/\D/g, ""),
      email: data.email.trim().toLowerCase(),
      category: category || null,
      selected_right: selectedRight || null,
      eligibility_score: relevanceScore || "unknown",
      details: detailParts.join("\n"),
    };

    if (needsExtended) {
      payload.id_number = data.id_number.replace(/\D/g, "");
      payload.date_of_birth = data.date_of_birth;
      payload.marital_status = data.marital_status;
    }

    // Carry through prefilled context
    if (prefill?.gender) payload.gender = prefill.gender;
    if (prefill?.spouse_name) payload.spouse_name = prefill.spouse_name;
    if (prefill?.spouse_id_number) payload.spouse_id_number = prefill.spouse_id_number;
    if (prefill?.spouse_health) payload.spouse_health = prefill.spouse_health;
    if (prefill?.spouse_employment) payload.spouse_employment = prefill.spouse_employment;
    if (typeof prefill?.children_count === "number")
      payload.children_count = prefill.children_count;
    if (prefill?.children_ages) payload.children_ages = prefill.children_ages;
    if (prefill?.children_health_details)
      payload.children_health_details = prefill.children_health_details;
    if (prefill?.employment_status) payload.employment_status = prefill.employment_status;
    if (prefill?.disability_percentage)
      payload.disability_percentage = prefill.disability_percentage;
    if (prefill?.housing_status) payload.housing_status = prefill.housing_status;
    if (prefill?.health_status) payload.health_status = prefill.health_status;
    if (prefill?.economic_status) payload.economic_status = prefill.economic_status;

    payload.delivery_channels = deliveryChannels;
    if (documentUrls && documentUrls.length > 0) payload.document_urls = documentUrls;
    if (communityData) payload.community_data = communityData;

    setIsSubmitting(true);

    // Deduplication by id_number then phone (matches existing logic)
    const phoneNorm = payload.phone;
    const idNorm = payload.id_number;
    let existingId: string | null = null;
    if (idNorm && idNorm.length === 9) {
      const { data: found } = await supabase
        .from("leads")
        .select("id")
        .eq("id_number", idNorm)
        .limit(1);
      if (found && found.length > 0) existingId = found[0].id;
    }
    if (!existingId && phoneNorm && phoneNorm.length === 10) {
      const { data: found } = await supabase
        .from("leads")
        .select("id")
        .eq("phone", phoneNorm)
        .limit(1);
      if (found && found.length > 0) existingId = found[0].id;
    }

    let ok = false;
    if (existingId) {
      const { data: existing } = await supabase
        .from("leads")
        .select("*")
        .eq("id", existingId)
        .single();
      if (existing) {
        const updatePayload: Record<string, any> = {};
        for (const [key, val] of Object.entries(payload)) {
          if (key === "source") continue;
          if (val === null || val === undefined || val === "") continue;
          // Always update request_type / service_type / latest details
          if (
            key === "request_type" ||
            key === "service_type" ||
            key === "details" ||
            key === "selected_right" ||
            key === "category" ||
            key === "eligibility_score" ||
            key === "community_data"
          ) {
            updatePayload[key] = val;
            continue;
          }
          const cur = (existing as any)[key];
          if (!cur || cur === "" || cur === null) {
            updatePayload[key] = val;
          }
        }
        if (payload.document_urls?.length) {
          const existingDocs = (existing as any).document_urls || [];
          updatePayload.document_urls = [...existingDocs, ...payload.document_urls];
        }
        if (Object.keys(updatePayload).length > 0) {
          const { error } = await supabase
            .from("leads")
            .update(updatePayload as any)
            .eq("id", existingId);
          ok = !error;
        } else {
          ok = true;
        }
      }
    } else {
      const { error } = await supabase.from("leads").insert(payload as any);
      ok = !error;
    }

    setIsSubmitting(false);

    if (!ok) {
      toast({
        title: "שגיאה בשמירה",
        description: "לא הצלחנו לשמור את הפרטים. נסו שוב.",
        variant: "destructive",
      });
      return false;
    }
    setStep("success");
    onSuccess?.(requestType);
    return true;
  };

  if (step === "success") {
    const opt = requestTypeOptions.find((o) => o.id === requestType)!;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-6 space-y-4"
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.5 }}
          className="inline-flex w-16 h-16 rounded-full bg-primary/10 items-center justify-center"
        >
          <CheckCircle className="w-9 h-9 text-primary" />
        </motion.div>
        <h3 className="text-xl font-bold text-foreground">הפנייה התקבלה! 🎉</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          {requestType === "info" &&
            "נשלח אליכם בקרוב מייל מסודר עם המידע המלא על הזכות."}
          {requestType === "info_reminders" &&
            "נשלח את המידע ונמשיך לעדכן אתכם על זכויות חדשות שמתאימות לכם."}
          {requestType === "full_handling" &&
            "נציג מטעמנו ייצור איתכם קשר בהקדם ויטפל בכל הבירוקרטיה."}
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-xs">
          <opt.icon className="w-3.5 h-3.5" /> {opt.short}
        </div>
      </motion.div>
    );
  }

  if (step === "choose") {
    return (
      <div className="space-y-3">
        {showTopicHeader && (selectedRight || category) && (
          <div className="text-center mb-1">
            <p className="text-xs text-muted-foreground">בקשה עבור</p>
            <p className="text-sm font-bold text-foreground">
              {selectedRight || category}
            </p>
          </div>
        )}
        <p className="text-sm text-foreground/80 text-center mb-2">
          איך תרצו שנעזור לכם?
        </p>
        <div className={`grid gap-2.5 ${compact ? "grid-cols-1" : "grid-cols-1"}`}>
          {requestTypeOptions.map((opt) => (
            <motion.button
              key={opt.id}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handlePickType(opt.id)}
              className="text-right flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all"
            >
              <div
                className={`w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br ${opt.gradient} flex items-center justify-center shadow-sm`}
              >
                <opt.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-foreground">{opt.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                  {opt.desc}
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  // step === "form"
  const opt = requestTypeOptions.find((o) => o.id === requestType)!;
  return (
    <div className="space-y-3">
      {/* Selected level chip */}
      <div className="flex items-center justify-between gap-2">
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-br ${opt.gradient} text-white text-xs font-bold shadow-sm`}
        >
          <opt.icon className="w-3.5 h-3.5" /> {opt.short}
        </div>
        {!defaultRequestType && (
          <button
            type="button"
            onClick={() => setStep("choose")}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <ArrowRight className="w-3 h-3" /> שינוי
          </button>
        )}
      </div>

      {showTopicHeader && (selectedRight || category) && (
        <div className="text-xs text-muted-foreground text-center -mt-1">
          עבור: <span className="text-foreground font-medium">{selectedRight || category}</span>
        </div>
      )}

      <div className={compact ? "grid grid-cols-2 gap-2" : "space-y-2.5"} dir="rtl">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-foreground flex items-center gap-0.5 text-right">
            שם מלא <RequiredMark />
          </label>
          <Input
            placeholder="שם פרטי ושם משפחה"
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            className="text-sm text-right"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-foreground flex items-center gap-0.5 text-right">
            טלפון <RequiredMark />
          </label>
          <Input
            placeholder="0501234567"
            value={data.phone}
            type="tel"
            dir="ltr"
            onChange={(e) => setData({ ...data, phone: e.target.value })}
            className="text-sm"
          />
        </div>
        <div className={`space-y-1 ${compact ? "col-span-2" : ""}`}>
          <label className="text-[11px] font-semibold text-foreground flex items-center gap-0.5 text-right">
            כתובת מייל <RequiredMark />
          </label>
          <Input
            placeholder="email@example.com"
            type="email"
            dir="ltr"
            value={data.email}
            onChange={(e) => setData({ ...data, email: e.target.value })}
            className="text-sm"
          />
        </div>
      </div>

      <AnimatePresence>
        {needsExtended && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="rounded-lg border border-secondary/30 bg-secondary/5 p-3 space-y-2.5 mt-1" dir="rtl">
              <p className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-secondary" />
                פרטים נוספים נדרשים לשירות הזה
              </p>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground flex items-center gap-0.5 text-right">
                  תעודת זהות (9 ספרות) <RequiredMark />
                </label>
                <Input
                  placeholder="123456789"
                  value={data.id_number}
                  dir="ltr"
                  onChange={(e) => setData({ ...data, id_number: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground flex items-center gap-0.5 text-right">
                    תאריך לידה <RequiredMark />
                  </label>
                  <Input
                    type="date"
                    value={data.date_of_birth}
                    onChange={(e) => setData({ ...data, date_of_birth: e.target.value })}
                    className="text-sm"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground flex items-center gap-0.5 text-right">
                    מצב משפחתי <RequiredMark />
                  </label>
                  <select
                    value={data.marital_status}
                    onChange={(e) => setData({ ...data, marital_status: e.target.value })}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-right"
                    dir="rtl"
                  >
                    <option value="">בחרו...</option>
                    {maritalOptions.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delivery channels selector */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
        <p className="text-xs font-bold text-foreground">
          📡 איך תרצו לקבל את המידע / התזכורת / השירות? <span className="text-muted-foreground font-normal">(ניתן לבחור יותר מאחד)</span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          {channelOptions.map((opt) => {
            const active = deliveryChannels.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  setDeliveryChannels((prev) =>
                    prev.includes(opt.id) ? prev.filter((x) => x !== opt.id) : [...prev, opt.id],
                  )
                }
                className={`px-3 py-2 rounded-md text-sm font-medium border transition-all text-right ${
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-foreground border-border hover:border-primary/40"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {!compact && (
        <Textarea
          placeholder="הערות (אופציונלי)"
          value={data.extra_notes}
          onChange={(e) => setData({ ...data, extra_notes: e.target.value })}
          className="text-sm min-h-[60px]"
        />
      )}

      <Button
        onClick={saveLead}
        disabled={isSubmitting}
        className="w-full gap-2 mt-1"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> שולח...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" /> שליחת הפנייה
          </>
        )}
      </Button>
      <p className="text-[10px] text-center text-muted-foreground">
        הפרטים שלכם נשלחים אלינו באופן מאובטח 🔒
      </p>
    </div>
  );
};

export default UnifiedLeadForm;
