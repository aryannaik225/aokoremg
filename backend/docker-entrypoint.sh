#!/bin/sh
set -e

DB_FILE="${DB_PATH:-./data/gridbricks.db}"

if [ ! -f "$DB_FILE" ]; then
  echo "No SQLite DB found at $DB_FILE — running initial ingestion from Elexon..."
  python -m app.ingestion.ingest
else
  echo "Found existing SQLite DB at $DB_FILE — skipping ingestion."
fi

exec uvicorn app.main:app --host 0.0.0.0 --port 8000
