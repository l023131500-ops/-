import { useTenant } from "@/hooks/useTenant";

export default function About() {
  const { tenant } = useTenant();
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="font-heading text-4xl mb-6">אודות {tenant?.branding?.site_name || tenant?.name}</h1>
      <div className="prose prose-lg max-w-none text-foreground/85 space-y-4">
        <p>{tenant?.branding?.site_tagline || "פלטפורמה תורנית מקיפה המאגדת שיעורים, חומרי לימוד וקהילות לומדים."}</p>
        <p>הפלטפורמה שלנו מאפשרת חיבור בין מגידי שיעורים לבין הלומדים, ניהול בתי כנסת ומועצות דתיות, וגישה למאגר תוכן תורני עשיר ועדכני.</p>
        <p>אנו מאמינים שכל יהודי ראוי לגישה נוחה ללימוד תורה, במגוון נושאים ורמות, בכל זמן ובכל מקום.</p>
      </div>
    </div>
  );
}
