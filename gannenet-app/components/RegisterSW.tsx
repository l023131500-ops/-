"use client";
import { useEffect } from "react";

// Registers the offline service worker. AI endpoints are excluded inside sw.js.
export default function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
