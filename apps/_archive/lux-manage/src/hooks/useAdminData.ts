import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// Types for admin data
export interface ClientRecord {
  id: string;
  name: string;
  email: string;
  family_status: string;
  children_count: number;
  monthly_income: number;
  tier: string;
  business_enabled: boolean;
  profile_complete: boolean;
  onboarding_complete: boolean;
  credit_card_debt: number;
  created_at: string;
}

export interface DynamicQuestion {
  id: string;
  text: string;
  type: string;
  options: string[];
  target_segment: string;
  condition_alerts: any[];
  required: boolean;
  created_at: string;
}

export interface AcademyContent {
  id: string;
  title: string;
  type: string;
  category: string;
  content: string;
  duration: string;
  icon: string;
  created_at: string;
}

export function useAdminClients() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("*") as any;
    if (data) setClients(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const updateClientTier = useCallback(async (id: string, tier: string) => {
    await supabase.from("profiles").update({ tier, business_enabled: tier === "premium" } as any).eq("id", id);
    setClients(prev => prev.map(c => c.id === id ? { ...c, tier, business_enabled: tier === "premium" } : c));
  }, []);

  const toggleBusinessAccess = useCallback(async (id: string) => {
    const client = clients.find(c => c.id === id);
    if (!client) return;
    await supabase.from("profiles").update({ business_enabled: !client.business_enabled } as any).eq("id", id);
    setClients(prev => prev.map(c => c.id === id ? { ...c, business_enabled: !c.business_enabled } : c));
  }, [clients]);

  return { clients, loading, updateClientTier, toggleBusinessAccess, refetch: fetchClients };
}

export function useAdminQuestions() {
  const [questions, setQuestions] = useState<DynamicQuestion[]>([]);

  const fetchQuestions = useCallback(async () => {
    const { data } = await supabase.from("dynamic_questions").select("*") as any;
    if (data) setQuestions(data);
  }, []);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const addQuestion = useCallback(async (q: Omit<DynamicQuestion, "id" | "created_at">) => {
    const { data } = await supabase.from("dynamic_questions").insert(q as any).select().single() as any;
    if (data) setQuestions(prev => [...prev, data]);
  }, []);

  const removeQuestion = useCallback(async (id: string) => {
    await supabase.from("dynamic_questions").delete().eq("id", id);
    setQuestions(prev => prev.filter(q => q.id !== id));
  }, []);

  return { questions, addQuestion, removeQuestion };
}

export function useAdminAcademy() {
  const [content, setContent] = useState<AcademyContent[]>([]);

  const fetchContent = useCallback(async () => {
    const { data } = await supabase.from("academy_content").select("*") as any;
    if (data) setContent(data);
  }, []);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const addContent = useCallback(async (c: Omit<AcademyContent, "id" | "created_at">) => {
    const { data } = await supabase.from("academy_content").insert(c as any).select().single() as any;
    if (data) setContent(prev => [...prev, data]);
  }, []);

  const removeContent = useCallback(async (id: string) => {
    await supabase.from("academy_content").delete().eq("id", id);
    setContent(prev => prev.filter(c => c.id !== id));
  }, []);

  return { content, addContent, removeContent };
}

export function useConditionRules() {
  const [rules, setRules] = useState<any[]>([]);

  const fetchRules = useCallback(async () => {
    const { data } = await supabase.from("condition_rules").select("*") as any;
    if (data) setRules(data);
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const addRule = useCallback(async (rule: any) => {
    const { data } = await supabase.from("condition_rules").insert(rule as any).select().single() as any;
    if (data) setRules(prev => [...prev, data]);
  }, []);

  const removeRule = useCallback(async (id: string) => {
    await supabase.from("condition_rules").delete().eq("id", id);
    setRules(prev => prev.filter(r => r.id !== id));
  }, []);

  return { rules, addRule, removeRule };
}
