import { Moon, Sun } from "lucide-react";
import type { Theme } from "../hooks/useTheme";

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={onToggle}
      className="relative flex h-8 w-16 items-center rounded-full border px-1 transition-colors duration-300"
      style={{
        backgroundColor: isDark ? "var(--color-sidebar-active)" : "#eff6ff",
        borderColor: "var(--color-border)",
      }}
    >
      <span
        className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow transition-transform duration-300 dark:bg-[#1c2a47]"
        style={{ transform: isDark ? "translateX(32px)" : "translateX(0px)" }}
      >
        {isDark ? (
          <Moon className="h-3.5 w-3.5 text-blue-300" />
        ) : (
          <Sun className="h-3.5 w-3.5 text-amber-500" />
        )}
      </span>
    </button>
  );
}
