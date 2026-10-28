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
      aria-pressed={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={onToggle}
      className="flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md transition-colors duration-300 hover:border-white/30 cursor-pointer"
      style={{
        backgroundColor: isDark ? "rgba(15, 25, 46, 0.55)" : "rgba(255, 255, 255, 0.55)",
        borderColor: "var(--color-border)",
        boxShadow: "0 4px 16px -4px rgba(15, 23, 42, 0.25)",
      }}
    >
      {isDark ? (
        <Moon className="h-5 w-5 text-blue-200" />
      ) : (
        <Sun className="h-5 w-5 text-amber-500" />
      )}
    </button>
  );
}
