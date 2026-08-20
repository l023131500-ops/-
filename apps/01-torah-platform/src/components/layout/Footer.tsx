import { Link } from "react-router-dom";
import { Phone, Mail, MapPin } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";

export function Footer() {
  const { tenant } = useTenant();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-10 grid gap-8 md:grid-cols-4">
        <div>
          <div className="font-heading text-xl mb-3">{tenant?.branding?.site_name || tenant?.name || "פלטפורמת תורה"}</div>
          <p className="text-sm opacity-90">{tenant?.branding?.site_tagline || "המקום לכל הלומדים והמלמדים תורה"}</p>
        </div>
        <div>
          <div className="font-heading text-lg mb-3">ניווט</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/" className="inline-flex items-center min-h-6 opacity-90 hover:opacity-100 hover:underline">ראשי</Link></li>
            <li><Link to="/lessons" className="inline-flex items-center min-h-6 opacity-90 hover:opacity-100 hover:underline">מאגר שיעורים</Link></li>
            <li><Link to="/shop" className="inline-flex items-center min-h-6 opacity-90 hover:opacity-100 hover:underline">תשמישי קדושה</Link></li>
            <li><Link to="/donate" className="inline-flex items-center min-h-6 opacity-90 hover:opacity-100 hover:underline">תרומה</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-heading text-lg mb-3">קישורים</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/about" className="inline-flex items-center min-h-6 opacity-90 hover:opacity-100 hover:underline">אודות</Link></li>
            <li><Link to="/contact" className="inline-flex items-center min-h-6 opacity-90 hover:opacity-100 hover:underline">צור קשר</Link></li>
            <li><Link to="/privacy" className="inline-flex items-center min-h-6 opacity-90 hover:opacity-100 hover:underline">מדיניות פרטיות</Link></li>
            <li><Link to="/accessibility" className="inline-flex items-center min-h-6 opacity-90 hover:opacity-100 hover:underline">הצהרת נגישות</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-heading text-lg mb-3">צרו קשר</div>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> <span dir="ltr">02-3131600</span></li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> <span dir="ltr">a023131600@gmail.com</span></li>
            {tenant?.branding?.social_links?.address && (
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {tenant.branding.social_links.address}</li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-4 text-center text-xs opacity-75">
          © {year} {tenant?.branding?.site_name || tenant?.name || "פלטפורמת תורה"} · כל הזכויות שמורות
        </div>
      </div>
    </footer>
  );
}
