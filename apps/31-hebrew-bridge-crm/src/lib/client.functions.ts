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

type DocumentRow = {
  id: string;
  name: string;
  storage_path: string;
  mime: string | null;
  size: number | null;
  created_at: string;
  status: string | null;
  category: string | null;
};

function toUploadedDocument(row: DocumentRow): UploadedDocument {
  return {
    id: row.id,
    name: row.name,
    path: row.storage_path,
    mime: row.mime ?? "",
    size: Number(row.size ?? 0),
    uploaded_at: row.created_at,
    status: (row.status as UploadedDocument["status"]) ?? "pending_review",
    category: (row.category as DocumentCategory | null) ?? null,
  };
}

const DOCUMENT_COLUMNS = "id, name, storage_path, mime, size, created_at, status, category";

export const getClientDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ClientDashboardData> => {
    const { supabase, userId } = context as any;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();

    const { data: docRows, error: docErr } = await supabase
      .from("documents")
      .select(DOCUMENT_COLUMNS)
      .eq("owner_client_id", userId)
      .order("created_at", { ascending: false });
    if (docErr) throw new Error(docErr.message);

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

    const docs: UploadedDocument[] = ((docRows ?? []) as DocumentRow[]).map(toUploadedDocument);

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

    const { data: inserted, error: insErr } = await supabase
      .from("documents")
      .insert({
        id: data.id,
        owner_client_id: userId,
        uploaded_by: userId,
        name: data.name,
        storage_path: data.path,
        mime: data.mime,
        size: data.size,
        status: "pending_review",
        category: data.category ?? null,
      })
      .select(DOCUMENT_COLUMNS);
    if (insErr) throw new Error(insErr.message);
    // A write filtered out by RLS is not an error in PostgREST — it returns zero rows.
    if (!inserted || inserted.length === 0) {
      throw new Error("שמירת המסמך נכשלה — אין הרשאה לרשום את המסמך בתיק.");
    }

    return { ok: true, document: toUploadedDocument(inserted[0] as DocumentRow) };
  });

export const getDocumentDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;

    const { data: target, error: readErr } = await supabase
      .from("documents")
      .select("id, storage_path")
      .eq("id", data.id)
      .eq("owner_client_id", userId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!target) throw new Error("המסמך לא נמצא או שאין הרשאה לצפות בו.");

    if (!target.storage_path.startsWith(`${userId}/`)) {
      throw new Error("Invalid storage path");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("client-documents")
      .createSignedUrl(target.storage_path, 60);
    if (signErr) throw new Error(signErr.message);
    if (!signed?.signedUrl) throw new Error("יצירת קישור להורדה נכשלה.");

    return { ok: true, url: signed.signedUrl };
  });

export const removeUploadedDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;

    const { data: target, error: readErr } = await supabase
      .from("documents")
      .select("id, storage_path")
      .eq("id", data.id)
      .eq("owner_client_id", userId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!target) return { ok: true };

    if (!target.storage_path.startsWith(`${userId}/`)) {
      throw new Error("Invalid storage path");
    }

    const { data: deleted, error: delErr } = await supabase
      .from("documents")
      .delete()
      .eq("id", data.id)
      .eq("owner_client_id", userId)
      .select("id");
    if (delErr) throw new Error(delErr.message);
    // A delete filtered out by RLS is not an error in PostgREST — it returns zero rows.
    if (!deleted || deleted.length === 0) {
      throw new Error("מחיקת המסמך נכשלה — אין הרשאה להסיר את המסמך מהתיק.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.storage.from("client-documents").remove([target.storage_path]);

    return { ok: true };
  });

export type ClientConsent = {
  category: string;
  allowedFields: string[];
  isGranted: boolean;
  updatedAt: string | null;
};

export const getClientConsents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ClientConsent[]> => {
    const { supabase, userId } = context as any;

    // The catalogue of partner categories lives in visibility_rules, which every
    // authenticated user may read. Never invent a category that is not a row there.
    const { data: rules, error: rulesErr } = await supabase
      .from("visibility_rules")
      .select("partner_category, allowed_schema_fields")
      .order("partner_category");
    if (rulesErr) throw new Error(rulesErr.message);

    const { data: consents, error: consErr } = await supabase
      .from("client_consents")
      .select("partner_category, is_granted, updated_at")
      .eq("client_id", userId);
    if (consErr) throw new Error(consErr.message);

    const granted = new Map<string, { is_granted: boolean; updated_at: string | null }>(
      ((consents ?? []) as any[]).map((c) => [
        c.partner_category as string,
        { is_granted: Boolean(c.is_granted), updated_at: (c.updated_at as string) ?? null },
      ])
    );

    return ((rules ?? []) as any[]).map((r) => {
      const existing = granted.get(r.partner_category as string);
      return {
        category: r.partner_category as string,
        allowedFields: Array.isArray(r.allowed_schema_fields)
          ? (r.allowed_schema_fields as string[])
          : [],
        isGranted: existing?.is_granted ?? false,
        updatedAt: existing?.updated_at ?? null,
      };
    });
  });

export const setClientConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { category: string; isGranted: boolean }) =>
    z.object({ category: z.string().min(1).max(100), isGranted: z.boolean() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;

    // Only a category that actually exists as a visibility rule may be consented to.
    const { data: rule, error: ruleErr } = await supabase
      .from("visibility_rules")
      .select("partner_category")
      .eq("partner_category", data.category)
      .maybeSingle();
    if (ruleErr) throw new Error(ruleErr.message);
    if (!rule) throw new Error("קטגוריית השותפים אינה קיימת.");

    const { data: saved, error: upErr } = await supabase
      .from("client_consents")
      .upsert(
        { client_id: userId, partner_category: data.category, is_granted: data.isGranted },
        { onConflict: "client_id,partner_category" }
      )
      .select("partner_category, is_granted, updated_at");
    if (upErr) throw new Error(upErr.message);
    // A write filtered out by RLS is not an error in PostgREST — it returns zero rows.
    if (!saved || saved.length === 0) {
      throw new Error("שמירת ההרשאה נכשלה — אין הרשאה לעדכן את השיתוף.");
    }

    return {
      ok: true,
      consent: {
        category: saved[0].partner_category as string,
        isGranted: Boolean(saved[0].is_granted),
        updatedAt: (saved[0].updated_at as string) ?? null,
      },
    };
  });
