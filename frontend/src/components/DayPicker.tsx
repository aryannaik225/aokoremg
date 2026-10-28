import { CalendarDays, ChevronDown } from "lucide-react";
import type { DaySummary } from "../api/client";

interface DayPickerProps {
  days: DaySummary[];
  selectedDate: string | null;
  onSelect: (date: string) => void;
}

export function DayPicker({ days, selectedDate, onSelect }: DayPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="delivery-day" className="text-xs font-medium tracking-tight text-zinc-400">
        Delivery day
      </label>
      <div className="relative w-full max-w-xs">
        <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <select
          id="delivery-day"
          className="w-full appearance-none rounded-full border border-white/5 bg-[#141415] py-2.5 pl-10 pr-10 text-sm font-medium tracking-tight text-white shadow-inner outline-none transition-colors hover:border-white/20 focus:border-[#0A84FF]/50"
          value={selectedDate ?? ""}
          onChange={(e) => onSelect(e.target.value)}
        >
          {days.map((day) => (
            <option key={day.date} value={day.date} className="bg-[#141415] text-white">
              {day.date}
              {!day.has_complete_actuals || !day.has_any_forecast ? " (partial data)" : ""}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
      </div>
    </div>
  );
}
