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
import { ChartLegend, ForecastActualChart } from "../components/ForecastActualChart";
import { Hero } from "../components/Hero";
import { HeroBackdrop } from "../components/HeroBackdrop";
import { KeyInsights } from "../components/KeyInsights";
import { MetricsSummary } from "../components/MetricsSummary";
import { Sidebar } from "../components/Sidebar";
import { ThemeToggle } from "../components/ThemeToggle";
import type { Theme } from "../hooks/useTheme";

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

interface DashboardProps {
  theme: Theme;
  onToggleTheme: () => void;
}

export function Dashboard({ theme, onToggleTheme }: DashboardProps) {
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
    <div className="flex h-screen overflow-hidden transition-colors duration-300" style={{ backgroundColor: "var(--color-bg)" }}>
      <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>

      <Sidebar />

      <div className="relative h-screen min-w-0 flex-1 overflow-y-auto">
        <HeroBackdrop />

        <motion.div
          className="relative z-10 mx-auto max-w-full px-4 py-6 sm:px-6 sm:py-8"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={item}>
            {daysError && <p className="mb-3 text-sm text-red-500">Failed to load delivery days: {daysError}</p>}
            <Hero>
              {!daysError && !days && (
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                  Loading delivery days...
                </p>
              )}
              {days && days.length === 0 && (
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                  No delivery days in scope.
                </p>
              )}
              {days && days.length > 0 && (
                <DayPicker days={days} selectedDate={selectedDate} onSelect={setSelectedDate} />
              )}
            </Hero>
          </motion.div>

          <motion.div variants={item} className="surface-panel mt-4 rounded-3xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-medium tracking-wide" style={{ color: "var(--color-text-primary)" }}>
                Forecast vs. Actual — {selectedDate ?? "—"}
              </h2>
              <div className="flex items-center gap-3">
                {series && series.periods.some((p) => p.forecast !== null || p.actual !== null) && <ChartLegend />}
                <span
                  className="rounded-full border px-3 py-1 text-[11px]"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
                >
                  Half-hourly
                </span>
              </div>
            </div>
            {seriesError && <p className="mt-3 text-sm text-red-500">Failed to load series: {seriesError}</p>}
            {!seriesError && selectedDate && !series && (
              <p className="mt-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
                Loading chart...
              </p>
            )}
            {series && series.periods.every((p) => p.forecast === null && p.actual === null) && (
              <p className="mt-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
                No forecast or actual data available for this day.
              </p>
            )}
            {series && series.periods.some((p) => p.forecast !== null || p.actual !== null) && (
              <div className="mt-4">
                <ForecastActualChart periods={series.periods} />
              </div>
            )}
          </motion.div>

          <motion.div variants={item} className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="surface-panel rounded-3xl p-6">
              {metricsError && <p className="text-sm text-red-500">Failed to load metrics: {metricsError}</p>}
              {!metricsError && !metrics && (
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                  Loading metrics...
                </p>
              )}
              {metrics && (
                <MetricsSummary title="Selected day" subtitle={selectedDate ?? ""} metrics={dayMetrics} />
              )}
            </div>
            <div className="surface-panel rounded-3xl p-6">
              {metrics && (
                <MetricsSummary
                  title="Full decision window"
                  subtitle={`${metrics.from} to ${metrics.to}`}
                  metrics={metrics.aggregate}
                />
              )}
            </div>
          </motion.div>

          <motion.div variants={item} className="mt-6">
            <KeyInsights periods={series?.periods ?? []} aggregate={metrics?.aggregate ?? null} />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
