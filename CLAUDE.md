# GridBricks Assignment — Wind Forecast Accuracy Portal

## Rules

1. When asked to commit, write a descriptive commit message explaining exactly what changed (e.g. `fix: patch auth vulnerability in middleware`), not a generic message.
2. Never modify the local git author configuration. Rely entirely on the existing local config (aryannaik225) — never add "Claude" or "AI" as a co-author or attribution line.
3. Never run `git push`. Only run `git add` and `git commit`. The user reviews the log and pushes themselves.

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

### Phase 2 — Elexon ingestion
- [ ] Implement `elexon/client.py` with functions to fetch `FUELHH` (filtered to `fuelType=WIND`) and `WINDFOR` for a given date range.
- [ ] Implement Pydantic schemas validating raw Elexon response shape.
- [ ] Implement `ingestion/ingest.py` to fetch Jan 2 – Feb 1, 2026 actuals and all relevant `WINDFOR` revisions, and upsert into SQLite (idempotent — safe to re-run).
- [ ] Add a CLI entrypoint or startup hook to trigger ingestion, plus basic logging of rows fetched/inserted.
- [ ] Write a quick sanity script/test confirming actuals and forecasts both cover the expected delivery-day range with no major gaps.

### Phase 3 — Decision-time forecast & metrics logic
- [ ] Implement `domain/decision_forecast.py`: given a delivery date and decision-cutoff, return the latest-as-of-cutoff forecast per settlement period.
- [ ] (Optional) Unit test `decision_forecast.py` against a hand-constructed set of forecast revisions to confirm it picks the correct "as of" row, not just the latest overall.
- [ ] Implement `domain/metrics.py`: MAE, RMSE, bias, nMAE, MAPE over a list of (forecast, actual) pairs.
- [ ] (Optional) Unit test `metrics.py` against known numeric examples.

### Phase 4 — API endpoints
- [ ] Implement `GET /api/days` listing in-scope delivery days with data-availability flags.
- [ ] Implement `GET /api/days/{date}/series` returning per-settlement-period forecast, actual, and error for one delivery day.
- [ ] Implement `GET /api/metrics` returning aggregated error metrics over a date range (default full Jan 2026 decision window).
- [ ] (Optional) Add integration tests hitting these endpoints against the seeded SQLite data.

### Phase 5 — Frontend scaffolding
- [ ] Initialize `frontend/` Next.js and Tailwind CSS, basic routing-free single-page structure.
- [ ] Implement `api/client.ts` wrapping the three backend endpoints.
- [ ] Build `DayPicker.tsx` constrained to the Jan 2 – Feb 1, 2026 delivery-day range.

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
- [ ] Deploy backend (Heroku or equivalent), run ingestion against it, confirm live API responses.
- [ ] Deploy frontend (Vercel), pointed at the deployed backend URL.
- [ ] Verify both deployed URLs work in an incognito window with no auth barriers.

### Phase 9 — Repo & submission prep
- [ ] Write README: directory/file overview, local run instructions, deployed app links, explicit note on any AI tool usage.
- [ ] Rename/create the public GitHub repo with an anonymous random-string name.
- [ ] Record the two-part (pitch + tech review) demo video, ≤10 minutes total, ≤5 minutes per part.
- [ ] Fill out the submission form with repo, video, and deployed app links, each verified in incognito mode.
