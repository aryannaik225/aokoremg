import { CalendarDays, ChevronDown } from "lucide-react";
import type { DaySummary } from "../api/client";

interface DayPickerProps {
  days: DaySummary[];
  selectedDate: string | null;
  onSelect: (date: string) => void;
}

export function DayPicker({ days, selectedDate, onSelect }: DayPickerProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="delivery-day" className="text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>
        Delivery day
      </label>
      <div className="surface-panel relative flex items-center rounded-full">
        <CalendarDays
          className="pointer-events-none absolute left-4 h-4 w-4"
          style={{ color: "var(--color-text-muted)" }}
        />
        <select
          id="delivery-day"
          className="w-full min-w-[180px] appearance-none rounded-full bg-transparent py-2.5 pl-10 pr-10 text-sm font-medium outline-none"
          style={{ color: "var(--color-text-primary)" }}
          value={selectedDate ?? ""}
          onChange={(e) => onSelect(e.target.value)}
        >
          {days.map((day) => (
            <option key={day.date} value={day.date} style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text-primary)" }}>
              {day.date}
              {!day.has_complete_actuals || !day.has_any_forecast ? " (partial data)" : ""}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-4 h-4 w-4"
          style={{ color: "var(--color-text-muted)" }}
        />
      </div>
    </div>
  );
}
