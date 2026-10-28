import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  getDays,
  getDaySeries,
  getMetrics,
  type DaySeries,
  type DaySummary,
  type MetricsResponse,
} from "../api/client";
import { DayPicker } from "../components/DayPicker";
import { ForecastActualChart } from "../components/ForecastActualChart";
import { MetricsSummary } from "../components/MetricsSummary";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function Dashboard() {
  const [days, setDays] = useState<DaySummary[] | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [series, setSeries] = useState<DaySeries | null>(null);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [daysError, setDaysError] = useState<string | null>(null);
  const [seriesError, setSeriesError] = useState<string | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  useEffect(() => {
    getDays()
      .then((data) => {
        setDays(data);
        if (data.length > 0) setSelectedDate(data[0].date);
      })
      .catch((err) => setDaysError(String(err)));

    getMetrics()
      .then(setMetrics)
      .catch((err) => setMetricsError(String(err)));
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    setSeries(null);
    setSeriesError(null);
    getDaySeries(selectedDate)
      .then(setSeries)
      .catch((err) => setSeriesError(String(err)));
  }, [selectedDate]);

  const dayMetrics = useMemo(() => {
    if (!metrics || !selectedDate) return null;
    return metrics.daily.find((d) => d.date === selectedDate) ?? null;
  }, [metrics, selectedDate]);

  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      <motion.div
        className="mx-auto max-w-5xl px-4 py-10"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={item}>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Wind Forecast Accuracy Portal
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Decision-time wind forecast vs. actual generation, delivery days Jan 2 – Feb 1, 2026.
          </p>
        </motion.div>

        <motion.div variants={item} className="mt-7">
          {daysError && <p className="text-sm text-red-400">Failed to load delivery days: {daysError}</p>}
          {!daysError && !days && <p className="text-sm text-zinc-500">Loading delivery days...</p>}
          {days && days.length === 0 && <p className="text-sm text-zinc-500">No delivery days in scope.</p>}
          {days && days.length > 0 && (
            <DayPicker days={days} selectedDate={selectedDate} onSelect={setSelectedDate} />
          )}
        </motion.div>

        <motion.div variants={item} className="glass-panel mt-6 rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-white">
              Forecast vs. actual — {selectedDate ?? "—"}
            </h2>
            <span className="rounded-full border border-white/5 bg-white/[0.03] px-3 py-1 text-[11px] text-zinc-400">
              Half-hourly
            </span>
          </div>
          {seriesError && <p className="mt-3 text-sm text-red-400">Failed to load series: {seriesError}</p>}
          {!seriesError && selectedDate && !series && (
            <p className="mt-3 text-sm text-zinc-500">Loading chart...</p>
          )}
          {series && series.periods.every((p) => p.forecast === null && p.actual === null) && (
            <p className="mt-3 text-sm text-zinc-500">No forecast or actual data available for this day.</p>
          )}
          {series && series.periods.some((p) => p.forecast !== null || p.actual !== null) && (
            <div className="mt-4">
              <ForecastActualChart periods={series.periods} />
            </div>
          )}
        </motion.div>

        <motion.div variants={item} className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="glass-panel rounded-3xl p-6">
            {metricsError && <p className="text-sm text-red-400">Failed to load metrics: {metricsError}</p>}
            {!metricsError && !metrics && <p className="text-sm text-zinc-500">Loading metrics...</p>}
            {metrics && (
              <MetricsSummary title="Selected day" subtitle={selectedDate ?? ""} metrics={dayMetrics} />
            )}
          </div>
          <div className="glass-panel rounded-3xl p-6">
            {metrics && (
              <MetricsSummary
                title="Full decision window"
                subtitle={`${metrics.from} to ${metrics.to}`}
                metrics={metrics.aggregate}
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
