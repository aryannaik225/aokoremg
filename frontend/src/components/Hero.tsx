import { Leaf } from "lucide-react";
import type { ReactNode } from "react";
import { HeroScenery } from "./HeroScenery";

const GRANULARITY_OPTIONS = [
  { label: "Hourly", enabled: false },
  { label: "Half-hourly", enabled: true },
  { label: "15-minute", enabled: false },
] as const;

interface HeroProps {
  children: ReactNode;
}

export function Hero({ children }: HeroProps) {
  return (
    <div className="hero-scenery relative overflow-hidden rounded-3xl border" style={{ borderColor: "var(--color-border)" }}>
      <HeroScenery />
      <div className="hero-overlay absolute inset-0" />

      <div className="relative flex flex-col gap-6 px-6 py-8 sm:px-8 sm:py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: "var(--color-text-primary)" }}>
              Wind Forecast <span style={{ color: "var(--color-forecast)" }}>Accuracy Portal</span>
            </h1>
            <p className="mt-1.5 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Decision-time wind forecast vs. actual generation
            </p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
              Delivery days: Jan 2 – Feb 1, 2026
            </p>
          </div>

          <div
            className="surface-panel hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium sm:flex"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <Leaf className="h-3.5 w-3.5 text-emerald-500" />
            <span>
              Cleaner energy <span className="block text-[10px]" style={{ color: "var(--color-text-muted)" }}>for a brighter tomorrow</span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {children}

          <div
            className="surface-panel ml-auto flex items-center gap-1 rounded-full p-1"
            role="group"
            aria-label="Chart granularity"
          >
            {GRANULARITY_OPTIONS.map(({ label, enabled }) => (
              <button
                key={label}
                type="button"
                disabled={!enabled}
                title={enabled ? undefined : "Not available — WINDFOR publishes hourly, FUELHH half-hourly"}
                className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-40"
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
    </div>
  );
}
