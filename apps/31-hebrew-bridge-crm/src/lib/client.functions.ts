import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const DOCUMENT_CATEGORIES = [
  { value: "tax_report", label: "דוח מס" },
  { value: "pay_slip", label: "תלוש שכר" },
  { value: "contract", label: "חוזה" },
  { value: "id_doc", label: "תעודת זהות" },
  { value: "bank_statement", label: "דף חשבון בנק" },
  { value: "other", label: "אחר" },
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number]["value"];

export type UploadedDocument = {
  id: string;
  name: string;
  path: string;
  mime: string;
  size: number;
  uploaded_at: string;
  status: "pending_review" | "approved" | "rejected";
  category?: DocumentCategory | null;
};

export type ClientDashboardData = {
  userId: string;
  fullName: string | null;
  treatmentStatus: "not_started" | "sent" | "in_progress" | "completed";
  assignedPartnerName: string | null;
  uploadedDocuments: UploadedDocument[];
};

export const getClientDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ClientDashboardData> => {
    const { supabase, userId } = context as any;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();

    const { data: clientProfile, error: cpErr } = await supabase
      .from("client_profiles")
      .select("uploaded_documents")
      .eq("id", userId)
      .maybeSingle();
    if (cpErr) throw new Error(cpErr.message);

    const { data: assignment } = await supabase
      .from("partner_assignments")
      .select("partner_id, treatment_status, created_at")
      .eq("client_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let partnerName: string | null = null;
    if (assignment?.partner_id) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: pProfile } = await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("id", assignment.partner_id)
        .maybeSingle();
      partnerName = pProfile?.full_name ?? null;
    }

    const rawDocs = clientProfile?.uploaded_documents;
    const docs: UploadedDocument[] = Array.isArray(rawDocs) ? (rawDocs as any[]) : [];

    return {
      userId,
      fullName: profile?.full_name ?? null,
      treatmentStatus: (assignment?.treatment_status as any) ?? "not_started",
      assignedPartnerName: partnerName,
      uploadedDocuments: docs,
    };
  });

const categoryValues = DOCUMENT_CATEGORIES.map((c) => c.value) as [
  DocumentCategory,
  ...DocumentCategory[],
];

const documentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  path: z.string().min(1).max(512),
  mime: z.enum(["application/pdf", "image/png", "image/jpeg"]),
  size: z.number().int().min(1).max(5 * 1024 * 1024),
  category: z.enum(categoryValues).optional().nullable(),
});

export const appendUploadedDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof documentSchema>) => documentSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;

    // Verify path is owned by user
    if (!data.path.startsWith(`${userId}/`)) {
      throw new Error("Invalid storage path");
    }

    const { data: row, error: readErr } = await supabase
      .from("client_profiles")
      .select("uploaded_documents")
      .eq("id", userId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);

    const current: UploadedDocument[] = Array.isArray(row?.uploaded_documents)
      ? (row!.uploaded_documents as any[])
      : [];

    const entry: UploadedDocument = {
      id: data.id,
      name: data.name,
      path: data.path,
      mime: data.mime,
      size: data.size,
      uploaded_at: new Date().toISOString(),
      status: "pending_review",
      category: data.category ?? null,
    };

    const { error: upErr } = await supabase
      .from("client_profiles")
      .update({ uploaded_documents: [...current, entry] })
      .eq("id", userId);
    if (upErr) throw new Error(upErr.message);

    return { ok: true, document: entry };
  });

export const removeUploadedDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;

    const { data: row, error: readErr } = await supabase
      .from("client_profiles")
      .select("uploaded_documents")
      .eq("id", userId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);

    const current: UploadedDocument[] = Array.isArray(row?.uploaded_documents)
      ? (row!.uploaded_documents as any[])
      : [];
    const target = current.find((d) => d.id === data.id);
    if (!target) return { ok: true };

    if (!target.path.startsWith(`${userId}/`)) {
      throw new Error("Invalid storage path");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.storage.from("client-documents").remove([target.path]);

    const next = current.filter((d) => d.id !== data.id);
    const { error: upErr } = await supabase
      .from("client_profiles")
      .update({ uploaded_documents: next })
      .eq("id", userId);
    if (upErr) throw new Error(upErr.message);

    return { ok: true };
  });
