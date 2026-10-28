from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_days import router as days_router
from app.api.routes_metrics import router as metrics_router
from app.api.routes_series import router as series_router
from app.db.session import init_db

app = FastAPI(title="GridBricks Wind Forecast Accuracy Portal")

app.include_router(days_router)
app.include_router(series_router)
app.include_router(metrics_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
