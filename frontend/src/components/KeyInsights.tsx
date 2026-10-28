import { Activity, Lightbulb, Target, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import type { ErrorMetrics, SeriesPeriod } from "../api/client";

interface KeyInsightsProps {
  periods: SeriesPeriod[];
  aggregate: ErrorMetrics | null;
}

function meanAbsError(periods: SeriesPeriod[]): number | null {
  const errors = periods.filter((p) => p.error !== null).map((p) => Math.abs(p.error as number));
  if (errors.length === 0) return null;
  return errors.reduce((a, b) => a + b, 0) / errors.length;
}

function InsightCard({
  icon: Icon,
  iconClass,
  text,
}: {
  icon: typeof TrendingUp;
  iconClass: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
        {text}
      </p>
    </div>
  );
}

export function KeyInsights({ periods, aggregate }: KeyInsightsProps) {
  const insights = useMemo(() => {
    const morning = periods.filter((p) => p.start_time.slice(11, 13) < "12");
    const evening = periods.filter((p) => p.start_time.slice(11, 13) >= "12");
    const morningMae = meanAbsError(morning);
    const eveningMae = meanAbsError(evening);

    let trendText = "Not enough overlapping forecast/actual data today to compare morning and evening accuracy.";
    if (morningMae !== null && eveningMae !== null) {
      const better = eveningMae <= morningMae ? "evening" : "morning";
      const worse = better === "evening" ? "morning" : "evening";
      trendText = `Forecast accuracy is stronger in the ${better} hours for this day — average absolute error is ${better === "evening" ? "lower after 12:00" : "lower before 12:00"} than in the ${worse}.`;
    }

    let biasText = "No aggregate bias data available yet.";
    if (aggregate && aggregate.bias !== null) {
      const direction = aggregate.bias >= 0 ? "over-forecasting" : "under-forecasting";
      biasText = `Consistent ${direction} observed across the full decision window (${aggregate.bias >= 0 ? "+" : ""}${Math.round(aggregate.bias).toLocaleString()} MW average bias).`;
    }

    const scored = periods.filter((p) => p.error !== null);
    let focusText = "No settlement periods with both a forecast and an actual value today.";
    if (scored.length > 0) {
      const worst = scored.reduce((a, b) => (Math.abs(a.error as number) > Math.abs(b.error as number) ? a : b));
      const time = worst.start_time.slice(11, 16);
      focusText = `Focus area: ${time} shows the highest deviation from actual generation this day (${Math.abs(Math.round(worst.error as number)).toLocaleString()} MW error).`;
    }

    return { trendText, biasText, focusText };
  }, [periods, aggregate]);

  return (
    <div className="surface-panel rounded-3xl p-6 transition-colors duration-300">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
          Key insights
        </h3>
      </div>
      <div className="mt-4 grid gap-5 sm:grid-cols-3">
        <InsightCard
          icon={TrendingUp}
          iconClass="bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
          text={insights.trendText}
        />
        <InsightCard
          icon={Activity}
          iconClass="bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
          text={insights.biasText}
        />
        <InsightCard
          icon={Target}
          iconClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
          text={insights.focusText}
        />
      </div>
    </div>
  );
}
