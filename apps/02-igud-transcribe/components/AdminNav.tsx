"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import ThemeToggle from "./ThemeToggle";

const NAV = [
  { href: "/admin", label: "דשבורד" },
  { href: "/admin/uploads", label: "העלאות" },
  { href: "/admin/coupons", label: "קופונים" },
  { href: "/admin/glossary", label: "מילון מונחים" },
  { href: "/admin/settings", label: "הגדרות" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createSupabaseBrowser();

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="bg-brand-blue text-white shadow-md">
      <div className="container-rtl flex items-center justify-between h-16">
        <Link href="/admin" className="font-serif font-bold text-lg">
          איגוד השיעורים · ניהול
        </Link>
        <nav className="flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`px-3 py-2 rounded-md text-sm transition ${
                  active ? "bg-white/15 text-brand-gold" : "hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <ThemeToggle />
          <button
            onClick={signOut}
            className="ms-4 px-3 py-2 text-sm text-white/70 hover:text-white"
          >
            יציאה
          </button>
        </nav>
      </div>
    </header>
  );
}
