"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

/*
Toggles between the light and dark "Ledger" themes by setting
data-theme on <html> and persisting the choice. The initial theme is
applied before hydration by an inline script in the root layout, so there
is no flash; this component just reflects and flips it.
*/

export default function ThemeToggle({ showLabel = false, className = "" }) {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const current =
      document.documentElement.getAttribute("data-theme") || "light";
    setTheme(current);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("pg-theme", next);
    } catch {
      /* ignore storage errors */
    }
    setTheme(next);
  };

  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      className={`btn btn-ghost ${showLabel ? "justify-start w-full" : ""} ${className}`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
      {showLabel && (isDark ? "Light mode" : "Dark mode")}
    </button>
  );
}
