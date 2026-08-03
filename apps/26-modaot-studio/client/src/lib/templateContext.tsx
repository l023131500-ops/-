// קונטקסט משותף להעברת התבנית שנבחרה מ-Home ל-Editor — בלי localStorage (חסום ב-iframe).
import { createContext, useContext, useState, type ReactNode } from "react";
import type { TemplateDoc } from "@shared/layers";

export interface SelectedTemplate {
  doc: TemplateDoc;
  category: string;
  style: string;
  format: string;
  name: string;
  templateId?: number;
}

interface TemplateContextValue {
  selected: SelectedTemplate | null;
  setSelected: (t: SelectedTemplate | null) => void;
}

const TemplateContext = createContext<TemplateContextValue | null>(null);

export function TemplateProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<SelectedTemplate | null>(null);
  return (
    <TemplateContext.Provider value={{ selected, setSelected }}>
      {children}
    </TemplateContext.Provider>
  );
}

export function useTemplateContext() {
  const ctx = useContext(TemplateContext);
  if (!ctx) throw new Error("useTemplateContext must be used within TemplateProvider");
  return ctx;
}
