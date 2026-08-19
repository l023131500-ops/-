import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertCanAccessClient(ctx: any, clientId: string) {
  if (ctx.userId === clientId) return;
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

// ---------- Personal ----------
const personalSchema = z.object({
  client_id: z.string().uuid(),
  id_number: z.string().max(64).nullish(),
  date_of_birth: z.string().nullish(),
  gender: z.string().max(32).nullish(),
  marital_status: z.string().max(32).nullish(),
  address_street: z.string().max(255).nullish(),
  address_city: z.string().max(128).nullish(),
  address_zip: z.string().max(32).nullish(),
  address_country: z.string().max(64).nullish(),
  residency_status: z.string().max(64).nullish(),
  occupation: z.string().max(128).nullish(),
  employer: z.string().max(128).nullish(),
  notes: z.string().max(2000).nullish(),
});

export const upsertPersonalDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => personalSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertCanAccessClient(context as any, data.client_id);
    const { error } = await (context as any).supabase
      .from("client_personal_details")
      .upsert(data, { onConflict: "client_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Financial ----------
const financialSchema = z.object({
  client_id: z.string().uuid(),
  monthly_income: z.number().nullish(),
  monthly_expenses: z.number().nullish(),
  assets_summary: z.string().max(2000).nullish(),
  liabilities_summary: z.string().max(2000).nullish(),
  bank_name: z.string().max(128).nullish(),
  account_type: z.string().max(64).nullish(),
  tax_residency: z.string().max(64).nullish(),
  risk_profile: z.string().max(64).nullish(),
  notes: z.string().max(2000).nullish(),
});

export const upsertFinancialProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => financialSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertCanAccessClient(context as any, data.client_id);
    const { error } = await (context as any).supabase
      .from("client_financial_profile")
      .upsert(data, { onConflict: "client_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Family ----------
const familySchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid(),
  relation: z.string().min(1).max(32),
  full_name: z.string().min(1).max(200),
  id_number: z.string().max(64).nullish(),
  date_of_birth: z.string().nullish(),
  dependent: z.boolean().default(false),
  notes: z.string().max(1000).nullish(),
});

export const upsertFamilyMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => familySchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertCanAccessClient(context as any, data.client_id);
    const { error } = await (context as any).supabase
      .from("client_family_members")
      .upsert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteFamilyMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), client_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCanAccessClient(context as any, data.client_id);
    const { error } = await (context as any).supabase
      .from("client_family_members").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Employment ----------
const employmentSchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid(),
  employer: z.string().min(1).max(200),
  role: z.string().max(128).nullish(),
  start_date: z.string().nullish(),
  end_date: z.string().nullish(),
  monthly_gross: z.number().nullish(),
  notes: z.string().max(1000).nullish(),
});

export const upsertEmployment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => employmentSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertCanAccessClient(context as any, data.client_id);
    const { error } = await (context as any).supabase
      .from("client_employment_history").upsert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteEmployment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), client_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCanAccessClient(context as any, data.client_id);
    const { error } = await (context as any).supabase
      .from("client_employment_history").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Bank accounts ----------
const bankSchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid(),
  bank: z.string().min(1).max(128),
  branch: z.string().max(32).nullish(),
  account_number_last4: z.string().max(8).nullish(),
  account_type: z.string().max(32).nullish(),
  currency: z.string().max(8).default("ILS"),
  is_primary: z.boolean().default(false),
  notes: z.string().max(1000).nullish(),
});

export const upsertBankAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => bankSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertCanAccessClient(context as any, data.client_id);
    const { error } = await (context as any).supabase
      .from("client_bank_accounts").upsert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteBankAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), client_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCanAccessClient(context as any, data.client_id);
    const { error } = await (context as any).supabase
      .from("client_bank_accounts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Full profile read ----------
export const getClientFullProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ client_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCanAccessClient(context as any, data.client_id);
    const sb = (context as any).supabase;
    const [profile, personal, financial, family, employment, banks, docs] = await Promise.all([
      sb.from("profiles").select("*").eq("id", data.client_id).maybeSingle(),
      sb.from("client_personal_details").select("*").eq("client_id", data.client_id).maybeSingle(),
      sb.from("client_financial_profile").select("*").eq("client_id", data.client_id).maybeSingle(),
      sb.from("client_family_members").select("*").eq("client_id", data.client_id).order("created_at"),
      sb.from("client_employment_history").select("*").eq("client_id", data.client_id).order("start_date", { ascending: false }),
      sb.from("client_bank_accounts").select("*").eq("client_id", data.client_id).order("is_primary", { ascending: false }),
      sb.from("documents").select("*").eq("owner_client_id", data.client_id).order("created_at", { ascending: false }),
    ]);
    return {
      profile: profile.data,
      personal: personal.data,
      financial: financial.data,
      family: family.data ?? [],
      employment: employment.data ?? [],
      bank_accounts: banks.data ?? [],
      documents: docs.data ?? [],
    };
  });
