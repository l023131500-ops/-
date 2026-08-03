import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Heart, Home, DollarSign, Shield, Edit2, Save, X, Briefcase, Baby, Plus, Tag, Phone } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  createEditableProfileFromApp,
  createEditableProfileFromDb,
  sanitizeEditableProfile,
  type EditableProfileForm,
} from "@/lib/profileForm";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// Quick-edit parameter chips - user can tap any to edit independently
const QUICK_PARAMS: { key: keyof EditableProfileForm; label: string; type: "text" | "number" | "select"; options?: string[] }[] = [
  { key: "name", label: "שם", type: "text" },
  { key: "family_status", label: "מצב משפחתי", type: "select", options: ["רווק/ה", "נשוי/אה", "גרוש/ה", "אלמן/ה"] },
  { key: "children_count", label: "מספר ילדים", type: "number" },
  { key: "city", label: "עיר", type: "text" },
  { key: "sector", label: "מגזר", type: "text" },
  { key: "health_fund", label: "קופת חולים", type: "select", options: ["כללית", "מכבי", "מאוחדת", "לאומית"] },
  { key: "special_health_needs", label: "צרכים בריאותיים", type: "text" },
  { key: "residential_status", label: "סטטוס מגורים", type: "select", options: ["renter", "owner", "mortgage"] },
  { key: "rent_amount", label: "שכר דירה", type: "number" },
  { key: "mortgage_monthly", label: "משכנתא", type: "number" },
  { key: "living_standard", label: "רמת חיים", type: "select", options: ["נמוך", "בינוני", "גבוה"] },
  { key: "car_type", label: "סוג רכב", type: "text" },
  { key: "car_year", label: "שנת רכב", type: "number" },
  { key: "real_estate_assets", label: "נכסים", type: "text" },
  { key: "credit_card_debt", label: "חוב אשראי", type: "number" },
  { key: "monthly_income", label: "הכנסה חודשית", type: "number" },
  { key: "monthly_fixed_expenses", label: "הוצאות קבועות", type: "number" },
  { key: "yearly_fixed_expenses", label: "הוצאות שנתיות", type: "number" },
  { key: "daily_expenses", label: "הוצאות יומיות", type: "number" },
  { key: "weekly_expenses", label: "הוצאות שבועיות", type: "number" },
  { key: "passive_income", label: "הכנסה פסיבית", type: "number" },
  { key: "yearly_bonus", label: "בונוס שנתי", type: "number" },
  { key: "recurring_support", label: "תמיכה חוזרת", type: "number" },
  { key: "one_time_income", label: "הכנסה חד פעמית", type: "number" },
  { key: "business_dividends", label: "דיבידנדים", type: "number" },
];

function IvrPinManager({ userId }: { userId: string | null }) {
  const [idNumber, setIdNumber] = useState("");
  const [pin, setPin] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [savingIvr, setSavingIvr] = useState(false);

  useEffect(() => {
    if (!userId) return;
    void (async () => {
      const { data } = await supabase.from("profiles").select("id_number, ivr_pin").eq("id", userId).maybeSingle();
      if (data) {
        setIdNumber((data as any).id_number || "");
        setPin((data as any).ivr_pin || "");
      }
      setLoaded(true);
    })();
  }, [userId]);

  const handleSave = async () => {
    if (!userId) return;
    if (pin && pin.length !== 6) {
      toast.error("הסיסמה חייבת להיות בדיוק 6 ספרות");
      return;
    }
    setSavingIvr(true);
    try {
      const { error } = await supabase.from("profiles").update({
        id_number: idNumber,
        ivr_pin: pin,
      } as any).eq("id", userId);
      if (error) throw error;
      toast.success("פרטי המערכת הקולית עודכנו!");
    } catch {
      toast.error("שגיאה בשמירה");
    } finally {
      setSavingIvr(false);
    }
  };

  if (!loaded) return <div className="text-xs text-muted-foreground">טוען...</div>;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">תעודת זהות</label>
          <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="הזן תעודת זהות" className="h-10 border-border bg-background text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">סיסמה (6 ספרות)</label>
          <Input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" maxLength={6} className="h-10 border-border bg-background text-sm tracking-widest text-center font-mono" />
        </div>
      </div>
      <button onClick={handleSave} disabled={savingIvr} className="px-6 py-2.5 rounded-xl gold-gradient text-primary-foreground font-semibold text-xs disabled:opacity-50">
        {savingIvr ? "שומר..." : "שמור הגדרות קוליות"}
      </button>
    </div>
  );
}

export default function ProfilePage() {
  const { profile, setProfile, userId, t } = useApp();
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const appProfile = useMemo(() => createEditableProfileFromApp(profile), [profile]);
  const [savedProfile, setSavedProfile] = useState<EditableProfileForm>(appProfile);
  const [form, setForm] = useState<EditableProfileForm>(appProfile);
  const [showBusinessInterest, setShowBusinessInterest] = useState(false);
  const [businessMessage, setBusinessMessage] = useState("");
  const [quickEditKey, setQuickEditKey] = useState<keyof EditableProfileForm | null>(null);
  const [quickEditValue, setQuickEditValue] = useState<string>("");

  useEffect(() => {
    if (!userId) {
      setSavedProfile(appProfile);
      setForm(appProfile);
      return;
    }
    let active = true;
    void (async () => {
      const base = createEditableProfileFromApp(profile);
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      const nextProfile = data ? createEditableProfileFromDb(data as Record<string, unknown>, base) : base;
      const sanitized = sanitizeEditableProfile(nextProfile);
      if (!active) return;
      setSavedProfile(sanitized);
      setForm(sanitized);
    })();
    return () => { active = false; };
  }, [appProfile, profile, userId]);

  const displayData = editing ? form : savedProfile;

  const startEdit = () => { setForm(savedProfile); setEditing(true); };
  const cancelEdit = () => { setForm(savedProfile); setEditing(false); };

  const updateField = <K extends keyof EditableProfileForm>(key: K, value: EditableProfileForm[K]) => {
    setForm((prev) => sanitizeEditableProfile({ ...prev, [key]: value }));
  };

  const updateChildField = (index: number, key: "children_names" | "children_ages" | "children_health_needs", value: string | number) => {
    setForm((prev) => {
      const next = { ...prev, [key]: [...prev[key]] };
      (next[key] as Array<string | number>)[index] = value;
      return sanitizeEditableProfile(next);
    });
  };

  const saveToDb = async (data: EditableProfileForm) => {
    if (!userId) return;
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      name: data.name,
      family_status: data.family_status,
      children_count: data.children_count,
      children_names: data.children_names,
      children_ages: data.children_ages,
      children_health_needs: data.children_health_needs,
      monthly_income: data.monthly_income,
      business_dividends: data.business_dividends,
      passive_income: data.passive_income,
      recurring_support: data.recurring_support,
      yearly_bonus: data.yearly_bonus,
      one_time_income: data.one_time_income,
      living_standard: data.living_standard,
      health_fund: data.health_fund,
      special_health_needs: data.special_health_needs,
      residential_status: data.residential_status,
      city: data.city,
      sector: data.sector,
      rent_amount: data.rent_amount,
      mortgage_monthly: data.mortgage_monthly,
      daily_expenses: data.daily_expenses,
      weekly_expenses: data.weekly_expenses,
      monthly_fixed_expenses: data.monthly_fixed_expenses,
      yearly_fixed_expenses: data.yearly_fixed_expenses,
      profile_complete: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });
    if (error) throw error;
  };

  const syncToAppProfile = (sanitized: EditableProfileForm) => {
    setProfile({
      ...profile,
      name: sanitized.name,
      familyStatus: sanitized.family_status,
      childrenCount: sanitized.children_count,
      childrenNames: sanitized.children_names,
      childrenAges: sanitized.children_ages,
      childrenHealthNeeds: sanitized.children_health_needs,
      monthlyIncome: sanitized.monthly_income,
      businessDividends: sanitized.business_dividends,
      passiveIncome: sanitized.passive_income,
      recurringSupport: sanitized.recurring_support,
      yearlyBonus: sanitized.yearly_bonus,
      oneTimeIncome: sanitized.one_time_income,
      livingStandard: sanitized.living_standard,
      healthFund: sanitized.health_fund,
      specialHealthNeeds: sanitized.special_health_needs,
      residentialStatus: sanitized.residential_status,
      city: sanitized.city,
      sector: sanitized.sector,
      rentAmount: sanitized.rent_amount,
      mortgageMonthly: sanitized.mortgage_monthly,
      dailyExpenses: sanitized.daily_expenses,
      weeklyExpenses: sanitized.weekly_expenses,
      monthlyFixedExpenses: sanitized.monthly_fixed_expenses,
      yearlyFixedExpenses: sanitized.yearly_fixed_expenses,
      profileComplete: true,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const sanitized = sanitizeEditableProfile(form);
      await saveToDb(sanitized);
      syncToAppProfile(sanitized);
      setSavedProfile(sanitized);
      setForm(sanitized);
      setEditing(false);
      toast.success("הפרופיל עודכן בהצלחה!");
    } catch (err: any) {
      toast.error("שגיאה בשמירה: " + (err.message || "נסה שוב"));
    } finally {
      setSaving(false);
    }
  };

  // Quick edit a single field
  const openQuickEdit = (key: keyof EditableProfileForm) => {
    setQuickEditKey(key);
    setQuickEditValue(String(savedProfile[key] ?? ""));
  };

  const saveQuickEdit = async () => {
    if (!quickEditKey) return;
    try {
      const param = QUICK_PARAMS.find((p) => p.key === quickEditKey);
      const val = param?.type === "number" ? Number(quickEditValue) : quickEditValue;
      const updated = sanitizeEditableProfile({ ...savedProfile, [quickEditKey]: val });
      await saveToDb(updated);
      syncToAppProfile(updated);
      setSavedProfile(updated);
      setForm(updated);
      setQuickEditKey(null);
      toast.success("עודכן!");
    } catch {
      toast.error("שגיאה בשמירה");
    }
  };

  const handleBusinessInterest = async () => {
    try {
      await supabase.from("leads").insert({
        name: displayData.name,
        email: user?.email || "",
        phone: "",
        source: "business_interest",
        message: businessMessage || `לקוח ${displayData.name} מתעניין בניהול עסקי`,
      });
      toast.success("הבקשה נשלחה! צוות FinanceHub ייצור איתך קשר.");
      setShowBusinessInterest(false);
      setBusinessMessage("");
    } catch {
      toast.error("שגיאה בשליחה, נסה שוב");
    }
  };

  const sections = [
    {
      title: t("personal_details"), icon: User,
      fields: [
        { key: "name" as const, label: "שם מלא", value: displayData.name, type: "text" },
        { key: "family_status" as const, label: t("family_status"), value: displayData.family_status, type: "select", options: ["רווק/ה", "נשוי/אה", "גרוש/ה", "אלמן/ה"] },
        { key: "children_count" as const, label: t("children"), value: `${displayData.children_count}`, type: "number" },
        { key: "city" as const, label: "עיר", value: displayData.city, type: "text" },
        { key: "sector" as const, label: "מגזר", value: displayData.sector, type: "text" },
      ],
    },
    {
      title: t("living_standard"), icon: DollarSign,
      fields: [
        { key: "living_standard" as const, label: t("living_standard"), value: displayData.living_standard, type: "select", options: ["נמוך", "בינוני", "גבוה"] },
      ],
    },
    {
      title: t("health_social"), icon: Heart,
      fields: [
        { key: "health_fund" as const, label: t("health_fund"), value: displayData.health_fund, type: "select", options: ["כללית", "מכבי", "מאוחדת", "לאומית"] },
        { key: "special_health_needs" as const, label: t("special_health_needs"), value: displayData.special_health_needs, type: "text" },
      ],
    },
    {
      title: t("residential_status"), icon: Home,
      fields: [
        { key: "residential_status" as const, label: t("residential_status"), value: displayData.residential_status === "owner" ? t("owner") : displayData.residential_status === "mortgage" ? "משכנתא" : t("renter"), type: "select", options: ["renter", "owner", "mortgage"], optionLabels: ["שוכר", "בעלים", "משכנתא"] },
        ...(displayData.residential_status === "renter" ? [{ key: "rent_amount" as const, label: "שכר דירה חודשי", value: `₪${displayData.rent_amount.toLocaleString()}`, type: "number" as const, rawValue: displayData.rent_amount }] : []),
        ...(displayData.residential_status === "mortgage" ? [{ key: "mortgage_monthly" as const, label: "החזר משכנתא חודשי", value: `₪${displayData.mortgage_monthly.toLocaleString()}`, type: "number" as const, rawValue: displayData.mortgage_monthly }] : []),
      ],
    },
  ];

  const childRows = Array.from({ length: displayData.children_count }, (_, index) => ({
    name: displayData.children_names[index] || "",
    age: displayData.children_ages[index] || 0,
    health: displayData.children_health_needs[index] || "",
  }));

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="p-8 md:p-12 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="w-18 h-18 rounded-2xl gold-gradient flex items-center justify-center shadow-lg" style={{ width: 72, height: 72 }}>
            <span className="text-2xl font-black text-primary-foreground">
              {displayData.name.charAt(0) || "?"}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">{displayData.name || "משתמש"}</h1>
            <p className="text-sm text-muted-foreground tracking-editorial">{t("profile")}</p>
          </div>
        </div>
        {!editing ? (
          <button onClick={startEdit} className="btn-clay-gold text-xs flex items-center gap-2">
            <Edit2 className="w-4 h-4" /> עריכת פרופיל
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="btn-clay-gold text-xs flex items-center gap-2">
              <Save className="w-4 h-4" /> {saving ? "שומר..." : "שמור"}
            </button>
            <button onClick={cancelEdit} className="px-4 py-2 rounded-xl bg-secondary text-muted-foreground text-xs font-bold hover:bg-secondary/80">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </motion.div>

      {/* Quick Edit Chips - independent parameter entry */}
      {!editing && (
        <motion.div variants={itemVariants} className="bento-card space-y-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 gold-text" />
            <h3 className="text-sm font-bold text-foreground">עדכון מהיר — לחץ לעריכת שדה בודד</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_PARAMS.map((p) => {
              const val = savedProfile[p.key];
              const display = val !== undefined && val !== "" && val !== 0 ? String(val) : "—";
              return (
                <button
                  key={p.key}
                  onClick={() => openQuickEdit(p.key)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary/60 border border-border/40 hover:border-accent/40 hover:bg-accent/5 transition-all text-xs group"
                >
                  <span className="text-muted-foreground">{p.label}:</span>
                  <span className="font-bold text-foreground group-hover:gold-text">{display}</span>
                  <Edit2 className="w-3 h-3 text-muted-foreground/40 group-hover:text-accent" />
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Quick Edit Modal */}
      <AnimatePresence>
        {quickEditKey && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setQuickEditKey(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bento-card w-full max-w-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground">
                  עדכון {QUICK_PARAMS.find((p) => p.key === quickEditKey)?.label}
                </h3>
                <button onClick={() => setQuickEditKey(null)}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              {(() => {
                const param = QUICK_PARAMS.find((p) => p.key === quickEditKey);
                if (!param) return null;
                if (param.type === "select") {
                  return (
                    <div className="space-y-2">
                      {param.options?.map((opt) => (
                        <button key={opt} onClick={() => setQuickEditValue(opt)}
                          className={`w-full text-right px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                            quickEditValue === opt
                              ? "border-accent bg-accent/10 gold-text"
                              : "border-border/40 bg-secondary/40 text-foreground hover:bg-secondary/60"
                          }`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  );
                }
                return (
                  <Input
                    type={param.type === "number" ? "number" : "text"}
                    value={quickEditValue}
                    onChange={(e) => setQuickEditValue(e.target.value)}
                    className="h-12 text-base border-border bg-background"
                    autoFocus
                  />
                );
              })()}
              <button onClick={saveQuickEdit}
                className="w-full py-3 rounded-xl gold-gradient text-primary-foreground font-semibold text-sm">
                שמור שינוי
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {sections.map((section) => (
          <motion.div key={section.title} variants={itemVariants} className="bento-card space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-accent/8">
                <section.icon className="w-4 h-4 gold-text" />
              </div>
              <h3 className="text-sm font-bold text-foreground">{section.title}</h3>
            </div>
            <div className="space-y-3">
              {section.fields.map((field: any) => (
                <div key={field.key} className="flex justify-between items-center p-3 rounded-2xl bg-secondary/40 border border-border/30">
                  <span className="text-xs text-muted-foreground">{field.label}</span>
                  {editing ? (
                    field.type === "select" ? (
                      <select
                        value={(form as any)[field.key] || ""}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        className="bg-secondary border border-border rounded-lg px-2 py-1 text-xs text-foreground"
                      >
                        <option value="">בחר</option>
                        {(field.options || []).map((opt: string, i: number) => (
                          <option key={opt} value={opt}>{field.optionLabels ? field.optionLabels[i] : opt}</option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        type={field.type === "number" ? "number" : "text"}
                        value={(form as any)[field.key] ?? ""}
                        onChange={(e) => updateField(field.key, (field.type === "number" ? Number(e.target.value) : e.target.value) as never)}
                        className="h-9 w-40 border-border bg-background text-left text-xs"
                      />
                    )
                  ) : (
                    <span className="text-sm font-bold text-foreground">{field.value || "—"}</span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div variants={itemVariants} className="bento-card space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-accent/8">
            <Baby className="w-4 h-4 gold-text" />
          </div>
          <h3 className="text-sm font-bold text-foreground">ילדים - שמות, גילאים וצרכים</h3>
        </div>

        {editing ? (
          <div className="space-y-4">
            <div className="max-w-40">
              <label className="mb-2 block text-xs text-muted-foreground">מספר ילדים</label>
              <Input
                type="number"
                min={0}
                value={form.children_count}
                onChange={(e) => updateField("children_count", Number(e.target.value) as never)}
                className="h-10 border-border bg-background text-sm"
              />
            </div>
            {childRows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/50 p-4 text-sm text-muted-foreground">אין ילדים מוגדרים כרגע.</div>
            ) : (
              <div className="space-y-3">
                {childRows.map((child, index) => (
                  <div key={`child-${index}`} className="grid grid-cols-1 gap-3 rounded-2xl border border-border/40 bg-secondary/30 p-4 md:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-xs text-muted-foreground">שם ילד/ה {index + 1}</label>
                      <Input value={child.name} onChange={(e) => updateChildField(index, "children_names", e.target.value)} placeholder="שם" className="h-10 border-border bg-background text-sm" />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs text-muted-foreground">גיל</label>
                      <Input type="number" min={0} value={child.age} onChange={(e) => updateChildField(index, "children_ages", Number(e.target.value))} placeholder="גיל" className="h-10 border-border bg-background text-sm" />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs text-muted-foreground">צורך בריאותי / הערה</label>
                      <Input value={child.health} onChange={(e) => updateChildField(index, "children_health_needs", e.target.value)} placeholder="לא חובה" className="h-10 border-border bg-background text-sm" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {childRows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/50 p-4 text-sm text-muted-foreground">לא הוגדרו עדיין ילדים בפרופיל.</div>
            ) : (
              childRows.map((child, index) => (
                <div key={`child-view-${index}`} className="grid grid-cols-1 gap-2 rounded-2xl bg-secondary/40 p-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">שם</p>
                    <p className="text-sm font-semibold text-foreground">{child.name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">גיל</p>
                    <p className="text-sm font-semibold text-foreground">{child.age || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">צורך בריאותי / הערה</p>
                    <p className="text-sm font-semibold text-foreground">{child.health || "—"}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </motion.div>

      {/* IVR / Voice System Access */}
      <motion.div variants={itemVariants} className="bento-card space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-accent/8">
            <Shield className="w-4 h-4 gold-text" />
          </div>
          <h3 className="text-sm font-bold text-foreground">גישה למערכת הקולית (IVR)</h3>
        </div>
        <p className="text-xs text-muted-foreground">הגדר תעודת זהות וסיסמה בת 6 ספרות לכניסה למערכת הקולית של ימות המשיח</p>
        <IvrPinManager userId={userId} />
      </motion.div>

      {/* Renter Rights Alert */}
      {displayData.residential_status === "renter" && (
        <motion.div variants={itemVariants} className="bento-card border-s-4 border-accent">
          <div className="flex items-center gap-4">
            <Shield className="w-5 h-5 gold-text" />
            <div>
              <p className="text-sm font-bold text-foreground">{t("rights")}</p>
              <p className="text-xs text-muted-foreground">{t("rent_assistance_alert")}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Business Interest */}
      {!displayData.business_enabled && (
        <motion.div variants={itemVariants} className="bento-card border-2 border-dashed border-accent/30 hover:border-accent/60 cursor-pointer transition-all"
          onClick={() => setShowBusinessInterest(true)}>
          <div className="flex items-center gap-4 py-2">
            <div className="p-3 rounded-2xl bg-accent/10">
              <Briefcase className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">יש לך עסק?</p>
              <p className="text-sm text-muted-foreground">מעוניין לייעל את העסק שלך? לחץ כאן ונחזור אליך</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Business Interest Modal */}
      {showBusinessInterest && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowBusinessInterest(false)}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()}
            className="bento-card w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">🏢 התעניינות בניהול עסקי</h3>
              <button onClick={() => setShowBusinessInterest(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <p className="text-sm text-muted-foreground">ספר לנו על העסק שלך ונחזור אליך בהקדם</p>
            <textarea
              value={businessMessage}
              onChange={(e) => setBusinessMessage(e.target.value)}
              placeholder="שם העסק, סוג הפעילות, מה תרצה לנהל..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <button onClick={handleBusinessInterest} className="w-full py-3 rounded-xl gold-gradient text-primary-foreground font-semibold text-sm">
              שלח בקשה — צרו איתי קשר
            </button>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
