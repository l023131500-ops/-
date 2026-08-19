import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "not_started" | "sent" | "in_progress" | "completed";

const STEPS: { key: Status[]; label: string }[] = [
  { key: ["not_started"], label: "נקלט במערכת" },
  { key: ["sent", "in_progress"], label: "בבדיקת מומחה" },
  { key: ["completed"], label: "הושלם - הופקו זכויות" },
];

export function TreatmentTracker({ status }: { status: Status }) {
  const activeIndex = STEPS.findIndex((s) => s.key.includes(status));

  return (
    <div className="w-full" dir="rtl">
      <ol className="flex flex-col md:flex-row md:items-center gap-4 md:gap-0">
        {STEPS.map((step, i) => {
          const isCompleted = i < activeIndex;
          const isActive = i === activeIndex;
          return (
            <li key={step.label} className="flex md:flex-1 items-center gap-3 md:gap-0">
              <div className="flex items-center md:flex-col md:gap-2 md:flex-1">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                    isCompleted && "bg-primary border-primary text-primary-foreground",
                    isActive && "border-primary bg-primary/10 text-primary ring-4 ring-primary/20",
                    !isCompleted && !isActive && "border-muted bg-muted/30 text-muted-foreground",
                  )}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "mr-3 md:mr-0 md:mt-1 text-sm md:text-center",
                    (isActive || isCompleted) ? "text-foreground font-medium" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "hidden md:block flex-1 h-0.5 mx-2 transition-colors",
                    i < activeIndex ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
