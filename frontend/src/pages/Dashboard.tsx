import { useEffect, useState } from "react";
import { getDays, getDaySeries, type DaySeries, type DaySummary } from "../api/client";
import { DayPicker } from "../components/DayPicker";

export function Dashboard() {
  const [days, setDays] = useState<DaySummary[] | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [series, setSeries] = useState<DaySeries | null>(null);
  const [daysError, setDaysError] = useState<string | null>(null);
  const [seriesError, setSeriesError] = useState<string | null>(null);

  useEffect(() => {
    getDays()
      .then((data) => {
        setDays(data);
        if (data.length > 0) setSelectedDate(data[0].date);
      })
      .catch((err) => setDaysError(String(err)));
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    setSeries(null);
    setSeriesError(null);
    getDaySeries(selectedDate)
      .then(setSeries)
      .catch((err) => setSeriesError(String(err)));
  }, [selectedDate]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
        Wind Forecast Accuracy Portal
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Decision-time wind forecast vs. actual generation, delivery days Jan 2 – Feb 1, 2026.
      </p>

      <div className="mt-6">
        {daysError && <p className="text-sm text-red-600">Failed to load delivery days: {daysError}</p>}
        {!daysError && !days && <p className="text-sm text-slate-500">Loading delivery days...</p>}
        {days && days.length === 0 && <p className="text-sm text-slate-500">No delivery days in scope.</p>}
        {days && days.length > 0 && (
          <DayPicker days={days} selectedDate={selectedDate} onSelect={setSelectedDate} />
        )}
      </div>

      <div className="mt-8">
        {seriesError && <p className="text-sm text-red-600">Failed to load series: {seriesError}</p>}
        {!seriesError && selectedDate && !series && <p className="text-sm text-slate-500">Loading series...</p>}
        {series && (
          <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-3 py-2">Start time</th>
                  <th className="px-3 py-2">Forecast (MW)</th>
                  <th className="px-3 py-2">Actual (MW)</th>
                  <th className="px-3 py-2">Error (MW)</th>
                </tr>
              </thead>
              <tbody>
                {series.periods.map((p) => (
                  <tr key={p.start_time} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-1.5">{p.start_time}</td>
                    <td className="px-3 py-1.5">{p.forecast ?? "—"}</td>
                    <td className="px-3 py-1.5">{p.actual ?? "—"}</td>
                    <td className="px-3 py-1.5">{p.error ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
