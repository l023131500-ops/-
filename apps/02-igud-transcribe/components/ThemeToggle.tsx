"use client";

import { useEffect, useState } from "react";

const KEY = "tamlul-theme";

export default function ThemeToggle() {
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
      className="btn-outline text-sm px-3"
      aria-label="החלף מצב כהה/בהיר"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
