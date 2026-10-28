import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeriesPeriod } from "../api/client";

interface ForecastActualChartProps {
  periods: SeriesPeriod[];
}

function formatTime(startTime: string): string {
  return startTime.slice(11, 16);
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number | null; dataKey: string }[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const forecast = payload.find((p) => p.dataKey === "forecast")?.value;
  const actual = payload.find((p) => p.dataKey === "actual")?.value;
  return (
    <div
      className="rounded-2xl border px-4 py-3 text-xs shadow-lg"
      style={{ backgroundColor: "var(--color-tooltip-bg)", borderColor: "var(--color-tooltip-border)" }}
    >
      <div className="font-medium tracking-tight" style={{ color: "var(--color-text-primary)" }}>
        {label}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--color-forecast)" }} />
        <span style={{ color: "var(--color-text-secondary)" }}>Forecast</span>
        <span className="ml-auto font-semibold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
          {forecast ?? "—"} MW
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--color-actual)" }} />
        <span style={{ color: "var(--color-text-secondary)" }}>Actual</span>
        <span className="ml-auto font-semibold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
          {actual ?? "—"} MW
        </span>
      </div>
    </div>
  );
}

export function ChartLegend() {
  return (
    <div className="flex items-center gap-5 text-xs">
      <span className="flex items-center gap-2" style={{ color: "var(--color-text-secondary)" }}>
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ background: "var(--color-forecast)", boxShadow: "0 0 6px var(--color-forecast)" }}
        />
        Decision-time forecast
      </span>
      <span className="flex items-center gap-2" style={{ color: "var(--color-text-secondary)" }}>
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ background: "var(--color-actual)", boxShadow: "0 0 6px var(--color-actual)" }}
        />
        Actual generation
      </span>
    </div>
  );
}

export function ForecastActualChart({ periods }: ForecastActualChartProps) {
  const data = periods.map((p) => ({
    time: formatTime(p.start_time),
    forecast: p.forecast,
    actual: p.actual,
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 16, bottom: 32 }}>
          <defs>
            <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-forecast-fill-from)" />
              <stop offset="100%" stopColor="var(--color-forecast-fill-to)" />
            </linearGradient>
            <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-actual-fill-from)" />
              <stop offset="100%" stopColor="var(--color-actual-fill-to)" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--color-grid-line)" strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="time"
            interval={5}
            tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            label={{
              value: "Settlement time",
              position: "insideBottom",
              offset: -24,
              fill: "var(--color-text-muted)",
              fontSize: 11,
            }}
          />
          <YAxis
            tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={56}
            label={{
              value: "Generation (MW)",
              angle: -90,
              position: "insideLeft",
              dx: -12,
              style: { textAnchor: "middle" },
              fill: "var(--color-text-muted)",
              fontSize: 11,
            }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--color-grid-line)", strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="forecast"
            stroke="var(--color-forecast)"
            strokeWidth={2}
            fill="url(#forecastFill)"
            dot={false}
            activeDot={{ r: 5, stroke: "var(--color-surface)", strokeWidth: 2, fill: "var(--color-forecast)" }}
            connectNulls
            isAnimationActive={false}
            className="glow-line-forecast"
          />
          <Area
            type="monotone"
            dataKey="actual"
            stroke="var(--color-actual)"
            strokeWidth={2}
            fill="url(#actualFill)"
            dot={false}
            activeDot={{ r: 5, stroke: "var(--color-surface)", strokeWidth: 2, fill: "var(--color-actual)" }}
            connectNulls
            isAnimationActive={false}
            className="glow-line-actual"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
