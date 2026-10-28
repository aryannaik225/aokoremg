import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeriesPeriod } from "../api/client";

const FORECAST_COLOR = "#0A84FF";
const ACTUAL_COLOR = "#FB7185";

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
    <div className="glass-panel rounded-2xl px-4 py-3 text-xs">
      <div className="font-medium tracking-tight text-white">{label}</div>
      <div className="mt-2 flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: FORECAST_COLOR }} />
        <span className="text-zinc-400">Forecast</span>
        <span className="ml-auto font-semibold tracking-tight text-white">
          {forecast ?? "—"} MW
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: ACTUAL_COLOR }} />
        <span className="text-zinc-400">Actual</span>
        <span className="ml-auto font-semibold tracking-tight text-white">
          {actual ?? "—"} MW
        </span>
      </div>
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
      <div className="mb-4 flex items-center gap-5 text-xs">
        <span className="flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.03] px-3 py-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: FORECAST_COLOR, boxShadow: `0 0 6px ${FORECAST_COLOR}` }} />
          <span className="text-zinc-400">Decision-time forecast</span>
        </span>
        <span className="flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.03] px-3 py-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: ACTUAL_COLOR, boxShadow: `0 0 6px ${ACTUAL_COLOR}` }} />
          <span className="text-zinc-400">Actual generation</span>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="time"
            interval={5}
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.12)", strokeWidth: 1 }} />
          <Line
            type="monotone"
            dataKey="forecast"
            stroke={FORECAST_COLOR}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, stroke: "#0a0a0b", strokeWidth: 2, fill: FORECAST_COLOR }}
            connectNulls
            isAnimationActive={false}
            className="glow-line-forecast"
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke={ACTUAL_COLOR}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, stroke: "#0a0a0b", strokeWidth: 2, fill: ACTUAL_COLOR }}
            connectNulls
            isAnimationActive={false}
            className="glow-line-actual"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
