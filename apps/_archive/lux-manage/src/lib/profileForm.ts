import type { UserProfile } from "@/contexts/AppContext";

export interface EditableProfileForm {
  name: string;
  family_status: string;
  children_count: number;
  children_names: string[];
  children_ages: number[];
  children_health_needs: string[];
  monthly_income: number;
  business_dividends: number;
  passive_income: number;
  recurring_support: number;
  yearly_bonus: number;
  one_time_income: number;
  living_standard: string;
  health_fund: string;
  special_health_needs: string;
  residential_status: "owner" | "renter" | "mortgage";
  city: string;
  sector: string;
  rent_amount: number;
  mortgage_monthly: number;
  daily_expenses: number;
  weekly_expenses: number;
  monthly_fixed_expenses: number;
  yearly_fixed_expenses: number;
  business_enabled: boolean;
  car_type: string;
  car_year: number;
  real_estate_assets: string;
  credit_card_debt: number;
}

const normalizeNumber = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeText = (value: unknown) => (typeof value === "string" ? value : "").trim();

const resizeList = <T,>(list: T[], size: number, factory: () => T): T[] => {
  const next = Array.from({ length: Math.max(0, size) }, (_, index) => list[index] ?? factory());
  return next;
};

export function createEditableProfileFromApp(profile: UserProfile): EditableProfileForm {
  return {
    name: profile.name || "",
    family_status: profile.familyStatus || "",
    children_count: Math.max(profile.childrenCount || 0, profile.childrenNames.length, profile.childrenAges.length, profile.childrenHealthNeeds.length),
    children_names: profile.childrenNames || [],
    children_ages: profile.childrenAges || [],
    children_health_needs: profile.childrenHealthNeeds || [],
    monthly_income: profile.monthlyIncome || 0,
    business_dividends: profile.businessDividends || 0,
    passive_income: profile.passiveIncome || 0,
    recurring_support: profile.recurringSupport || 0,
    yearly_bonus: profile.yearlyBonus || 0,
    one_time_income: profile.oneTimeIncome || 0,
    living_standard: profile.livingStandard || "בינוני",
    health_fund: profile.healthFund || "",
    special_health_needs: profile.specialHealthNeeds || "",
    residential_status: profile.residentialStatus || "renter",
    city: profile.city || "",
    sector: profile.sector || "",
    rent_amount: profile.rentAmount || 0,
    mortgage_monthly: profile.mortgageMonthly || 0,
    daily_expenses: profile.dailyExpenses || 0,
    weekly_expenses: profile.weeklyExpenses || 0,
    monthly_fixed_expenses: profile.monthlyFixedExpenses || 0,
    yearly_fixed_expenses: profile.yearlyFixedExpenses || 0,
    business_enabled: false,
    car_type: "",
    car_year: 0,
    real_estate_assets: "",
    credit_card_debt: 0,
  };
}

export function createEditableProfileFromDb(data: Record<string, unknown>, fallback: EditableProfileForm): EditableProfileForm {
  return {
    name: normalizeText(data.name) || fallback.name,
    family_status: normalizeText(data.family_status) || fallback.family_status,
    children_count: Math.max(
      normalizeNumber(data.children_count),
      Array.isArray(data.children_names) ? data.children_names.length : 0,
      Array.isArray(data.children_ages) ? data.children_ages.length : 0,
      Array.isArray(data.children_health_needs) ? data.children_health_needs.length : 0,
    ),
    children_names: Array.isArray(data.children_names) ? data.children_names.map((item) => normalizeText(item)) : fallback.children_names,
    children_ages: Array.isArray(data.children_ages) ? data.children_ages.map((item) => normalizeNumber(item)) : fallback.children_ages,
    children_health_needs: Array.isArray(data.children_health_needs) ? data.children_health_needs.map((item) => normalizeText(item)) : fallback.children_health_needs,
    monthly_income: normalizeNumber(data.monthly_income ?? fallback.monthly_income),
    business_dividends: normalizeNumber(data.business_dividends ?? fallback.business_dividends),
    passive_income: normalizeNumber(data.passive_income ?? fallback.passive_income),
    recurring_support: normalizeNumber(data.recurring_support ?? fallback.recurring_support),
    yearly_bonus: normalizeNumber(data.yearly_bonus ?? fallback.yearly_bonus),
    one_time_income: normalizeNumber(data.one_time_income ?? fallback.one_time_income),
    living_standard: normalizeText(data.living_standard) || fallback.living_standard,
    health_fund: normalizeText(data.health_fund) || fallback.health_fund,
    special_health_needs: normalizeText(data.special_health_needs) || fallback.special_health_needs,
    residential_status: (["owner", "renter", "mortgage"] as const).includes(data.residential_status as "owner" | "renter" | "mortgage")
      ? (data.residential_status as "owner" | "renter" | "mortgage")
      : fallback.residential_status,
    city: normalizeText(data.city) || fallback.city,
    sector: normalizeText(data.sector) || fallback.sector,
    rent_amount: normalizeNumber(data.rent_amount ?? fallback.rent_amount),
    mortgage_monthly: normalizeNumber(data.mortgage_monthly ?? fallback.mortgage_monthly),
    daily_expenses: normalizeNumber(data.daily_expenses ?? fallback.daily_expenses),
    weekly_expenses: normalizeNumber(data.weekly_expenses ?? fallback.weekly_expenses),
    monthly_fixed_expenses: normalizeNumber(data.monthly_fixed_expenses ?? fallback.monthly_fixed_expenses),
    yearly_fixed_expenses: normalizeNumber(data.yearly_fixed_expenses ?? fallback.yearly_fixed_expenses),
    business_enabled: Boolean(data.business_enabled ?? fallback.business_enabled),
    car_type: normalizeText(data.car_type) || fallback.car_type,
    car_year: normalizeNumber(data.car_year ?? fallback.car_year),
    real_estate_assets: normalizeText(data.real_estate_assets) || fallback.real_estate_assets,
    credit_card_debt: normalizeNumber(data.credit_card_debt ?? fallback.credit_card_debt),
  };
}

export function sanitizeEditableProfile(form: EditableProfileForm): EditableProfileForm {
  const childCount = Math.max(0, normalizeNumber(form.children_count));

  return {
    ...form,
    name: normalizeText(form.name),
    family_status: normalizeText(form.family_status),
    children_count: childCount,
    children_names: resizeList(form.children_names, childCount, () => "").map((item) => normalizeText(item)),
    children_ages: resizeList(form.children_ages, childCount, () => 0).map((item) => normalizeNumber(item)),
    children_health_needs: resizeList(form.children_health_needs, childCount, () => "").map((item) => normalizeText(item)),
    monthly_income: normalizeNumber(form.monthly_income),
    business_dividends: normalizeNumber(form.business_dividends),
    passive_income: normalizeNumber(form.passive_income),
    recurring_support: normalizeNumber(form.recurring_support),
    yearly_bonus: normalizeNumber(form.yearly_bonus),
    one_time_income: normalizeNumber(form.one_time_income),
    living_standard: normalizeText(form.living_standard) || "בינוני",
    health_fund: normalizeText(form.health_fund),
    special_health_needs: normalizeText(form.special_health_needs),
    city: normalizeText(form.city),
    sector: normalizeText(form.sector),
    rent_amount: normalizeNumber(form.rent_amount),
    mortgage_monthly: normalizeNumber(form.mortgage_monthly),
    daily_expenses: normalizeNumber(form.daily_expenses),
    weekly_expenses: normalizeNumber(form.weekly_expenses),
    monthly_fixed_expenses: normalizeNumber(form.monthly_fixed_expenses),
    yearly_fixed_expenses: normalizeNumber(form.yearly_fixed_expenses),
    car_type: normalizeText(form.car_type),
    car_year: normalizeNumber(form.car_year),
    real_estate_assets: normalizeText(form.real_estate_assets),
    credit_card_debt: normalizeNumber(form.credit_card_debt),
  };
}