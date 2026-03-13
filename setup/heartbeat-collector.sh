#!/bin/bash
# ============================================================
# FlowOS Mac Mini — Heartbeat Collector
# ============================================================
# Collects comprehensive system metrics and pushes to Supabase.
# Run every 30 seconds via launchd (see setup/com.flowos.heartbeat.plist)
#
# Environment variables required:
#   FLOWOS_NODE_ID             — e.g. "kyungjini" | "jaepini" | "antoni"
#   NEXT_PUBLIC_SUPABASE_URL   — Supabase project URL
#   SUPABASE_SERVICE_ROLE_KEY  — Service role key (has write access)
#
# Setup:
#   1. Copy to /usr/local/bin/flowos-heartbeat.sh
#   2. chmod +x /usr/local/bin/flowos-heartbeat.sh
#   3. Copy com.flowos.heartbeat.plist to ~/Library/LaunchAgents/
#   4. launchctl load ~/Library/LaunchAgents/com.flowos.heartbeat.plist
# ============================================================

set -euo pipefail

# ── Config ─────────────────────────────────────────────────────────────────
NODE_ID="${FLOWOS_NODE_ID:-$(hostname -s | tr '[:upper:]' '[:lower:]')}"
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
LOG_FILE="${FLOWOS_LOG_FILE:-/tmp/flowos-heartbeat.log}"

if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_KEY" ]]; then
  echo "$(date '+%H:%M:%S') [ERROR] SUPABASE_URL or SUPABASE_KEY not set" >> "$LOG_FILE"
  exit 1
fi

log() { echo "$(date '+%H:%M:%S') [HB:$NODE_ID] $*" >> "$LOG_FILE"; }

# ── CPU Usage ──────────────────────────────────────────────────────────────
CPU_USAGE=$(top -l 2 -n 0 | grep 'CPU usage' | tail -1 | awk '{print $3}' | tr -d '%' 2>/dev/null || echo "null")
# Fallback
if [[ -z "$CPU_USAGE" || "$CPU_USAGE" == "null" ]]; then
  CPU_USAGE=$(ps -A -o %cpu | awk '{s+=$1} END {printf "%.1f", s}' 2>/dev/null || echo "null")
fi

# ── Memory ─────────────────────────────────────────────────────────────────
VM_STAT=$(vm_stat 2>/dev/null)
PAGE_SIZE=16384  # Apple Silicon page size (16KB)

pages_to_gb() {
  local pages="${1:-0}"
  awk "BEGIN {printf \"%.3f\", ($pages * $PAGE_SIZE) / 1073741824}"
}

PAGES_FREE=$(echo "$VM_STAT" | awk '/Pages free:/ {gsub(/\./,"",$3); print $3}')
PAGES_ACTIVE=$(echo "$VM_STAT" | awk '/Pages active:/ {gsub(/\./,"",$3); print $3}')
PAGES_INACTIVE=$(echo "$VM_STAT" | awk '/Pages inactive:/ {gsub(/\./,"",$3); print $3}')
PAGES_WIRED=$(echo "$VM_STAT" | awk '/Pages wired down:/ {gsub(/\./,"",$4); print $4}')
PAGES_COMPRESSED=$(echo "$VM_STAT" | awk '/Pages occupied by compressor:/ {gsub(/\./,"",$5); print $5}')

PAGES_FREE=${PAGES_FREE:-0}
PAGES_ACTIVE=${PAGES_ACTIVE:-0}
PAGES_INACTIVE=${PAGES_INACTIVE:-0}
PAGES_WIRED=${PAGES_WIRED:-0}
PAGES_COMPRESSED=${PAGES_COMPRESSED:-0}

TOTAL_PAGES=$((PAGES_FREE + PAGES_ACTIVE + PAGES_INACTIVE + PAGES_WIRED + PAGES_COMPRESSED))
USED_PAGES=$((PAGES_ACTIVE + PAGES_INACTIVE + PAGES_WIRED + PAGES_COMPRESSED))

if [[ "$TOTAL_PAGES" -gt 0 ]]; then
  MEM_USAGE_PCT=$(awk "BEGIN {printf \"%.1f\", ($USED_PAGES / $TOTAL_PAGES) * 100}")
else
  MEM_USAGE_PCT="null"
fi

MEM_WIRED_GB=$(pages_to_gb "$PAGES_WIRED")
MEM_COMPRESSED_GB=$(pages_to_gb "$PAGES_COMPRESSED")

# Memory Pressure
MEM_PRESSURE=$(memory_pressure 2>/dev/null | grep -oiE 'Normal|Warn|Critical' | head -1 | tr '[:upper:]' '[:lower:]' || echo "normal")
MEM_PRESSURE=${MEM_PRESSURE:-normal}

# Swap
SWAP_USED_GB=$(sysctl -n vm.swapusage 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i~/used/) {gsub(/M/,"",$i+1); printf "%.3f", $(i+1)/1024; exit}}' || echo "0")

# ── Disk ──────────────────────────────────────────────────────────────────
DISK_INFO=$(df -g / 2>/dev/null | tail -1)
DISK_TOTAL_GB=$(echo "$DISK_INFO" | awk '{print $2}' || echo "null")
DISK_USED_GB=$(echo "$DISK_INFO" | awk '{print $3}' || echo "null")
DISK_FREE_GB=$(echo "$DISK_INFO" | awk '{print $4}' || echo "null")

# Disk I/O (sample over 1s)
if command -v iostat &>/dev/null; then
  IOSTAT_OUT=$(iostat -d -c 2 1 2>/dev/null | tail -1)
  DISK_READ_MBPS=$(echo "$IOSTAT_OUT" | awk '{printf "%.3f", $3/1024}' 2>/dev/null || echo "null")
  DISK_WRITE_MBPS=$(echo "$IOSTAT_OUT" | awk '{printf "%.3f", $4/1024}' 2>/dev/null || echo "null")
else
  DISK_READ_MBPS="null"
  DISK_WRITE_MBPS="null"
fi

# ── Uptime ────────────────────────────────────────────────────────────────
BOOT_EPOCH=$(sysctl -n kern.boottime 2>/dev/null | awk '{print $4}' | tr -d ',')
NOW_EPOCH=$(date +%s)
if [[ -n "$BOOT_EPOCH" ]]; then
  UPTIME_SECONDS=$((NOW_EPOCH - BOOT_EPOCH))
else
  UPTIME_SECONDS="null"
fi

# ── Network I/O ───────────────────────────────────────────────────────────
NET_INTERFACE="${FLOWOS_NET_IFACE:-en0}"

get_net_bytes() {
  netstat -ib 2>/dev/null | awk -v iface="$NET_INTERFACE" '$1==iface && !/lo/ {print $7, $10; exit}'
}

NET1=$(get_net_bytes); sleep 1; NET2=$(get_net_bytes)
NET_IN_1=$(echo "$NET1" | awk '{print $1}'); NET_OUT_1=$(echo "$NET1" | awk '{print $2}')
NET_IN_2=$(echo "$NET2" | awk '{print $1}'); NET_OUT_2=$(echo "$NET2" | awk '{print $2}')

if [[ -n "$NET_IN_1" && -n "$NET_IN_2" ]]; then
  NET_IN_MBPS=$(awk "BEGIN {printf \"%.4f\", (${NET_IN_2:-0} - ${NET_IN_1:-0}) / 1048576}")
  NET_OUT_MBPS=$(awk "BEGIN {printf \"%.4f\", (${NET_OUT_2:-0} - ${NET_OUT_1:-0}) / 1048576}")
  # Clamp negatives (counter reset)
  NET_IN_MBPS=$(awk "BEGIN {v=${NET_IN_MBPS}; print (v<0)?0:v}")
  NET_OUT_MBPS=$(awk "BEGIN {v=${NET_OUT_MBPS}; print (v<0)?0:v}")
else
  NET_IN_MBPS="null"; NET_OUT_MBPS="null"
fi

# ── Tailscale ─────────────────────────────────────────────────────────────
if command -v tailscale &>/dev/null; then
  TS_STATUS=$(tailscale status --json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('BackendState','unknown'))" 2>/dev/null || echo "unknown")
  # Ping Tailscale gateway (100.100.100.100 is the magic DNS)
  TS_PING=$(ping -c 1 -W 1000 100.100.100.100 2>/dev/null | awk -F'/' 'END {print $5}' | cut -d. -f1)
  TS_LATENCY_MS=${TS_PING:-null}
else
  TS_STATUS="not_installed"
  TS_LATENCY_MS="null"
fi

# External latency checks
SUPABASE_HOST=$(echo "$SUPABASE_URL" | sed 's|https\?://||' | cut -d/ -f1)
LATENCY_SUPABASE=$(ping -c 1 -W 1000 "$SUPABASE_HOST" 2>/dev/null | awk -F'/' 'END {print $5}' | cut -d. -f1 || echo "null")
LATENCY_ANTHROPIC=$(ping -c 1 -W 1000 api.anthropic.com 2>/dev/null | awk -F'/' 'END {print $5}' | cut -d. -f1 || echo "null")

# ── Claude Processes ──────────────────────────────────────────────────────
CLAUDE_COUNT=$(pgrep -x claude 2>/dev/null | wc -l | tr -d ' ' || echo "0")

CLAUDE_PIDS_JSON="["
FIRST_PID=true
while IFS= read -r pid; do
  [[ -z "$pid" ]] && continue
  MEM_KB=$(ps -p "$pid" -o rss= 2>/dev/null | tr -d ' ' || echo "0")
  MEM_MB=$(awk "BEGIN {printf \"%.1f\", ${MEM_KB:-0}/1024}")
  RUNTIME=$(ps -p "$pid" -o etimes= 2>/dev/null | tr -d ' ' || echo "0")
  if [[ "$FIRST_PID" == "false" ]]; then CLAUDE_PIDS_JSON+=","; fi
  CLAUDE_PIDS_JSON+="{\"pid\":$pid,\"memory_mb\":$MEM_MB,\"runtime_sec\":${RUNTIME:-0},\"model\":\"unknown\"}"
  FIRST_PID=false
done < <(pgrep -x claude 2>/dev/null || true)
CLAUDE_PIDS_JSON+="]"

# ── Top Processes (by CPU) ─────────────────────────────────────────────────
TOP_PROCS_JSON="["
FIRST_PROC=true
while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  PROC_NAME=$(echo "$line" | awk '{print $11}' | xargs basename 2>/dev/null | head -c 40)
  PROC_CPU=$(echo "$line" | awk '{print $3}')
  PROC_MEM=$(echo "$line" | awk '{printf "%.0f", $6/1024}')
  [[ -z "$PROC_NAME" || "$PROC_NAME" == "COMMAND" ]] && continue
  if [[ "$FIRST_PROC" == "false" ]]; then TOP_PROCS_JSON+=","; fi
  # Escape quotes in process name
  PROC_NAME_SAFE=$(echo "$PROC_NAME" | sed 's/"/\\"/g')
  TOP_PROCS_JSON+="{\"name\":\"$PROC_NAME_SAFE\",\"cpu_pct\":${PROC_CPU:-0},\"mem_mb\":${PROC_MEM:-0}}"
  FIRST_PROC=false
done < <(ps aux 2>/dev/null | sort -rn -k3 | head -6 | tail -5 || true)
TOP_PROCS_JSON+="]"

# ── OpenClaw ──────────────────────────────────────────────────────────────
if command -v openclaw &>/dev/null; then
  OC_RAW=$(openclaw gateway status 2>/dev/null || true)
  if echo "$OC_RAW" | grep -qi "running\|started\|active"; then
    OPENCLAW_STATUS="running"
  elif echo "$OC_RAW" | grep -qi "stopped\|not running"; then
    OPENCLAW_STATUS="stopped"
  else
    OPENCLAW_STATUS="unknown"
  fi
  OPENCLAW_VERSION=$(openclaw --version 2>/dev/null | head -1 | awk '{print $NF}' || echo "unknown")
else
  OPENCLAW_STATUS="not_installed"
  OPENCLAW_VERSION="null"
fi

# Active OpenClaw-related processes
ACTIVE_AGENTS=$(pgrep -f 'openclaw' 2>/dev/null | wc -l | tr -d ' ' || echo "0")

# ── Git Repos ────────────────────────────────────────────────────────────
HOME_USER="${HOME:-/Users/$(whoami)}"
GIT_REPO_COUNT=$(find "$HOME_USER/Projects" "$HOME_USER/clawd" "$HOME_USER/code" -maxdepth 4 -name ".git" -type d 2>/dev/null | wc -l | tr -d ' ' || echo "0")

# ── JSON null helper ─────────────────────────────────────────────────────
nullify() {
  local val="$1"
  if [[ -z "$val" || "$val" == "null" || "$val" == "-" ]]; then echo "null"; else echo "$val"; fi
}

# ── Build Payload ─────────────────────────────────────────────────────────
PAYLOAD=$(python3 -c "
import json, sys

def safe(v):
    try: return float(v) if v not in (None,'null','','-') else None
    except: return None

def safe_int(v):
    try: return int(v) if v not in (None,'null','','-') else None
    except: return None

payload = {
    'node_id':                   '$NODE_ID',
    'status':                    'alive',
    'active_agents':             safe_int('$ACTIVE_AGENTS') or 0,
    'active_claude_sessions':    safe_int('$CLAUDE_COUNT') or 0,
    'cpu_usage':                 safe('$CPU_USAGE'),
    'memory_usage':              safe('$MEM_USAGE_PCT'),
    'disk_free_gb':              safe('$DISK_FREE_GB'),
    'disk_total_gb':             safe('$DISK_TOTAL_GB'),
    'disk_used_gb':              safe('$DISK_USED_GB'),
    'disk_read_mbps':            safe('$DISK_READ_MBPS'),
    'disk_write_mbps':           safe('$DISK_WRITE_MBPS'),
    'memory_wired_gb':           safe('$MEM_WIRED_GB'),
    'memory_compressed_gb':      safe('$MEM_COMPRESSED_GB'),
    'memory_pressure':           '$MEM_PRESSURE',
    'swap_used_gb':              safe('$SWAP_USED_GB'),
    'uptime_seconds':            safe_int('$UPTIME_SECONDS'),
    'net_in_mbps':               safe('$NET_IN_MBPS'),
    'net_out_mbps':              safe('$NET_OUT_MBPS'),
    'tailscale_status':          '$TS_STATUS',
    'tailscale_latency_ms':      safe_int('$TS_LATENCY_MS'),
    'latency_supabase_ms':       safe_int('$LATENCY_SUPABASE'),
    'latency_anthropic_ms':      safe_int('$LATENCY_ANTHROPIC'),
    'claude_pids':               $CLAUDE_PIDS_JSON,
    'top_processes':             $TOP_PROCS_JSON,
    'openclaw_status':           '$OPENCLAW_STATUS',
    'openclaw_version':          '$OPENCLAW_VERSION',
    'git_repo_count':            safe_int('$GIT_REPO_COUNT'),
}

print(json.dumps(payload))
" 2>/dev/null)

if [[ -z "$PAYLOAD" ]]; then
  log "ERROR: Failed to build payload"
  exit 1
fi

# ── Push to Supabase ──────────────────────────────────────────────────────
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST \
  "${SUPABASE_URL}/rest/v1/node_heartbeats" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d "$PAYLOAD" \
  --max-time 10 \
  2>/dev/null)

if [[ "$HTTP_STATUS" =~ ^2 ]]; then
  log "OK (HTTP $HTTP_STATUS) cpu=${CPU_USAGE}% mem=${MEM_USAGE_PCT}% disk_free=${DISK_FREE_GB}GB ts=$TS_STATUS"
else
  log "ERROR: Supabase returned HTTP $HTTP_STATUS"
fi
