import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { globalSearchQuery } from "@/features/dashboard/queries";

export function GlobalSearch() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const { data, isFetching } = useQuery(globalSearchQuery(search));

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative w-full max-w-xs">
      <div className="relative">
        <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="חיפוש לקוח (שם / ת.ז / טלפון)"
          className="pr-8 h-9"
        />
        {isFetching && search.length >= 2 && (
          <Loader2 className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {open && search.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-80 overflow-auto">
          {(data ?? []).length === 0 && !isFetching ? (
            <div className="p-3 text-sm text-muted-foreground text-center">לא נמצאו תוצאות</div>
          ) : (
            (data ?? []).map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setOpen(false);
                  setSearch("");
                  navigate({ to: "/clients/$id", params: { id: c.id } });
                }}
                className="w-full text-right p-2 hover:bg-accent flex flex-col gap-0.5 border-b last:border-b-0"
              >
                <span className="text-sm font-medium">
                  {c.first_name} {c.last_name}
                </span>
                <span className="text-xs text-muted-foreground" dir="ltr">
                  {c.file_number ?? ""} · {c.phone ?? ""} {c.id_number ? `· ${c.id_number}` : ""}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
