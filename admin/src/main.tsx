import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { ThemeToggle } from "./theme.js";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* מחוץ ל-App בכוונה: המתג נדרש גם במסך ההתחברות, שהוא ה-return הראשון של App. */}
    <ThemeToggle />
    <App />
  </React.StrictMode>,
);
