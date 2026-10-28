import { CalendarDays, ChevronDown } from "lucide-react";
import type { DaySummary } from "../api/client";

interface DayPickerProps {
  days: DaySummary[];
  selectedDate: string | null;
  onSelect: (date: string) => void;
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  return date.toLocaleDateString("en-GB", {
    // weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function DayPicker({ days, selectedDate, onSelect }: DayPickerProps) {
  const selectedDay = days.find((d) => d.date === selectedDate);

  return (
    <div
      className="bg-white/50 dark:bg-[#141415]/50 border dark:border-[#e4e8f0]/10 border-[#000000]/10 backdrop-blur-2xl relative flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-2.5 transition-colors duration-300 hover:border-[var(--color-forecast)]/40"
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: "var(--color-sidebar-active)" }}
      >
        <CalendarDays className="h-4 w-4" style={{ color: "var(--color-forecast)" }} />
      </span>

      <div className="flex flex-col leading-tight">
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
          Delivery day
        </span>
        <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {selectedDay ? formatDisplayDate(selectedDay.date) : "Select a day"}
        </span>
      </div>

      <ChevronDown className="ml-2 h-4 w-4 shrink-0" style={{ color: "var(--color-text-muted)" }} />

      <select
        id="delivery-day"
        aria-label="Delivery day"
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0 px-5 py-2 text-sm font-semibold"
        value={selectedDate ?? ""}
        onChange={(e) => onSelect(e.target.value)}
      >
        {days.map((day) => (
          <option
            key={day.date}
            value={day.date}
            className="cursor-pointer"
            style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text-primary)", cursor: "pointer" }}
          >
            {formatDisplayDate(day.date)}
            {!day.has_complete_actuals || !day.has_any_forecast ? " — partial data" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
