import Link from "next/link";
import { createSupabaseService } from "@/lib/supabase/server";

async function fetchProject(id: string) {
  const svc = createSupabaseService();
  const { data: project } = await svc.from("ad_projects").select("*").eq("id", id).maybeSingle();
  if (!project) return null;
  const { data: selected } = project.selected_generation_id
    ? await svc.from("ad_generations").select("*").eq("id", project.selected_generation_id).maybeSingle()
    : { data: null } as any;
  return { project, selected };
}

export default async function ResultPage({ params }: { params: { id: string } }) {
  const data = await fetchProject(params.id);
  if (!data) return <main className="p-10 text-center">לא נמצא פרויקט.</main>;
  const { project, selected } = data;

  return (
    <main className="min-h-screen bg-brand-cream py-10">
      <div className="container mx-auto px-4 max-w-3xl">
        <Link href="/" className="text-brand-blue text-sm hover:underline">← חזרה לבית</Link>
        <h1 className="font-serif text-3xl font-bold text-brand-dark mt-2 mb-6">המודעה מוכנה</h1>

        {selected ? (
          <div className="card">
            {selected.image_url && (
              <img src={selected.image_url} alt="המודעה" className="rounded-lg mx-auto mb-6 max-w-md w-full" />
            )}
            <div className="grid md:grid-cols-3 gap-3">
              {selected.image_url && (
                <a className="btn-primary text-center" href={selected.image_url} download>
                  הורדת PNG
                </a>
              )}
              {selected.whatsapp_url && (
                <a className="btn-outline text-center" href={selected.whatsapp_url} download>
                  גרסת WhatsApp
                </a>
              )}
              {selected.pdf_url && (
                <a className="btn-outline text-center" href={selected.pdf_url} download>
                  הורדת PDF
                </a>
              )}
            </div>
            <div className="mt-6 text-center text-sm text-gray-600">
              <Link href="/create" className="text-brand-blue hover:underline">צור מודעה נוספת</Link>
            </div>
          </div>
        ) : (
          <div className="card text-center">
            <p>הקבצים עדיין מוכנים לעיבוד...</p>
          </div>
        )}
      </div>
    </main>
  );
}
