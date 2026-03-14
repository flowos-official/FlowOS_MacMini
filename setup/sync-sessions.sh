#!/usr/bin/env bash
# =============================================================================
# FlowOS — Session Monitor Sync Script
# Polls Antoni + Kyungjini OpenClaw gateways and upserts to Supabase
# Deploy to: /Users/Antoni/scripts/sync-sessions.sh
# LaunchAgent: com.flowos.sync-sessions (60s interval)
# =============================================================================

set -euo pipefail

SUPABASE_URL="https://wihejwjemizbciwliqzp.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpaGVqd2plbWl6YmNpd2xpcXpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzMwOTg2MCwiZXhwIjoyMDg4ODg1ODYwfQ.Q4_y1ol2SW5NC7wU37UP5VxEl-lp5sAIUI6drquOobo"

KYUNGJINI_TOKEN="4020bd24cc5b33483c93a9d45e68e642d3e63de1fb00c984"
# NOTE: Kyungjini gateway port is 18790 (confirmed from openclaw.json)
# From Antoni machine, use Tailscale IP: http://100.103.230.68:18790
# (update this if the bind address changes or port differs)
KYUNGJINI_GATEWAY="http://100.103.230.68:18790"

# Read Antoni token from config
OPENCLAW_JSON="${HOME}/.openclaw/openclaw.json"
if [[ -f "$OPENCLAW_JSON" ]]; then
  ANTONI_TOKEN=$(python3 -c "import json,sys; d=json.load(open('$OPENCLAW_JSON')); print(d.get('gatewayToken',''))" 2>/dev/null || echo "")
else
  ANTONI_TOKEN=""
fi
ANTONI_GATEWAY="http://127.0.0.1:18789"

LOG_PREFIX="[sync-sessions $(date '+%Y-%m-%d %H:%M:%S')]"

# ── Helpers ──────────────────────────────────────────────────────────────────

# fetch_sessions NODE_ID GATEWAY_URL TOKEN → JSON array string or "[]"
fetch_sessions() {
  local node_id="$1"
  local gateway="$2"
  local token="$3"

  if [[ -z "$token" ]]; then
    echo "$LOG_PREFIX WARN: no token for $node_id, skipping" >&2
    echo "[]"
    return
  fi

  local response
  response=$(curl -sf --max-time 10 \
    -X POST "${gateway}/tools/invoke" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${token}" \
    -d '{"tool":"sessions_list","params":{}}' 2>/dev/null) || {
    echo "$LOG_PREFIX WARN: could not reach $node_id gateway at $gateway" >&2
    echo "[]"
    return
  }

  # Parse sessions array from response
  # Response format: {"ok":true,"result":{"details":{"sessions":[...]}}}
  python3 -c "
import json, sys
try:
    raw = sys.stdin.read()
    d = json.loads(raw)
    # Try result.details.sessions first (OpenClaw gateway format)
    sessions = (d.get('result') or {}).get('details', {}).get('sessions', None)
    if sessions is None:
        # Fallback: top-level sessions key
        sessions = d.get('sessions', [])
    print(json.dumps(sessions))
except Exception as e:
    sys.stderr.write(f'parse error: {e}\n')
    print('[]')
" <<< "\${response}" 2>/dev/null || echo "[]"
}

# sync_node NODE_ID SESSIONS_JSON
sync_node() {
  local node_id="$1"
  local sessions_json="$2"

  # 1. DELETE existing rows for this node
  local del_response
  del_response=$(curl -sf --max-time 10 \
    -X DELETE \
    "${SUPABASE_URL}/rest/v1/active_sessions?node_id=eq.${node_id}" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Prefer: return=minimal" 2>/dev/null) || {
    echo "$LOG_PREFIX ERROR: failed to delete sessions for $node_id" >&2
    return
  }

  # 2. Count sessions
  local count
  count=$(python3 -c "import json,sys; s=json.loads(sys.argv[1]); print(len(s))" "$sessions_json" 2>/dev/null || echo "0")

  if [[ "$count" -eq 0 ]]; then
    echo "$LOG_PREFIX INFO: $node_id — 0 sessions (cleared)" >&2
    return
  fi

  # 3. Build INSERT payload
  local insert_payload
  insert_payload=$(python3 -c "
import json, sys
from datetime import datetime, timezone

sessions = json.loads(sys.argv[1])
node_id = sys.argv[2]
now = datetime.now(timezone.utc).isoformat()
rows = []
for s in sessions:
    rows.append({
        'node_id': node_id,
        'session_key': s.get('key', ''),
        'display_name': s.get('displayName', ''),
        'session_type': s.get('kind', 'other'),
        'model': s.get('model', ''),
        'total_tokens': s.get('totalTokens', 0),
        'context_tokens': s.get('contextTokens', 0),
        'channel': s.get('channel', ''),
        'last_activity_at': now,
        'started_at': now,
        'estimated_minutes': 60,
    })
print(json.dumps(rows))
" "$sessions_json" "$node_id" 2>/dev/null)

  if [[ -z "$insert_payload" ]] || [[ "$insert_payload" == "[]" ]]; then
    echo "$LOG_PREFIX WARN: empty insert payload for $node_id" >&2
    return
  fi

  # 4. INSERT new rows
  local ins_response
  ins_response=$(curl -sf --max-time 10 \
    -X POST \
    "${SUPABASE_URL}/rest/v1/active_sessions" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "$insert_payload" 2>/dev/null) || {
    echo "$LOG_PREFIX ERROR: failed to insert sessions for $node_id" >&2
    return
  }

  echo "$LOG_PREFIX OK: $node_id — $count sessions synced" >&2
}

# ── Main ─────────────────────────────────────────────────────────────────────

echo "$LOG_PREFIX starting sync run" >&2

# Antoni (local)
ANTONI_SESSIONS=$(fetch_sessions "antoni" "$ANTONI_GATEWAY" "$ANTONI_TOKEN")
sync_node "antoni" "$ANTONI_SESSIONS"

# Kyungjini (remote via Tailscale — gateway exposed at 28790)
# NOTE: Kyungjini's gateway must be reachable. In the Anton machine,
# this requires Tailscale to be active and Kyungjini's port 28790 to be
# accessible. Adjust gateway URL if needed (e.g. http://100.x.x.x:28790).
KYUNGJINI_SESSIONS=$(fetch_sessions "kyungjini" "$KYUNGJINI_GATEWAY" "$KYUNGJINI_TOKEN")
sync_node "kyungjini" "$KYUNGJINI_SESSIONS"

echo "$LOG_PREFIX done" >&2
