const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export interface DaySummary {
  date: string;
  actual_periods_available: number;
  forecast_periods_available: number;
  settlement_periods_expected: number;
  has_complete_actuals: boolean;
  has_any_forecast: boolean;
}

export interface SeriesPeriod {
  start_time: string;
  forecast: number | null;
  actual: number | null;
  error: number | null;
}

export interface DaySeries {
  date: string;
  periods: SeriesPeriod[];
}

export interface ErrorMetrics {
  mae: number | null;
  rmse: number | null;
  bias: number | null;
  n_mae: number | null;
  mape: number | null;
  count: number;
}

export interface MetricsResponse {
  from: string;
  to: string;
  aggregate: ErrorMetrics;
  daily: (ErrorMetrics & { date: string })[];
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Request to ${path} failed with ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export function getDays(): Promise<DaySummary[]> {
  return request<DaySummary[]>("/api/days");
}

export function getDaySeries(date: string): Promise<DaySeries> {
  return request<DaySeries>(`/api/days/${date}/series`);
}

export function getMetrics(from?: string, to?: string): Promise<MetricsResponse> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();
  return request<MetricsResponse>(`/api/metrics${query ? `?${query}` : ""}`);
}
