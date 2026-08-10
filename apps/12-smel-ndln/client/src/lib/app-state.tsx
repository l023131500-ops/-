import { createContext, useContext, useState, ReactNode } from "react";
import type { ResearchProfile } from "@shared/schema";

type AppState = {
  address: string;
  setAddress: (a: string) => void;
  // The city as it was typed, kept apart from the composed address string. The
  // report needs it on its own to tell whether the registry matched the address
  // in the city that was asked for — "רחוב מספר עיר" as one string cannot say.
  typedCity: string;
  setTypedCity: (c: string) => void;
  profile: ResearchProfile | null;
  setProfile: (p: ResearchProfile | null) => void;
  leadSubmitted: boolean;
  setLeadSubmitted: (v: boolean) => void;
};

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState("");
  const [typedCity, setTypedCity] = useState("");
  const [profile, setProfile] = useState<ResearchProfile | null>(null);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  return (
    <Ctx.Provider
      value={{
        address,
        setAddress,
        typedCity,
        setTypedCity,
        profile,
        setProfile,
        leadSubmitted,
        setLeadSubmitted,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
