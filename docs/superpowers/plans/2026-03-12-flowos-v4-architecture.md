# FlowOS Agency OS Architecture v4.0 — HTML Document Update Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update `flowos-agency-architecture.html` from v3.0 to v4.0 based on the approved design spec.

**Architecture:** Single-file HTML document update. All edits target `/Users/paksungho/FlowOS_MacMini/flowos-agency-architecture.html` (2,043 lines, Korean). Changes follow the spec at `docs/superpowers/specs/2026-03-12-flowos-v4-architecture-design.md`.

**Tech Stack:** HTML, CSS (inline `<style>`), Korean text content

> **Note on line numbers:** Line references in this plan are based on the v3.0 file. After each task applies edits, subsequent line numbers shift. Locate edit targets by content (old_string), not line number. The Edit tool handles this automatically.

---

## File Structure

- **Modify:** `flowos-agency-architecture.html` — the only file being changed
- **Reference (read-only):** `docs/superpowers/specs/2026-03-12-flowos-v4-architecture-design.md` — the approved spec

### Current HTML Section Map (v3.0)

| Lines | Section | Status |
|-------|---------|--------|
| 211-225 | Cover | Revise |
| 230-257 | 01 — 왜 이 구조인가 | Revise |
| 262-349 | 02 — 하드웨어 아키텍처 | Revise |
| 354-424 | 03 — 에이전트 아키텍처 | Revise |
| 429-505 | 04 — 개발 파이프라인 | Revise |
| 510-606 | 05 — 소프트웨어 아키텍처 | Revise |
| 611-946 | 05b — Google Workspace & Slack | Revise |
| 951-1155 | 06 — 서브에이전트 아키텍처 | Revise |
| 1160-1385 | 07 — Claude Code 자율 코딩 루프 | Revise |
| 1390-1524 | 07b — 양방향 컨텍스트 동기화 | Revise |
| 1529-1594 | 08 — 표준 기술 스택 | Minor revise |
| 1601-1657 | 09 — 구현 로드맵 | Replace with Installation Playbook |
| 1662-1883 | 10 — 리스크 분석 | Revise (solutions designed) |
| 1888-2006 | 11 — 클라이언트 인테이크 | Unchanged |
| 2011-2040 | 12 — 기대 효과 | Minor revise |
| 2036-2043 | Footer | Revise |

### New Sections to Insert (after Section 10)

| New Section | Content Source (Spec) |
|-------------|----------------------|
| 10b — 킬 스위치 & 서킷 브레이커 | Spec §11 |
| 10c — Supabase 장애 대응 | Spec §12 |
| 10d — 확인 레벨 시스템 | Spec §13 |
| 10e — 크론 모니터링 | Spec §14 |
| 10f — 설계 결정 및 제한사항 | Spec §15 |

---

## Chunk 1: Cover + Section 01 (Foundation)

### Task 1: Update Cover — v3.0 → v4.0, Dynamic Project Count

**Files:**
- Modify: `flowos-agency-architecture.html:211-225`

- [ ] **Step 1: Update cover label and version**

Replace the cover section (lines 211-225) with v4.0 content. Key changes:
- `v3.0` → `v4.0` (3 occurrences: `.label`, `.version`, and subtitle)
- `29개 AI 개발 프로젝트` → dynamic wording (remove fixed count)
- Subtitle: reflect 3 Mac Mini autonomous agent servers

```html
<!-- Find and replace these specific strings -->

<!-- 1. Cover label -->
Old: <div class="label">Internal Architecture Report · v3.0</div>
New: <div class="label">Internal Architecture Report · v4.0</div>

<!-- 2. Subtitle -->
Old: <p class="subtitle">3인 팀으로 29개 AI 개발 프로젝트를 동시 운영하기 위한<br>분산 에이전트 인프라 — 하드웨어부터 자동화 파이프라인까지</p>
New: <p class="subtitle">3인 팀의 다수 AI 개발 프로젝트를 동시 운영하기 위한<br>3대 Mac Mini 자율 에이전트 서버 — Antoni · Kyungjini · Jaepini</p>

<!-- 3. Version footer -->
Old: <div class="version">v3.0</div>
New: <div class="version">v4.0</div>
```

- [ ] **Step 2: Verify the cover renders correctly**

Open the file in a browser and confirm:
- Label shows `v4.0`
- Subtitle shows dynamic project count (no "29개")
- Bottom-right version shows `v4.0`

- [ ] **Step 3: Commit**

```bash
git add flowos-agency-architecture.html
git commit -m "docs: update cover to v4.0, remove hardcoded project count"
```

### Task 2: Update Section 01 — Dynamic Project Count

**Files:**
- Modify: `flowos-agency-architecture.html:230-257`

- [ ] **Step 1: Update stats grid — remove hardcoded "29"**

```html
<!-- Stats grid: change "29" to dynamic text -->
Old: <div class="stat"><div class="num">29</div><div class="unit">활성 프로젝트</div></div>
New: <div class="stat"><div class="num">N+</div><div class="unit">활성 프로젝트 (동적)</div></div>
```

- [ ] **Step 2: Update body text — remove hardcoded counts**

```html
<!-- Paragraph about current projects -->
Old: <p>현재 활성 프로젝트는 29개다. 이 중 17개는 지난 2주 이내 커밋이 있고, 나머지는 유지보수 또는 MVP 대기 상태다. 수동 관리로는 이 규모를 유지할 수 없다.</p>
New: <p>활성 프로젝트는 지속적으로 증가한다. 다수가 최근 2주 이내 커밋이 있고, 나머지는 유지보수 또는 MVP 대기 상태다. 수동 관리로는 이 규모를 유지할 수 없다.</p>
```

- [ ] **Step 3: Update "왜 하나가 아니라 세 대인가" paragraph**

Add the coordinator/failover concept to the explanation:

```html
Old: <p>OpenClaw는 단일 사용자 게이트웨이다. 3명이 공유하면 컨텍스트 오염, 인증 범위 혼재, 단일 장애점이 발생한다. 각자 전용 노드를 가지면 — KJ 에이전트는 KJ의 코드베이스를, JP 에이전트는 JP의 담당 프로젝트를, Anton 에이전트는 클라이언트 커뮤니케이션 패턴을 학습한다.</p>
New: <p>OpenClaw는 단일 사용자 게이트웨이다. 3명이 공유하면 컨텍스트 오염, 인증 범위 혼재, 단일 장애점이 발생한다. 3대의 Mac Mini — <strong>Antoni</strong>(코디네이터), <strong>Kyungjini</strong>(개발 리드), <strong>Jaepini</strong>(품질) — 는 각각 독립 에이전트를 운영하며, 하이브리드 코디네이터 토폴로지로 상호 감시·자동 페일오버한다.</p>
```

- [ ] **Step 4: Update callout principle**

```html
Old: <p><strong>핵심 원칙:</strong> 인원이 아닌 프로젝트 수에 비례해 확장되는 인프라. 26번째 프로젝트의 한계 비용은 0에 수렴한다.</p>
New: <p><strong>핵심 원칙:</strong> 인원이 아닌 프로젝트 수에 비례해 확장되는 인프라. 다음 프로젝트의 한계 비용은 0에 수렴한다. 노드 하나가 죽어도 나머지가 자율 대응한다.</p>
```

- [ ] **Step 5: Commit**

```bash
git add flowos-agency-architecture.html
git commit -m "docs: section 01 — remove hardcoded project counts, add coordinator concept"
```

### Task 3: Rewrite Section 02 — Node Identity & Hardware

**Files:**
- Modify: `flowos-agency-architecture.html:262-349`

- [ ] **Step 1: Update section description**

```html
Old: <p class="desc">Mac Mini M4 Pro 3대 + Tailscale 프라이빗 메시 + Supabase 공유 컨트롤 플레인</p>
New: <p class="desc">Antoni · Kyungjini · Jaepini — Mac Mini M4 Pro 3대 + Tailscale 프라이빗 메시 + Supabase 공유 컨트롤 플레인</p>
```

- [ ] **Step 2: Replace the system topology diagram**

Replace the entire topology diagram (lines 293-325) with the v4.0 version showing Antoni/Kyungjini/Jaepini names, coordinator role, email forwarding, and new Supabase tables:

```
┌──────────────────────────────────────────────────────────────┐
│                      CONTROL PLANE                           │
│                   Supabase (Cloud)                           │
│                                                              │
│   projects · node_roles · node_heartbeats · agent_events    │
│   project_locks · active_sessions · failover_events         │
└─────────────────┬──────────────┬──────────────┬─────────────┘
                  │              │              │
        ┌─────────┘    ┌─────────┘    └─────────┐
        │              │                        │
┌───────┴──────┐ ┌─────┴────────┐ ┌─────────────┴──┐
│   ANTONI     │ │  KYUNGJINI   │ │    JAEPINI      │
│ ★ Coordinator│ │  Dev Lead    │ │   Quality       │
│ 클라이언트 운영│ │  개발 리드    │ │   품질 관리     │
│              │ │              │ │                 │
│  OpenClaw    │ │  OpenClaw    │ │   OpenClaw      │
│  ├ Gmail ★   │ │  ├ builder   │ │   ├ builder     │
│  ├ Calendar ★│ │  ├ qa        │ │   ├ qa          │
│  ├ billing ★ │ │  ├ deploy    │ │   ├ deploy      │
│  ├ comms ★   │ │  └ monitor   │ │   └ research    │
│  └ dispatch ★│ │              │ │                 │
│  (★=coordinator only)        │ │                 │
└──────┬───────┘ └─────┬──────┘ └──────────┬──────┘
       │               │                   │
       └────────────── Tailscale ──────────┘
                    100.64.0.x
                    (프라이빗 메시)
                          │
        ┌─────────────────┴──────────────────┐
        │            공유 서비스              │
        │  GitHub Org · Vercel Team          │
        │  1Password Teams · Slack           │
        │  macmini@flowos.work (공유 Gmail)  │
        │  Cloudflare (SSL · DNS · Proxy)    │
        └────────────────────────────────────┘

이메일 포워딩:
kj@flowos.work     ─→ macmini@flowos.work
jp@flowos.work     ─→ macmini@flowos.work
anton@flowos.work  ─→ macmini@flowos.work
→ 코디네이터만 Gmail 스캔 (Message-ID 기반 중복 제거)
```

- [ ] **Step 3: Update Tailscale settings box**

```html
<!-- Replace Node 01/02/03 with Antoni/Kyungjini/Jaepini -->
Old: <div class="spec-row"><span class="key">Node 01 (Anton)</span><span class="val">100.64.0.1</span></div>
     <div class="spec-row"><span class="key">Node 02 (KJ)</span><span class="val">100.64.0.2</span></div>
     <div class="spec-row"><span class="key">Node 03 (JP)</span><span class="val">100.64.0.3</span></div>
New: <div class="spec-row"><span class="key">Antoni (antoni.tail)</span><span class="val">100.64.0.1</span></div>
     <div class="spec-row"><span class="key">Kyungjini (kyungjini.tail)</span><span class="val">100.64.0.2</span></div>
     <div class="spec-row"><span class="key">Jaepini (jaepini.tail)</span><span class="val">100.64.0.3</span></div>
```

- [ ] **Step 4: Update OpenClaw gateway box**

```html
<!-- Update memory path -->
Old: <div class="spec-row"><span class="key">메모리</span><span class="val">~/clawd/ (각 노드 독립)</span></div>
New: <div class="spec-row"><span class="key">메모리</span><span class="val">~/.openclaw/memory/ (각 노드 독립)</span></div>
```

- [ ] **Step 5: Update network description paragraph**

```html
Old: <p>세 노드는 Tailscale로 프라이빗 메시를 형성한다. 각 노드는 고정 Tailscale IP(100.x.x.x)를 가지며, 공개 인터넷을 통하지 않고 노드 간 직접 통신한다.</p>
New: <p>Antoni · Kyungjini · Jaepini 세 노드는 Tailscale로 프라이빗 메시를 형성한다. 각 노드는 고정 Tailscale IP(100.64.0.x)와 hostname(*.tail)을 가지며, 공개 인터넷을 통하지 않고 노드 간 직접 통신한다. 모든 노드는 동일한 Google 계정(macmini@flowos.work)을 사용하며, Gmail 스캔은 코디네이터(기본: Antoni)만 수행한다.</p>
```

- [ ] **Step 6: Update sharing explanation**

```html
Old: <p><strong>Tailscale이 공유하는 것 vs 아닌 것:</strong> Tailscale은 네트워크 레이어만 제공한다. 파일이나 컨텍스트를 자동 동기화하지 않는다. 노드 간 공유 상태는 Supabase(프로젝트 데이터·모델 레지스트리), GitHub(코드·CLAUDE.md), Slack(메시지 버스)을 통해 이뤄진다. 각 노드의 OpenClaw 로컬 메모리(<code>~/clawd/MEMORY.md</code>)는 의도적으로 분리 유지된다 — 각 에이전트는 고유한 아이덴티티와 맥락을 가진다.</p>
New: <p><strong>Tailscale이 공유하는 것 vs 아닌 것:</strong> Tailscale은 네트워크 레이어만 제공한다. 파일이나 컨텍스트를 자동 동기화하지 않는다. 노드 간 공유 상태는 Supabase(프로젝트 데이터·node_roles·agent_events), GitHub(코드·CLAUDE.md), Slack(알림·메시지 버스)을 통해 이뤄진다. 에이전트 간 실시간 조율은 <strong>Supabase Realtime</strong>이 담당한다. 각 노드의 OpenClaw 로컬 메모리(<code>~/.openclaw/memory/MEMORY.md</code>)는 의도적으로 분리 유지된다.</p>
```

- [ ] **Step 7: Add shared accounts table (spec §3)**

After the spec-grid boxes, insert a shared accounts reference table:

```html
<h3>공유 계정 및 인증</h3>
<p>v4.0 핵심 변경: 모든 노드가 동일 계정을 공유한다.</p>

<table>
  <thead><tr><th>리소스</th><th>계정/인증</th><th>공유 모델</th></tr></thead>
  <tbody>
    <tr><td>Google Workspace</td><td class="mono">macmini@flowos.work</td><td>동일 OAuth 토큰 — 각 노드 독립 인증 (같은 계정)</td></tr>
    <tr><td>Claude Max</td><td>하나의 구독</td><td>공유 로그인 — 동시 세션 수가 제약 (총 6세션)</td></tr>
    <tr><td>GitHub Org</td><td class="mono">flowos-official</td><td>각 노드 개별 SSH 키, 동일 org 접근</td></tr>
    <tr><td>Supabase</td><td>하나의 프로젝트</td><td>동일 SUPABASE_URL + SERVICE_ROLE_KEY</td></tr>
    <tr><td>Slack</td><td>하나의 봇 토큰</td><td>동일 SLACK_BOT_TOKEN — 코디네이터가 클라이언트 메시지 제어</td></tr>
    <tr><td>1Password</td><td>하나의 Teams 계정</td><td>동일 서비스 계정, 각 노드 op CLI 독립 사용</td></tr>
  </tbody>
</table>
```

- [ ] **Step 8: Commit**

```bash
git add flowos-agency-architecture.html
git commit -m "docs: section 02 — rename nodes to Antoni/Kyungjini/Jaepini, shared accounts"
```

---

## Chunk 2: Agent Architecture + Coordination (Sections 03, 04)

### Task 4: Rewrite Section 03 — Hybrid Coordinator Topology

**Files:**
- Modify: `flowos-agency-architecture.html:354-424`

- [ ] **Step 1: Update section title and description**

```html
Old: <h2>3 에이전트 페르소나</h2>
     <p class="desc">각 에이전트는 담당자의 실제 업무 방식을 학습하고 반영한다.</p>
New: <h2>하이브리드 코디네이터 토폴로지</h2>
     <p class="desc">Antoni가 기본 코디네이터. 장애 시 Kyungjini가 자동 인수. Jaepini는 생존 모드. 모든 노드가 상호 감시한다.</p>
```

- [ ] **Step 2: Replace the 3 node cards with v4.0 content**

Replace the entire `node-grid` div with updated cards showing Antoni/Kyungjini/Jaepini names, roles, and coordinator/failover badges:

Node 01 card:
```html
<div class="node-card">
  <div class="node-label">COORDINATOR (기본)</div>
  <div class="node-name">Antoni</div>
  <div class="node-role">클라이언트 운영 · 코디네이션 · 디스패칭</div>
  <div class="node-persona">Client Ops + Coordinator Agent</div>
  <ul>
    <li>Gmail 스캔 (macmini@flowos.work) — 코디네이터 전용</li>
    <li>Calendar/Drive 스캔 — 코디네이터 전용</li>
    <li>Slack 채널 모니터링 & 메시지 라우팅</li>
    <li>작업 디스패칭 (Supabase agent_events)</li>
    <li>일일 리포트 생성 · 비용 집계</li>
    <li>Claude Code 세션 예산 관리</li>
    <li>페일오버 우선순위: 1 (Primary)</li>
  </ul>
</div>
```

Node 02 card:
```html
<div class="node-card">
  <div class="node-label">DEV LEAD WORKER</div>
  <div class="node-name">Kyungjini</div>
  <div class="node-role">MVP 빌드 · 아키텍처 · 고부하 Claude Code</div>
  <div class="node-persona">Builder Agent</div>
  <ul>
    <li>빠른 프로젝트 스캐폴딩</li>
    <li>MVP 병렬 코딩 에이전트 (최대 3세션)</li>
    <li>아키텍처 리뷰 · 프로덕션 배포</li>
    <li>배포 모니터링 (deploy-monitor)</li>
    <li>Antoni 장애 시 → 코디네이터 자동 인수</li>
    <li>페일오버 우선순위: 2</li>
  </ul>
</div>
```

Node 03 card:
```html
<div class="node-card">
  <div class="node-label">QUALITY WORKER</div>
  <div class="node-name">Jaepini</div>
  <div class="node-role">리팩토링 · QA · 테스트 · 리서치</div>
  <div class="node-persona">Finisher Agent</div>
  <ul>
    <li>MVP → 프로덕션 품질 전환</li>
    <li>코드 리팩토링 · 성능 최적화 (최대 2세션)</li>
    <li>mvp-watcher: KJ MVP 완료 자동 감지</li>
    <li>QA 에이전트 · 기술 리서치</li>
    <li>2노드 다운 시 → 생존 모드 (모니터링만)</li>
    <li>페일오버 우선순위: 3</li>
  </ul>
</div>
```

- [ ] **Step 3: Replace agent communication section with failover chain**

Replace the "에이전트 간 통신" paragraph and diagram (lines 408-423) with the failover chain from spec §2:

```html
<h3>코디네이터 책임 (기본: Antoni)</h3>
<p>코디네이터는 다음을 독점적으로 수행한다. <code>requires: is_coordinator</code> 플래그로 런타임 강제된다.</p>
<table>
  <thead><tr><th>책임</th><th>크론/트리거</th><th>비고</th></tr></thead>
  <tbody>
    <tr><td>Gmail/Calendar/Drive 스캔</td><td>*/10, */30, */60</td><td>macmini@flowos.work 공유 계정</td></tr>
    <tr><td>Slack 채널 모니터링 & 라우팅</td><td>*/10</td><td>클라이언트 대면 메시지는 코디네이터만</td></tr>
    <tr><td>작업 디스패칭</td><td>agent_events</td><td>Kyungjini/Jaepini에게 작업 할당</td></tr>
    <tr><td>일일 리포트 · 비용 집계</td><td>매일 04:00 / 06:00</td><td></td></tr>
    <tr><td>Claude Code 세션 예산 관리</td><td>*/15</td><td>active_sessions + node_roles 기반</td></tr>
    <tr><td>클라이언트 알림 초안</td><td>이벤트 기반</td><td>Level 2 확인 후 발송</td></tr>
  </tbody>
</table>

<h3>페일오버 체인</h3>
<div class="diagram">
Antoni 다운 → Kyungjini가 감지 (30분 무응답, 15분 경고 후)
           → Kyungjini가 Supabase: is_coordinator=true 설정
           → Gmail/Slack/Calendar/Drive 스캔 + 디스패칭 시작
           → Slack #agency-alerts: "Antoni offline. Kyungjini coordinating."

Kyungjini도 다운 → Jaepini가 감지
                  → Jaepini 생존 모드 (모니터링만, 코딩 없음)
                  → Slack DM to KJ: "2 nodes down. Manual intervention needed."

Antoni 복귀 → 코디네이터 자동 회수 안 함
            → 수동 핸드백 대기 (Supabase/Slack 명령)
            → Slack #agency-alerts: "Antoni back online. Kyungjini still coordinating."</div>
```

- [ ] **Step 4: Add communication layers (spec §4)**

After the failover chain, add the 4-layer communication priority stack:

```html
<h3>노드 간 통신 레이어 (우선순위 순)</h3>
<div class="diagram">
Layer 1: Supabase Realtime (agent_events)    — 구조화 이벤트, 밀리초 전달
Layer 2: Supabase Tables (공유 상태)          — heartbeats, locks, node_roles
Layer 3: Slack (사람 가독)                    — 알림, 일일 리포트, 경고
Layer 4: Tailscale SSH (비상 전용)            — Supabase 다운 시 노드 간 직접 통신</div>
```

- [ ] **Step 5: Add autonomous problem-solving matrix (spec §4)**

```html
<h3>자율 문제 해결 매트릭스</h3>
<table>
  <thead><tr><th>상황</th><th>감지</th><th>자율 대응</th></tr></thead>
  <tbody>
    <tr><td>Kyungjini 배포 실패</td><td>deploy-monitor: Vercel ERROR</td><td>Claude Code 스폰 → 수정. 2회 실패 → Jaepini에 위임</td></tr>
    <tr><td>Claude 세션 할당 소진</td><td>세션 스폰 시 limit error</td><td>코디네이터에 +1 요청. 유휴 노드 quota 이전</td></tr>
    <tr><td>Jaepini QA 크리티컬 버그 발견</td><td>qa-agent → agent_events</td><td>Kyungjini 수신 → coding-agent 자동 수정 → QA 재트리거</td></tr>
    <tr><td>Antoni 과부하 (agents > 8)</td><td>health-checker 감지</td><td>이메일 분류를 Kyungjini에 일회성 위임</td></tr>
    <tr><td>Supabase 다운</td><td>health check 3회 실패</td><td>Slack 통신 전환 + 로컬 SQLite 캐시 + Tailscale SSH 비상</td></tr>
    <tr><td>Git 충돌 (같은 프로젝트)</td><td>project_locks가 방지</td><td>lock 만료 + 충돌 → git pull --rebase → 재시도</td></tr>
  </tbody>
</table>
```

- [ ] **Step 6: Commit**

```bash
git add flowos-agency-architecture.html
git commit -m "docs: section 03 — hybrid coordinator topology with failover chain"
```

### Task 5: Update Section 04 — Pipeline with Project Locks

**Files:**
- Modify: `flowos-agency-architecture.html:429-505`

- [ ] **Step 1: Remove hardcoded "29" from project tiering**

```html
Old: <p>29개 프로젝트를 모두 동일하게 모니터링하는 것은 비효율적이다. 실제 git 활동 기반으로 3단계로 분류한다.</p>
New: <p>모든 프로젝트를 동일하게 모니터링하는 것은 비효율적이다. 실제 git 활동 기반으로 3단계로 분류한다.</p>
```

- [ ] **Step 2: Remove hardcoded tier counts**

In the tier table, replace fixed project counts with dynamic descriptions:

```html
<!-- Tier 1 row -->
Old: <td>17개</td>
New: <td>동적</td>

<!-- Tier 2 row -->
Old: <td>12개</td>
New: <td>동적</td>
```

- [ ] **Step 3: Add project lock section after git strategy**

After the git strategy paragraph (after line 472), add:

```html
<h3>프로젝트 레벨 락 — 동시 작업 방지</h3>
<p>Kyungjini와 Jaepini가 같은 프로젝트에 동시 Claude Code 세션을 열면 git 충돌이 발생한다. <code>project_locks</code> 테이블로 프로젝트 단위 독점 락을 관리한다.</p>

<div class="diagram">
Claude Code 세션 스폰 전:
  1. SELECT * FROM project_locks WHERE project_id = {project}
  2. 락 존재 → 스폰 중단, Slack DM: "{project}는 {locked_by}가 작업 중"
  3. 락 없음 → INSERT project_locks (project_id, locked_by, expires_at=now()+2h)
  4. Claude Code 세션 시작

세션 완료/크래시:
  → DELETE FROM project_locks WHERE project_id = {project}
  → DELETE FROM active_sessions WHERE pid = {pid}

stale lock 방지:
  → expires_at 2시간 자동 해제
  → health-checker가 만료 락 정리</div>
```

- [ ] **Step 4: Commit**

```bash
git add flowos-agency-architecture.html
git commit -m "docs: section 04 — dynamic project counts, add project locks"
```

---

## Chunk 3: Software Architecture + Integration (Sections 05, 05b, 06)

### Task 6: Update Section 05 — Shared Accounts, Coordinator-Only Scanning

**Files:**
- Modify: `flowos-agency-architecture.html:510-606`

- [ ] **Step 1: Update Supabase schema diagram**

Add new coordination tables to the schema comment. Update `owner_node` values from `node01|node02|node03` to `antoni|kyungjini|jaepini`:

```html
Old: owner_node,                            -- node01|node02|node03
New: owner_node,                            -- antoni|kyungjini|jaepini
```

Add after the existing schema entries:

```
-- 멀티 노드 조율 (v4.0 신규)
node_roles (node_id, display_name, primary_role, is_coordinator, ...)
node_heartbeats (node_id, status, active_agents, cpu_usage, ...)
failover_events (from_node, to_node, reason, crons_transferred, ...)
project_locks (project_id, locked_by, lock_type, expires_at)
active_sessions (node_id, project_id, session_type, model, pid, ...)
cron_executions (node_id, skill_name, started_at, status, ...)
```

- [ ] **Step 2: Update Gmail monitoring section**

```html
Old: <h3>Gmail 모니터링 (Anton 노드)</h3>
     <p>Anton 노드는 5분 크론으로 Gmail을 모니터링한다. Claude가 이메일을 분류하고 중요도를 판단하여 해당 Slack 채널로 라우팅한다. KakaoTalk은 자동화 불가(macOS Hardened Runtime으로 인한 기술적 제약) — 클라이언트와 합의하여 이메일 우선 정책을 유지한다.</p>
New: <h3>Gmail 모니터링 (코디네이터 전용)</h3>
     <p>코디네이터 노드(기본: Antoni)만 Gmail을 스캔한다 (<code>requires: is_coordinator</code>). 모든 노드는 동일한 공유 계정(macmini@flowos.work)을 사용하지만, 중복 스캔 방지를 위해 코디네이터만 실행한다. kj@, jp@, anton@flowos.work의 이메일은 macmini@flowos.work로 포워딩되며, Message-ID 헤더로 중복을 제거한다. KakaoTalk은 자동화 불가(macOS Hardened Runtime) — 이메일 우선 정책 유지.</p>
```

- [ ] **Step 3: Update Gmail scan diagram**

Replace the Gmail scan diagram with the v4.0 version that includes email dedup and recipient routing:

```
Gmail 스캔 (코디네이터, */10 크론)
─────────────────────────────────
gog gmail list --unread --since=10min
   │
   ├── 1. 중복 제거: Message-ID 추출
   │     SELECT FROM stream_memory WHERE raw_ref = {message_id}
   │     EXISTS → skip (이미 처리됨)
   │     NOT EXISTS → continue
   │
   ├── 2. 수신자 라우팅: 포워딩 헤더 분석
   │     To: kj@flowos.work    → tag: kj, Kyungjini에 agent_event
   │     To: jp@flowos.work    → tag: jp, Jaepini에 agent_event
   │     To: anton@flowos.work → tag: anton, Antoni에서 처리
   │     To: macmini@flowos.work → tag: system, 코디네이터 처리
   │
   ├── 3. LLM 분류: 유형, 긴급도, 프로젝트 매칭
   │
   ├── 4. Supabase stream_memory INSERT (message_id as raw_ref)
   │
   └── 5. 라우팅:
       ├── 신규 클라이언트 → #agency-inbox + Anton DM
       ├── 기술 질문 → #proj-{slug} + KJ DM
       ├── 빌링/계약 → #agency-costs + Anton DM
       ├── 긴급 → 태그된 담당자 즉시 DM
       └── 뉴스레터/스팸 → 무시
```

- [ ] **Step 4: Commit**

```bash
git add flowos-agency-architecture.html
git commit -m "docs: section 05 — shared accounts, coordinator-only scanning, email dedup"
```

### Task 7: Rewrite Section 05b — Shared Google Account Architecture

**Files:**
- Modify: `flowos-agency-architecture.html:611-946`

- [ ] **Step 1: Update callout**

```html
Old: <p><strong>핵심 누락:</strong> 기존 아키텍처는 Gmail 스캔(Anton 노드)만 언급했다. Calendar API, Google Drive, Slack 읽기/쓰기, 그리고 이 모든 채널의 <strong>누적 메모리</strong>가 빠져 있었다. 에이전트가 "지금 무슨 일이 일어나고 있는지"를 항상 알고 있어야 한다.</p>
New: <p><strong>v4.0 변경:</strong> 모든 노드가 동일한 Google 계정(macmini@flowos.work)을 공유한다. Gmail/Calendar/Drive 스캔은 <strong>코디네이터만</strong> 수행하여 중복 처리를 방지한다. Slack은 모든 노드가 읽되, 클라이언트 대면 메시지는 코디네이터만 작성한다.</p>
```

- [ ] **Step 2: Update gog auth section**

```html
Old: <p><code>gog auth manage</code>로 OAuth 토큰을 발급하면 Gmail API, Calendar API, Google Drive API가 동시에 활성화된다. 각 노드별 독립 인증.</p>
New: <p><code>gog auth manage</code>로 macmini@flowos.work 계정의 OAuth 토큰을 발급한다. 모든 3개 노드가 동일 계정으로 독립 인증한다. Gmail/Calendar/Drive API 전체 활성화.</p>
```

- [ ] **Step 3: Update node auth scope table**

Replace the per-node auth table (lines 649-677) to reflect shared account:

All nodes have the same auth (same Google account), but scanning behavior differs:

```html
<table>
  <thead><tr><th>노드</th><th>Gmail 스캔</th><th>Calendar 스캔</th><th>Drive 스캔</th><th>Slack</th><th>역할</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>Antoni (코디네이터)</strong></td>
      <td>✅ 코디네이터 전용</td>
      <td>✅ 코디네이터 전용</td>
      <td>✅ 코디네이터 전용</td>
      <td>✅ 읽기+쓰기 (클라이언트 대면 포함)</td>
      <td>모든 스트림 스캔 + 라우팅 + 디스패칭</td>
    </tr>
    <tr>
      <td><strong>Kyungjini (Dev Lead)</strong></td>
      <td>— (코디네이터가 라우팅)</td>
      <td>— (코디네이터가 브로드캐스트)</td>
      <td>— (코디네이터가 알림)</td>
      <td>✅ 읽기+쓰기 (내부 채널)</td>
      <td>agent_events로 수신, 자체 Slack 스캔</td>
    </tr>
    <tr>
      <td><strong>Jaepini (Quality)</strong></td>
      <td>— (코디네이터가 라우팅)</td>
      <td>— (코디네이터가 브로드캐스트)</td>
      <td>— (코디네이터가 알림)</td>
      <td>✅ 읽기+쓰기 (내부 채널)</td>
      <td>agent_events로 수신, 자체 Slack 스캔</td>
    </tr>
  </tbody>
</table>
```

- [ ] **Step 4: Add duplicate prevention rules section**

After the auth table, add:

```html
<h3>중복 방지 규칙 (공유 Slack 봇)</h3>
<div class="diagram">
Gmail 스캔:     코디네이터만 스캔하고 처리
Calendar 스캔:  코디네이터만 스캔, 다른 노드에 이벤트 브로드캐스트
Slack 읽기:     모든 노드가 읽음 (자체 트리거용)
Slack 쓰기:     모든 노드가 쓰기 가능 (자체 채널/토픽)
                단, 클라이언트 대면 메시지 → 코디네이터만 초안 작성

node_roles 테이블로 강제:
  is_coordinator=true  → can_scan_gmail=true, can_send_client_comms=true
  is_coordinator=false → can_scan_gmail=false, can_send_client_comms=false</div>
```

- [ ] **Step 5: Update stream memory paths from `~/clawd/` to `~/flowos/`**

All occurrences of `~/clawd/memory/streams/` should become `~/flowos/streams/`:

```
Old: ~/clawd/memory/streams/gmail.md
New: ~/flowos/streams/gmail.md

Old: ~/clawd/memory/streams/calendar.md
New: ~/flowos/streams/calendar.md

Old: ~/clawd/memory/streams/slack.md
New: ~/flowos/streams/slack.md

Old: ~/clawd/memory/streams/drive.md
New: ~/flowos/streams/drive.md
```

- [ ] **Step 6: Update stream_memory schema node_id values**

```html
Old: node_id     text NOT NULL,          -- 'node01' | 'node02' | 'node03'
New: node_id     text NOT NULL,          -- 'antoni' | 'kyungjini' | 'jaepini'
```

- [ ] **Step 7: Update Phase 0 tasks table**

Replace `mkdir -p ~/clawd/memory/streams` with `mkdir -p ~/flowos/streams`:

```html
Old: <td><code>mkdir -p ~/clawd/memory/streams</code></td>
New: <td><code>mkdir -p ~/flowos/streams</code></td>
```

- [ ] **Step 8: Commit**

```bash
git add flowos-agency-architecture.html
git commit -m "docs: section 05b — shared Google account, coordinator-only scanning, dedup rules"
```

### Task 8: Update Section 06 — Sub-agent Architecture with Coordinator Flags

**Files:**
- Modify: `flowos-agency-architecture.html:951-1155`

- [ ] **Step 1: Update section description**

```html
Old: <p class="desc">각 Mac Mini의 OpenClaw 메인 에이전트는 오케스트레이터 역할을 한다. 실제 작업은 목적별로 스폰된 서브에이전트가 처리하며, 병렬 실행된다.</p>
New: <p class="desc">모든 스킬은 모든 노드에 설치된다. <code>requires: is_coordinator</code> 플래그가 런타임에 실행 여부를 결정한다. 페일오버 시 설정 변경 없이 즉시 코디네이터 역할을 인수한다.</p>
```

- [ ] **Step 2: Update Node 01 heading and description**

```html
Old: <h3>Node 01 — Anton: Client Ops Orchestrator</h3>
     <p>Anton 노드의 메인 에이전트는 외부 커뮤니케이션 루프를 관리한다. 모든 서브에이전트는 크론 또는 웹훅으로 트리거된다.</p>
New: <h3>Antoni — Coordinator + Client Ops</h3>
     <p>Antoni의 메인 에이전트는 코디네이터 역할과 외부 커뮤니케이션 루프를 관리한다. 코디네이터 전용 스킬(★)은 <code>requires: is_coordinator</code> 플래그로 런타임 강제된다.</p>
```

- [ ] **Step 3: Add coordinator flags to Antoni's sub-agent table**

For each coordinator-only sub-agent, add `★` marker and update the trigger column to show `requires: is_coordinator`:

- `email-scanner` → `gmail-stream-scanner ★`
- `billing-collector ★`
- `deploy-notifier ★`
- `daily-reporter ★`
- `proactive-advisor ★`
- `calendar-stream-scanner ★`
- `drive-stream-scanner ★`
- `intake-logger ★`
- Add new: `session-budget-manager ★` (*/15 cron)
- Add new: `health-checker` (*/5 cron — runs on ALL nodes)

Also update the `daily-reporter` cron:
```html
Old: <td class="mono">0 19 * * * (UTC)<br>= 04:00 KST</td>
New: <td class="mono">0 4 * * * (KST)<br>requires: is_coordinator</td>
```

- [ ] **Step 4: Update Node 02 heading**

```html
Old: <h3>Node 02 — KJ: Build Orchestrator</h3>
New: <h3>Kyungjini — Dev Lead Builder</h3>
```

Update the description to reflect session quota (3 sessions max):

```html
Old: <p>KJ 노드는 가장 많은 병렬 서브에이전트를 운영한다. 코딩 에이전트 최대 5개를 동시에 실행하여 서로 다른 프로젝트를 병렬로 처리한다. ACP 하네스(Claude Code CLI)를 사용하므로 실제 코드 작성, 빌드, 테스트까지 자율 처리한다.</p>
New: <p>Kyungjini는 가장 많은 Claude Code 세션을 운영한다 (기본 할당: 3세션). 코딩 에이전트를 병렬 실행하여 서로 다른 프로젝트를 동시 처리한다. project_locks로 동시 작업 충돌을 방지한다.</p>
```

- [ ] **Step 5: Remove kj-stream-scanner from Node 02 table**

Since Gmail/Calendar scanning is coordinator-only, remove the `kj-stream-scanner` row. Kyungjini gets health-checker and deploy-monitor instead.

- [ ] **Step 6: Update Node 03 heading**

```html
Old: <h3>Node 03 — JP: Quality Orchestrator</h3>
New: <h3>Jaepini — Quality Assurance</h3>
```

Update description for session quota (2 sessions max).

- [ ] **Step 7: Remove jp-stream-scanner from Node 03 table**

Same reasoning — no per-node stream scanning. Jaepini gets health-checker, deploy-monitor, mvp-watcher.

- [ ] **Step 8: Update inter-node communication bus section**

Replace `node01/node02/node03` references with `Antoni/Kyungjini/Jaepini`. Update the diagram to show Supabase Realtime as primary bus (not just Slack):

```html
Old: <p>세 노드는 서로 직접 API를 호출하지 않는다. <strong>Slack이 비동기 메시지 버스</strong> 역할을 한다.</p>
New: <p>에이전트 간 실시간 조율은 <strong>Supabase Realtime (agent_events)</strong>이 담당한다. Slack은 사람이 읽는 알림용이다. 통신 우선순위: ① Supabase Realtime → ② Supabase Tables → ③ Slack → ④ Tailscale SSH (비상)</p>
```

- [ ] **Step 9: Commit**

```bash
git add flowos-agency-architecture.html
git commit -m "docs: section 06 — coordinator flags, node renaming, session quotas"
```

---

## Chunk 4: Claude Code + Sync + Schema (Sections 07, 07b, Supabase)

### Task 9: Update Section 07 — Session Quota Management

**Files:**
- Modify: `flowos-agency-architecture.html:1160-1385`

- [ ] **Step 1: Add session quota management subsection**

After the "Claude Code 스폰 방식" table (after line 1292), add new content for session management:

```html
<h3>Claude Max 세션 관리 — 공유 구독</h3>
<p>하나의 Claude Max 구독을 3대 Mac Mini가 공유한다. 동시 세션이 제약이며, <code>active_sessions</code> + <code>node_roles.claude_session_quota</code>로 관리한다.</p>

<table>
  <thead><tr><th>노드</th><th>기본 할당</th><th>용도</th></tr></thead>
  <tbody>
    <tr><td><strong>Antoni</strong></td><td>1세션</td><td>이메일 초안, 리포트 등 경량 작업</td></tr>
    <tr><td><strong>Kyungjini</strong></td><td>3세션</td><td>MVP 코딩, 병렬 빌드</td></tr>
    <tr><td><strong>Jaepini</strong></td><td>2세션</td><td>리팩토링, QA</td></tr>
    <tr><td><strong>합계</strong></td><td><strong>6세션</strong></td><td>Supabase node_roles에서 동적 조정 가능</td></tr>
  </tbody>
</table>

<div class="diagram">
세션 스폰 라이프사이클:
─────────────────────
1. project_locks 확인 — 프로젝트 사용 가능?
   NO → skip, Slack 알림

2. 자기 active_sessions vs quota 확인
   AT QUOTA → 코디네이터에 agent_event 요청
            → 유휴 노드에서 1 quota 임시 이전
            → 없으면 큐잉

3. INSERT project_locks (expires_at = now()+2h)
4. INSERT active_sessions (node_id, project_id, session_type, pid)
5. Claude Code 세션 스폰
6. 완료/크래시 시:
   → DELETE active_sessions
   → DELETE project_locks
   → INSERT agent_event (결과 요약)

세션 예산 리밸런싱 (코디네이터, */15):
─────────────────────────────────────
  actual = 0 for > 30min AND 다른 노드 at quota
  → 1 quota 임시 이전
  stale session (last_activity > 2h)
  → 강제 종료 + 정리</div>
```

- [ ] **Step 2: Update model registry section — remove hardcoded "29"**

```html
Old: <p>모든 프로젝트는 모델명을 직접 하드코딩하지 않는다. Supabase의 <code>model_registry</code> 테이블을 참조한다. 새 모델 출시 시 레지스트리 한 줄만 수정하면 29개 프로젝트가 즉시 반영된다.</p>
New: <p>모든 프로젝트는 모델명을 직접 하드코딩하지 않는다. Supabase의 <code>model_registry</code> 테이블을 참조한다. 새 모델 출시 시 레지스트리 한 줄만 수정하면 전체 프로젝트가 즉시 반영된다.</p>
```

Also in the diagram:
```html
Old: → 전체 29개 프로젝트 즉시 적용. 코드 수정 없음.
New: → 전체 프로젝트 즉시 적용. 코드 수정 없음.
```

- [ ] **Step 3: Commit**

```bash
git add flowos-agency-architecture.html
git commit -m "docs: section 07 — add Claude Max session quota management"
```

### Task 10: Update Section 07b — Revised agent_events + failover_events

**Files:**
- Modify: `flowos-agency-architecture.html:1390-1524`

- [ ] **Step 1: Update the agent_events schema**

Replace the old agent_events DDL (lines 1405-1413) with the v4.0 version from spec §5:

```sql
CREATE TABLE agent_events (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source_node      text NOT NULL REFERENCES node_roles(node_id),
  target_node      text,                        -- NULL = 전체 브로드캐스트
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

- [ ] **Step 2: Update event type references from node01/02/03 to Antoni/Kyungjini/Jaepini**

In the event matrix table, replace:
- `Node 01` → `Antoni`
- `Node 02` → `Kyungjini`
- `Node 03` → `Jaepini`
- `Node 01 반응 (Anton)` → `Antoni 반응`
- `Node 02 반응 (KJ)` → `Kyungjini 반응`
- `Node 03 반응 (JP)` → `Jaepini 반응`

- [ ] **Step 3: Update CLAUDE.md sync section — add agent_context column**

The `agent_context` concept from spec §15 is already described in v3.0 (lines 1483-1505). Update node references:

```html
Old: KJ 에이전트가 MVP 완료 시:
New: Kyungjini 에이전트가 MVP 완료 시:

Old: JP 에이전트가 Claude Code 스폰 전:
New: Jaepini 에이전트가 Claude Code 스폰 전:
```

- [ ] **Step 4: Update the full flow diagram node names**

Replace in the bidirectional flow diagram (lines 1508-1523):
- `Node 01` / `Anton` → `Antoni`
- `Node 02` / `KJ` → `Kyungjini`
- `Node 03` / `JP` → `Jaepini`

- [ ] **Step 5: Commit**

```bash
git add flowos-agency-architecture.html
git commit -m "docs: section 07b — revised agent_events schema, node name updates"
```

### Task 11: Update Section 08 — Minor Tech Stack Update

**Files:**
- Modify: `flowos-agency-architecture.html:1529-1594`

- [ ] **Step 1: Fix duplicate page-num and remove hardcoded "29"**

```html
Old: <span class="page-num">08</span>
     <span class="page-num">07</span>
New: <span class="page-num">08</span>
```

```html
Old: <p class="desc">모든 29개 프로젝트가 동일한 기반을 상속한다. 컨텍스트 스위칭 비용이 0에 가깝다.</p>
New: <p class="desc">모든 프로젝트가 동일한 기반을 상속한다. 컨텍스트 스위칭 비용이 0에 가깝다.</p>
```

- [ ] **Step 2: Commit**

```bash
git add flowos-agency-architecture.html
git commit -m "docs: section 08 — fix duplicate page-num, remove hardcoded count"
```

---

## Chunk 5: New Sections — Safety, Operations, Playbook

### Task 12: Replace Section 09 — Installation Playbook

**Files:**
- Modify: `flowos-agency-architecture.html:1601-1657`

- [ ] **Step 1: Replace section 09 header and content**

Replace the entire "구현 로드맵" section with the Installation Playbook from spec §8. This is a complete replacement of lines 1601-1657.

New section header:
```html
<h2>설치 플레이북</h2>
<p class="desc">Mac Mini 도착 전, 도착 후, 완전 가동까지 — 정확한 명령어와 검증 단계.</p>
```

Include all 5 phases from the spec:

**Phase 0 — Before Mac Minis arrive:**
- Supabase tables deployment
- Seed data
- Email forwarding setup
- Slack bot creation
- 1Password service account
- OpenClaw skill files in flowos-system repo
- Architecture doc v4.0

**Phase 1 — Each Mac Mini setup (~1 hour):**
```bash
# 1. macOS basics
xcode-select --install
brew install git gh tailscale

# 2. Tailscale
sudo tailscale up --hostname=antoni  # or kyungjini / jaepini

# 3. Dev tools
brew install oven-sh/bun/bun node go 1password-cli

# 4. gog CLI
go install github.com/paksungho/gog@latest

# 5. OpenClaw
curl -fsSL https://openclaw.ai/install.sh | bash

# 6-9. Claude Code login, gog auth, gh auth, 1Password
```

**Phase 2 — FlowOS directory setup:**
```bash
mkdir -p ~/flowos/{config,streams,reports,logs,cache}
mkdir -p ~/projects
git clone git@github.com:flowos-official/flowos-system.git ~/flowos-system
ln -s ~/flowos-system/openclaw/skills ~/.openclaw/skills
```

**Phase 3 — Activate crons & verify**

**Phase 4 — Clone active projects**

Include the folder structure diagram from spec §7.

- [ ] **Step 2: Add node.env examples (inline from spec §7)**

Insert 3 spec-box cards with exact node.env content:

**Antoni (node.env):**
```
NODE_ID=antoni
NODE_ROLE=coordinator
HOSTNAME=antoni.tail
TAILSCALE_IP=100.64.0.1
CLAUDE_SESSION_QUOTA=1
CAN_SCAN_GMAIL=true
CAN_SEND_CLIENT_COMMS=true
FAILOVER_PRIORITY=1
```

**Kyungjini (node.env):**
```
NODE_ID=kyungjini
NODE_ROLE=dev-lead
HOSTNAME=kyungjini.tail
TAILSCALE_IP=100.64.0.2
CLAUDE_SESSION_QUOTA=3
CAN_SCAN_GMAIL=false
CAN_SEND_CLIENT_COMMS=false
FAILOVER_PRIORITY=2
```

**Jaepini (node.env):**
```
NODE_ID=jaepini
NODE_ROLE=quality
HOSTNAME=jaepini.tail
TAILSCALE_IP=100.64.0.3
CLAUDE_SESSION_QUOTA=2
CAN_SCAN_GMAIL=false
CAN_SEND_CLIENT_COMMS=false
FAILOVER_PRIORITY=3
```

- [ ] **Step 3: Add per-node cron schedules (inline from spec §7)**

Insert cron schedule YAML for each node in diagram boxes:

**Antoni (coordinator) — 10 crons:**
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
    schedule: "0 4 * * *"
    requires: is_coordinator
  - skill: proactive-advisor
    schedule: "0 9,14,18 * * 1-5"
    requires: is_coordinator
  - skill: session-budget-manager
    schedule: "*/15 * * * *"
    requires: is_coordinator
```

**Kyungjini (dev-lead) — 4 crons:**
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

**Jaepini (quality) — 5 crons:**
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

- [ ] **Step 4: Add spec §16 content — Playbook Additions**

Add the following subsections to the playbook:

**Slack channels to create (Phase 0):**
```html
<h4>Phase 0 — Slack 채널 생성</h4>
<div class="diagram">
#agency-alerts          — 노드 헬스, 페일오버, 킬 스위치 이벤트
#agency-inbox           — 신규 클라이언트 이메일 라우팅
#agency-costs           — 일일/주간 비용 리포트
#agency-daily           — 일일 요약 브리핑
#agency-events-fallback — Supabase 다운 시 agent_events 대체
#proj-{slug}            — 프로젝트별 (intake-logger가 자동 생성)</div>
```

**env.template.op content:**
```html
<h4>1Password 시크릿 템플릿 (env.template.op)</h4>
<div class="diagram">
# ~/flowos/config/env.template.op
SUPABASE_URL=op://flowos/shared/supabase-url
SUPABASE_SERVICE_ROLE_KEY=op://flowos/shared/supabase-service-key
SLACK_BOT_TOKEN=op://flowos/shared/slack-bot-token
ANTHROPIC_API_KEY=op://flowos/shared/anthropic-key
GITHUB_TOKEN=op://flowos/shared/github-token
BRAVE_SEARCH_API_KEY=op://flowos/shared/brave-search-key
RESEND_API_KEY=op://flowos/shared/resend-api-key
# 프로젝트별 시크릿: op://flowos/{project-slug}/ vaults</div>
```

**Disaster recovery table:**
```html
<h4>재해 복구</h4>
<table>
  <thead><tr><th>자산</th><th>백업 전략</th><th>복구</th></tr></thead>
  <tbody>
    <tr><td>프로젝트 코드</td><td>GitHub (권위적 소스)</td><td>gh repo clone</td></tr>
    <tr><td>OpenClaw 메모리</td><td>일일 백업 → Drive/S3</td><td>백업에서 복원</td></tr>
    <tr><td>스트림 캐시</td><td>Supabase stream_memory에서 재생성</td><td>스트림 스캐너 재실행</td></tr>
    <tr><td>node.env</td><td>flowos-system git repo</td><td>repo 재클론</td></tr>
    <tr><td>로컬 SQLite 캐시</td><td>일시적 — Supabase에서 재구축</td><td>부팅 시 자동 재구축</td></tr>
    <tr><td>Claude 인증</td><td>claude login으로 재인증</td><td>5분</td></tr>
  </tbody>
</table>
```

**SSD 완전 고장 시 복구:**
```
1. 하드웨어 교체
2. Phase 1 + Phase 2 플레이북 실행
3. OpenClaw 메모리 일일 백업에서 복원
4. 노드가 2시간 내 메시에 재합류
```

- [ ] **Step 5: Commit**

```bash
git add flowos-agency-architecture.html
git commit -m "docs: section 09 — replace roadmap with detailed installation playbook"
```

### Task 13: Update Section 10 — Risk Solutions Designed

**Files:**
- Modify: `flowos-agency-architecture.html:1662-1883`

- [ ] **Step 1: Update section description**

```html
Old: <p class="desc">현재 아키텍처에서 식별된 위험 요소와 누락된 기능. 심각도 순으로 정리한다.</p>
New: <p class="desc">v3.0에서 식별된 위험 요소와 누락 기능. v4.0에서 해결책이 설계되었다. 아래는 설계 완료된 대응 방안이다.</p>
```

- [ ] **Step 2: Update node_heartbeats DDL — use new node IDs**

```html
Old: node_id     text NOT NULL,          -- 'node01' | 'node02' | 'node03'
New: node_id     text NOT NULL REFERENCES node_roles(node_id),  -- 'antoni' | 'kyungjini' | 'jaepini'
```

- [ ] **Step 3: Update risk #2 — node down detection (now solved)**

Mark as solved — reference the heartbeat system and failover chain designed in spec §4:

```html
Old: <h4>2. 노드 다운 감지 및 알림 없음</h4>
New: <h4>2. 노드 다운 감지 — ✅ 해결됨 (하트비트 + 페일오버)</h4>
```

- [ ] **Step 4: Update risk #3 — Claude Code conflict (now solved)**

```html
Old: <h4>3. Claude Code 동시 실행 충돌</h4>
New: <h4>3. Claude Code 동시 실행 — ✅ 해결됨 (project_locks + active_sessions)</h4>
```

- [ ] **Step 5: Update risk #4 — kill switch (now solved)**

```html
Old: <h4>4. 에이전트 폭주 / 킬 스위치 없음</h4>
New: <h4>4. 에이전트 폭주 — ✅ 해결됨 (킬 스위치 + 서킷 브레이커)</h4>
```

- [ ] **Step 6: Update health monitoring (risk #10) — now solved**

```html
Old: <h4>10. 에이전트 헬스 모니터링</h4>
New: <h4>10. 에이전트 헬스 모니터링 — ✅ 해결됨 (node_heartbeats + 크론 모니터링)</h4>
```

- [ ] **Step 7: Update remaining node references throughout Section 10**

Replace `Node 01 (Anton)` → `Antoni`, `Node 02 (KJ)` → `Kyungjini`, `Node 03 (JP)` → `Jaepini` throughout the section.

- [ ] **Step 8: Commit**

```bash
git add flowos-agency-architecture.html
git commit -m "docs: section 10 — mark risks as resolved, update node names"
```

### Task 14: Add Section 10b — Kill Switch & Circuit Breakers

**Files:**
- Modify: `flowos-agency-architecture.html` — insert after Section 10 closing `</div>`, before Section 11

- [ ] **Step 1: Insert complete Section 10b HTML**

```html
<!-- ═══════════════════════════════════════════════
     10b — 킬 스위치 & 서킷 브레이커
════════════════════════════════════════════════ -->
<div class="section section-break">
  <div class="section-header">
    <span class="section-label">10b — 킬 스위치 & 서킷 브레이커</span>
    <span class="page-num">10b</span>
  </div>

  <h2>안전 메커니즘</h2>
  <p class="desc">자율 에이전트의 폭주를 방지하는 긴급 정지 및 자동 제한 시스템.</p>

  <h3>Slack 킬 스위치</h3>
  <div class="diagram">
/kill [node] [agent]    — 특정 노드의 특정 에이전트 종료
/kill [node]            — 특정 노드의 모든 에이전트 종료
/kill-all               — 비상: 전체 노드 전체 에이전트 종료

구현: Slack slash command → Supabase agent_events
      event_type: 'kill_command' + priority: 'critical'
      각 노드 health-checker가 kill 이벤트 감시 → 프로세스 종료</div>

  <h3>자동 서킷 브레이커</h3>
  <table>
    <thead><tr><th>트리거</th><th>임계값</th><th>동작</th></tr></thead>
    <tbody>
      <tr><td>동일 작업 연속 실패</td><td>3회</td><td>에이전트 자동 중단 + Slack #agency-alerts</td></tr>
      <tr><td>이메일 발송 속도</td><td>>10/시간 또는 >50/일</td><td>발송 차단 + Anton 알림</td></tr>
      <tr><td>프로젝트당 배포 속도</td><td>>5/시간</td><td>배포 차단 + KJ 알림</td></tr>
      <tr><td>에이전트별 API 비용</td><td>>$5/시간</td><td>에이전트 일시정지 + 코디네이터 알림</td></tr>
      <tr><td>Claude Code 세션 런타임</td><td>>2시간</td><td>1.5h 경고, 2h 강제 종료</td></tr>
      <tr><td>전체 활성 세션</td><td>>6 (전 노드 합산)</td><td>신규 요청 큐잉, 추가 스폰 차단</td></tr>
    </tbody>
  </table>

  <h3>Rate Limit 강제</h3>
  <div class="diagram">
이메일 발송 전:
  count = SELECT COUNT(*) FROM audit_log
          WHERE action='email_send' AND node_id={self}
          AND created_at > now() - interval '1 hour'
  IF count >= 10 → BLOCK, 코디네이터 알림

배포 전:
  count = SELECT COUNT(*) FROM deployments
          WHERE project_id={project}
          AND deployed_at > now() - interval '1 hour'
  IF count >= 5 → BLOCK, KJ 알림</div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add flowos-agency-architecture.html
git commit -m "docs: add section 10b — kill switch and circuit breakers"
```

### Task 15: Add Section 10c — Supabase Degradation Strategy

**Files:**
- Modify: `flowos-agency-architecture.html` — insert after Section 10b

- [ ] **Step 1: Insert complete Section 10c HTML**

```html
<!-- ═══════════════════════════════════════════════
     10c — Supabase 장애 대응
════════════════════════════════════════════════ -->
<div class="section section-break">
  <div class="section-header">
    <span class="section-label">10c — Supabase 장애 대응</span>
    <span class="page-num">10c</span>
  </div>

  <h2>Supabase 장애 대응 전략</h2>
  <p class="desc">Supabase가 단일 조율 포인트. 장애 시 로컬 SQLite 캐시 + Slack 폴백으로 운영 지속.</p>

  <h3>로컬 SQLite 캐시 (각 노드)</h3>
  <p>각 노드는 <code>~/flowos/cache/local.db</code>에 로컬 SQLite를 유지한다.</p>
  <div class="diagram">
-- 주요 Supabase 테이블 미러 (5분마다 갱신)
CREATE TABLE cached_node_roles (node_roles와 동일 스키마);
CREATE TABLE cached_projects (projects와 동일 스키마);
CREATE TABLE cached_model_registry (model_registry와 동일 스키마);

-- 대기 이벤트 큐 (Supabase 도달 불가 시 기록)
CREATE TABLE pending_events (
  id          text PRIMARY KEY,
  table_name  text NOT NULL,     -- 'agent_events' | 'node_heartbeats' | etc.
  payload     text NOT NULL,     -- JSON
  created_at  text DEFAULT (datetime('now'))
);</div>

  <h3>장애 대응 시퀀스</h3>
  <div class="diagram">
Supabase health check 실패 (3회 연속, 30초 간격)
  │
  ├─ 1. 모든 읽기 → 로컬 SQLite 캐시로 전환
  │     (node_roles, projects, model_registry)
  │
  ├─ 2. 모든 쓰기 → pending_events 테이블에 큐잉
  │     (heartbeats, agent_events, stream_memory inserts)
  │
  ├─ 3. 노드 간 통신 → Slack으로 전환
  │     #agency-alerts: "⚠️ Supabase down. Operating on local cache."
  │     agent_events → #agency-events-fallback 채널로 게시
  │
  ├─ 4. Tailscale SSH (최후 수단)
  │     Slack도 실패 → 노드 간 직접 SSH
  │     ssh kyungjini.tail "echo HEARTBEAT $(date)"
  │
  ├─ 5. 백그라운드 Supabase 폴링 (60초 간격)
  │
  └─ 6. 복구 시:
       → pending_events → Supabase 플러시 (created_at 순서)
       → 충돌 해결: last-write-wins
       → Slack: "✅ Supabase recovered. Synced {n} pending events."
       → 정상 운영 재개</div>

  <h3>캐시 갱신 스케줄</h3>
  <div class="diagram">
*/5 * * * * — cached_node_roles, cached_projects, cached_model_registry 갱신
             Supabase 도달 불가 → 건너뜀, 기존 캐시 사용
             캐시 나이 > 1시간 → 경고 로그</div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add flowos-agency-architecture.html
git commit -m "docs: add section 10c — Supabase degradation strategy"
```

### Task 16: Add Section 10d — Action Confirmation Levels

**Files:**
- Modify: `flowos-agency-architecture.html` — insert after Section 10c

- [ ] **Step 1: Insert complete Section 10d HTML**

```html
<!-- ═══════════════════════════════════════════════
     10d — 확인 레벨 시스템
════════════════════════════════════════════════ -->
<div class="section section-break">
  <div class="section-header">
    <span class="section-label">10d — 확인 레벨 시스템</span>
    <span class="page-num">10d</span>
  </div>

  <h2>액션 확인 레벨</h2>
  <p class="desc">Level 0 (자율) · Level 1 (사후 알림) · Level 2 (사전 확인) — 외부 영향 작업일수록 높은 확인 레벨.</p>

  <table>
    <thead><tr><th>레벨</th><th>대상 작업</th><th>동작</th></tr></thead>
    <tbody>
      <tr>
        <td><span class="tier-badge tier-1">Level 0 — 자율</span></td>
        <td>메모리 업데이트, 내부 분석, 스트림 스캔, 리포트 생성, 하트비트, CLAUDE.md 업데이트</td>
        <td>즉시 실행. audit_log에만 기록.</td>
      </tr>
      <tr>
        <td><span class="tier-badge tier-2">Level 1 — 사후 알림</span></td>
        <td>Slack 채널 게시 (내부), 브리핑, 비용 리포트, 프로젝트 상태 업데이트</td>
        <td>실행 후 Slack DM: "Done: [요약]" 사후 보고.</td>
      </tr>
      <tr>
        <td><span class="tier-badge tier-3">Level 2 — 사전 확인</span></td>
        <td>이메일 발송, 클라이언트 알림, 코드 배포, 빌링 작업, 데이터 삭제, 1Password 변경</td>
        <td>초안/계획 → Slack DM → "승인" 또는 "수정" 응답 대기 → 실행</td>
      </tr>
    </tbody>
  </table>

  <h3>스킬 헤더 선언</h3>
  <div class="diagram">
# 각 스킬 파일 헤더에 선언
confirmation_level: 2  # 0, 1, or 2
approver: anton        # Level 2에서 승인할 사람

OpenClaw 런타임이 외부 작업 실행 전 확인.
Level 2 작업이 승인 없이 실행되면 → 차단 + 로깅.</div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add flowos-agency-architecture.html
git commit -m "docs: add section 10d — action confirmation levels"
```

### Task 17: Add Section 10e — Cron & Skill Monitoring

**Files:**
- Modify: `flowos-agency-architecture.html` — insert after Section 10d

- [ ] **Step 1: Insert complete Section 10e HTML**

```html
<!-- ═══════════════════════════════════════════════
     10e — 크론 모니터링
════════════════════════════════════════════════ -->
<div class="section section-break">
  <div class="section-header">
    <span class="section-label">10e — 크론 모니터링</span>
    <span class="page-num">10e</span>
  </div>

  <h2>크론 실행 모니터링</h2>
  <p class="desc">사일런트 크론 실패 감지. gmail-stream-scanner가 멈추면 누구도 모르는 상황 방지.</p>

  <h3>크론 실행 로그 테이블</h3>
  <div class="diagram">
CREATE TABLE cron_executions (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  node_id       text NOT NULL REFERENCES node_roles(node_id),
  skill_name    text NOT NULL,
  started_at    timestamptz NOT NULL,
  completed_at  timestamptz,
  status        text DEFAULT 'running',  -- 'running' | 'success' | 'failure' | 'timeout'
  error_message text,
  duration_ms   int
);</div>

  <h3>Dead 크론 감지 (health-checker, */5)</h3>
  <div class="diagram">
FOR each scheduled cron on this node:
  last_run = SELECT MAX(started_at) FROM cron_executions
             WHERE node_id={self} AND skill_name={cron.skill}

  expected_interval = parse(cron.schedule)  -- e.g., 10min for */10

  IF last_run IS NULL OR last_run < now() - (expected_interval * 3):
    → Slack #agency-alerts: "⚠️ {skill_name} on {node_id} hasn't run in {duration}"
    → 재시작 시도
    → 재시작 2회 실패 → 담당자 DM 에스컬레이션</div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add flowos-agency-architecture.html
git commit -m "docs: add section 10e — cron execution monitoring"
```

### Task 18: Add Section 10f — Design Decisions & Limitations + Runtime Enforcement

**Files:**
- Modify: `flowos-agency-architecture.html` — insert after Section 10e

- [ ] **Step 1: Insert complete Section 10f HTML**

```html
<!-- ═══════════════════════════════════════════════
     10f — 설계 결정 및 제한사항
════════════════════════════════════════════════ -->
<div class="section section-break">
  <div class="section-header">
    <span class="section-label">10f — 설계 결정 및 제한사항</span>
    <span class="page-num">10f</span>
  </div>

  <h2>설계 결정 및 알려진 제한사항</h2>
  <p class="desc">의도적 선택과 기술적 제약. 왜 이렇게 결정했는지.</p>

  <h3>KakaoTalk — 자동화 불가</h3>
  <p>macOS Hardened Runtime이 KakaoTalk의 프로그래밍적 접근을 차단한다. 의도적 제한. 클라이언트 커뮤니케이션 정책: <strong>이메일 우선</strong>. KakaoTalk 메시지는 Anton(사람)이 수동 처리. 텍스트 복사 → Slack/Telegram 붙여넣기로 에이전트에 전달.</p>

  <h3>규제 산업 클라이언트 격리</h3>
  <table>
    <thead><tr><th>구분</th><th>일반 프로젝트</th><th>규제 프로젝트</th></tr></thead>
    <tbody>
      <tr><td>Supabase</td><td>공유 인스턴스 (schema 분리)</td><td>전용 인스턴스</td></tr>
      <tr><td>1Password</td><td>공유 볼트 (프로젝트별 항목)</td><td>전용 팀 볼트</td></tr>
      <tr><td>에이전트 컨텍스트</td><td>프로젝트 간 참조 가능</td><td>격리 — 타 프로젝트 참조 금지</td></tr>
      <tr><td>Git</td><td>공유 org</td><td>별도 org 또는 private fork</td></tr>
      <tr><td>배포</td><td>공유 Vercel Team</td><td>전용 Vercel 프로젝트</td></tr>
    </tbody>
  </table>
  <p><code>projects</code> 테이블의 <code>regulated_industry</code> 불리언 플래그로 제어. 스킬이 데이터 교차 참조 전 확인.</p>

  <h3>모델 레지스트리 Blue-Green 전환</h3>
  <div class="diagram">
1. model_registry에 next_model 값 추가
2. 신규 Claude Code 세션 → next_model 사용
3. 기존 세션 → current_model 유지
4. current_model 세션 0개 → current_model = next_model, next_model = NULL
5. next_model 에러율 > 10% → 자동 롤백 (next_model = NULL)</div>

  <h3>agent_context — CLAUDE.md 동기화</h3>
  <div class="diagram">
ALTER TABLE projects ADD COLUMN agent_context jsonb DEFAULT '{}';
-- 포함: 클라이언트 정보, 기술 결정, 현재 phase, 알려진 이슈
-- 노드가 Claude Code 스폰 시 → agent_context 읽어 로컬 CLAUDE.md 생성
-- Claude Code 완료 시 → 업데이트된 컨텍스트를 agent_context에 기록
-- git pull 없이 노드 간 CLAUDE.md 동기화 가능</div>

  <h3>프로젝트 아카이빙 플로우</h3>
  <div class="diagram">
1. projects.phase = 'archived' → 모든 크론/워처에서 자동 제외
2. LLM이 전체 히스토리 → 1페이지 CLAUDE.md 아카이브 요약
3. agent_events → cold storage, Supabase에서 삭제
4. Vercel 프로젝트 일시 중지 (유지보수 계약 없으면)
5. 1Password 볼트 키 90일 만료 설정
6. Antoni가 "프로젝트 완료 + 유지보수 안내" 이메일 발송</div>

  <h3>노드 ID 마이그레이션 (v3.0 → v4.0)</h3>
  <div class="diagram">
-- 기존 stream_memory의 node01/02/03 → antoni/kyungjini/jaepini 1회 마이그레이션
UPDATE stream_memory SET node_id = 'antoni' WHERE node_id = 'node01';
UPDATE stream_memory SET node_id = 'kyungjini' WHERE node_id = 'node02';
UPDATE stream_memory SET node_id = 'jaepini' WHERE node_id = 'node03';</div>

  <h3>타임존 규칙</h3>
  <p>모든 Mac Mini는 <strong>KST (Asia/Seoul, UTC+9)</strong>에서 운영. 모든 크론 스케줄은 KST 기준. Supabase timestamps는 <code>timestamptz</code> (UTC 저장, 로컬 표시).</p>

  <h3><code>requires: is_coordinator</code> 런타임 강제 (spec §17)</h3>
  <p>모든 스킬은 모든 노드에 설치된다. 코디네이터 체크는 런타임에 수행. 페일오버 시 설정 변경 없이 즉시 코디네이터 역할 인수.</p>
  <div class="diagram">
크론 스킬 실행 전 래퍼:
  1. ~/flowos/config/node.env 읽기 → NODE_ID 획득
  2. Supabase 조회: SELECT is_coordinator FROM node_roles WHERE node_id = {NODE_ID}
     (Supabase 도달 불가 → 로컬 SQLite 캐시 폴백)
  3. 스킬이 requires: is_coordinator AND 노드가 코디네이터 아님:
     → 실행 건너뜀 (cron_executions에 status='skipped' 기록)
  4. 코디네이터인 경우 → 정상 실행

→ 페일오버로 Kyungjini가 코디네이터 되면
  다음 크론 사이클에서 즉시 코디네이터 스킬 실행 시작
  설정 파일 변경 불필요</div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add flowos-agency-architecture.html
git commit -m "docs: add section 10f — design decisions, limitations, runtime enforcement"
```

---

## Chunk 6: Final Updates (Section 12, Footer, Supabase Schema)

### Task 19: Add Revised Supabase Schema Section

**Files:**
- Modify: `flowos-agency-architecture.html` — insert a comprehensive schema section

- [ ] **Step 1: Add complete v4.0 Supabase schema to Section 05**

After the existing Supabase schema in Section 05 (locate by content: the `comms_log` DDL comment block), add the full v4.0 coordination tables DDL from spec §5. **Note:** The `agent_events` DDL also appears in Section 07b inline — this is intentional (07b shows it in context, 05 has the complete schema reference):

```html
<h3>멀티 노드 조율 스키마 (v4.0 신규)</h3>
<div class="diagram">
-- 노드 역할 관리
CREATE TABLE node_roles (
  node_id              text PRIMARY KEY,
  display_name         text NOT NULL,
  primary_role         text NOT NULL,
  is_coordinator       boolean DEFAULT false,
  can_scan_gmail       boolean DEFAULT false,
  can_send_client_comms boolean DEFAULT false,
  claude_session_quota int DEFAULT 2,
  failover_priority    int NOT NULL,
  status               text DEFAULT 'online',
  updated_at           timestamptz DEFAULT now()
);

-- 하트비트 (각 노드 5분마다)
CREATE TABLE node_heartbeats (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  node_id          text NOT NULL REFERENCES node_roles(node_id),
  status           text DEFAULT 'alive',
  active_agents    int DEFAULT 0,
  active_claude_sessions int DEFAULT 0,
  cpu_usage        float,
  memory_usage     float,
  disk_free_gb     float,
  last_error       text,
  created_at       timestamptz DEFAULT now()
);

-- 페일오버 이벤트 로그
CREATE TABLE failover_events (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  from_node        text NOT NULL,
  to_node          text NOT NULL,
  reason           text NOT NULL,
  crons_transferred text[],
  resolved_at      timestamptz,
  created_at       timestamptz DEFAULT now()
);

-- 프로젝트 레벨 락
CREATE TABLE project_locks (
  project_id       uuid PRIMARY KEY REFERENCES projects(id),
  locked_by        text NOT NULL REFERENCES node_roles(node_id),
  lock_type        text DEFAULT 'exclusive',
  reason           text,
  expires_at       timestamptz NOT NULL,
  created_at       timestamptz DEFAULT now()
);

-- Claude Code 활성 세션
CREATE TABLE active_sessions (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  node_id          text NOT NULL REFERENCES node_roles(node_id),
  project_id       uuid REFERENCES projects(id),
  session_type     text NOT NULL,
  model            text DEFAULT 'opus',
  pid              int,
  started_at       timestamptz DEFAULT now(),
  estimated_minutes int DEFAULT 30,
  last_activity_at timestamptz DEFAULT now()
);

-- 크론 실행 로그
CREATE TABLE cron_executions (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  node_id       text NOT NULL REFERENCES node_roles(node_id),
  skill_name    text NOT NULL,
  started_at    timestamptz NOT NULL,
  completed_at  timestamptz,
  status        text DEFAULT 'running',
  error_message text,
  duration_ms   int
);

-- 초기 시드 데이터
INSERT INTO node_roles VALUES
  ('antoni',    'Antoni',    'coordinator', true,  true,  true,  1, 1, 'online', now()),
  ('kyungjini', 'Kyungjini', 'dev-lead',    false, false, false, 3, 2, 'online', now()),
  ('jaepini',   'Jaepini',   'quality',     false, false, false, 2, 3, 'online', now());</div>
```

- [ ] **Step 2: Commit**

```bash
git add flowos-agency-architecture.html
git commit -m "docs: add complete v4.0 Supabase coordination schema with seed data"
```

### Task 20: Update Section 12 — Expected Benefits

**Files:**
- Modify: `flowos-agency-architecture.html:2011-2040`

- [ ] **Step 1: Update stats to reflect v4.0 capabilities**

Add a new stat for fault tolerance:

```html
<div class="stats">
  <div class="stat"><div class="num">5×</div><div class="unit">개발자당 처리량</div></div>
  <div class="stat"><div class="num">&lt;5분</div><div class="unit">신규 프로젝트 셋업</div></div>
  <div class="stat"><div class="num">30분</div><div class="unit">자동 페일오버</div></div>
  <div class="stat"><div class="num">0</div><div class="unit">단일 장애점</div></div>
</div>
```

- [ ] **Step 2: Add v4.0 specific benefits paragraph**

After the existing benefits, add:

```html
<p><strong>자율 복구:</strong> Antoni가 다운되면 Kyungjini가 30분 내 코디네이터를 자동 인수한다. Gmail 스캔, 일일 리포트, 비용 집계가 중단 없이 계속된다. 인간 개입 없이 시스템이 스스로 복구한다.</p>

<p><strong>안전한 자율성:</strong> 킬 스위치, 서킷 브레이커, 확인 레벨 시스템으로 에이전트 폭주를 방지한다. 이메일 발송은 항상 사전 확인, 배포는 rate limit, 비용은 자동 캡 — 자율적이되 통제된 시스템.</p>
```

- [ ] **Step 3: Commit**

```bash
git add flowos-agency-architecture.html
git commit -m "docs: section 12 — add v4.0 fault tolerance and safety benefits"
```

### Task 21: Update Footer

**Files:**
- Modify: `flowos-agency-architecture.html:2036-2043`

- [ ] **Step 1: Update footer version**

```html
Old: <span>FlowOS Agency OS Architecture Report — v3.0 — 2026년 3월</span>
New: <span>FlowOS Agency OS Architecture Report — v4.0 — 2026년 3월</span>
```

- [ ] **Step 2: Commit**

```bash
git add flowos-agency-architecture.html
git commit -m "docs: update footer to v4.0"
```

### Task 22: Final Verification

- [ ] **Step 1: Search for remaining v3.0 references**

```bash
grep -n "v3.0\|node01\|node02\|node03\|Node 01\|Node 02\|Node 03\|29개\|29 개\|~/clawd/" flowos-agency-architecture.html
```

Fix any remaining old references found.

- [ ] **Step 2: Search for remaining hardcoded "29" counts**

```bash
grep -n "29" flowos-agency-architecture.html
```

Verify only legitimate uses remain (like CSS values, not project counts).

- [ ] **Step 3: Verify HTML renders correctly**

Open `flowos-agency-architecture.html` in a browser and verify:
- Cover shows v4.0
- All node names are Antoni/Kyungjini/Jaepini
- New sections (10b-10f) render correctly
- Installation playbook is complete
- Supabase schema shows all new tables
- Footer shows v4.0

- [ ] **Step 4: Final commit**

```bash
git add flowos-agency-architecture.html
git commit -m "docs: final v3→v4 cleanup — remove all legacy references"
```

---

## Summary of Changes (22 Tasks, 6 Chunks)

| Category | Changes | Tasks |
|----------|---------|-------|
| **Node Naming** | node01/02/03 → antoni/kyungjini/jaepini throughout | 3, 4, 8, 10, 13, 22 |
| **Shared Accounts** | macmini@flowos.work shared Gmail, 6 resources in shared table | 3 (Step 7), 6, 7 |
| **Coordinator** | Hybrid coordinator topology with failover chain | 4 |
| **Communication** | 4-layer priority stack + autonomous problem-solving matrix | 4 (Steps 4-5) |
| **Email Dedup** | Message-ID dedup, forwarding header routing, coordinator-only scan | 6, 7 |
| **Project Locks** | project_locks table prevents concurrent Claude Code on same project | 5 |
| **Session Mgmt** | Claude Max quota (1/3/2), active_sessions, rebalancing | 9 |
| **Supabase Schema** | 7 new tables: node_roles, node_heartbeats, failover_events, project_locks, active_sessions, cron_executions, revised agent_events | 10, 19 |
| **Coordinator Flags** | `requires: is_coordinator` on skills, runtime enforcement wrapper | 8, 18 |
| **Safety** | Kill switch (/kill-all), circuit breakers (6 triggers), rate limits | 14 |
| **Resilience** | Supabase degradation → SQLite cache + Slack fallback + Tailscale SSH | 15 |
| **Confirmation** | Level 0/1/2 action confirmation with skill header declaration | 16 |
| **Monitoring** | Heartbeat system, dead cron detection, cron_executions log | 17 |
| **Design Decisions** | KakaoTalk limitation, regulatory isolation, model blue-green, agent_context, archiving, node ID migration, timezone | 18 |
| **Playbook** | Phase 0-4 commands, node.env configs, cron YAML, Slack channels, env.template.op, disaster recovery | 12 |
| **Dynamic Counts** | Remove all hardcoded "29" project references | 1, 2, 5, 9, 11 |
| **New Sections** | 10b (kill switch), 10c (Supabase fallback), 10d (confirmation), 10e (cron monitoring), 10f (design decisions + runtime enforcement) | 14-18 |
