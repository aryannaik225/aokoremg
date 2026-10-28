# GridBricks Assignment — Wind Forecast Accuracy Portal

## Important GitHub Rules

1. When asked to commit, write a descriptive commit message explaining exactly what changed (e.g. `fix: patch auth vulnerability in middleware`), not a generic message. Never commit without asking.
2. Never modify the local git author configuration. Rely entirely on the existing local config (aryannaik225) — 
3. Never add "Claude" or "AI" as a co-author or attribution line.
4. Never run `git push`. Only run `git add` and `git commit`. The user reviews the log and pushes themselves.

## 1. Project Overview

A web app for a UK energy utility's day-ahead power-buying team. The team must decide, one day before each delivery day, how much power to procure beyond what wind generation is expected to supply. The app has two jobs, using **only** two Elexon BMRS endpoints and **only** wind data:

1. Show the **latest wind generation forecast that was actually available at decision time** for each half-hourly settlement period of a given delivery day.
2. Quantify, with real numbers, **how accurate that decision-time forecast turned out to be** against actual metered wind generation, so the team can factor forecast risk into their buying decision.

Scope is deliberately narrow: national-level wind only, Elexon only, and data relevant to **purchase decisions made in January 2026**.

### Data sources (Elexon BMRS)

| Purpose | Dataset | Endpoint | Key fields |
|---|---|---|---|
| Actuals | `FUELHH` | `https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH` (stream variant per instructions.md) | `startTime` (30-min settlement period), `fuelType` (filter to `WIND`), `generation` |
| Forecasts | `WINDFOR` | `https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR` (stream variant per instructions.md) | `startTime`, `publishTime` (when the forecast was issued), `generation` |

> Use the exact `/stream` endpoints linked in `instructions.md`; confirm actual base URL/query params (date range params, pagination) during implementation — Elexon's API may require `from`/`to` or `publishDateTimeFrom/To` style params. Validate with a real request before writing ingestion code against assumptions.

### Core domain logic — decision-time semantics (critical, do not skip)

- The day-ahead market gate closes before the delivery day. The team must decide on day `D-1` what to buy for delivery day `D`.
- "Latest forecast available at decision time" means: for each settlement period (`startTime`) on delivery day `D`, pick the `WINDFOR` record with that `startTime` whose `publishTime` is the **most recent one ≤ the decision cutoff on `D-1`** (use end-of-day `D-1` as the practical cutoff unless a more precise gate-closure time is adopted — document whichever choice is made).
- This is a per-settlement-period "as-of" lookup, not just "the forecast published closest to delivery" — multiple `WINDFOR` records can share a `startTime` with different `publishTime`s as forecasts get revised; always pick the latest one that existed *before* the decision was made, never a later revision.

### January 2026 constraint (critical, do not skip)

- "Purchase decisions to be made in January 2026" → decision dates run **Jan 1, 2026 to Jan 31, 2026**.
- Since each decision on day `D-1` covers delivery day `D = (D-1) + 1`, the **delivery days in scope are Jan 2, 2026 through Feb 1, 2026**.
- Forecast data must be pulled for a wider publish-time window than just January (forecasts for a Feb 1 delivery day, published Jan 31, still count), and actuals must cover Jan 2 – Feb 1, 2026.
- The app's day picker / default view should reflect delivery days Jan 2 – Feb 1, 2026, not calendar January.

### Quantitative error metric

For each in-scope delivery day and settlement period:
- `error = decision_time_forecast_generation - actual_generation`

Aggregate (per day, and across the full Jan 2026 decision window):
- **MAE** (mean absolute error)
- **RMSE** (root mean squared error)
- **Bias** (mean signed error — are we systematically over/under-forecasting?)
- **MAPE or nMAE** (normalized error — MAPE is unstable near-zero generation, so prefer **nMAE = MAE / mean(actual_generation)** as the headline normalized metric, with MAPE shown only as a secondary figure)

These metrics are what let the buying team weigh how much to trust the forecast when sizing their day-ahead purchase.

---

## 2. Architecture

### 2.1 Backend — FastAPI (Python)

```
backend/
  app/
    main.py                 # FastAPI app, routers, CORS
    config.py                # env-driven settings (Elexon base URL, cache DB path, decision cutoff time)
    elexon/
      client.py              # HTTP client for FUELHH and WINDFOR stream endpoints
      schemas.py              # Pydantic models for raw Elexon responses
    ingestion/
      ingest.py               # fetch + upsert actuals & forecasts into local storage
    domain/
      decision_forecast.py    # "as-of" latest-forecast-before-cutoff selection logic
      metrics.py               # MAE / RMSE / bias / nMAE / MAPE calculations
    db/
      models.py                # SQLAlchemy models: ActualGeneration, ForecastGeneration
      session.py
    api/
      routes_days.py           # GET /api/days -> list of in-scope delivery days
      routes_series.py         # GET /api/days/{date}/series -> forecast vs actual per settlement period
      routes_metrics.py        # GET /api/metrics?from=&to= -> aggregated error metrics
    tests/
  Dockerfile
  requirements.txt
```

- **Storage**: SQLite file (simplest for a 16-hour build, Docker-volume-backed) with two tables: `actual_generation(start_time, generation)` and `forecast_generation(start_time, publish_time, generation)`. Avoids re-hitting Elexon on every page load.
- **Ingestion**: on-demand endpoint or startup task that fetches Jan 2 – Feb 1, 2026 actuals (`FUELHH`, `fuelType=WIND`) and all `WINDFOR` records with `startTime` in that same window (across all their `publishTime` revisions), and upserts them.
- **Decision-time selection**: pure function — given a delivery date and a decision-cutoff timestamp, return one forecast `generation` value per settlement period by filtering to `publishTime <= cutoff` and taking the max `publishTime` per `startTime`.
- **Metrics service**: pure function(s) over paired (forecast, actual) series → dict of MAE/RMSE/bias/nMAE/MAPE.
- **API endpoints**:
  - `GET /api/days` — list of delivery days in scope (Jan 2–Feb 1, 2026) with data-availability flags.
  - `GET /api/days/{date}/series` — half-hourly forecast vs actual pairs + per-period error for one delivery day.
  - `GET /api/metrics?from=2026-01-02&to=2026-02-01` — aggregated error metrics over a range (default: full window).

### 2.2 Frontend — React

```
frontend/
  src/
    api/
      client.ts                # fetch wrappers for backend endpoints
    components/
      DayPicker.tsx             # select delivery day (Jan 2 – Feb 1, 2026)
      ForecastActualChart.tsx    # line chart: forecast vs actual per settlement period
      MetricsSummary.tsx          # MAE / RMSE / bias / nMAE tiles for selected day + whole month
    pages/
      Dashboard.tsx
    App.tsx
  Dockerfile
  package.json
```

- Single dashboard page: day picker at top, chart in the middle (forecast line vs actual line, half-hourly), metrics summary panel showing both the selected day's error and the full-January-decision-window aggregate.
- Charting library: any lightweight option (e.g. Recharts) is fine — follow the dataviz skill's palette/accessibility guidance when building this.
- No auth, no routing complexity needed — this is a single-view analytical tool.

### 2.3 Docker

```
docker-compose.yml       # backend + frontend services, shared network, volume for sqlite db
backend/Dockerfile        # python:3.12-slim, install requirements, run uvicorn
frontend/Dockerfile       # node build stage -> static serve (or vite dev server for simplicity)
.env.example               # ELEXON_BASE_URL, DECISION_CUTOFF_TIME, DB_PATH, etc.
```

- `docker-compose up` should bring up both services locally with one command, matching what will later be deployed.

### 2.4 Deployment

- Frontend → Vercel (static React build).
- Backend → Heroku (or equivalent small PaaS) running the FastAPI container, with the SQLite file seeded via the ingestion step on first boot (or a one-off ingestion script run against the deployed instance).
- README must document: directory layout, local run instructions (`docker-compose up`), and the live deployed URLs — plus an explicit note on any AI tool assistance used, per instructions.md.

---

## 3. Task Checklist

### Phase 0 — Domain & data validation (COMPLETED)
- [x] **FUELHH (Actuals) API Contract:** 
  - URL format: `https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream?settlementDateFrom={YYYY-MM-DD}&settlementDateTo={YYYY-MM-DD}&fuelType=WIND`
  - Response Schema: Array of objects containing `{"dataset": "FUELHH", "publishTime": str, "startTime": str (ISO8601), "settlementDate": str, "settlementPeriod": int, "fuelType": "WIND", "generation": int (Megawatts)}`
- [x] **WINDFOR (Forecasts) API Contract:**
  - URL format: `https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream?publishDateTimeFrom={YYYY-MM-DDTHH:MM:SSZ}&publishDateTimeTo={YYYY-MM-DDTHH:MM:SSZ}`
  - Response Schema: Array of objects containing `{"dataset": "WINDFOR", "publishTime": str (ISO8601), "startTime": str (ISO8601), "generation": int (Megawatts)}`
  - *Crucial Data Note:* The API returns multiple rows per `startTime` representing forecast revisions. The backend must filter these.
- [x] Document the precise decision-cutoff time: **Use 11:00 AM UK time on day D-1 as the strict gate-closure cutoff time** in `config.py`.
- [x] Confirm data windows: **Delivery-day window is Jan 2, 2026 – Feb 1, 2026**. (Decision-day window is Jan 1–31, 2026).

### Phase 1 — Backend scaffolding (COMPLETED)
- [x] Initialize `backend/` FastAPI project structure, `requirements.txt` (fastapi, uvicorn, httpx, sqlalchemy, pydantic).
- [x] Set up `config.py` with env-driven settings and `.env.example`.
- [x] Set up SQLite + SQLAlchemy models (`ActualGeneration`, `ForecastGeneration`) and session management.
- [x] Add basic health-check endpoint and CORS config for the frontend origin.

**Implementation note:** Created the `backend/app/` package skeleton (`elexon/`, `ingestion/`, `domain/`, `db/`, `api/`, `tests/`, each with `__init__.py`) matching the layout in section 2.1. `config.py` uses `pydantic-settings` to read `ELEXON_BASE_URL`, `DECISION_CUTOFF_TIME` (hardcoded default 11:00 UK time per the Phase 0 decision), `DELIVERY_WINDOW_START/END` (2026-01-02 / 2026-02-01), `DB_PATH`, and `FRONTEND_ORIGIN` from a `.env` file, with `.env.example` added at the repo root. `db/models.py` defines `ActualGeneration` (PK `start_time`) and `ForecastGeneration` (composite PK `start_time` + `publish_time`, since WINDFOR has multiple revisions per settlement period) as SQLAlchemy 2.0 declarative models; `db/session.py` creates the SQLite engine (DB file under `backend/data/`, auto-created) and exposes `init_db()` + a `get_db()` FastAPI dependency. `main.py` wires CORS (restricted to `FRONTEND_ORIGIN`), calls `init_db()` on startup, and exposes `GET /api/health`.

Routers for `/api/days`, `/api/days/{date}/series`, and `/api/metrics` are deliberately not stubbed yet — they depend on ingestion and domain logic from later phases and aren't part of Phase 1's scope.

Note: the local Python interpreter is 3.14, which has no prebuilt wheels for the `pydantic==2.9.2` / `pydantic-settings==2.5.2` versions originally listed as examples — pinned `requirements.txt` to `pydantic==2.14.1` / `pydantic-settings==2.11.0` instead (first versions with cp314 wheels); all other pins are unchanged. Verified: `pip install -r requirements.txt` installs cleanly in a venv, `uvicorn app.main:app` starts, `GET /api/health` returns `{"status":"ok"}`, and the SQLite file at `backend/data/gridbricks.db` is created on startup with both `actual_generation` and `forecast_generation` tables.

### Phase 2 — Elexon ingestion (COMPLETED)
- [x] Implement `elexon/client.py` with functions to fetch `FUELHH` (filtered to `fuelType=WIND`) and `WINDFOR` for a given date range.
- [x] Implement Pydantic schemas validating raw Elexon response shape.
- [x] Implement `ingestion/ingest.py` to fetch Jan 2 – Feb 1, 2026 actuals and all relevant `WINDFOR` revisions, and upsert into SQLite (idempotent — safe to re-run).
- [x] Add a CLI entrypoint or startup hook to trigger ingestion, plus basic logging of rows fetched/inserted.
- [x] Write a quick sanity script/test confirming actuals and forecasts both cover the expected delivery-day range with no major gaps.

**Implementation note:** `elexon/schemas.py` defines `FuelHHRecord` and `WindForRecord` Pydantic models matching the confirmed Phase 0 response shapes. `elexon/client.py` has two thin `httpx`-based functions, `fetch_fuelhh_wind(date_from, date_to)` and `fetch_windfor(publish_from, publish_to)`, each hitting the `/stream` endpoint and validating the JSON array response with a `TypeAdapter`.

`ingestion/ingest.py` fetches `FUELHH` directly over the delivery window (`settlementDateFrom/To` = Jan 2–Feb 1, 2026), and fetches `WINDFOR` over a wider `publishDateTimeFrom/To` range — 14 days before the delivery window start through 1 day after its end — since forecasts for in-scope delivery days can be published well before January. The fetched `WINDFOR` rows are then filtered in Python to only those whose `startTime` falls within the delivery window before upserting, per the CLAUDE.md note that the API filters by publish time, not start time. Both upserts use SQLite's `INSERT ... ON CONFLICT DO UPDATE` (via `sqlalchemy.dialects.sqlite.insert`) keyed on each table's primary key, making re-runs idempotent, and are batched in chunks of 200 rows to stay under SQLite's default 999-bound-parameter limit (hit this directly on the first real run with ~18k forecast rows). `run_ingestion()` is exposed both as `python -m app.ingestion.ingest` (CLI entrypoint) and importable for a future startup hook; it logs rows fetched vs. upserted for each dataset.

Ran ingestion against the live Elexon API: 1,488 `FUELHH` rows (31 days × 48 settlement periods) and 18,080 in-window `WINDFOR` rows (out of 26,280 fetched across the wider publish-time lookback) were upserted into `backend/data/gridbricks.db`.

`tests/test_ingestion_sanity.py` checks the ingested (not mocked) DB: actuals' min/max `start_time` span the full delivery window with row count within 5% of the expected 1,488, forecasts' min/max `start_time` likewise span the window, and forecasts have strictly more total rows than distinct `start_time` values (confirming multiple revisions were captured, not just one row per period). All three pass against the live-ingested data. Added `pytest==9.2.0` to `requirements.txt` (no cp314 wheel for the originally-tried 8.3.3, same issue as the earlier pydantic pin note).

### Phase 3 — Decision-time forecast & metrics logic (COMPLETED)
- [x] Implement `domain/decision_forecast.py`: given a delivery date and decision-cutoff, return the latest-as-of-cutoff forecast per settlement period.
- [x] (Optional) Unit test `decision_forecast.py` against a hand-constructed set of forecast revisions to confirm it picks the correct "as of" row, not just the latest overall.
- [x] Implement `domain/metrics.py`: MAE, RMSE, bias, nMAE, MAPE over a list of (forecast, actual) pairs.
- [x] (Optional) Unit test `metrics.py` against known numeric examples.

**Implementation note:** `domain/decision_forecast.py` defines a `ForecastRevision` dataclass plus three functions: `decision_cutoff_utc(delivery_date)` converts the Phase 0 rule (11:00 UK local time on D-1) into a naive UTC `datetime` — matching how Elexon timestamps end up stored in SQLite, since SQLAlchemy's SQLite `DateTime` column silently drops `tzinfo` on write/read (confirmed by inspecting a stored row: a tz-aware UTC datetime came back naive). January and Feb 1 are both UK winter time (GMT = UTC+0), so this window needs no DST handling, but the conversion is done properly via `zoneinfo("Europe/London")` rather than hardcoded, in case the window ever shifts. `select_decision_time_forecast(revisions, cutoff_utc)` is the pure "as-of" selection: for each `start_time` it keeps only the revision with the max `publish_time` among those `<= cutoff_utc`, discarding any revision published after the cutoff even if it would otherwise be the latest for that period. `get_decision_time_forecast_for_day(db, delivery_date)` is the DB-facing wrapper that queries `ForecastGeneration` for the day's `start_time` range and calls the pure function.

`domain/metrics.py` defines `compute_metrics(pairs)` over `(forecast, actual)` tuples, returning an `ErrorMetrics` dataclass with `mae`, `rmse`, `bias` (mean signed error, `forecast - actual`), `n_mae` (MAE / mean(actual), `None` if mean(actual) is 0), `mape` (secondary metric, computed only over pairs with nonzero actual, `None` if none exist), and `count`.

Added `tzdata==2025.2` to `requirements.txt` — Windows has no system IANA tzdata, so `zoneinfo.ZoneInfo("Europe/London")` raised `ZoneInfoNotFoundError` without it.

`tests/test_decision_forecast.py` (5 tests) and `tests/test_metrics.py` (4 tests) cover: cutoff math, picking the correct as-of revision vs. the latest-overall one, exact-cutoff-timestamp inclusion, a settlement period with no pre-cutoff revision being omitted (not defaulted to 0), independent per-period resolution, a hand-computed numeric example for all four metrics, the empty-input case, the zero-mean-actual case (nMAE/MAPE should be `None`, not a div-by-zero), and the perfect-forecast case. All 12 tests in the suite (these plus the existing Phase 2 ingestion sanity tests) pass.

**Data-shape finding surfaced while sanity-checking against the live-ingested DB (relevant to Phase 4):** WINDFOR is natively **hourly** (`start_time` only ever lands on the hour), while FUELHH/actuals are half-hourly. Running `get_decision_time_forecast_for_day` against real data for Jan 15, 2026 returned exactly 24 of 48 settlement periods — the 24 `:30` periods have zero WINDFOR rows at all (confirmed directly against the table, not a cutoff artifact). The decision-time selection logic is correct as-is (it faithfully returns only what the API provides), but the Phase 4 `series` endpoint will need an explicit, documented choice for pairing a half-hourly actual against an hourly forecast — e.g. forward-filling the hourly forecast value onto the following `:30` period, or only pairing on the hours that exist and flagging the `:30` periods as no-forecast-available. Not resolved in this phase; flagging so it isn't lost.

### Phase 4 — API endpoints (COMPLETED)
- [x] Implement `GET /api/days` listing in-scope delivery days with data-availability flags.
- [x] Implement `GET /api/days/{date}/series` returning per-settlement-period forecast, actual, and error for one delivery day.
- [x] Implement `GET /api/metrics` returning aggregated error metrics over a date range (default full Jan 2026 decision window).
- [x] (Optional) Add integration tests hitting these endpoints against the seeded SQLite data.

**Implementation note:** Resolved the Phase 3 half-hourly-actuals-vs-hourly-forecast gap first, in a new `domain/series.py`: `build_day_series(db, delivery_date)` returns all 48 settlement periods for a day (not just the ones with data), pairing each period's actual with the decision-time forecast **forward-filled from the preceding on-the-hour WINDFOR value** (e.g. the `HH:30` period gets the same decision-time forecast as `HH:00`) — documented as the explicit, deliberate choice flagged as unresolved at the end of Phase 3. Periods missing an actual and/or a pre-cutoff forecast come back with `null`/`None` rather than being silently dropped or zero-filled, so gaps stay visible to API consumers.

Three routers were added under `api/`, each a thin wrapper over the domain layer, and registered in `main.py`:
- `routes_days.py` — `GET /api/days` iterates the configured delivery window (`settings.delivery_window_start`..`end`) and reports `actual_periods_available`, `forecast_periods_available` (counted against the decision-time selection, so it reflects what the buying team could actually see — expect 24/48 since WINDFOR is hourly), and boolean `has_complete_actuals` / `has_any_forecast` flags per day.
- `routes_series.py` — `GET /api/days/{date}/series` calls `build_day_series` directly and returns the 48 `{start_time, forecast, actual, error}` rows; returns `400` for any `date` outside the in-scope delivery window (checked against `settings.delivery_window_start/end`) rather than silently returning empty data.
- `routes_metrics.py` — `GET /api/metrics?from=&to=` defaults both bounds to the full delivery window when omitted, `400`s if `from > to` or if either bound falls outside the in-scope window (keeps the endpoint from silently aggregating over out-of-scope / no-data dates), and for each day in range calls `build_day_series` + `domain/metrics.compute_metrics` over the periods where both forecast and actual exist, returning both a `daily` breakdown and one `aggregate` across the full queried range.

`tests/test_api_endpoints.py` (6 new tests, using FastAPI's `TestClient` against the live-ingested DB — no mocking, consistent with the Phase 2 sanity tests) covers: `/api/days` returns exactly the 31 expected dates with complete data; `/api/days/{date}/series` returns 48 periods per day with every `:30` period's forecast equal to its preceding `:00` period's forecast (verifying the forward-fill); an out-of-scope date on `/series` returns `400`; `/api/metrics` with no params matches the full window and its daily breakdown has one entry per day; an out-of-scope metrics range returns `400`; and a single-day metrics range returns exactly one daily entry. All 18 tests in the suite (12 from Phases 2-3 plus these 6) pass. Manually smoke-tested all three endpoints against the real ingested data with `uvicorn` running locally — e.g. `/api/metrics` over the full window returns `nMAE ≈ 0.179` (MAE ≈ 2016 MW against mean actual generation), confirming the pipeline produces sane, non-degenerate numbers end-to-end.

### Phase 5 — Frontend scaffolding (COMPLETED)
- [x] Initialize `frontend/` Next.js and Tailwind CSS, basic routing-free single-page structure.
- [x] Implement `api/client.ts` wrapping the three backend endpoints.
- [x] Build `DayPicker.tsx` constrained to the Jan 2 – Feb 1, 2026 delivery-day range.

**Implementation note:** Scaffolded `frontend/` with Vite + React + TypeScript instead of Next.js — deviation from this checklist's literal wording, but consistent with section 2.1/2.2's own framing ("no auth, no routing complexity," `frontend/Dockerfile` note "node build stage -> static serve (**or vite dev server for simplicity**)") and with `config.py`'s existing `FRONTEND_ORIGIN` default of `http://localhost:5173`, which is Vite's default dev port, not Next's 3000. Next.js's SSR/routing/app-router machinery has no job to do in a single-view, no-auth analytical tool, so Vite was chosen as the closer fit; flagging the deviation here rather than silently diverging from the written plan.

Tailwind CSS v4 wired in via the `@tailwindcss/vite` plugin (no separate `postcss.config`/`tailwind.config` needed in v4) — added to `vite.config.ts` and imported with `@import "tailwindcss";` in `src/index.css`, which also replaces Vite's default boilerplate styles (the fixed-width `#root`, custom fonts, etc.) with a plain reset.

`src/api/client.ts` defines typed interfaces (`DaySummary`, `DaySeries`, `SeriesPeriod`, `ErrorMetrics`, `MetricsResponse`) mirroring the three backend endpoints' actual JSON shapes (confirmed against the live Phase 4 routers, not guessed), and three thin `fetch` wrappers: `getDays()`, `getDaySeries(date)`, `getMetrics(from?, to?)`. The API base URL is read from `VITE_API_BASE_URL` (defaults to `http://localhost:8000`), configured via a new `frontend/.env.example`.

`src/components/DayPicker.tsx` renders a `<select>` populated from `/api/days`, restricted to exactly the days that endpoint returns (which is already the server-side-enforced Jan 2 – Feb 1, 2026 window — the picker never needs its own date-range logic), and flags any day missing complete actuals or any forecast as "(partial data)" in the option label.

`src/pages/Dashboard.tsx` wires the day picker to `getDays`/`getDaySeries` with loading and error states for both calls, and renders the selected day's periods as a plain table (`start_time`/`forecast`/`actual`/`error`) — a deliberate placeholder standing in for the chart and metrics tiles that are Phase 6's job, used here only to verify the scaffolding's data flow end-to-end. `App.tsx` now renders `Dashboard` directly (no router, per spec).

Verified: `npx tsc --noEmit` and `npm run build` both succeed with no errors. Ran the backend (`uvicorn app.main:app --port 8000`, against the already-ingested `backend/data/gridbricks.db` from Phase 2) and the frontend (`npm run dev`, port 5173) together locally; confirmed `GET /api/days` and `GET /api/days/{date}/series` return real data through the browser-facing dev server and that CORS (`FRONTEND_ORIGIN=http://localhost:5173` in `config.py`) allows the cross-origin request. Playwright's browser tool wasn't reachable in this sandbox to drive an actual page load, so the end-to-end check was via direct `curl` against both running servers plus the clean typecheck/build — a real-browser click-through is still worth doing manually (see testing notes below).

### Phase 6 — Frontend visualization
- [ ] Build `ForecastActualChart.tsx`: half-hourly forecast vs actual line chart for the selected day (consult dataviz skill before writing chart code).
- [ ] Build `MetricsSummary.tsx`: display MAE/RMSE/bias/nMAE for the selected day and for the full January decision window.
- [ ] Wire `Dashboard.tsx` to tie day picker, chart, and summary together with loading/empty/error states.
- [ ] Manually verify in a browser: picking different days updates both the chart and the per-day metrics correctly.

### Phase 7 — Docker
- [ ] Write `backend/Dockerfile` (python:3.12-slim, install deps, run uvicorn, expose port).
- [ ] Write `frontend/Dockerfile` (node build stage, serve static build).
- [ ] Write root `docker-compose.yml` wiring backend + frontend + shared volume for the SQLite file.
- [ ] Verify `docker-compose up` brings up a fully working app end-to-end locally from a clean checkout.

### Phase 8 — Deployment
- [ ] Deploy backend (Heroku or equivalent free service), run ingestion against it, confirm live API responses.
- [ ] Deploy frontend (Vercel), pointed at the deployed backend URL.
- [ ] Verify both deployed URLs work in an incognito window with no auth barriers.

### Phase 9 — Repo & submission prep
- [ ] Write README: directory/file overview, local run instructions, deployed app links, explicit note on any AI tool usage.
- [ ] Rename/create the public GitHub repo with an anonymous random-string name.
- [ ] Record the two-part (pitch + tech review) demo video, ≤10 minutes total, ≤5 minutes per part.
- [ ] Fill out the submission form with repo, video, and deployed app links, each verified in incognito mode.
