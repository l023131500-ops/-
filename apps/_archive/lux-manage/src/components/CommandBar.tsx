import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard, Wallet, ListTodo, Shield, CalendarDays, FileText,
  GraduationCap, Users, TrendingUp, Plus, Zap, Settings, BarChart3, MessageCircle,
} from "lucide-react";

const navItems = [
  { label: "לוח בקרה", icon: LayoutDashboard, path: "/" },
  { label: "מעקב הוצאות", icon: Wallet, path: "/expenses" },
  { label: "ציר זמן חכם", icon: ListTodo, path: "/timeline" },
  { label: "זכויות והטבות", icon: Shield, path: "/benefits" },
  { label: "לוח שנה", icon: CalendarDays, path: "/calendar" },
  { label: "חשבוניות", icon: FileText, path: "/invoices" },
  { label: "אקדמיית צמיחה", icon: GraduationCap, path: "/academy" },
  { label: "ספקים", icon: Users, path: "/suppliers" },
  { label: "בריאות פיננסית", icon: TrendingUp, path: "/financial-health" },
  { label: "עתיד המשפחה", icon: BarChart3, path: "/family-future" },
  { label: "צ׳אט מומחה", icon: MessageCircle, path: "/expert-chat" },
  { label: "הגדרות", icon: Settings, path: "/settings" },
];

const quickActions = [
  { label: "הוסף הוצאה", icon: Plus, path: "/expenses" },
  { label: "הזנה מהירה", icon: Zap, path: "/quick-entry" },
  { label: "משימה חדשה", icon: ListTodo, path: "/timeline" },
];

export default function CommandBar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const go = (path: string) => { navigate(path); setOpen(false); };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="חפש עמוד, פעולה או פקודה..." dir="rtl" />
      <CommandList dir="rtl">
        <CommandEmpty>לא נמצאו תוצאות.</CommandEmpty>
        <CommandGroup heading="פעולות מהירות">
          {quickActions.map(a => (
            <CommandItem key={a.path + a.label} onSelect={() => go(a.path)} className="gap-3 cursor-pointer">
              <a.icon className="w-4 h-4 text-accent" />
              <span>{a.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="ניווט">
          {navItems.map(item => (
            <CommandItem key={item.path} onSelect={() => go(item.path)} className="gap-3 cursor-pointer">
              <item.icon className="w-4 h-4 text-muted-foreground" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
