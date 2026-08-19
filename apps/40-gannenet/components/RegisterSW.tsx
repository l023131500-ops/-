"use client";
import { useEffect } from "react";
import { BASE, withBase } from "@/lib/base";

// Registers the offline service worker under the app's base path. AI endpoints
// are excluded inside sw.js.
export default function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(withBase("/sw.js"), { scope: (BASE || "") + "/" }).catch(() => {});
    }
  }, []);
  return null;
}
