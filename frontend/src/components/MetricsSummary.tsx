import { ArrowDownRight, ArrowUpRight, Minus, Percent, TrendingUp, Waves } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { useState } from "react";
import type { ErrorMetrics } from "../api/client";

interface MetricsSummaryProps {
  title: string;
  subtitle: string;
  metrics: ErrorMetrics | null;
}

function formatMw(value: number | null): string {
  if (value === null) return "—";
  return `${Math.round(value).toLocaleString()} MW`;
}

function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function StatTile({
  label,
  value,
  help,
  icon: Icon,
  chipClass,
  glowClass,
}: {
  label: string;
  value: string;
  help: ReactNode;
  icon: typeof TrendingUp;
  chipClass: string;
  glowClass: string;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  return (
    <div
      className="surface-panel relative flex flex-col gap-2 overflow-hidden rounded-2xl px-4 py-3.5 transition-colors duration-300"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setPos(null)}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute h-32 w-32 rounded-full blur-2xl transition-[opacity,left,top] duration-150 ease-out ${glowClass}`}
        style={{
          background: "radial-gradient(circle, currentColor 0%, transparent 70%)",
          left: pos ? pos.x - 64 : 0,
          top: pos ? pos.y - 64 : 0,
          opacity: pos ? 0.4 : 0,
        }}
      />
      <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-xl ${chipClass}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="relative z-10">
        <div className="text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>
          {label}
        </div>
        <div className="mt-0.5 text-xl font-semibold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
          {value}
        </div>
        <div className="mt-0.5 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
          {help}
        </div>
      </div>
    </div>
  );
}

export function MetricsSummary({ title, subtitle, metrics }: MetricsSummaryProps) {
  const biasPositive = metrics?.bias !== null && metrics?.bias !== undefined && metrics.bias >= 0;
  const BiasIcon = metrics?.bias === null || metrics?.bias === undefined ? Minus : biasPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
          {title}
        </h3>
        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {subtitle}
        </span>
      </div>
      {metrics === null && (
        <p className="mt-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
          No overlapping forecast/actual periods to score.
        </p>
      )}
      {metrics !== null && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            label="MAE"
            value={formatMw(metrics.mae)}
            help="Mean absolute error"
            icon={TrendingUp}
            chipClass="bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300 dark:shadow-[0_0_12px_rgba(59,158,255,0.35)]"
            glowClass="text-blue-600 dark:text-blue-300"
          />
          <StatTile
            label="RMSE"
            value={formatMw(metrics.rmse)}
            help="Root mean squared error"
            icon={Waves}
            chipClass="bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300 dark:shadow-[0_0_12px_rgba(167,139,250,0.35)]"
            glowClass="text-violet-600 dark:text-violet-300"
          />
          <StatTile
            label="Bias"
            value={metrics.bias === null ? "—" : `${metrics.bias >= 0 ? "+" : ""}${Math.round(metrics.bias).toLocaleString()} MW`}
            help={
              <span className="inline-flex items-center gap-1">
                <BiasIcon className="h-3 w-3" />
                {metrics.bias === null ? "Mean signed error" : biasPositive ? "Over-forecasting" : "Under-forecasting"}
              </span>
            }
            icon={BiasIcon}
            chipClass="bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300 dark:shadow-[0_0_12px_rgba(251,113,133,0.35)]"
            glowClass="text-rose-600 dark:text-rose-300"
          />
          <StatTile
            label="nMAE"
            value={formatPercent(metrics.n_mae)}
            help="MAE / mean actual generation"
            icon={Percent}
            chipClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300 dark:shadow-[0_0_12px_rgba(52,211,153,0.35)]"
            glowClass="text-emerald-600 dark:text-emerald-300"
          />
        </div>
      )}
    </div>
  );
}
