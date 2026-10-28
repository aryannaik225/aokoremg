import type { DaySummary } from "../api/client";

interface DayPickerProps {
  days: DaySummary[];
  selectedDate: string | null;
  onSelect: (date: string) => void;
}

export function DayPicker({ days, selectedDate, onSelect }: DayPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="delivery-day" className="text-sm font-medium text-slate-600 dark:text-slate-300">
        Delivery day
      </label>
      <select
        id="delivery-day"
        className="w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        value={selectedDate ?? ""}
        onChange={(e) => onSelect(e.target.value)}
      >
        {days.map((day) => (
          <option key={day.date} value={day.date}>
            {day.date}
            {!day.has_complete_actuals || !day.has_any_forecast ? " (partial data)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
