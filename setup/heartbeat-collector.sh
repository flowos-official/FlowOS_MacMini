#!/bin/bash
# FlowOS Mac Mini — Heartbeat Collector
# Full paths required for launchd (no PATH inheritance)

SYSCTL=/usr/sbin/sysctl
VM_STAT=/usr/bin/vm_stat
MEM_PRESSURE_BIN=/usr/bin/memory_pressure
TOP=/usr/bin/top
PS=/bin/ps
DF=/bin/df
NETSTAT=/usr/sbin/netstat
PGREP=/usr/bin/pgrep
PYTHON3=/usr/bin/python3
CURL=/usr/bin/curl
TAILSCALE=/opt/homebrew/bin/tailscale
OPENCLAW=/opt/homebrew/bin/openclaw
FIND=/usr/bin/find
WC=/usr/bin/wc
DATE=/bin/date
HOSTNAME_BIN=/bin/hostname

NODE_ID="${FLOWOS_NODE_ID:-$($HOSTNAME_BIN -s | tr '[:upper:]' '[:lower:]')}"
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
LOG_FILE="${FLOWOS_LOG_FILE:-/tmp/flowos-heartbeat.log}"
NET_IFACE="${FLOWOS_NET_IFACE:-en0}"

[[ -z "$SUPABASE_URL" || -z "$SUPABASE_KEY" ]] && {
  echo "$($DATE '+%H:%M:%S') [ERROR] env vars missing" >> "$LOG_FILE"; exit 1
}

log() { echo "$($DATE '+%H:%M:%S') [HB:$NODE_ID] $*" >> "$LOG_FILE"; }

# ── Collect everything via Python3 (avoids bash awk/escape hell) ───────────
METRICS=$($PYTHON3 - "$NODE_ID" "$NET_IFACE" <<'PYEOF'
import subprocess, json, sys, re, os, time

node_id  = sys.argv[1] if len(sys.argv) > 1 else "unknown"
net_iface = sys.argv[2] if len(sys.argv) > 2 else "en0"

def run(cmd, timeout=5):
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return r.stdout.strip()
    except Exception:
        return ""

def fnum(v):
    try: return float(v)
    except: return None

def inum(v):
    try: return int(float(v))
    except: return None

m = {}

# ── CPU ──────────────────────────────────────────────────────────────────
top_out = run(["/usr/bin/top", "-l", "2", "-n", "0"], timeout=8)
for line in reversed(top_out.splitlines()):
    if "CPU usage" in line:
        parts = line.split()
        for i, p in enumerate(parts):
            if p.endswith("%") and i > 0 and "user" in (parts[i-1] if i > 0 else ""):
                m["cpu_usage"] = fnum(p.rstrip("%"))
                break
        # fallback: grab first percentage after "CPU usage:"
        if "cpu_usage" not in m:
            nums = re.findall(r"([\d.]+)%", line)
            if nums:
                # user + sys
                try: m["cpu_usage"] = round(float(nums[0]) + float(nums[1]), 1)
                except: m["cpu_usage"] = fnum(nums[0])
        break

# ── Memory ───────────────────────────────────────────────────────────────
vm_out = run(["/usr/bin/vm_stat"])
page_size = 16384
pages = {}
for line in vm_out.splitlines():
    line = line.replace(".", "")
    if "Pages free" in line:
        pages["free"] = inum(line.split(":")[-1].strip())
    elif "Pages active" in line:
        pages["active"] = inum(line.split(":")[-1].strip())
    elif "Pages inactive" in line:
        pages["inactive"] = inum(line.split(":")[-1].strip())
    elif "Pages wired" in line:
        pages["wired"] = inum(line.split(":")[-1].strip())
    elif "compressor" in line:
        pages["compressed"] = inum(line.split(":")[-1].strip())

total = sum(v or 0 for v in pages.values())
used  = (pages.get("active",0) or 0) + (pages.get("inactive",0) or 0) + \
        (pages.get("wired",0) or 0) + (pages.get("compressed",0) or 0)
if total > 0:
    m["memory_usage"] = round(used / total * 100, 1)
m["memory_wired_gb"]      = round((pages.get("wired",0) or 0) * page_size / 1073741824, 3)
m["memory_compressed_gb"] = round((pages.get("compressed",0) or 0) * page_size / 1073741824, 3)

# Memory pressure
mp_out = run(["/usr/bin/memory_pressure"])
for word in ["critical", "warn", "normal"]:
    if word in mp_out.lower():
        m["memory_pressure"] = word; break
else:
    m["memory_pressure"] = "normal"

# Swap
swap_out = run(["/usr/sbin/sysctl", "vm.swapusage"])
# "vm.swapusage: total = 2048.00M  used = 512.00M  free = 1536.00M"
used_m = re.search(r"used\s*=\s*([\d.]+)M", swap_out)
m["swap_used_gb"] = round(float(used_m.group(1)) / 1024, 3) if used_m else None

# ── Disk ─────────────────────────────────────────────────────────────────
df_out = run(["/bin/df", "-g", "/"])
lines = df_out.splitlines()
if len(lines) >= 2:
    parts = lines[1].split()
    m["disk_total_gb"] = inum(parts[1]) if len(parts) > 1 else None
    m["disk_used_gb"]  = inum(parts[2]) if len(parts) > 2 else None
    m["disk_free_gb"]  = inum(parts[3]) if len(parts) > 3 else None

# Disk I/O (quick 1s sample)
try:
    io1 = run(["/usr/sbin/iostat", "-d", "-c", "2", "1"], timeout=4)
    last = [l for l in io1.splitlines() if l.strip() and not l.startswith("disk")]
    if last:
        row = last[-1].split()
        m["disk_read_mbps"]  = round(float(row[2]) / 1024, 3) if len(row) > 2 else None
        m["disk_write_mbps"] = round(float(row[3]) / 1024, 3) if len(row) > 3 else None
except Exception:
    pass

# ── Uptime ───────────────────────────────────────────────────────────────
boot_out = run(["/usr/sbin/sysctl", "-n", "kern.boottime"])
# { sec = 1741234567, usec = ... }
sec_m = re.search(r"sec\s*=\s*(\d+)", boot_out)
if sec_m:
    m["uptime_seconds"] = int(time.time()) - int(sec_m.group(1))

# ── Network I/O (1s delta) ───────────────────────────────────────────────
def get_net_bytes(iface):
    out = run(["/usr/sbin/netstat", "-ib"], timeout=3)
    for line in out.splitlines():
        parts = line.split()
        if parts and parts[0] == iface and "lo" not in line:
            try: return int(parts[6]), int(parts[9])
            except: pass
    return None, None

try:
    in1, out1 = get_net_bytes(net_iface)
    time.sleep(1)
    in2, out2 = get_net_bytes(net_iface)
    if None not in (in1, in2, out1, out2) and in2 >= in1 and out2 >= out1:
        m["net_in_mbps"]  = round((in2 - in1) / 1048576, 4)
        m["net_out_mbps"] = round((out2 - out1) / 1048576, 4)
except Exception:
    pass

# ── Tailscale ────────────────────────────────────────────────────────────
ts_bin = "/opt/homebrew/bin/tailscale"
if os.path.exists(ts_bin):
    ts_json = run([ts_bin, "status", "--json"], timeout=5)
    try:
        ts_data = json.loads(ts_json)
        m["tailscale_status"] = ts_data.get("BackendState", "unknown")
    except Exception:
        m["tailscale_status"] = "unknown"
else:
    m["tailscale_status"] = "not_installed"

# Latency via ping (quick, non-blocking)
def ping_ms(host):
    out = run(["/sbin/ping", "-c", "1", "-W", "500", host], timeout=3)
    match = re.search(r"time=([\d.]+)\s*ms", out)
    if match:
        return int(float(match.group(1)))
    match = re.search(r"/([\d.]+)/", out)
    if match:
        return int(float(match.group(1)))
    return None

supabase_host = re.sub(r"https?://", "", (os.environ.get("NEXT_PUBLIC_SUPABASE_URL",""))).split("/")[0]
if supabase_host:
    m["latency_supabase_ms"]  = ping_ms(supabase_host)
m["latency_anthropic_ms"] = ping_ms("api.anthropic.com")

# ── Claude Processes ─────────────────────────────────────────────────────
claude_pids = run(["/usr/bin/pgrep", "-x", "claude"]).splitlines()
m["active_claude_sessions"] = len([p for p in claude_pids if p.strip()])
pids_list = []
for pid in claude_pids:
    pid = pid.strip()
    if not pid: continue
    ps_out = run(["/bin/ps", "-p", pid, "-o", "rss=,etimes="], timeout=3)
    parts = ps_out.split()
    if len(parts) >= 2:
        pids_list.append({
            "pid": int(pid),
            "memory_mb": round(int(parts[0]) / 1024, 1),
            "runtime_sec": int(parts[1]),
            "model": "unknown"
        })
m["claude_pids"] = pids_list

# ── Top Processes ────────────────────────────────────────────────────────
ps_out = run(["/bin/ps", "aux", "-r"], timeout=5)
procs = []
for line in ps_out.splitlines()[1:6]:
    parts = line.split(None, 10)
    if len(parts) < 11: continue
    name = os.path.basename(parts[10].split()[0]) if parts[10].strip() else parts[10]
    try:
        procs.append({
            "name": name[:40],
            "cpu_pct": float(parts[2]),
            "mem_mb": round(int(parts[5]) / 1024, 1)
        })
    except Exception:
        continue
m["top_processes"] = procs

# ── OpenClaw ─────────────────────────────────────────────────────────────
oc_bin = "/opt/homebrew/bin/openclaw"
m["active_agents"] = 0
if os.path.exists(oc_bin):
    oc_status_out = run([oc_bin, "gateway", "status"], timeout=5)
    m["openclaw_status"] = "running" if any(w in oc_status_out.lower() for w in ["running","started","active"]) else "stopped"
    ver_out = run([oc_bin, "--version"], timeout=3)
    m["openclaw_version"] = ver_out.split()[-1] if ver_out else "unknown"
    oc_pids = run(["/usr/bin/pgrep", "-f", "openclaw"]).splitlines()
    m["active_agents"] = len([p for p in oc_pids if p.strip()])
else:
    m["openclaw_status"] = "not_installed"

# ── Git Repos ────────────────────────────────────────────────────────────
home = os.environ.get("HOME", f"/Users/{os.environ.get('USER','')}")
git_count = 0
for base in [f"{home}/Projects", f"{home}/clawd", f"{home}/code"]:
    if os.path.isdir(base):
        for root, dirs, files in os.walk(base):
            if ".git" in dirs:
                git_count += 1
                dirs[:] = []
            if root.count(os.sep) - base.count(os.sep) >= 4:
                dirs[:] = []
m["git_repo_count"] = git_count

# ── Final payload ─────────────────────────────────────────────────────────
m["node_id"] = node_id
m["status"]  = "alive"

print(json.dumps(m))
PYEOF
)

if [[ -z "$METRICS" ]]; then
  log "ERROR: Python collection failed"
  exit 1
fi

# ── Push to Supabase ───────────────────────────────────────────────────────
HTTP_CODE=$($CURL -s -o /tmp/flowos-hb-resp.txt -w "%{http_code}" \
  -X POST "${SUPABASE_URL}/rest/v1/node_heartbeats" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d "$METRICS" \
  --max-time 15 2>/dev/null)

if [[ "$HTTP_CODE" =~ ^2 ]]; then
  CPU=$(echo "$METRICS" | $PYTHON3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('cpu_usage','?'))" 2>/dev/null)
  MEM=$(echo "$METRICS" | $PYTHON3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('memory_usage','?'))" 2>/dev/null)
  log "OK (HTTP $HTTP_CODE) cpu=${CPU}% mem=${MEM}%"
else
  RESP=$(cat /tmp/flowos-hb-resp.txt 2>/dev/null | head -c 300)
  log "ERROR: HTTP $HTTP_CODE | $RESP"
fi
