#!/bin/bash
# FlowOS Session Monitor — polls all nodes via Tailscale, syncs to Supabase
# Runs every 10 seconds, updates active_sessions table
# Install: cp to /usr/local/bin/flowos-session-monitor.sh && chmod +x

CURL=/usr/bin/curl
PYTHON3=/usr/bin/python3
DATE=/bin/date
LOG_FILE="${FLOWOS_LOG_FILE:-/tmp/flowos-session-monitor.log}"
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

[[ -z "$SUPABASE_URL" || -z "$SUPABASE_KEY" ]] && {
  echo "$($DATE '+%H:%M:%S') [ERROR] SUPABASE env vars missing" >> "$LOG_FILE"; exit 1
}

# Node definitions
declare -A NODE_URLS=(
  ["antoni"]="http://100.88.238.69:18789"
  ["kyungjini"]="http://100.96.10.3:18790"
  ["jaepini"]="http://100.110.12.82:18790"
)
declare -A NODE_TOKENS=(
  ["antoni"]="a5e74f78bf90196d153769a50c4d7a769a67a7d636559b5f"
  ["kyungjini"]="4020bd24cc5b33483c93a9d45e68e642d3e63de1fb00c984"
  ["jaepini"]="4020bd24cc5b33483c93a9d45e68e642d3e63de1fb00c984"
)

log() { echo "$($DATE '+%H:%M:%S') [SESSION-MON] $*" >> "$LOG_FILE"; }

fetch_and_sync() {
  $PYTHON3 - "$SUPABASE_URL" "$SUPABASE_KEY" <<'PYEOF'
import json, sys, urllib.request, urllib.error, time

SUPABASE_URL = sys.argv[1]
SUPABASE_KEY = sys.argv[2]

NODES = {
    "antoni":    {"url": "http://100.88.238.69:18789", "token": "a5e74f78bf90196d153769a50c4d7a769a67a7d636559b5f"},
    "kyungjini": {"url": "http://100.96.10.3:18790",   "token": "4020bd24cc5b33483c93a9d45e68e642d3e63de1fb00c984"},
    "jaepini":   {"url": "http://100.110.12.82:18790",  "token": "4020bd24cc5b33483c93a9d45e68e642d3e63de1fb00c984"},
}

def sb_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

def fetch_sessions(node_id, cfg):
    """Fetch sessions from a node via Tailscale."""
    try:
        body = json.dumps({"tool": "sessions_list", "args": {"activeMinutes": 30, "messageLimit": 1}}).encode()
        req = urllib.request.Request(
            f"{cfg['url']}/tools/invoke",
            data=body,
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {cfg['token']}"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
        raw = data.get("result", {}).get("content", [{}])[0].get("text", "{}")
        parsed = json.loads(raw)
        sessions = parsed.get("sessions", parsed if isinstance(parsed, list) else [])
        return sessions
    except Exception as e:
        return None  # Node offline

def sync_to_supabase(all_sessions):
    """Delete old sessions and insert current ones."""
    # Delete all existing sessions
    try:
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/active_sessions?id=neq.00000000-0000-0000-0000-000000000000",
            headers={**sb_headers(), "Prefer": "return=minimal"},
            method="DELETE",
        )
        urllib.request.urlopen(req, timeout=5)
    except Exception:
        pass

    if not all_sessions:
        return

    # Insert new sessions
    try:
        body = json.dumps(all_sessions).encode()
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/active_sessions",
            data=body,
            headers=sb_headers(),
            method="POST",
        )
        urllib.request.urlopen(req, timeout=5)
    except Exception as e:
        print(f"Insert error: {e}", file=sys.stderr)

# ── Main ──
all_sessions = []
node_statuses = {}

for node_id, cfg in NODES.items():
    sessions = fetch_sessions(node_id, cfg)
    if sessions is None:
        node_statuses[node_id] = "offline"
        continue

    node_statuses[node_id] = "online"
    for s in sessions:
        key = str(s.get("key", s.get("sessionKey", "")))
        # Determine session type from key
        session_type = "other"
        if ":group:" in key or key.startswith("group"):
            session_type = "group"
        elif ":dm:" in key or ":p2p:" in key:
            session_type = "dm"

        # Determine model from session data
        model = s.get("model", "claude-sonnet-4-6")
        if not model:
            model = "claude-sonnet-4-6"

        # Get last message for context
        msgs = s.get("lastMessages", [])
        last_msg = msgs[0] if msgs else {}
        last_content = str(last_msg.get("content", last_msg.get("text", "")))[:200]

        all_sessions.append({
            "node_id": node_id,
            "session_type": session_type,
            "model": model,
            "pid": s.get("pid"),
            "last_activity_at": s.get("updatedAt", s.get("updated_at")),
        })

sync_to_supabase(all_sessions)

total = len(all_sessions)
summary = " ".join(f"{n}={'online' if node_statuses.get(n)=='online' else 'OFFLINE'}" for n in NODES)
by_node = {}
for s in all_sessions:
    by_node[s["node_id"]] = by_node.get(s["node_id"], 0) + 1
counts = " ".join(f"{n}={by_node.get(n,0)}" for n in NODES)
print(f"OK total={total} {counts} ({summary})")
PYEOF
}

# Run once
RESULT=$(fetch_and_sync 2>&1)
log "$RESULT"
