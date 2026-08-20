import { useEffect } from "react";

// Injects/removes a <script type="application/ld+json"> in <head> for pages
// whose structured data depends on fetched data (unlike the static
// Organization/WebSite blocks already in client/index.html). Renders nothing.
export function JsonLd({ id, data }: { id: string; data: Record<string, unknown> | null }) {
  useEffect(() => {
    if (!data) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = id;
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [id, JSON.stringify(data)]);

  return null;
}
