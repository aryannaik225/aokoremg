import { Leaf } from "lucide-react";
import type { ReactNode } from "react";

const GRANULARITY_OPTIONS = [
  // { label: "Hourly", enabled: false },
  { label: "Half-hourly", enabled: true },
  // { label: "15-minute", enabled: false },
] as const;

interface HeroProps {
  children: ReactNode;
}

export function Hero({ children }: HeroProps) {
  return (
    <div className="flex flex-col gap-6 px-6 py-4 sm:px-8 sm:py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-4xl" style={{ color: "var(--color-text-primary)" }}>
            Wind Forecast <span style={{ color: "var(--color-forecast)" }}>Accuracy Portal</span>
          </h1>
          <p className="mt-1 text-lg" style={{ color: "var(--color-text-secondary)" }}>
            Decision-time wind forecast vs. actual generation
          </p>
          <p className="mt-0.5 text-sm" style={{ color: "var(--color-text-muted)" }}>
            Delivery days: Jan 2 – Feb 1, 2026
          </p>
        </div>

        <div
          className="bg-white/50 dark:bg-[#141415]/50 border border-[#e4e8f0] dark:border-[#000000]/10 backdrop-blur-2xl hidden items-center gap-4 rounded-full px-5 py-2 text-[13px] font-medium transition-colors duration-300 sm:flex"
          // style={{ color: "var(--color-text-secondary)" }}
        >
          <Leaf className="h-6 w-6 text-emerald-500" />
          <span>
            Cleaner energy <span className="block text-xs" style={{ color: "var(--color-text-muted)" }}>for a brighter tomorrow</span>
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {children}

        <div
          className="surface-panel flex items-center gap-1 rounded-full p-0"
          role="group"
          aria-label="Chart granularity"
        >
          {GRANULARITY_OPTIONS.map(({ label, enabled }) => (
            <button
              key={label}
              type="button"
              disabled={!enabled}
              title={enabled ? undefined : "Not available — WINDFOR publishes hourly, FUELHH half-hourly"}
              className="rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-40"
              style={
                enabled
                  ? { backgroundColor: "var(--color-forecast)", color: "white" }
                  : { color: "var(--color-text-secondary)" }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
