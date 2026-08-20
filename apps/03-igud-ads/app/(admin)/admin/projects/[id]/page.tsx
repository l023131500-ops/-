import { createSupabaseService, createSupabaseServiceRaw } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

async function fetchProjectDetail(id: string) {
  const svc = createSupabaseService();
  const raw = createSupabaseServiceRaw();

  const { data: project } = await svc
    .from("ad_projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!project) return null;

  const { data: gens } = await svc
    .from("ad_generations")
    .select("*")
    .eq("project_id", id)
    .order("variation_num");

  const signed = await Promise.all(
    (gens || []).map(async (g: Record<string, unknown>) => {
      if (g.storage_path) {
        const { data: s } = await raw.storage
          .from("ad-outputs")
          .createSignedUrl(g.storage_path as string, 3600);
        return { ...g, image_url: s?.signedUrl || g.image_url };
      }
      return g;
    })
  );

  const { data: payments } = await svc
    .from("ad_payments")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  return { project, generations: signed, payments: payments || [] };
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ready: "bg-green-100 text-green-800",
    generating: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
    completed: "bg-blue-100 text-blue-800",
    pending: "bg-gray-100 text-gray-700",
  };
  const labels: Record<string, string> = {
    ready: "מוכן",
    generating: "בעיבוד",
    error: "שגיאה",
    completed: "הושלם",
    pending: "ממתין",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-800"}`}>
      {labels[status] || status}
    </span>
  );
}

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const data = await fetchProjectDetail(params.id);
  if (!data) return notFound();

  const { project, generations, payments } = data;
  const customerData = (project.customer_data as Record<string, unknown>) || {};
  const parameters = (project.parameters as Record<string, unknown>) || {};

  return (
    <div dir="rtl" className="max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/projects" className="text-gray-600 hover:text-gray-700 text-sm">
          ← חזרה לפרויקטים
        </Link>
        <span className="text-gray-600">|</span>
        <h1 className="font-serif text-2xl font-bold text-brand-dark">
          {(project.title as string) || params.id}
        </h1>
        <StatusBadge status={project.status as string} />
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {/* Project info */}
        <div className="md:col-span-2 bg-surface rounded-xl border p-5">
          <h2 className="font-semibold mb-3">פרטי פרויקט</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="text-gray-500">מזהה</div>
            <div className="font-mono text-xs">{project.id as string}</div>
            <div className="text-gray-500">מסלול</div>
            <div>{(project.mode as string) || "—"}</div>
            <div className="text-gray-500">תבנית</div>
            <div>{(project.template_id as string) || "—"}</div>
            <div className="text-gray-500">תאריך יצירה</div>
            <div>{new Date(project.created_at as string).toLocaleString("he-IL")}</div>
          </div>
        </div>

        {/* Customer data */}
        <div className="bg-surface rounded-xl border p-5">
          <h2 className="font-semibold mb-3">פרטי לקוח</h2>
          <div className="text-sm space-y-1 text-gray-700">
            {Object.entries(customerData).map(([k, v]) => (
              <div key={k}>
                <span className="text-gray-600">{k}: </span>
                {String(v)}
              </div>
            ))}
            {Object.keys(customerData).length === 0 && <div className="text-gray-600">אין פרטים</div>}
          </div>
        </div>
      </div>

      {/* Payments */}
      {payments.length > 0 && (
        <div className="bg-surface rounded-xl border p-5 mb-6">
          <h2 className="font-semibold mb-3">תשלומים</h2>
          <div className="space-y-2">
            {payments.map((pay: Record<string, unknown>) => (
              <div key={pay.id as string} className="flex items-center justify-between text-sm border rounded p-2">
                <span>₪{pay.amount as number}</span>
                <span>{pay.payer_name as string || "—"}</span>
                <StatusBadge status={pay.status as string} />
                <span className="text-gray-600 text-xs">
                  {new Date(pay.created_at as string).toLocaleString("he-IL")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generated images */}
      <div className="bg-surface rounded-xl border p-5 mb-6">
        <h2 className="font-semibold mb-3">תמונות שנוצרו</h2>
        {generations.length === 0 ? (
          <div className="text-gray-600 text-sm">אין תמונות עדיין.</div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {generations.map((g: Record<string, unknown>) => (
              <div key={g.id as string} className="border rounded-lg p-3 text-center">
                {g.image_url ? (
                  <img
                    src={g.image_url as string}
                    alt={`וריאציה ${g.variation_num as number}`}
                    className="rounded-lg w-full object-cover mb-2"
                  />
                ) : null}
                <div className="text-xs text-gray-600 mb-1">וריאציה {g.variation_num as number}</div>
                {g.selected ? <div className="text-xs text-green-700 font-medium">✓ נבחרה</div> : null}
                {g.image_url ? (
                  <a
                    href={g.image_url as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="text-xs text-brand-blue hover:underline block mt-1"
                  >
                    הורד תמונה
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Parameters JSON */}
      <div className="bg-surface rounded-xl border p-5">
        <h2 className="font-semibold mb-3">פרמטרים</h2>
        <pre className="text-xs bg-gray-50 rounded p-3 overflow-x-auto text-right">
          {JSON.stringify(parameters, null, 2)}
        </pre>
      </div>
    </div>
  );
}
