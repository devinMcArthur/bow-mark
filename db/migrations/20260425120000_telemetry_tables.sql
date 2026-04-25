-- Telemetry tables for persistent observability
-- Phase 1 of telemetry-logging-improvements plan

CREATE TABLE telemetry_errors (
  id            BIGSERIAL PRIMARY KEY,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  source        TEXT NOT NULL,
  operation     TEXT,
  error_message TEXT NOT NULL,
  error_code    TEXT,
  trace_id      TEXT,
  user_id       TEXT,
  user_name     TEXT,
  user_email    TEXT,
  metadata      JSONB
);

CREATE INDEX idx_telemetry_errors_occurred ON telemetry_errors (occurred_at DESC);
CREATE INDEX idx_telemetry_errors_source   ON telemetry_errors (source, occurred_at DESC);

CREATE TABLE telemetry_op_timings (
  id             BIGSERIAL PRIMARY KEY,
  recorded_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  operation_name TEXT NOT NULL,
  duration_ms    INTEGER NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('ok', 'error')),
  trace_id       TEXT
);

CREATE INDEX idx_telemetry_op_timings_recorded ON telemetry_op_timings (recorded_at DESC);
CREATE INDEX idx_telemetry_op_timings_op       ON telemetry_op_timings (operation_name, recorded_at DESC);

CREATE TABLE telemetry_consumer_events (
  id            BIGSERIAL PRIMARY KEY,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type    TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('ok', 'error', 'retry')),
  duration_ms   INTEGER,
  error_message TEXT,
  metadata      JSONB
);

CREATE INDEX idx_telemetry_consumer_occurred ON telemetry_consumer_events (occurred_at DESC);
CREATE INDEX idx_telemetry_consumer_status   ON telemetry_consumer_events (status, occurred_at DESC);
