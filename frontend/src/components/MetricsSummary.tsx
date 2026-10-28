import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ReactNode } from "react";
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
  glow,
}: {
  label: string;
  value: string;
  help: ReactNode;
  glow?: "green" | "red" | null;
}) {
  const glowColor =
    glow === "green" ? "rgba(34,197,94,0.18)" : glow === "red" ? "rgba(248,113,113,0.18)" : "transparent";

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="glass-panel relative overflow-hidden rounded-3xl px-5 py-4 transition-colors hover:border-white/20"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full"
        style={{ background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)` }}
      />
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight text-white">{value}</div>
      <div className="mt-1 text-[11px] text-zinc-500">{help}</div>
    </motion.div>
  );
}

export function MetricsSummary({ title, subtitle, metrics }: MetricsSummaryProps) {
  const biasGlow = metrics?.bias === null || metrics?.bias === undefined ? null : metrics.bias >= 0 ? "green" : "red";
  const BiasIcon = metrics?.bias === null || metrics?.bias === undefined ? Minus : metrics.bias >= 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <div>
      <h3 className="text-sm font-semibold tracking-tight text-white">{title}</h3>
      <p className="mt-0.5 text-xs text-zinc-400">{subtitle}</p>
      {metrics === null && (
        <p className="mt-3 text-sm text-zinc-500">No overlapping forecast/actual periods to score.</p>
      )}
      {metrics !== null && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="MAE" value={formatMw(metrics.mae)} help="Mean absolute error" />
          <StatTile label="RMSE" value={formatMw(metrics.rmse)} help="Root mean squared error" />
          <StatTile
            label="Bias"
            value={metrics.bias === null ? "—" : `${metrics.bias >= 0 ? "+" : ""}${Math.round(metrics.bias).toLocaleString()} MW`}
            help={
              <span className="inline-flex items-center gap-1">
                <BiasIcon className="h-3 w-3" />
                {metrics.bias === null ? "Mean signed error" : metrics.bias >= 0 ? "Over-forecasting" : "Under-forecasting"}
              </span>
            }
            glow={biasGlow}
          />
          <StatTile label="nMAE" value={formatPercent(metrics.n_mae)} help="MAE / mean actual generation" />
        </div>
      )}
    </div>
  );
}
