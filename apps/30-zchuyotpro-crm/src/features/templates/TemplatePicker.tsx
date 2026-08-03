import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { templatesQuery, renderTemplate, type TemplateRow } from "./queries";

export function TemplatePicker({
  channel,
  vars,
  onPick,
}: {
  channel?: string;
  vars: { client_name?: string; file_number?: string; agent_name?: string; phone?: string; email?: string };
  onPick: (t: { subject?: string | null; body: string }) => void;
}) {
  const { data: templates } = useQuery(templatesQuery(channel));
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <FileText className="h-4 w-4 ms-1" /> שימוש בתבנית
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start" dir="rtl">
        <div className="max-h-72 overflow-auto">
          {(templates ?? []).length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">אין תבניות</div>
          ) : (
            (templates ?? []).map((t: TemplateRow) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onPick({
                    subject: t.subject ? renderTemplate(t.subject, vars) : null,
                    body: renderTemplate(t.body, vars),
                  });
                  setOpen(false);
                }}
                className="w-full text-right p-2 hover:bg-accent border-b last:border-b-0"
              >
                <div className="text-sm font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">{t.body}</div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
