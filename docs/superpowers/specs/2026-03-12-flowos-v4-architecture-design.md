# FlowOS Agency OS Architecture — v4.0 Design Spec

**Date:** 2026-03-12
**Status:** Approved
**Author:** KJ + Claude
**Scope:** Refine flowos-agency-architecture.html from v3.0 → v4.0, then build the system

---

## 1. Context

FlowOS is a 3-person AI development agency (KJ, JP, Anton) that manages a dynamic number of client projects simultaneously. The team is deploying 3 Mac Mini M4 Pro machines as fully autonomous agent servers, each running OpenClaw (https://openclaw.ai/) as the agent gateway.

### Current state
- `flowos-agency-architecture.html` exists at v3.0 (~2,043 lines, Korean)
- GitHub org with project repos — already set up
- Supabase project — already running
- Mac Minis — not yet arrived, preparing deployment playbook

### What this spec covers
1. Revise the architecture document to reflect reality (shared accounts, node naming, coordination topology)
2. Design the inter-node communication and self-healing system
3. Produce an exact per-node installation playbook

---

## 2. Node Identity & Roles

Three Mac Mini M4 Pro machines, each with a name and primary role:

| Node | Hostname | Tailscale IP | Primary Role | Failover Priority |
|------|----------|-------------|--------------|-------------------|
| **Antoni** | `antoni.tail` | 100.64.0.1 | Coordinator — client comms, monitoring, dispatching | 1 (primary coordinator) |
| **Kyungjini** | `kyungjini.tail` | 100.64.0.2 | Dev Lead Worker — MVP builds, architecture, heavy Claude Code | 2 (takes over coordinator if Antoni dies) |
| **Jaepini** | `jaepini.tail` | 100.64.0.3 | Quality Worker — refactoring, QA, testing, research | 3 (survival mode only) |

### Coordinator responsibilities (Antoni by default)
- Gmail/Calendar/Drive scanning (macmini@flowos.work)
- Slack channel monitoring & message routing
- Billing/cost collection
- Dispatching work to Kyungjini/Jaepini via Supabase agent_events
- Daily reports generation
- Client notification drafts
- Session budget management — allocates Claude Code sessions across nodes

### Failover chain
```
Antoni dies → Kyungjini detects (30min no heartbeat, after 15min warning)
           → Kyungjini sets coordinator=kyungjini in Supabase
           → Kyungjini starts Gmail/Slack/Calendar/Drive scans + dispatching
           → Slack #agency-alerts: "Antoni offline. Kyungjini coordinating."

Kyungjini also dies → Jaepini detects
                    → Jaepini enters survival mode (monitoring only, no coding)
                    → Slack DM to KJ: "2 nodes down. Manual intervention needed."

Antoni comes back → Does NOT auto-reclaim coordinator
                  → Waits for manual handback via Supabase/Slack command
```

---

## 3. Shared Accounts & Authentication

All 3 nodes share the same accounts. This is a key departure from v3.0 which assumed per-node independent auth.

| Resource | Account/Credential | Sharing Model |
|----------|-------------------|---------------|
| Google Workspace | macmini@flowos.work | Same OAuth token via `gog auth` — each node authenticates independently with same account |
| Claude Max | One subscription | Shared login — concurrent session limit is the constraint |
| GitHub Org | flowos-official | Each node has its own SSH key, same org access |
| Supabase | One project | Same `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` on all 3 |
| Slack | One bot token (`SLACK_BOT_TOKEN`) | Same token on all 3 — coordinator controls who posts client-facing messages |
| 1Password | One Teams account | Same service account, each node uses `op` CLI independently |

### Email forwarding architecture

All personal FlowOS emails forward to the shared inbox:

```
kj@flowos.work     ─→ macmini@flowos.work
jp@flowos.work     ─→ macmini@flowos.work
anton@flowos.work  ─→ macmini@flowos.work
```

### Gmail scanning rules (coordinator only)

```
Email arrives at macmini@flowos.work
  │
  ├─ 1. DEDUPLICATION: Extract Message-ID header
  │     Check Supabase: SELECT FROM stream_memory WHERE raw_ref = {message_id}
  │     EXISTS → skip (already processed), add any new recipient tags
  │     NOT EXISTS → continue
  │
  ├─ 2. RECIPIENT ROUTING: Extract original recipient from forwarding headers
  │     (To, CC, BCC, X-Forwarded-For, X-Original-To)
  │     To: kj@flowos.work    → tag: kj, route to Kyungjini via agent_event
  │     To: jp@flowos.work    → tag: jp, route to Jaepini via agent_event
  │     To: anton@flowos.work → tag: anton, handle on Antoni
  │     To: macmini@flowos.work → tag: system, coordinator handles
  │     CC/BCC multiple       → tag all relevant, primary = To: recipient
  │
  ├─ 3. LLM CLASSIFICATION: content type, urgency, project match
  │
  ├─ 4. Supabase stream_memory INSERT (with message_id as raw_ref for dedup)
  │
  └─ 5. ROUTE:
      ├─ Client inquiry      → #agency-inbox + Anton DM
      ├─ Technical question   → #proj-{slug} + KJ DM
      ├─ Billing/contract     → #agency-costs + Anton DM
      ├─ Urgent (any)         → DM to tagged person immediately
      └─ Newsletter/spam      → ignore
```

### Duplicate prevention rules (shared Slack bot)

```
Gmail scan:     ONLY the coordinator scans and acts
Calendar scan:  ONLY the coordinator scans, broadcasts events to others
Slack reading:  ALL nodes read (for their own triggers)
Slack writing:  ALL nodes write (to their own channels/topics)
                BUT client-facing messages → ONLY coordinator drafts
```

Enforced via `node_roles` table — see Schema section.

---

## 4. Inter-Node Communication & Self-Healing

### Communication layers (in priority order)

```
Layer 1: Supabase Realtime (agent_events)    — structured events, millisecond delivery
Layer 2: Supabase Tables (shared state)       — heartbeats, locks, node_roles
Layer 3: Slack (human-readable)               — notifications, daily reports, alerts
Layer 4: Tailscale SSH (emergency only)       — direct node-to-node when Supabase is down
```

### Heartbeat system

Every node writes a heartbeat every 5 minutes:

```
antoni    → node_heartbeats { status: "alive", active_agents: 3, cpu: 12%, mem: 34% }
kyungjini → node_heartbeats { status: "alive", active_agents: 5, cpu: 45%, mem: 62% }
jaepini   → node_heartbeats { status: "alive", active_agents: 2, cpu: 8%,  mem: 28% }
```

Every node reads heartbeats every 5 minutes:

```
FOR each other node:
  IF last_heartbeat > 15 min ago:
    → Slack #agency-alerts: "[node] offline for 15min"
    → Slack DM to responsible human

  IF last_heartbeat > 30 min ago AND node is coordinator:
    → FAILOVER TRIGGERED

  IF last_heartbeat > 30 min ago AND node is worker:
    → Redistribute critical crons to surviving nodes
    → Log to Supabase: failover_events
```

### Failover sequence (Antoni dies — detailed)

```
T+0min    Antoni stops writing heartbeats
T+15min   Kyungjini & Jaepini detect absence
          → Slack #agency-alerts: "⚠️ Antoni offline 15min"
          → Slack DM to Anton (human)
T+30min   Still no heartbeat
          → Kyungjini triggers failover:
            1. UPDATE node_roles SET is_coordinator=true WHERE node_id='kyungjini'
            2. UPDATE node_roles SET is_coordinator=false WHERE node_id='antoni'
            3. Kyungjini starts: gmail-scanner, calendar-scanner, drive-scanner,
               billing-collector, daily-reporter, proactive-advisor
            4. INSERT failover_events { from: antoni, to: kyungjini, reason: heartbeat_timeout }
            5. Slack #agency-alerts: "🔄 Coordinator failover: Antoni → Kyungjini"
T+???     Antoni comes back online
          → Reads node_roles, sees kyungjini is coordinator
          → Does NOT reclaim automatically
          → Slack #agency-alerts: "Antoni back online. Kyungjini still coordinating."
          → KJ decides when to hand back manually
```

### Autonomous problem-solving matrix

| Situation | Detection | Autonomous Response |
|-----------|-----------|-------------------|
| Deploy fails on Kyungjini | deploy-monitor sees Vercel ERROR | Kyungjini spawns Claude Code to fix. If fails 2x → asks Jaepini to attempt |
| Claude session quota exhausted | Session spawn returns limit error | Node requests +1 from coordinator. Coordinator reduces idle node's quota |
| Jaepini QA finds critical bug | qa-agent reports via agent_events | Kyungjini receives event → auto-spawns coding-agent to fix → re-triggers QA |
| Antoni overloaded (agents > 8) | Health checker detects | Antoni delegates email classification to Kyungjini (one-off) |
| Supabase is down | Health check fails 3x | All nodes switch to Slack-only communication. Tailscale SSH for direct coordination. Local SQLite cache for reads |
| Git conflict on same project | project_locks prevents this. If lock expired + conflict → node runs `git pull --rebase` and retries |

---

## 5. Supabase Schema (Revised for v4.0)

### Existing tables (kept from v3.0)
- `projects` — project registry (dynamic count)
- `api_costs` — billing tracking per project
- `deployments` — Vercel deploy history
- `comms_log` — client communication log
- `stream_memory` — continuous memory events (raw_ref used for email dedup)
- `daily_reports` — daily summaries
- `model_registry` — central model versions
- `audit_log` — compliance tracking

### New tables for multi-node coordination

```sql
-- Node identity & role management
CREATE TABLE node_roles (
  node_id              text PRIMARY KEY,
  display_name         text NOT NULL,
  primary_role         text NOT NULL,          -- 'coordinator' | 'dev-lead' | 'quality'
  is_coordinator       boolean DEFAULT false,
  can_scan_gmail       boolean DEFAULT false,
  can_send_client_comms boolean DEFAULT false,
  claude_session_quota int DEFAULT 2,
  failover_priority    int NOT NULL,
  status               text DEFAULT 'online',  -- 'online' | 'offline' | 'degraded'
  updated_at           timestamptz DEFAULT now()
);

-- Heartbeats (each node writes every 5min)
CREATE TABLE node_heartbeats (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  node_id          text NOT NULL REFERENCES node_roles(node_id),
  status           text DEFAULT 'alive',     -- 'alive' | 'degraded'
  active_agents    int DEFAULT 0,
  active_claude_sessions int DEFAULT 0,
  cpu_usage        float,
  memory_usage     float,
  disk_free_gb     float,
  last_error       text,
  created_at       timestamptz DEFAULT now()
);

-- Failover event log
CREATE TABLE failover_events (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  from_node        text NOT NULL,
  to_node          text NOT NULL,
  reason           text NOT NULL,              -- 'heartbeat_timeout' | 'manual' | 'overload'
  crons_transferred text[],
  resolved_at      timestamptz,
  created_at       timestamptz DEFAULT now()
);

-- Project-level locks
CREATE TABLE project_locks (
  project_id       uuid PRIMARY KEY REFERENCES projects(id),
  locked_by        text NOT NULL REFERENCES node_roles(node_id),
  lock_type        text DEFAULT 'exclusive',
  reason           text,
  expires_at       timestamptz NOT NULL,
  created_at       timestamptz DEFAULT now()
);

-- Active Claude Code sessions
CREATE TABLE active_sessions (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  node_id          text NOT NULL REFERENCES node_roles(node_id),
  project_id       uuid REFERENCES projects(id),
  session_type     text NOT NULL,              -- 'coding' | 'qa' | 'research' | 'report'
  model            text DEFAULT 'opus',
  pid              int,
  started_at       timestamptz DEFAULT now(),
  estimated_minutes int DEFAULT 30,
  last_activity_at timestamptz DEFAULT now()
);

-- Agent events (revised — dedup and routing support)
CREATE TABLE agent_events (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source_node      text NOT NULL REFERENCES node_roles(node_id),
  target_node      text,                        -- NULL = broadcast to all
  project_id       uuid REFERENCES projects(id),
  event_type       text NOT NULL,
  priority         text DEFAULT 'normal',       -- 'critical' | 'high' | 'normal' | 'low'
  summary          text,
  data             jsonb,
  status           text DEFAULT 'pending',      -- 'pending' | 'claimed' | 'processed' | 'failed'
  claimed_by       text,
  processed_at     timestamptz,
  created_at       timestamptz DEFAULT now()
);
```

### Initial seed data

```sql
INSERT INTO node_roles VALUES
  ('antoni',    'Antoni',    'coordinator', true,  true,  true,  1, 1, 'online', now()),
  ('kyungjini', 'Kyungjini', 'dev-lead',    false, false, false, 3, 2, 'online', now()),
  ('jaepini',   'Jaepini',   'quality',     false, false, false, 2, 3, 'online', now());
```

---

## 6. Claude Max Session Management

One subscription shared across 3 machines. Concurrent sessions are the constraint.

### Default quotas

| Node | Quota | Use |
|------|-------|-----|
| Antoni | 1 | Light tasks (email drafts, reports) |
| Kyungjini | 3 | MVP coding, parallel builds |
| Jaepini | 2 | Refactoring, QA |
| **Total** | **6** | Adjustable via Supabase node_roles |

### Session lifecycle

```
Node wants to spawn Claude Code session
  │
  ├─ 1. Check project_locks — is project available?
  │     NO → skip, Slack notify
  │
  ├─ 2. Check own active sessions vs quota (query active_sessions + node_roles)
  │     AT QUOTA → request more from coordinator via agent_event
  │              → coordinator checks if another node has idle sessions
  │              → if yes: temporarily transfer 1 quota
  │              → if no: queue the task
  │
  ├─ 3. INSERT project_locks (node_id, project_id, expires_at=now()+2h)
  │
  ├─ 4. INSERT active_sessions (node_id, project_id, session_type, pid)
  │
  ├─ 5. Spawn: claude --print or ACP harness
  │
  └─ 6. On completion/crash:
       → DELETE from active_sessions
       → DELETE from project_locks
       → INSERT agent_event (result summary)
```

### Session budget rebalancing (coordinator, every 15 min)

```
FOR each node:
  actual = COUNT(*) FROM active_sessions WHERE node_id = node
  quota = node_roles.claude_session_quota

  IF actual == 0 for > 30min AND another node is at quota:
    → Transfer 1 quota temporarily
    → Slack DM: "Transferred 1 session from {idle_node} to {busy_node}"

  IF stale session (last_activity_at > 2h ago):
    → Kill session (if pid exists)
    → Clean up active_sessions + project_locks
```

---

## 7. Folder Structure Per Node

All 3 nodes share the same base structure. Role-specific config is the only difference.

```
~/
├── openclaw/                    # OpenClaw installation
│   ├── config.yaml              # Node-specific config (identity, role, channels)
│   ├── memory/                  # OpenClaw persistent memory
│   │   └── MEMORY.md
│   ├── skills/                  # Custom OpenClaw skills (symlinked from flowos-system)
│   │   ├── health-checker.md
│   │   ├── failover-manager.md
│   │   ├── morning-briefer.md
│   │   ├── slack-stream-scanner.md
│   │   ├── deploy-monitor.md
│   │   ├── coding-agent.md
│   │   ├── gmail-stream-scanner.md      # coordinator-only
│   │   ├── calendar-stream-scanner.md   # coordinator-only
│   │   ├── drive-stream-scanner.md      # coordinator-only
│   │   ├── billing-collector.md         # coordinator-only
│   │   ├── deploy-notifier.md           # coordinator-only
│   │   ├── daily-reporter.md            # coordinator-only
│   │   ├── proactive-advisor.md         # coordinator-only
│   │   ├── intake-logger.md             # coordinator-only
│   │   ├── session-budget-manager.md    # coordinator-only
│   │   ├── mvp-watcher.md              # jaepini-only
│   │   ├── qa-agent.md                 # jaepini-only
│   │   ├── research-agent.md           # jaepini-only
│   │   ├── project-scaffolder.md       # kyungjini-only
│   │   └── secret-migrator.md          # kyungjini-only
│   └── crons/
│       └── schedule.yaml        # Node-specific cron schedule
│
├── flowos/                      # FlowOS system files
│   ├── config/
│   │   ├── node.env             # NODE_ID, ROLE, etc. (no secrets)
│   │   └── env.template.op      # 1Password references for all secrets
│   ├── streams/                 # Continuous memory (local cache)
│   │   ├── gmail.md
│   │   ├── calendar.md
│   │   ├── slack.md
│   │   └── drive.md
│   ├── reports/                 # Daily reports output
│   │   └── YYYY-MM-DD.md
│   ├── logs/                    # Agent activity logs
│   │   └── YYYY-MM-DD.log
│   └── cache/                   # Local SQLite cache (Supabase fallback)
│       └── local.db
│
├── projects/                    # Git clones of active projects
│   ├── flowchat/
│   ├── immigration-crm/
│   └── ...
│
└── .claude/                     # Claude Code global config
    ├── CLAUDE.md
    ├── settings.json
    └── agents/
```

### Node-specific config (node.env)

**Antoni:**
```bash
NODE_ID=antoni
NODE_ROLE=coordinator
HOSTNAME=antoni.tail
TAILSCALE_IP=100.64.0.1
CLAUDE_SESSION_QUOTA=1
CAN_SCAN_GMAIL=true
CAN_SEND_CLIENT_COMMS=true
FAILOVER_PRIORITY=1
```

**Kyungjini:**
```bash
NODE_ID=kyungjini
NODE_ROLE=dev-lead
HOSTNAME=kyungjini.tail
TAILSCALE_IP=100.64.0.2
CLAUDE_SESSION_QUOTA=3
CAN_SCAN_GMAIL=false
CAN_SEND_CLIENT_COMMS=false
FAILOVER_PRIORITY=2
```

**Jaepini:**
```bash
NODE_ID=jaepini
NODE_ROLE=quality
HOSTNAME=jaepini.tail
TAILSCALE_IP=100.64.0.3
CLAUDE_SESSION_QUOTA=2
CAN_SCAN_GMAIL=false
CAN_SEND_CLIENT_COMMS=false
FAILOVER_PRIORITY=3
```

### Cron schedules per node

**Antoni (coordinator):**
```yaml
crons:
  - skill: health-checker
    schedule: "*/5 * * * *"
  - skill: gmail-stream-scanner
    schedule: "*/10 * * * *"
    requires: is_coordinator
  - skill: slack-stream-scanner
    schedule: "*/10 * * * *"
  - skill: calendar-stream-scanner
    schedule: "*/30 * * * *"
    requires: is_coordinator
  - skill: drive-stream-scanner
    schedule: "0 * * * *"
    requires: is_coordinator
  - skill: billing-collector
    schedule: "0 6 * * *"
    requires: is_coordinator
  - skill: morning-briefer
    schedule: "0 9 * * 1-5"
  - skill: daily-reporter
    schedule: "0 4 * * *"          # 04:00 KST
    requires: is_coordinator
  - skill: proactive-advisor
    schedule: "0 9,14,18 * * 1-5"
    requires: is_coordinator
  - skill: session-budget-manager
    schedule: "*/15 * * * *"
    requires: is_coordinator
```

**Kyungjini (dev-lead):**
```yaml
crons:
  - skill: health-checker
    schedule: "*/5 * * * *"
  - skill: slack-stream-scanner
    schedule: "*/10 * * * *"
  - skill: morning-briefer
    schedule: "0 9 * * 1-5"
  - skill: deploy-monitor
    schedule: "*/5 * * * *"
```

**Jaepini (quality):**
```yaml
crons:
  - skill: health-checker
    schedule: "*/5 * * * *"
  - skill: slack-stream-scanner
    schedule: "*/10 * * * *"
  - skill: morning-briefer
    schedule: "0 9 * * 1-5"
  - skill: mvp-watcher
    schedule: "*/10 * * * *"
  - skill: deploy-monitor
    schedule: "*/5 * * * *"
```

---

## 8. Installation Playbook

### Phase 0 — Before Mac Minis arrive (on current machine)

```
□ 1. Deploy new Supabase tables (node_roles, node_heartbeats, failover_events,
      project_locks, active_sessions, revised agent_events)
□ 2. INSERT node_roles seed data for antoni, kyungjini, jaepini
□ 3. Set up email forwarding:
      kj@flowos.work     → macmini@flowos.work
      jp@flowos.work     → macmini@flowos.work
      anton@flowos.work  → macmini@flowos.work
□ 4. Create Slack bot (if not exists), save SLACK_BOT_TOKEN
□ 5. Create 1Password service account
□ 6. Write all OpenClaw skill files in a shared git repo (flowos-system)
□ 7. Write this architecture doc v4.0
```

### Phase 1 — Each Mac Mini setup (~1 hour each, identical steps)

```bash
# 1. macOS basics
xcode-select --install
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install git gh tailscale

# 2. Tailscale — join the mesh
sudo tailscale up --hostname=antoni  # or kyungjini / jaepini

# 3. Dev tools
brew install oven-sh/bun/bun
brew install node
brew install go                 # needed for gog CLI
brew install 1password-cli

# 4. gog CLI (Google Workspace access)
go install github.com/paksungho/gog@latest

# 5. OpenClaw
curl -fsSL https://openclaw.ai/install.sh | bash

# 6. Claude Code — login with shared Claude Max account
claude login

# 7. Google Workspace auth
gog auth manage   # OAuth for macmini@flowos.work

# 8. GitHub auth
gh auth login     # authenticate with flowos org

# 9. 1Password service account
op account add --address flowos.1password.com
```

### Phase 2 — FlowOS directory setup (per node)

```bash
# Create folder structure
mkdir -p ~/flowos/{config,streams,reports,logs,cache}
mkdir -p ~/projects

# Clone the FlowOS system repo
git clone git@github.com:flowos-official/flowos-system.git ~/flowos-system

# Symlink skills into OpenClaw
ln -s ~/flowos-system/openclaw/skills ~/.openclaw/skills

# Write node-specific config (see Section 7 for content per node)
nano ~/flowos/config/node.env

# Secrets via 1Password — no .env files on disk
# All skills use: op run --env-file=~/flowos/config/env.template.op -- <command>
```

### Phase 3 — Activate crons & verify

```bash
# Register crons
openclaw cron register ~/flowos-system/openclaw/crons/antoni.yaml

# Verify health-checker
# Check Supabase: SELECT * FROM node_heartbeats ORDER BY created_at DESC
# All 3 nodes should appear within 5 minutes

# Verify Gmail scan (Antoni only)
# Send test email to macmini@flowos.work
# Check Slack #agency-inbox within 10 minutes

# Verify inter-node events
# Trigger a test agent_event, confirm all nodes receive it
```

### Phase 4 — Clone active projects

```bash
# Kyungjini — Tier 1 projects (active development)
cd ~/projects
gh repo list flowos-official --limit 100 --json name -q '.[].name' | \
  while read repo; do gh repo clone flowos-official/$repo; done

# Jaepini — same (needs code access for QA)
# Antoni — minimal (only clone as needed for context)
```

---

## 9. Document Changes Summary (v3.0 → v4.0)

### Sections to revise

| Section | Change |
|---------|--------|
| Cover | v3.0 → v4.0, remove hardcoded "29개" project count |
| 01 — 왜 이 구조인가 | Dynamic project count, remove fixed numbers |
| 02 — 하드웨어 | Rename Node 01/02/03 → Antoni/Kyungjini/Jaepini with hostnames |
| 02 — 네트워크 | Shared macmini@flowos.work, email forwarding + dedup |
| 03 — 에이전트 | Hybrid coordinator topology, failover chain |
| 04 — 파이프라인 | Add project_locks to prevent conflicts |
| 05 — 소프트웨어 | Single shared Google account, coordinator-only scanning |
| 05b — Google/Slack | Same account for all, routing by forwarding headers, dedup logic |
| 06 — 서브에이전트 | Revised skill files with `requires: is_coordinator` flags |
| 07 — Claude Code | Session quota management, active_sessions table |
| 07b — 양방향 동기화 | agent_events with status/claimed_by, failover_events table |
| 10 — 리스크 | Solutions designed (heartbeats, failover, locks, kill switch) |

### New sections to add

| Section | Content |
|---------|---------|
| Node Identity & Roles | Antoni/Kyungjini/Jaepini, failover chain, coordinator concept |
| Inter-Node Self-Healing | Heartbeat system, failover sequence, problem-solving matrix |
| Session Management | Claude Max quota, active_sessions, rebalancing, project locks |
| Email Deduplication | Forwarding architecture, Message-ID dedup, recipient tag routing |
| Installation Playbook | Phase 0-4 exact commands per node, folder structure |
| Revised Supabase Schema | All new coordination tables |

### Sections unchanged
- 08 — 표준 기술 스택 (still valid)
- 11 — 클라이언트 인테이크 (still valid)
- 12 — 기대 효과 (update to remove hardcoded numbers)

---

## 10. Success Criteria

- [ ] Architecture HTML updated to v4.0 with all revisions above
- [ ] All 3 Mac Minis can be set up following the playbook without ambiguity
- [ ] Supabase schema deployed with all coordination tables
- [ ] Health-checker running on all 3 nodes, heartbeats visible
- [ ] Failover tested: stop Antoni, verify Kyungjini takes over within 30min
- [ ] Gmail dedup verified: same email forwarded 3x, processed once
- [ ] Session quota enforced: node at quota cannot spawn new session
- [ ] Project locks prevent two nodes working on same project
- [ ] Kill switch tested: `/kill-all` stops all agents within 1 minute
- [ ] Cron monitor verified: silent cron failure detected within 15 minutes

---

## 11. Kill Switch & Circuit Breakers

Autonomous agents can go wrong. These safety mechanisms prevent runaway behavior.

### Slack kill switch

```
/kill [node] [agent]    — kill specific agent on specific node
/kill [node]            — kill all agents on a node
/kill-all               — emergency: kill all agents on all nodes
```

Implemented via Slack slash command → Supabase `agent_events` with `event_type: 'kill_command'` + `priority: 'critical'`. Each node's health-checker watches for kill events and terminates matching processes.

### Automatic circuit breakers

| Trigger | Threshold | Action |
|---------|-----------|--------|
| Same task fails consecutively | 3 failures | Auto-stop agent + Slack #agency-alerts |
| Email send rate | >10/hour or >50/day | Block further sends + alert Anton |
| Deploy rate per project | >5/hour | Block deploys + alert KJ |
| Per-agent API cost | >$5/hour | Pause agent + alert coordinator |
| Claude Code session runtime | >2 hours | Warning at 1.5h, force-kill at 2h |
| Total active sessions | >6 across all nodes | Queue new requests, no new spawns |

### Rate limit enforcement

Each skill checks rate limits before executing external actions:

```
BEFORE sending email:
  count = SELECT COUNT(*) FROM audit_log
          WHERE action='email_send' AND node_id={self}
          AND created_at > now() - interval '1 hour'
  IF count >= 10 → BLOCK, alert coordinator

BEFORE deploying:
  count = SELECT COUNT(*) FROM deployments
          WHERE project_id={project}
          AND deployed_at > now() - interval '1 hour'
  IF count >= 5 → BLOCK, alert KJ
```

---

## 12. Supabase Degradation Strategy

Supabase is the single point of coordination. When it goes down, nodes must continue operating.

### Local SQLite cache (each node)

Each node maintains a local SQLite database at `~/flowos/cache/local.db`:

```sql
-- Mirror of critical Supabase tables, refreshed every 5 minutes
CREATE TABLE cached_node_roles (same schema as node_roles);
CREATE TABLE cached_projects (same schema as projects);
CREATE TABLE cached_model_registry (same schema as model_registry);

-- Pending events queue (written when Supabase is unreachable)
CREATE TABLE pending_events (
  id          text PRIMARY KEY,
  table_name  text NOT NULL,     -- 'agent_events' | 'node_heartbeats' | etc.
  payload     text NOT NULL,     -- JSON
  created_at  text DEFAULT (datetime('now'))
);
```

### Degradation sequence

```
Supabase health check fails (3 consecutive attempts, 30 seconds apart)
  │
  ├─ 1. Switch to local SQLite cache for ALL reads
  │     (node_roles, projects, model_registry)
  │
  ├─ 2. Queue all writes to pending_events table
  │     (heartbeats, agent_events, stream_memory inserts)
  │
  ├─ 3. Switch inter-node communication to Slack
  │     Post to #agency-alerts: "⚠️ Supabase down. Operating on local cache."
  │     Agent events posted as Slack messages to #agency-events-fallback
  │
  ├─ 4. Tailscale SSH as last resort
  │     If Slack also fails → direct SSH between nodes
  │     ssh kyungjini.tail "echo HEARTBEAT $(date)"
  │
  ├─ 5. Continue background polling Supabase every 60 seconds
  │
  └─ 6. On recovery:
       → Flush pending_events to Supabase (ordered by created_at)
       → Conflict resolution: last-write-wins
       → Slack #agency-alerts: "✅ Supabase recovered. Synced {n} pending events."
       → Resume normal operation
```

### Cache refresh schedule

```
*/5 * * * * — Refresh cached_node_roles, cached_projects, cached_model_registry
             If Supabase unreachable → skip, use existing cache
             Cache age > 1 hour → log warning
```

---

## 13. Action Confirmation Levels

Agents must not act unilaterally on external-facing or irreversible actions.

| Level | Actions | Behavior |
|-------|---------|----------|
| **Level 0 — Autonomous** | Memory updates, internal analysis, stream scans, report generation, heartbeats, CLAUDE.md updates | Execute immediately. Log to audit_log only. |
| **Level 1 — Notify after** | Slack channel posts (internal), briefings, cost reports, project status updates | Execute, then post to Slack DM: "Done: [summary]" |
| **Level 2 — Confirm before** | Email sends, client notifications, code deploys, billing actions, data deletion, 1Password changes | Draft/plan → Slack DM to responsible human → wait for "approve" or "revise" → execute or retry |

### Enforcement

Each skill declares its confirmation level in its header:

```yaml
# In skill file header
confirmation_level: 2  # 0, 1, or 2
approver: anton        # which human approves (for level 2)
```

The OpenClaw runtime checks this before executing external actions. Level 2 actions without approval are blocked and logged.

---

## 14. Cron & Skill Monitoring

Silent cron failures are dangerous — if gmail-stream-scanner stops running, nobody knows for hours.

### Cron execution log table

```sql
CREATE TABLE cron_executions (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  node_id       text NOT NULL REFERENCES node_roles(node_id),
  skill_name    text NOT NULL,
  started_at    timestamptz NOT NULL,
  completed_at  timestamptz,
  status        text DEFAULT 'running',  -- 'running' | 'success' | 'failure' | 'timeout'
  error_message text,
  duration_ms   int
);
```

### Dead cron detection (part of health-checker, every 5 min)

```
FOR each scheduled cron on this node:
  last_run = SELECT MAX(started_at) FROM cron_executions
             WHERE node_id={self} AND skill_name={cron.skill}

  expected_interval = parse(cron.schedule)  -- e.g., 10min for */10

  IF last_run IS NULL OR last_run < now() - (expected_interval * 3):
    → Slack #agency-alerts: "⚠️ {skill_name} on {node_id} hasn't run in {duration}"
    → Attempt restart
    → If restart fails 2x → escalate to human DM
```

---

## 15. Known Limitations & Design Decisions

### KakaoTalk — not automated

macOS Hardened Runtime prevents programmatic access to KakaoTalk. This is a known, intentional limitation. Client communication policy: **email-first**. KakaoTalk messages are handled manually by Anton (human). If a client sends a KakaoTalk message, Anton copies the text and pastes it into the agent via Slack or Telegram for processing.

### Regulatory client data isolation

Projects for regulated industries (finance, healthcare, legal) require enhanced isolation:

| Aspect | Standard Project | Regulated Project |
|--------|-----------------|-------------------|
| Supabase | Shared instance (schema separation) | Dedicated Supabase instance |
| 1Password | Shared vault (per-project items) | Dedicated team vault |
| Agent context | Cross-project references allowed | Isolated — no cross-project data |
| Git | Shared org | Separate org or private fork |
| Deploy | Shared Vercel Team | Dedicated Vercel project |

The `projects` table has a `regulated_industry` boolean. Skills check this flag before cross-referencing data between projects.

### Model registry consumption

All projects reference models via the `model_registry` table, never hardcoded:

```sql
-- Each project reads:
SELECT current_model FROM model_registry WHERE key = 'chat-llm';
-- Returns: 'gemini-4-flash' (or whatever is current)
```

Model transitions use blue-green strategy:
1. Add `next_model` value to registry
2. New Claude Code sessions use `next_model`
3. Existing sessions keep `current_model`
4. When all `current_model` sessions complete → `current_model = next_model`, `next_model = NULL`
5. If `next_model` error rate > 10% → auto-rollback (`next_model = NULL`)

### `agent_context` on projects table

The `projects` table includes an `agent_context JSONB` column — the source of truth for CLAUDE.md synchronization:

```sql
ALTER TABLE projects ADD COLUMN agent_context jsonb DEFAULT '{}';
-- Contains: client info, tech decisions, current phase, known issues, etc.
-- When a node spawns Claude Code, it reads agent_context and generates CLAUDE.md locally
-- When Claude Code completes, it writes back updated context to agent_context
-- This eliminates the need for git pull to sync CLAUDE.md between nodes
```

### Project lifecycle — archiving flow

When a project is complete:
1. `projects.phase = 'archived'` → auto-excluded from all crons/watchers
2. LLM summarizes full project history → 1-page CLAUDE.md archive
3. `agent_events` for this project → cold storage, deleted from Supabase
4. Vercel project paused (not deleted) unless maintenance contract
5. 1Password vault keys set to expire in 90 days
6. Antoni sends "project complete + maintenance info" email to client

### Node ID migration

v3.0 used `node01`/`node02`/`node03`. v4.0 uses `antoni`/`kyungjini`/`jaepini`. Existing `stream_memory` rows with old node IDs need a one-time migration:

```sql
UPDATE stream_memory SET node_id = 'antoni' WHERE node_id = 'node01';
UPDATE stream_memory SET node_id = 'kyungjini' WHERE node_id = 'node02';
UPDATE stream_memory SET node_id = 'jaepini' WHERE node_id = 'node03';
```

### Timezone

All Mac Minis run in **KST (Asia/Seoul, UTC+9)**. All cron schedules in this spec are in KST. The daily-reporter cron `0 4 * * *` runs at 04:00 KST. Supabase timestamps use `timestamptz` (stored as UTC, displayed in local time).

**Note:** The v3.0 HTML used `0 19 * * *` assuming UTC. v4.0 crons use local KST since the Mac Minis are in Korea.

---

## 16. Installation Playbook Additions

### gog CLI installation

```bash
# gog is a Go binary — install via go install or download release
# Check https://github.com/paksungho/gog for latest install method
go install github.com/paksungho/gog@latest
# OR download from releases page
```

### Claude Max shared login

All 3 Mac Minis share one Claude Max subscription. Login flow:

```bash
# On each Mac Mini:
claude login
# This opens a browser for OAuth. Log in with the shared Claude Max account.
# Each machine gets its own session token stored in ~/.claude/credentials.json
# Multiple machines CAN be logged in simultaneously.
# The constraint is concurrent SESSIONS, not concurrent logins.
```

### OpenClaw installation directory

OpenClaw installs to `~/.openclaw/` by default. Verify after install:

```bash
which openclaw        # should show path
ls ~/.openclaw/       # config, memory, skills directories
```

Update symlink command accordingly:
```bash
ln -s ~/flowos-system/openclaw/skills ~/.openclaw/skills
```

### Slack channels to create (Phase 0)

```
#agency-alerts          — node health, failover, kill switch events
#agency-inbox           — new client emails routed here
#agency-costs           — daily/weekly cost reports
#agency-daily           — daily summary briefings
#agency-events-fallback — agent_events when Supabase is down
#proj-{slug}            — one per active project (auto-created by intake-logger)
```

### env.template.op content

```bash
# ~/flowos/config/env.template.op
SUPABASE_URL=op://flowos/shared/supabase-url
SUPABASE_SERVICE_ROLE_KEY=op://flowos/shared/supabase-service-key
SLACK_BOT_TOKEN=op://flowos/shared/slack-bot-token
ANTHROPIC_API_KEY=op://flowos/shared/anthropic-key
GITHUB_TOKEN=op://flowos/shared/github-token
BRAVE_SEARCH_API_KEY=op://flowos/shared/brave-search-key
RESEND_API_KEY=op://flowos/shared/resend-api-key
# Per-project secrets are in op://flowos/{project-slug}/ vaults
```

### Disaster recovery

| Asset | Backup Strategy | Recovery |
|-------|----------------|----------|
| Project code | GitHub (authoritative) | `gh repo clone` |
| OpenClaw memory | Daily backup to shared Drive or S3 | Restore from backup |
| Stream caches | Regenerated from Supabase stream_memory | Re-run stream scanners |
| node.env | In flowos-system git repo | Re-clone repo |
| Local SQLite cache | Ephemeral — rebuilds from Supabase | Auto-rebuilds on boot |
| Claude credentials | Re-login with `claude login` | 5 minutes |

If a Mac Mini's SSD fails completely:
1. Replace hardware
2. Run Phase 1 + Phase 2 from playbook
3. OpenClaw memory restored from daily backup
4. Node rejoins mesh within 2 hours

---

## 17. `requires: is_coordinator` Runtime Enforcement

The `requires: is_coordinator` flag in cron schedules is enforced by a wrapper that runs before each skill:

```
BEFORE executing any cron skill:
  1. Read ~/flowos/config/node.env → get NODE_ID
  2. Query Supabase: SELECT is_coordinator FROM node_roles WHERE node_id = {NODE_ID}
     (Falls back to local SQLite cache if Supabase unreachable)
  3. If skill has requires: is_coordinator AND node is NOT coordinator:
     → Skip execution silently (log to cron_executions with status='skipped')
  4. If node IS coordinator → execute normally
```

This means ALL skills are installed on ALL nodes. The coordinator check happens at runtime. When failover occurs and Kyungjini becomes coordinator, it immediately starts executing coordinator-gated skills on the next cron cycle — no config changes needed.
