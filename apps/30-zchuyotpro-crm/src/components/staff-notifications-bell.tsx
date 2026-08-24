import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, FileText, Handshake, Inbox, MessageSquare, ShieldCheck, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDateHe } from "@/lib/format";
import { isUnseen } from "@/features/clients/portalNotifications";
import {
  useStaffNotifications,
  type StaffNotificationKind,
} from "@/features/dashboard/staffNotifications";

const KIND_ICON: Record<StaffNotificationKind, typeof Bell> = {
  "consent-approved": ShieldCheck,
  "consent-declined": ShieldX,
  message: MessageSquare,
  intake: Inbox,
  referral: Handshake,
  document: FileText,
};

// Staff header bell — the client's decisions and inbound activity coming back
// to the office. Mirrors the portal NotificationsBell; sticky items (consent
// decisions, untriaged inquiries) stay counted until resolved server-side.
export function StaffNotificationsBell() {
  const { isStaff, items, seen, unseenCount, markAllSeen } = useStaffNotifications();
  const [open, setOpen] = useState(false);
  // snapshot the unseen keys when the panel opens so rows stay highlighted
  // while it is open, even though opening marks everything seen
  const [highlight, setHighlight] = useState<Set<string>>(new Set());

  if (!isStaff) return null;

  function handleOpenChange(next: boolean) {
    if (next) {
      setHighlight(new Set(items.filter((i) => isUnseen(i, seen)).map((i) => i.key)));
      markAllSeen();
    }
    setOpen(next);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" aria-label="עדכונים">
          <Bell className="h-4 w-4" />
          {unseenCount > 0 && (
            <span className="absolute -top-0.5 -start-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unseenCount > 99 ? "99+" : unseenCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent dir="rtl" align="end" className="w-80 p-0">
        <div className="px-3 py-2 border-b font-semibold text-sm">עדכונים למשרד</div>
        <div className="max-h-[360px] overflow-auto">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">אין עדכונים חדשים</p>
          ) : (
            items.map((n) => {
              const Icon = KIND_ICON[n.kind];
              const fresh = n.sticky || highlight.has(n.key);
              return (
                <Link
                  key={n.key}
                  to={n.url}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-start gap-2.5 px-3 py-2.5 border-b last:border-0 hover:bg-muted/50 transition-colors",
                    n.danger ? "bg-destructive/5" : n.sticky ? "bg-amber-50/70" : fresh ? "bg-primary/5" : "",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 p-1.5 rounded-md shrink-0",
                      n.danger
                        ? "bg-destructive/10 text-destructive"
                        : n.sticky
                          ? "bg-amber-100 text-amber-700"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm leading-snug", fresh && "font-medium")}>{n.title}</span>
                    {n.detail && <span className="block text-xs text-muted-foreground truncate">{n.detail}</span>}
                    <span className="flex items-center gap-1.5 mt-0.5">
                      {n.at && <span className="text-[11px] text-muted-foreground">{formatDateHe(n.at)}</span>}
                      {n.sticky && (
                        <Badge
                          className={cn(
                            "border-0 text-[10px] px-1.5 py-0",
                            n.danger ? "bg-destructive/10 text-destructive" : "bg-amber-100 text-amber-800",
                          )}
                        >
                          {n.danger ? "דורש התייחסות" : "ממתין לטיפול"}
                        </Badge>
                      )}
                    </span>
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
