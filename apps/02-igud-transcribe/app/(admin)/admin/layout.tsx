import AdminNav from "@/components/AdminNav";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />
      <main className="container-rtl py-8">{children}</main>
    </div>
  );
}
