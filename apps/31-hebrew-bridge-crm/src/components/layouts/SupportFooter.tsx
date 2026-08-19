import { Mail, Phone } from "lucide-react";

export function SupportFooter() {
  return (
    <footer
      dir="rtl"
      className="border-t border-border bg-card/80 backdrop-blur-sm py-2.5 px-4"
    >
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground/80">בקלות · תמיכה ושירות</span>
        <a
          href="tel:02-313-1500"
          className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <Phone className="h-3.5 w-3.5" />
          02-313-1500
        </a>
        <a
          href="mailto:l023131500@gmail.com"
          className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <Mail className="h-3.5 w-3.5" />
          l023131500@gmail.com
        </a>
      </div>
    </footer>
  );
}
