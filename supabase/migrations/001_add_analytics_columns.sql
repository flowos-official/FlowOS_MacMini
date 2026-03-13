-- FlowOS Mac Mini Analytics — Migration 001
-- Add comprehensive hardware/network/AI metrics to node_heartbeats
-- Create node_openclaw_logs table for session log viewer

-- ── 1. Add new columns to node_heartbeats ──────────────────────────────────

ALTER TABLE node_heartbeats
  -- Hardware
  ADD COLUMN IF NOT EXISTS cpu_temp_c           DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS memory_wired_gb      DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS memory_compressed_gb DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS memory_pressure      TEXT CHECK (memory_pressure IN ('normal', 'warn', 'critical')),
  ADD COLUMN IF NOT EXISTS swap_used_gb         DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS uptime_seconds       INTEGER,
  ADD COLUMN IF NOT EXISTS power_watts          DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS gpu_usage            DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS ane_usage            DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS fan_rpm              INTEGER,
  ADD COLUMN IF NOT EXISTS disk_read_mbps       DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS disk_write_mbps      DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS disk_total_gb        DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS disk_used_gb         DOUBLE PRECISION,
  -- Network
  ADD COLUMN IF NOT EXISTS net_in_mbps          DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS net_out_mbps         DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS tailscale_status     TEXT,
  ADD COLUMN IF NOT EXISTS tailscale_latency_ms INTEGER,
  ADD COLUMN IF NOT EXISTS latency_supabase_ms  INTEGER,
  ADD COLUMN IF NOT EXISTS latency_anthropic_ms INTEGER,
  -- AI / Claude
  ADD COLUMN IF NOT EXISTS claude_pids          JSONB,   -- [{pid, memory_mb, runtime_sec, model}]
  ADD COLUMN IF NOT EXISTS tokens_today         INTEGER,
  ADD COLUMN IF NOT EXISTS cost_today_usd       DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS api_latency_ms       INTEGER,
  -- Processes
  ADD COLUMN IF NOT EXISTS top_processes        JSONB,   -- [{name, cpu_pct, mem_mb}]
  -- OpenClaw
  ADD COLUMN IF NOT EXISTS openclaw_status              TEXT,
  ADD COLUMN IF NOT EXISTS openclaw_version             TEXT,
  ADD COLUMN IF NOT EXISTS openclaw_connected_channels  INTEGER,
  -- Misc
  ADD COLUMN IF NOT EXISTS git_repo_count       INTEGER;

-- ── 2. Create node_openclaw_logs table ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS node_openclaw_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id      TEXT        NOT NULL REFERENCES node_roles(node_id) ON DELETE CASCADE,
  session_key  TEXT        NOT NULL,
  session_type TEXT,                  -- 'main' | 'isolated' | 'cron'
  model        TEXT,
  role         TEXT,                  -- 'user' | 'assistant' | 'system'
  content      TEXT        NOT NULL,
  tokens       INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_openclaw_logs_node_session
  ON node_openclaw_logs (node_id, session_key);

CREATE INDEX IF NOT EXISTS idx_openclaw_logs_created
  ON node_openclaw_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_openclaw_logs_node_created
  ON node_openclaw_logs (node_id, created_at DESC);

-- ── 3. Enable Realtime for new table ────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE node_openclaw_logs;

-- ── 4. Trim old heartbeats (keep last 1000 per node) ───────────────────────
-- Run this as a cron job in Supabase or via pg_cron

-- Example pg_cron job (run daily at 3am):
-- SELECT cron.schedule('trim-heartbeats', '0 3 * * *', $$
--   DELETE FROM node_heartbeats
--   WHERE id NOT IN (
--     SELECT id FROM node_heartbeats
--     ORDER BY created_at DESC
--     LIMIT 1000
--   )
-- $$);

-- ── 5. Helpful views ────────────────────────────────────────────────────────

-- Latest heartbeat per node (used by dashboard overview)
CREATE OR REPLACE VIEW latest_node_heartbeats AS
SELECT DISTINCT ON (node_id) *
FROM node_heartbeats
ORDER BY node_id, created_at DESC;

-- Session list with message counts
CREATE OR REPLACE VIEW openclaw_session_summary AS
SELECT
  node_id,
  session_key,
  MAX(session_type) AS session_type,
  MAX(model)        AS model,
  COUNT(*)          AS message_count,
  MAX(created_at)   AS last_message_at
FROM node_openclaw_logs
GROUP BY node_id, session_key
ORDER BY last_message_at DESC;
