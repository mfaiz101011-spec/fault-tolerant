CREATE TABLE IF NOT EXISTS raw_events (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('processed', 'rejected', 'failed')),
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS processed_events (
  id BIGSERIAL PRIMARY KEY,
  raw_event_id BIGINT REFERENCES raw_events(id),
  idempotency_key TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  event_timestamp TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raw_events_status ON raw_events(status);
CREATE INDEX IF NOT EXISTS idx_processed_client_time
  ON processed_events(client_id, event_timestamp);
CREATE INDEX IF NOT EXISTS idx_processed_metric
  ON processed_events(metric);
