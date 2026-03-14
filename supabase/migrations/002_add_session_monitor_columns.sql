-- FlowOS Mac Mini Session Monitor — Migration 002
-- Add session tracking columns to active_sessions table
-- Enables real-time display of which tasks each node is currently running

ALTER TABLE active_sessions
  ADD COLUMN IF NOT EXISTS session_key    TEXT,
  ADD COLUMN IF NOT EXISTS display_name  TEXT,
  ADD COLUMN IF NOT EXISTS total_tokens  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS context_tokens INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS channel       TEXT;

-- Index for fast node-based lookups
CREATE INDEX IF NOT EXISTS idx_active_sessions_node_id
  ON active_sessions (node_id);

-- Ensure realtime is enabled for this table
ALTER PUBLICATION supabase_realtime ADD TABLE active_sessions;
