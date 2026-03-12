"use client";

import Link from "next/link";
import {
  ShieldCheck,
  Circle,
  Cpu,
  HardDrive,
  Memory,
  Clock,
  Pulse,
  ArrowRight,
  Lightning,
  Users,
  CalendarCheck,
} from "@phosphor-icons/react";
import { useNodeRoles, useLatestHeartbeats } from "@/lib/hooks/use-nodes";
import { useActiveSessions } from "@/lib/hooks/use-sessions";
import { useAgentEvents } from "@/lib/hooks/use-events";
import { useFailoverEvents } from "@/lib/hooks/use-events";
import type {
  NodeRole,
  NodeHeartbeat,
  ActiveSession,
  AgentEvent,
  FailoverEvent,
} from "@/types/database";

function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return "never";
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "online"
      ? "var(--color-success)"
      : status === "degraded"
      ? "var(--color-warning)"
      : "var(--color-destructive)";
  return (
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "50%",
        backgroundColor: color,
        flexShrink: 0,
      }}
    />
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const bg =
    priority === "critical"
      ? "var(--color-destructive)"
      : priority === "high"
      ? "var(--color-warning)"
      : priority === "normal"
      ? "var(--color-info)"
      : "var(--color-muted)";
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 7px",
        borderRadius: 999,
        background: bg,
        color: "#fff",
        letterSpacing: "0.03em",
        textTransform: "capitalize",
      }}
    >
      {priority}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colorMap: Record<string, string> = {
    coordinator: "var(--color-info)",
    "dev-lead": "var(--color-warning)",
    quality: "var(--color-success)",
  };
  const bg = colorMap[role] ?? "var(--color-muted)";
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 999,
        background: bg,
        color: "#fff",
        letterSpacing: "0.03em",
        textTransform: "capitalize",
      }}
    >
      {role}
    </span>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const color =
    pct > 85
      ? "var(--color-destructive)"
      : pct > 60
      ? "var(--color-warning)"
      : "var(--color-info)";
  return (
    <div
      style={{
        height: 6,
        borderRadius: 999,
        background: "var(--color-border)",
        overflow: "hidden",
        width: "100%",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          borderRadius: 999,
          background: color,
          transition: "width 0.3s ease",
        }}
      />
    </div>
  );
}

function MetricBar({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  const pct = value ?? 0;
  const color =
    pct > 85
      ? "var(--color-destructive)"
      : pct > 60
      ? "var(--color-warning)"
      : "var(--color-success)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          fontSize: 11,
          color: "var(--color-muted-foreground)",
          width: 32,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 5,
          borderRadius: 999,
          background: "var(--color-border)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: 999,
          }}
        />
      </div>
      <span style={{ fontSize: 11, color: "var(--color-muted-foreground)", width: 34, textAlign: "right" }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

const NODE_DISPLAY: Record<string, { name: string; role: string }> = {
  Antoni: { name: "Antoni", role: "coordinator" },
  Kyungjini: { name: "Kyungjini", role: "dev-lead" },
  Jaepini: { name: "Jaepini", role: "quality" },
};

const FAILOVER_CHAIN = ["Antoni", "Kyungjini", "Jaepini"];

export default function DashboardPage() {
  const { data: nodeRoles = [], isLoading: rolesLoading } = useNodeRoles();
  const { data: heartbeats = [] } = useLatestHeartbeats();
  const { data: activeSessions = [] } = useActiveSessions();
  const { data: agentEvents = [] } = useAgentEvents(10);
  const { data: failoverEvents = [] } = useFailoverEvents();

  const heartbeatMap: Record<string, NodeHeartbeat> = {};
  for (const hb of heartbeats) {
    if (hb.node_id) heartbeatMap[hb.node_id] = hb;
  }

  const roleMap: Record<string, NodeRole> = {};
  for (const nr of nodeRoles) {
    if (nr.node_id) roleMap[nr.node_id] = nr;
  }

  const coordinator = nodeRoles.find((n) => n.is_coordinator);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-background)",
        color: "var(--color-foreground)",
        fontFamily: "inherit",
        padding: "32px 40px",
        maxWidth: 1280,
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Pulse size={28} weight="thin" color="var(--color-info)" />
          <div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                margin: 0,
                color: "var(--color-foreground)",
              }}
            >
              Mission Control
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "var(--color-muted-foreground)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                fontWeight: 500,
              }}
            >
              FlowOS Node Monitoring
            </p>
          </div>
        </div>
      </div>

      {/* Node Status Cards */}
      <section style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            color: "var(--color-muted-foreground)",
            marginBottom: 14,
          }}
        >
          Node Status
        </h2>
        {rolesLoading ? (
          <div style={{ color: "var(--color-muted-foreground)", fontSize: 14 }}>
            Loading nodes...
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 18,
            }}
          >
            {FAILOVER_CHAIN.map((nodeId) => {
              const role = roleMap[nodeId];
              const hb = heartbeatMap[nodeId];
              const display = NODE_DISPLAY[nodeId] ?? { name: nodeId, role: "unknown" };
              const status = hb?.status ?? "offline";
              const sessionCount = activeSessions.filter(
                (s) => s.node_id === nodeId
              ).length;
              const quota = role?.claude_session_quota ?? 0;
              const cpuPct = hb?.cpu_usage ?? null;
              const memPct = hb?.memory_usage ?? null;
              const diskPct = hb?.disk_free_gb != null ? Math.max(0, 100 - (hb.disk_free_gb / 500) * 100) : null;

              return (
                <Link
                  key={nodeId}
                  href={`/dashboard/nodes/${nodeId}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div
                    style={{
                      background: "var(--color-background)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      padding: "20px 22px",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                      transition: "box-shadow 0.2s, border-color 0.2s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow =
                        "0 4px 16px rgba(0,0,0,0.10)";
                      (e.currentTarget as HTMLDivElement).style.borderColor =
                        "var(--color-info)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow =
                        "0 1px 4px rgba(0,0,0,0.06)";
                      (e.currentTarget as HTMLDivElement).style.borderColor =
                        "var(--color-border)";
                    }}
                  >
                    {/* Card Header */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 12,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <StatusDot status={status} />
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: 16,
                            letterSpacing: "-0.01em",
                          }}
                        >
                          {display.name}
                        </span>
                      </div>
                      {role?.is_coordinator && (
                        <ShieldCheck
                          size={18}
                          weight="light"
                          color="var(--color-info)"
                        />
                      )}
                    </div>

                    {/* Badges */}
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        flexWrap: "wrap",
                        marginBottom: 16,
                      }}
                    >
                      <RoleBadge role={display.role} />
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: "var(--color-muted)",
                          color: "var(--color-muted-foreground)",
                          fontWeight: 500,
                          textTransform: "capitalize",
                        }}
                      >
                        {status}
                      </span>
                    </div>

                    {/* Claude Session Quota */}
                    <div style={{ marginBottom: 14 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12,
                          color: "var(--color-muted-foreground)",
                          marginBottom: 5,
                        }}
                      >
                        <span>Claude Sessions</span>
                        <span style={{ fontWeight: 600, color: "var(--color-foreground)" }}>
                          {sessionCount} / {quota}
                        </span>
                      </div>
                      <ProgressBar value={sessionCount} max={quota} />
                    </div>

                    {/* System Metrics */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 14 }}>
                      <MetricBar label="CPU" value={cpuPct} />
                      <MetricBar label="MEM" value={memPct} />
                      <MetricBar label="DSK" value={diskPct} />
                    </div>

                    {/* Last Heartbeat */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 12,
                        color: "var(--color-muted-foreground)",
                      }}
                    >
                      <Clock size={13} weight="light" />
                      <span>Last seen {timeAgo(hb?.created_at)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Active Sessions Summary + Recent Events side by side */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.4fr",
          gap: 18,
          marginBottom: 32,
        }}
      >
        {/* Active Sessions */}
        <section>
          <h2
            style={{
              fontSize: 13,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: "var(--color-muted-foreground)",
              marginBottom: 14,
            }}
          >
            Active Sessions
          </h2>
          <div
            style={{
              background: "var(--color-background)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              overflow: "hidden",
            }}
          >
            {/* Summary row */}
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Users size={18} weight="light" color="var(--color-info)" />
              <span style={{ fontWeight: 700, fontSize: 22 }}>
                {activeSessions.length}
              </span>
              <span style={{ color: "var(--color-muted-foreground)", fontSize: 13 }}>
                total active sessions
              </span>
            </div>

            {activeSessions.length === 0 ? (
              <div
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: "var(--color-muted-foreground)",
                  fontSize: 13,
                }}
              >
                No active sessions
              </div>
            ) : (
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {activeSessions.map((s: ActiveSession, i: number) => (
                  <div
                    key={s.id ?? i}
                    style={{
                      padding: "12px 20px",
                      borderBottom:
                        i < activeSessions.length - 1
                          ? "1px solid var(--color-border)"
                          : undefined,
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 13 }}>
                        {s.node_id ?? "—"}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--color-muted-foreground)",
                        }}
                      >
                        {timeAgo(s.started_at)}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        fontSize: 12,
                        color: "var(--color-muted-foreground)",
                      }}
                    >
                      {s.project_id && (
                        <span
                          style={{
                            background: "var(--color-muted)",
                            borderRadius: 4,
                            padding: "1px 6px",
                          }}
                        >
                          {s.project_id}
                        </span>
                      )}
                      {s.session_type && (
                        <span
                          style={{
                            background: "var(--color-muted)",
                            borderRadius: 4,
                            padding: "1px 6px",
                          }}
                        >
                          {s.session_type}
                        </span>
                      )}
                      {s.model && (
                        <span
                          style={{
                            background: "var(--color-muted)",
                            borderRadius: 4,
                            padding: "1px 6px",
                          }}
                        >
                          {s.model}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Recent Events */}
        <section>
          <h2
            style={{
              fontSize: 13,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: "var(--color-muted-foreground)",
              marginBottom: 14,
            }}
          >
            Recent Events
          </h2>
          <div
            style={{
              background: "var(--color-background)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              overflow: "hidden",
            }}
          >
            {agentEvents.length === 0 ? (
              <div
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: "var(--color-muted-foreground)",
                  fontSize: 13,
                }}
              >
                No recent events
              </div>
            ) : (
              <div style={{ maxHeight: 380, overflowY: "auto" }}>
                {agentEvents.map((ev: AgentEvent, i: number) => (
                  <div
                    key={ev.id ?? i}
                    style={{
                      padding: "11px 20px",
                      borderBottom:
                        i < agentEvents.length - 1
                          ? "1px solid var(--color-border)"
                          : undefined,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <Lightning
                      size={14}
                      weight="light"
                      color="var(--color-muted-foreground)"
                      style={{ flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 2,
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: 13,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {ev.source_node ?? "—"}
                        </span>
                        <PriorityBadge priority={ev.priority ?? "normal"} />
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--color-muted-foreground)",
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span>{ev.event_type ?? "—"}</span>
                        {ev.status && (
                          <span
                            style={{
                              color:
                                ev.status === "completed"
                                  ? "var(--color-success)"
                                  : ev.status === "failed"
                                  ? "var(--color-destructive)"
                                  : "var(--color-muted-foreground)",
                            }}
                          >
                            {ev.status}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--color-muted-foreground)",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {timeAgo(ev.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Failover Status */}
      <section style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            color: "var(--color-muted-foreground)",
            marginBottom: 14,
          }}
        >
          Failover Status
        </h2>
        <div
          style={{
            background: "var(--color-background)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            padding: "22px 28px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ShieldCheck size={20} weight="light" color="var(--color-info)" />
              <span style={{ fontWeight: 600, fontSize: 14 }}>
                Current Coordinator:
              </span>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 14,
                  color: "var(--color-info)",
                }}
              >
                {coordinator?.node_id ?? "None"}
              </span>
            </div>
            {failoverEvents.length > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12,
                  color: "var(--color-muted-foreground)",
                }}
              >
                <CalendarCheck size={13} weight="light" />
                <span>
                  Last failover {timeAgo(failoverEvents[0]?.created_at)}
                </span>
              </div>
            )}
          </div>

          {/* Chain Visualization */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 0,
              flexWrap: "wrap",
            }}
          >
            {FAILOVER_CHAIN.map((nodeId, idx) => {
              const role = roleMap[nodeId];
              const hb = heartbeatMap[nodeId];
              const status = hb?.status ?? "offline";
              const isCoord = role?.is_coordinator ?? false;

              return (
                <div
                  key={nodeId}
                  style={{ display: "flex", alignItems: "center" }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 6,
                      padding: "14px 22px",
                      borderRadius: 10,
                      border: `1.5px solid ${isCoord ? "var(--color-info)" : "var(--color-border)"}`,
                      background: isCoord
                        ? "rgba(var(--color-info-rgb, 59,130,246), 0.05)"
                        : "var(--color-muted)",
                      minWidth: 110,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <StatusDot status={status} />
                      <span style={{ fontWeight: 700, fontSize: 14 }}>
                        {nodeId}
                      </span>
                      {isCoord && (
                        <ShieldCheck
                          size={14}
                          weight="light"
                          color="var(--color-info)"
                        />
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--color-muted-foreground)",
                        fontWeight: 500,
                      }}
                    >
                      Priority {idx + 1}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color:
                          status === "online"
                            ? "var(--color-success)"
                            : status === "degraded"
                            ? "var(--color-warning)"
                            : "var(--color-destructive)",
                        textTransform: "capitalize",
                        fontWeight: 600,
                      }}
                    >
                      {status}
                    </span>
                  </div>
                  {idx < FAILOVER_CHAIN.length - 1 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "0 10px",
                        color: "var(--color-muted-foreground)",
                      }}
                    >
                      <ArrowRight size={18} weight="light" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {failoverEvents.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--color-muted-foreground)",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Failover History
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {failoverEvents.slice(0, 3).map((fe: FailoverEvent, i: number) => (
                  <div
                    key={fe.id ?? i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 12,
                      color: "var(--color-muted-foreground)",
                    }}
                  >
                    <Circle size={7} weight="fill" color="var(--color-warning)" />
                    <span>
                      {fe.from_node ?? "?"} transferred coordinator to{" "}
                      <strong style={{ color: "var(--color-foreground)" }}>
                        {fe.to_node ?? "?"}
                      </strong>
                    </span>
                    <span style={{ marginLeft: "auto" }}>
                      {timeAgo(fe.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
