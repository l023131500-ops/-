"use client";

import { useEffect, useState } from "react";

const KEY = "modaot-theme";

export default function ThemeToggle({
  className = "btn-outline text-sm px-3",
}: {
  className?: string;
}) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(KEY, next ? "dark" : "light");
    } catch (e) {}
    setIsDark(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={className}
      aria-label="החלף מצב כהה/בהיר"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
