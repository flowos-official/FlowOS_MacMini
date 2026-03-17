#!/usr/bin/env python3
"""FlowOS Session Monitor — polls all 3 nodes via Tailscale every 5s, syncs to Supabase."""
import json, os, sys, time
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
LOG_FILE = os.environ.get("FLOWOS_LOG_FILE", "/tmp/flowos-session-monitor.log")

if not SUPABASE_URL or not SUPABASE_KEY:
    with open(LOG_FILE, "a") as f:
        f.write(time.strftime("%H:%M:%S") + " [ERROR] env vars missing\n")
    sys.exit(1)

NODES = {
    "antoni":    {"url": "http://100.88.238.69:18789", "token": "a5e74f78bf90196d153769a50c4d7a769a67a7d636559b5f"},
    "kyungjini": {"url": "http://100.96.10.3:18790",   "token": "4020bd24cc5b33483c93a9d45e68e642d3e63de1fb00c984"},
    "jaepini":   {"url": "http://100.110.12.82:18790",  "token": "4020bd24cc5b33483c93a9d45e68e642d3e63de1fb00c984"},
}

def sb_request(method, path, data=None):
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    body = json.dumps(data).encode() if data else None
    req = Request(SUPABASE_URL + "/rest/v1/" + path, data=body, headers=headers, method=method)
    try:
        urlopen(req, timeout=5)
        return True
    except (URLError, HTTPError) as e:
        return False

def fetch_sessions(node_id, cfg):
    try:
        body = json.dumps({"tool": "sessions_list", "args": {"activeMinutes": 30, "messageLimit": 1}}).encode()
        req = Request(
            cfg["url"] + "/tools/invoke",
            data=body,
            headers={"Content-Type": "application/json", "Authorization": "Bearer " + cfg["token"]},
            method="POST",
        )
        with urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
        raw = data.get("result", {}).get("content", [{}])[0].get("text", "{}")
        parsed = json.loads(raw)
        return parsed.get("sessions", parsed if isinstance(parsed, list) else [])
    except Exception:
        return None

# ── Collect from all nodes ──
all_rows = []
status_parts = []

for node_id, cfg in NODES.items():
    sessions = fetch_sessions(node_id, cfg)
    if sessions is None:
        status_parts.append(node_id + "=OFFLINE")
        continue
    status_parts.append(node_id + "=" + str(len(sessions)))
    for s in sessions:
        key = str(s.get("key", s.get("sessionKey", "")))
        session_type = "group" if ":group:" in key or key.startswith("group") else "other"
        # Convert epoch ms to ISO timestamp
        updated = s.get("updatedAt", s.get("updated_at"))
        if isinstance(updated, (int, float)) and updated > 1e12:
            updated = datetime.fromtimestamp(updated / 1000, tz=timezone.utc).isoformat()
        elif isinstance(updated, (int, float)):
            updated = datetime.fromtimestamp(updated, tz=timezone.utc).isoformat()
        all_rows.append({
            "node_id": node_id,
            "session_type": session_type,
            "model": s.get("model", "claude-sonnet-4-6") or "claude-sonnet-4-6",
            "pid": s.get("pid"),
            "last_activity_at": updated,
        })

# ── Sync to Supabase ──
sb_request("DELETE", "active_sessions?node_id=neq.NONE")
ok = True
if all_rows:
    ok = sb_request("POST", "active_sessions", all_rows)

ts = time.strftime("%H:%M:%S")
status = "OK" if ok else "FAIL"
msg = ts + " [SESSION-MON] " + status + " total=" + str(len(all_rows)) + " " + " ".join(status_parts)
with open(LOG_FILE, "a") as f:
    f.write(msg + "\n")
print(msg)
