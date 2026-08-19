import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadFromStorage, saveToStorage } from "@/lib/localStorage";

export type AppMode = "household" | "business";
export type Language = "en" | "he";

export interface ChildProfile {
  name: string;
  age: number;
  healthNeeds: string;
}

export interface LoanEntry {
  id: string;
  description: string;
  totalAmount: number;
  monthlyPayment: number;
  remainingMonths: number;
}

export interface UserProfile {
  name: string;
  familyStatus: string;
  childrenCount: number;
  childrenAges: number[];
  childrenNames: string[];
  childrenHealthNeeds: string[];
  monthlyIncome: number;
  businessDividends: number;
  passiveIncome: number;
  recurringSupport: number;
  yearlyBonus: number;
  oneTimeIncome: number;
  livingStandard: string;
  healthFund: string;
  specialHealthNeeds: string;
  residentialStatus: "owner" | "renter" | "mortgage";
  mortgageMonthly: number;
  rentAmount: number;
  carType: string;
  carYear: number;
  realEstateAssets: string;
  loans: LoanEntry[];
  creditCardDebt: number;
  familyFinancialHelp: boolean;
  familyHelpAmount: number;
  sector: string;
  city: string;
  dailyExpenses: number;
  weeklyExpenses: number;
  monthlyFixedExpenses: number;
  yearlyFixedExpenses: number;
  profileComplete: boolean;
}

interface AppContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  userId: string | null;
  setUserId: (id: string | null) => void;
  t: (key: string) => string;
}

const translations: Record<string, Record<Language, string>> = {
  greeting: { en: "Good morning", he: "בוקר טוב" },
  household: { en: "Household", he: "משק בית" },
  business: { en: "Business", he: "עסקי" },
  dashboard: { en: "Dashboard", he: "לוח בקרה" },
  profile: { en: "Profile", he: "פרופיל" },
  expenses: { en: "Expenses", he: "הוצאות" },
  income: { en: "Income", he: "הכנסות" },
  tasks: { en: "Tasks", he: "משימות" },
  rights: { en: "Rights & Benefits", he: "זכויות והטבות" },
  settings: { en: "Settings", he: "הגדרות" },
  add_expense: { en: "Add Expense", he: "הוסף הוצאה" },
  add_income: { en: "Add Income", he: "הוסף הכנסה" },
  new_task: { en: "New Task", he: "משימה חדשה" },
  current_balance: { en: "Current Balance", he: "יתרה נוכחית" },
  monthly_income_label: { en: "Monthly Income", he: "הכנסה חודשית" },
  monthly_expenses: { en: "Monthly Expenses", he: "הוצאות חודשיות" },
  savings: { en: "Savings", he: "חסכונות" },
  personal_details: { en: "Personal Details", he: "פרטים אישיים" },
  family_status: { en: "Family Status", he: "מצב משפחתי" },
  children: { en: "Children", he: "ילדים" },
  monthly_income_per_capita: { en: "Monthly Income Per Capita", he: "הכנסה חודשית לנפש" },
  living_standard: { en: "Living Standard", he: "רמת חיים" },
  health_fund: { en: "Health Fund", he: "קופת חולים" },
  special_health_needs: { en: "Special Health Needs", he: "צרכים בריאותיים מיוחדים" },
  residential_status: { en: "Residential Status", he: "סטטוס מגורים" },
  owner: { en: "Owner", he: "בעלים" },
  renter: { en: "Renter", he: "שוכר" },
  rent_assistance_alert: { en: "You may be eligible for rent assistance", he: "ייתכן שאתה זכאי לסיוע בשכר דירה" },
  financial_baseline: { en: "Financial Baseline", he: "בסיס פיננסי" },
  health_social: { en: "Health & Social", he: "בריאות וחברה" },
  switch_mode: { en: "Switch Mode", he: "החלף מצב" },
  quick_actions: { en: "Quick Actions", he: "פעולות מהירות" },
  financial_overview: { en: "Financial Overview", he: "סקירה פיננסית" },
  expense_tracker: { en: "Expense Tracker", he: "מעקב הוצאות" },
  family_future: { en: "Family Future", he: "עתיד המשפחה" },
  financial_health: { en: "Financial Health", he: "בריאות פיננסית" },
  suppliers: { en: "Suppliers", he: "ספקים" },
  timeline: { en: "Smart Timeline", he: "ציר זמן חכם" },
  expert_chat: { en: "Expert Chat", he: "צ׳אט עם מומחה" },
  benefits: { en: "Rights & Benefits", he: "זכויות והטבות" },
  upcoming_payments: { en: "Upcoming Payments", he: "תשלומים קרובים" },
};

export const emptyProfile: UserProfile = {
  name: "",
  familyStatus: "",
  childrenCount: 0,
  childrenAges: [],
  childrenNames: [],
  childrenHealthNeeds: [],
  monthlyIncome: 0,
  businessDividends: 0,
  passiveIncome: 0,
  recurringSupport: 0,
  yearlyBonus: 0,
  oneTimeIncome: 0,
  livingStandard: "בינוני",
  healthFund: "",
  specialHealthNeeds: "",
  residentialStatus: "renter",
  mortgageMonthly: 0,
  rentAmount: 0,
  carType: "",
  carYear: 0,
  realEstateAssets: "",
  loans: [],
  creditCardDebt: 0,
  familyFinancialHelp: false,
  familyHelpAmount: 0,
  sector: "",
  city: "",
  dailyExpenses: 0,
  weeklyExpenses: 0,
  monthlyFixedExpenses: 0,
  yearlyFixedExpenses: 0,
  profileComplete: false,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const pickString = (incoming: string | null | undefined, fallback: string) =>
  typeof incoming === "string" && incoming.trim() !== "" ? incoming : fallback;

const pickNumber = (incoming: number | null | undefined, fallback: number) => {
  const normalized = Number(incoming);
  return Number.isFinite(normalized) && normalized !== 0 ? normalized : fallback;
};

const pickStringArray = (incoming: unknown, fallback: string[]) =>
  Array.isArray(incoming) && incoming.length > 0 ? incoming.map(String) : fallback;

const pickNumberArray = (incoming: unknown, fallback: number[]) =>
  Array.isArray(incoming) && incoming.length > 0 ? incoming.map((value) => Number(value) || 0) : fallback;

function mapDbProfile(data: any): UserProfile {
  return {
    name: data.name || "",
    familyStatus: data.family_status || "",
    childrenCount: data.children_count || 0,
    childrenAges: (data.children_ages as number[]) || [],
    childrenNames: (data.children_names as string[]) || [],
    childrenHealthNeeds: (data.children_health_needs as string[]) || [],
    monthlyIncome: Number(data.monthly_income) || 0,
    businessDividends: Number(data.business_dividends) || 0,
    passiveIncome: Number(data.passive_income) || 0,
    recurringSupport: Number(data.recurring_support) || 0,
    yearlyBonus: Number(data.yearly_bonus) || 0,
    oneTimeIncome: Number(data.one_time_income) || 0,
    livingStandard: data.living_standard || "בינוני",
    healthFund: data.health_fund || "",
    specialHealthNeeds: data.special_health_needs || "",
    residentialStatus: (data.residential_status as "owner" | "renter" | "mortgage") || "renter",
    mortgageMonthly: Number(data.mortgage_monthly) || 0,
    rentAmount: Number(data.rent_amount) || 0,
    carType: data.car_type || "",
    carYear: data.car_year || 0,
    realEstateAssets: data.real_estate_assets || "",
    loans: (data.loans as any[]) || [],
    creditCardDebt: Number(data.credit_card_debt) || 0,
    familyFinancialHelp: data.family_financial_help || false,
    familyHelpAmount: Number(data.family_help_amount) || 0,
    sector: data.sector || "",
    city: data.city || "",
    dailyExpenses: Number(data.daily_expenses) || 0,
    weeklyExpenses: Number(data.weekly_expenses) || 0,
    monthlyFixedExpenses: Number(data.monthly_fixed_expenses) || 0,
    yearlyFixedExpenses: Number(data.yearly_fixed_expenses) || 0,
    profileComplete: data.profile_complete || false,
  };
}

function mergeProfiles(stored: UserProfile, dbProfile: UserProfile): UserProfile {
  return {
    name: pickString(dbProfile.name, stored.name),
    familyStatus: pickString(dbProfile.familyStatus, stored.familyStatus),
    childrenCount: pickNumber(dbProfile.childrenCount, stored.childrenCount),
    childrenAges: pickNumberArray(dbProfile.childrenAges, stored.childrenAges),
    childrenNames: pickStringArray(dbProfile.childrenNames, stored.childrenNames),
    childrenHealthNeeds: pickStringArray(dbProfile.childrenHealthNeeds, stored.childrenHealthNeeds),
    monthlyIncome: pickNumber(dbProfile.monthlyIncome, stored.monthlyIncome),
    businessDividends: pickNumber(dbProfile.businessDividends, stored.businessDividends),
    passiveIncome: pickNumber(dbProfile.passiveIncome, stored.passiveIncome),
    recurringSupport: pickNumber(dbProfile.recurringSupport, stored.recurringSupport),
    yearlyBonus: pickNumber(dbProfile.yearlyBonus, stored.yearlyBonus),
    oneTimeIncome: pickNumber(dbProfile.oneTimeIncome, stored.oneTimeIncome),
    livingStandard: pickString(dbProfile.livingStandard, stored.livingStandard),
    healthFund: pickString(dbProfile.healthFund, stored.healthFund),
    specialHealthNeeds: pickString(dbProfile.specialHealthNeeds, stored.specialHealthNeeds),
    residentialStatus: dbProfile.residentialStatus || stored.residentialStatus,
    mortgageMonthly: pickNumber(dbProfile.mortgageMonthly, stored.mortgageMonthly),
    rentAmount: pickNumber(dbProfile.rentAmount, stored.rentAmount),
    carType: pickString(dbProfile.carType, stored.carType),
    carYear: pickNumber(dbProfile.carYear, stored.carYear),
    realEstateAssets: pickString(dbProfile.realEstateAssets, stored.realEstateAssets),
    loans: Array.isArray(dbProfile.loans) && dbProfile.loans.length > 0 ? dbProfile.loans : stored.loans,
    creditCardDebt: pickNumber(dbProfile.creditCardDebt, stored.creditCardDebt),
    familyFinancialHelp: dbProfile.familyFinancialHelp || stored.familyFinancialHelp,
    familyHelpAmount: pickNumber(dbProfile.familyHelpAmount, stored.familyHelpAmount),
    sector: pickString(dbProfile.sector, stored.sector),
    city: pickString(dbProfile.city, stored.city),
    dailyExpenses: pickNumber(dbProfile.dailyExpenses, stored.dailyExpenses),
    weeklyExpenses: pickNumber(dbProfile.weeklyExpenses, stored.weeklyExpenses),
    monthlyFixedExpenses: pickNumber(dbProfile.monthlyFixedExpenses, stored.monthlyFixedExpenses),
    yearlyFixedExpenses: pickNumber(dbProfile.yearlyFixedExpenses, stored.yearlyFixedExpenses),
    profileComplete: dbProfile.profileComplete || stored.profileComplete,
  };
}

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<AppMode>("household");
  const [language, setLanguage] = useState<Language>("he");
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfileState] = useState<UserProfile>(emptyProfile);

  // Load user-scoped profile from DB when userId changes
  useEffect(() => {
    if (!userId || !UUID_PATTERN.test(userId)) {
      setProfileState(emptyProfile);
      return;
    }
    // First load from localStorage for instant display
    const stored = loadFromStorage<UserProfile>(`profile_${userId}`, emptyProfile);
    setProfileState(stored);

    // Then sync from database
    (async () => {
      try {
        const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
        if (data) {
          const mergedProfile = mergeProfiles(stored, mapDbProfile(data));
          setProfileState(mergedProfile);
          saveToStorage(`profile_${userId}`, mergedProfile);
        }
      } catch (err) {
        console.error("Failed to sync profile from DB:", err);
      }
    })();
  }, [userId]);

  const setProfile = (p: UserProfile) => {
    setProfileState(p);
    if (userId) {
      saveToStorage(`profile_${userId}`, p);
    }
  };

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <AppContext.Provider value={{ mode, setMode, language, setLanguage, profile, setProfile, userId, setUserId, t }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
