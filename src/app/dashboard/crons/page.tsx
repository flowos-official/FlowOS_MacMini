"use client";

import { useState, useMemo } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  SpinnerGap,
  ShieldCheck,
  Warning,
  Funnel,
} from "@phosphor-icons/react";
import { useCronExecutions } from "@/lib/hooks/use-crons";
import { useNodeRoles } from "@/lib/hooks/use-nodes";
import type { CronExecution } from "@/types/database";

// ---------------------------------------------------------------------------
// Static schedule definition
// ---------------------------------------------------------------------------

type ScheduleEntry = {
  skill: string;
  schedule: string;
  intervalMs: number; // expected max interval in ms for dead-cron detection
  coordinatorOnly?: boolean;
};

type NodeSchedule = {
  nodeId: string;
  displayName: string;
  skills: ScheduleEntry[];
};

const NODE_SCHEDULES: NodeSchedule[] = [
  {
    nodeId: "antoni",
    displayName: "Antoni",
    skills: [
      { skill: "health-checker", schedule: "*/5 min", intervalMs: 5 * 60 * 1000 },
      { skill: "gmail-stream-scanner", schedule: "*/10 min", intervalMs: 10 * 60 * 1000, coordinatorOnly: true },
      { skill: "slack-stream-scanner", schedule: "*/10 min", intervalMs: 10 * 60 * 1000 },
      { skill: "calendar-stream-scanner", schedule: "*/30 min", intervalMs: 30 * 60 * 1000, coordinatorOnly: true },
      { skill: "drive-stream-scanner", schedule: "hourly", intervalMs: 60 * 60 * 1000, coordinatorOnly: true },
      { skill: "billing-collector", schedule: "daily 06:00", intervalMs: 24 * 60 * 60 * 1000, coordinatorOnly: true },
      { skill: "morning-briefer", schedule: "weekdays 09:00", intervalMs: 24 * 60 * 60 * 1000 },
      { skill: "daily-reporter", schedule: "daily 04:00", intervalMs: 24 * 60 * 60 * 1000, coordinatorOnly: true },
      { skill: "proactive-advisor", schedule: "weekdays 09/14/18", intervalMs: 8 * 60 * 60 * 1000, coordinatorOnly: true },
      { skill: "session-budget-manager", schedule: "*/15 min", intervalMs: 15 * 60 * 1000, coordinatorOnly: true },
    ],
  },
  {
    nodeId: "kyungjini",
    displayName: "Kyungjini",
    skills: [
      { skill: "health-checker", schedule: "*/5 min", intervalMs: 5 * 60 * 1000 },
      { skill: "slack-stream-scanner", schedule: "*/10 min", intervalMs: 10 * 60 * 1000 },
      { skill: "morning-briefer", schedule: "weekdays 09:00", intervalMs: 24 * 60 * 60 * 1000 },
      { skill: "deploy-monitor", schedule: "*/5 min", intervalMs: 5 * 60 * 1000 },
    ],
  },
  {
    nodeId: "jaepini",
    displayName: "Jaepini",
    skills: [
      { skill: "health-checker", schedule: "*/5 min", intervalMs: 5 * 60 * 1000 },
      { skill: "slack-stream-scanner", schedule: "*/10 min", intervalMs: 10 * 60 * 1000 },
      { skill: "morning-briefer", schedule: "weekdays 09:00", intervalMs: 24 * 60 * 60 * 1000 },
      { skill: "mvp-watcher", schedule: "*/10 min", intervalMs: 10 * 60 * 1000 },
      { skill: "deploy-monitor", schedule: "*/5 min", intervalMs: 5 * 60 * 1000 },
    ],
  },
];

const ALL_NODE_IDS = NODE_SCHEDULES.map((n) => n.nodeId);

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "running":
      return (
        <span className="inline-flex items-center gap-1 text-[var(--color-info)] text-xs font-medium">
          <SpinnerGap size={13} weight="light" className="animate-spin" />
          running
        </span>
      );
    case "success":
      return (
        <span className="inline-flex items-center gap-1 text-[var(--color-success)] text-xs font-medium">
          <CheckCircle size={13} weight="light" />
          success
        </span>
      );
    case "failure":
      return (
        <span className="inline-flex items-center gap-1 text-[var(--color-destructive)] text-xs font-medium">
          <XCircle size={13} weight="light" />
          failure
        </span>
      );
    case "timeout":
      return (
        <span className="inline-flex items-center gap-1 text-[var(--color-warning)] text-xs font-medium">
          <Clock size={13} weight="light" />
          timeout
        </span>
      );
    default:
      return (
        <span className="text-xs text-[var(--color-muted-foreground)]">{status}</span>
      );
  }
}

// ---------------------------------------------------------------------------
// Dead cron detection
// ---------------------------------------------------------------------------

type DeadCron = {
  nodeId: string;
  skill: string;
  lastRanAt: string;
  expectedIntervalMs: number;
  actualAgeMs: number;
};

function detectDeadCrons(executions: CronExecution[]): DeadCron[] {
  const latestByKey = new Map<string, CronExecution>();
  for (const ex of executions) {
    const key = `${ex.node_id}::${ex.skill_name}`;
    if (!latestByKey.has(key)) {
      latestByKey.set(key, ex);
    }
  }

  const now = Date.now();
  const dead: DeadCron[] = [];

  for (const nodeSchedule of NODE_SCHEDULES) {
    for (const entry of nodeSchedule.skills) {
      const key = `${nodeSchedule.nodeId}::${entry.skill}`;
      const latest = latestByKey.get(key);
      if (!latest) continue;
      const ageMs = now - new Date(latest.started_at).getTime();
      if (ageMs > entry.intervalMs * 3) {
        dead.push({
          nodeId: nodeSchedule.nodeId,
          skill: entry.skill,
          lastRanAt: latest.started_at,
          expectedIntervalMs: entry.intervalMs,
          actualAgeMs: ageMs,
        });
      }
    }
  }

  return dead;
}

// ---------------------------------------------------------------------------
// Schedule Reference Table
// ---------------------------------------------------------------------------

function ScheduleReferenceTable({
  nodeSchedule,
  isCoordinator,
}: {
  nodeSchedule: NodeSchedule;
  isCoordinator: boolean;
}) {
  return (
    <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-[var(--color-secondary)] border-b border-[var(--color-border)] flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--color-foreground)]">
          {nodeSchedule.displayName}
        </span>
        {isCoordinator && (
          <span className="inline-flex items-center gap-1 text-xs text-[var(--color-muted-foreground)] border border-[var(--color-border)] rounded px-2 py-0.5 bg-[var(--color-background)]">
            <ShieldCheck size={11} weight="light" />
            coordinator
          </span>
        )}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            <th className="text-left px-4 py-2 text-xs font-medium text-[var(--color-muted-foreground)] w-1/2">
              Skill
            </th>
            <th className="text-left px-4 py-2 text-xs font-medium text-[var(--color-muted-foreground)]">
              Schedule
            </th>
          </tr>
        </thead>
        <tbody>
          {nodeSchedule.skills.map((entry, i) => (
            <tr
              key={entry.skill}
              className={`border-b border-[var(--color-border)] last:border-b-0 ${
                i % 2 === 0 ? "bg-[var(--color-background)]" : "bg-[var(--color-muted)]"
              }`}
            >
              <td className="px-4 py-2 text-[var(--color-foreground)] font-mono text-xs flex items-center gap-2">
                {entry.skill}
                {entry.coordinatorOnly && (
                  <span
                    title="coordinator-only"
                    className="inline-flex items-center gap-0.5 text-[10px] text-[var(--color-muted-foreground)] border border-[var(--color-border)] rounded px-1 py-0 bg-[var(--color-secondary)]"
                  >
                    <ShieldCheck size={10} weight="light" />
                    coord
                  </span>
                )}
              </td>
              <td className="px-4 py-2 text-[var(--color-muted-foreground)] text-xs">
                {entry.schedule}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function CronsPage() {
  const { data: executions = [] } = useCronExecutions(undefined, 200);
  const { data: nodeRoles = [] } = useNodeRoles();

  const coordinatorNodeId = useMemo(
    () => nodeRoles.find((n) => n.is_coordinator)?.node_id ?? null,
    [nodeRoles]
  );

  // Schedule tab
  const [scheduleTab, setScheduleTab] = useState<string>(NODE_SCHEDULES[0].nodeId);

  // Log filters
  const [filterNode, setFilterNode] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredExecutions = useMemo(() => {
    return executions.filter((ex) => {
      if (filterNode !== "all" && ex.node_id !== filterNode) return false;
      if (filterStatus !== "all" && ex.status !== filterStatus) return false;
      return true;
    });
  }, [executions, filterNode, filterStatus]);

  const deadCrons = useMemo(() => detectDeadCrons(executions), [executions]);

  const activeSchedule = NODE_SCHEDULES.find((n) => n.nodeId === scheduleTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-foreground)]">
          Cron Monitoring
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
          Schedule reference and real-time execution log for all FlowOS nodes.
        </p>
      </div>

      {/* Dead Cron Warning Banner */}
      {deadCrons.length > 0 && (
        <div className="border border-[var(--color-warning)] rounded-lg p-4 bg-amber-50">
          <div className="flex items-start gap-3">
            <Warning size={18} weight="light" className="text-[var(--color-warning)] mt-0.5 shrink-0" />
            <div className="space-y-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-foreground)]">
                {deadCrons.length} dead cron{deadCrons.length > 1 ? "s" : ""} detected
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                The following skills have not run in more than 3x their expected interval:
              </p>
              <ul className="space-y-0.5 mt-1">
                {deadCrons.map((dc) => {
                  const expectedMin = Math.round(dc.expectedIntervalMs / 60000);
                  const actualMin = Math.round(dc.actualAgeMs / 60000);
                  return (
                    <li
                      key={`${dc.nodeId}::${dc.skill}`}
                      className="text-xs text-[var(--color-foreground)] font-mono"
                    >
                      <span className="font-semibold">{dc.nodeId}</span> / {dc.skill}
                      {" "}
                      <span className="text-[var(--color-muted-foreground)]">
                        — last ran {formatRelative(dc.lastRanAt)} (expected every {expectedMin}m, {actualMin}m elapsed)
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Cron Schedule Reference */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--color-foreground)] mb-3">
          Cron Schedule Reference
        </h2>

        {/* Node tabs */}
        <div className="flex gap-1 border-b border-[var(--color-border)] mb-4">
          {NODE_SCHEDULES.map((ns) => {
            const isCoord = coordinatorNodeId === ns.nodeId;
            const active = scheduleTab === ns.nodeId;
            return (
              <button
                key={ns.nodeId}
                type="button"
                onClick={() => setScheduleTab(ns.nodeId)}
                className={`px-4 py-2 text-sm border-b-2 transition-colors -mb-px ${
                  active
                    ? "border-[var(--color-foreground)] text-[var(--color-foreground)] font-medium"
                    : "border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {ns.displayName}
                  {isCoord && (
                    <ShieldCheck size={12} weight="light" className="text-[var(--color-muted-foreground)]" />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {activeSchedule && (
          <ScheduleReferenceTable
            nodeSchedule={activeSchedule}
            isCoordinator={coordinatorNodeId === activeSchedule.nodeId}
          />
        )}
      </section>

      {/* Execution Log */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
            Execution Log
          </h2>
          <div className="flex items-center gap-2">
            <Funnel size={14} weight="light" className="text-[var(--color-muted-foreground)]" />
            {/* Node filter */}
            <select
              value={filterNode}
              onChange={(e) => setFilterNode(e.target.value)}
              className="text-xs border border-[var(--color-border)] rounded px-2 py-1.5 bg-[var(--color-background)] text-[var(--color-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--color-border)]"
            >
              <option value="all">All nodes</option>
              {NODE_SCHEDULES.map((ns) => (
                <option key={ns.nodeId} value={ns.nodeId}>
                  {ns.displayName}
                </option>
              ))}
            </select>
            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs border border-[var(--color-border)] rounded px-2 py-1.5 bg-[var(--color-background)] text-[var(--color-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--color-border)]"
            >
              <option value="all">All statuses</option>
              <option value="running">Running</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
              <option value="timeout">Timeout</option>
            </select>
          </div>
        </div>

        <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-secondary)] border-b border-[var(--color-border)]">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--color-muted-foreground)]">
                  Node
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--color-muted-foreground)]">
                  Skill
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--color-muted-foreground)]">
                  Status
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--color-muted-foreground)]">
                  Started
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--color-muted-foreground)]">
                  Duration
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--color-muted-foreground)]">
                  Error
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredExecutions.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-[var(--color-muted-foreground)]"
                  >
                    No executions found.
                  </td>
                </tr>
              ) : (
                filteredExecutions.map((ex, i) => (
                  <tr
                    key={ex.id}
                    className={`border-b border-[var(--color-border)] last:border-b-0 ${
                      i % 2 === 0
                        ? "bg-[var(--color-background)]"
                        : "bg-[var(--color-muted)]"
                    }`}
                  >
                    <td className="px-4 py-2.5 text-xs font-mono text-[var(--color-foreground)]">
                      {ex.node_id}
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono text-[var(--color-foreground)]">
                      {ex.skill_name}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={ex.status} />
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[var(--color-muted-foreground)] whitespace-nowrap">
                      {formatRelative(ex.started_at)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[var(--color-muted-foreground)]">
                      {formatDuration(ex.duration_ms)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[var(--color-destructive)] max-w-xs truncate">
                      {ex.error_message ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredExecutions.length > 0 && (
          <p className="text-xs text-[var(--color-muted-foreground)] mt-2">
            Showing {filteredExecutions.length} execution{filteredExecutions.length !== 1 ? "s" : ""}
            {filterNode !== "all" || filterStatus !== "all" ? " (filtered)" : ""}
          </p>
        )}
      </section>
    </div>
  );
}
