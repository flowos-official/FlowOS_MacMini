"use client";

import { useState } from "react";
import {
  ShieldWarning,
  Skull,
  ArrowsClockwise,
  CheckCircle,
  XCircle,
  CaretDown,
  Warning,
  Timer,
  CurrencyDollar,
  Envelope,
  Rocket,
  Stack,
  ArrowRight,
  Clock,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { useNodeRoles } from "@/lib/hooks/use-nodes";
import { useAgentEvents, useFailoverEvents } from "@/lib/hooks/use-events";
import type { NodeRole, AgentEvent, FailoverEvent } from "@/types/database";
import { useQueryClient } from "@tanstack/react-query";

type KillTarget = "node" | "all";

type ConfirmDialog =
  | { type: "kill_node"; nodeId: string; nodeName: string }
  | { type: "kill_all" }
  | { type: "failover"; fromNode: NodeRole; toNodeId: string; toNodeName: string }
  | null;

const CIRCUIT_BREAKER_THRESHOLDS = [
  {
    icon: ArrowsClockwise,
    label: "Same task fails",
    threshold: "3 consecutive",
    action: "Auto-stop",
  },
  {
    icon: Envelope,
    label: "Email send rate",
    threshold: ">10/hour or >50/day",
    action: "Rate limit",
  },
  {
    icon: Rocket,
    label: "Deploy rate",
    threshold: ">5/hour per project",
    action: "Queue deploys",
  },
  {
    icon: CurrencyDollar,
    label: "Per-agent API cost",
    threshold: ">$5/hour",
    action: "Suspend agent",
  },
  {
    icon: Timer,
    label: "Session runtime",
    threshold: ">2h",
    action: "Force-kill",
  },
  {
    icon: Stack,
    label: "Total sessions",
    threshold: ">6 concurrent",
    action: "Queue new",
  },
];

function ConfirmationModal({
  dialog,
  onCancel,
  onConfirm,
  isLoading,
}: {
  dialog: ConfirmDialog;
  onCancel: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  if (!dialog) return null;

  let title = "";
  let description = "";

  if (dialog.type === "kill_node") {
    title = "Kill agents on node?";
    description = `This will send a kill command to all agents running on ${dialog.nodeName}.`;
  } else if (dialog.type === "kill_all") {
    title = "Kill all agents on all nodes?";
    description = "This will send a kill command to every agent across all nodes immediately.";
  } else if (dialog.type === "failover") {
    title = "Initiate manual failover?";
    description = `This will transfer coordinator role from ${dialog.fromNode.display_name} to ${dialog.toNodeName}.`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div className="bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg p-6 max-w-sm w-full mx-4 shadow-lg">
        <div className="flex items-start gap-3 mb-4">
          <Warning size={20} weight="light" className="text-amber-500 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold text-[var(--color-foreground)] text-sm">{title}</h3>
            <p className="text-[var(--color-muted-foreground)] text-sm mt-1">{description}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm rounded-md border border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 font-medium"
          >
            {isLoading ? "Processing..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ControlsPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: nodeRoles = [] } = useNodeRoles();
  const { data: agentEvents = [] } = useAgentEvents(100);
  const { data: failoverEvents = [] } = useFailoverEvents();

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ message: string; isError: boolean } | null>(null);

  // Kill switch state
  const [selectedKillNode, setSelectedKillNode] = useState<string>("");

  // Coordinator failover state
  const [selectedFailoverTarget, setSelectedFailoverTarget] = useState<string>("");

  const currentCoordinator = nodeRoles.find((n) => n.is_coordinator);
  const nonCoordinatorNodes = nodeRoles.filter((n) => !n.is_coordinator);

  // Confirmation queue: pending events with event_type containing 'confirm' or priority='critical'
  const pendingConfirmations = agentEvents.filter(
    (e) =>
      e.status === "pending" &&
      (e.event_type.includes("confirm") || e.priority === "critical"),
  );

  function showFeedback(message: string, isError = false) {
    setActionFeedback({ message, isError });
    setTimeout(() => setActionFeedback(null), 3000);
  }

  async function executeKillNode(nodeId: string, nodeName: string) {
    setIsActionLoading(true);
    try {
      const { error } = await supabase.from("agent_events").insert({
        source_node: "dashboard",
        target_node: nodeId,
        event_type: "kill_command",
        priority: "critical",
        summary: `Kill all agents on node: ${nodeName}`,
        status: "pending",
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["agent_events"] });
      showFeedback(`Kill command sent to ${nodeName}`);
    } catch (err) {
      showFeedback(`Failed to send kill command: ${(err as Error).message}`, true);
    } finally {
      setIsActionLoading(false);
      setConfirmDialog(null);
    }
  }

  async function executeKillAll() {
    setIsActionLoading(true);
    try {
      const { error } = await supabase.from("agent_events").insert({
        source_node: "dashboard",
        target_node: null,
        event_type: "kill_command",
        priority: "critical",
        summary: "Kill all agents on all nodes",
        status: "pending",
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["agent_events"] });
      showFeedback("Kill all command sent");
    } catch (err) {
      showFeedback(`Failed to send kill command: ${(err as Error).message}`, true);
    } finally {
      setIsActionLoading(false);
      setConfirmDialog(null);
    }
  }

  async function executeFailover(fromNodeId: string, toNodeId: string) {
    setIsActionLoading(true);
    try {
      const { error: err1 } = await supabase
        .from("node_roles")
        .update({ is_coordinator: false })
        .eq("node_id", fromNodeId);
      if (err1) throw err1;

      const { error: err2 } = await supabase
        .from("node_roles")
        .update({ is_coordinator: true })
        .eq("node_id", toNodeId);
      if (err2) throw err2;

      queryClient.invalidateQueries({ queryKey: ["node_roles"] });
      showFeedback("Coordinator failover completed");
      setSelectedFailoverTarget("");
    } catch (err) {
      showFeedback(`Failover failed: ${(err as Error).message}`, true);
    } finally {
      setIsActionLoading(false);
      setConfirmDialog(null);
    }
  }

  async function handleConfirm() {
    if (!confirmDialog) return;
    if (confirmDialog.type === "kill_node") {
      await executeKillNode(confirmDialog.nodeId, confirmDialog.nodeName);
    } else if (confirmDialog.type === "kill_all") {
      await executeKillAll();
    } else if (confirmDialog.type === "failover") {
      await executeFailover(confirmDialog.fromNode.node_id, confirmDialog.toNodeId);
    }
  }

  async function handleApproveEvent(eventId: string) {
    const { error } = await supabase
      .from("agent_events")
      .update({ status: "approved", processed_at: new Date().toISOString() })
      .eq("id", eventId);
    if (error) {
      showFeedback(`Failed to approve: ${error.message}`, true);
    } else {
      queryClient.invalidateQueries({ queryKey: ["agent_events"] });
    }
  }

  async function handleRejectEvent(eventId: string) {
    const { error } = await supabase
      .from("agent_events")
      .update({ status: "rejected", processed_at: new Date().toISOString() })
      .eq("id", eventId);
    if (error) {
      showFeedback(`Failed to reject: ${error.message}`, true);
    } else {
      queryClient.invalidateQueries({ queryKey: ["agent_events"] });
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShieldWarning size={24} weight="light" className="text-[var(--color-foreground)]" />
        <h1 className="text-xl font-semibold text-[var(--color-foreground)]">Controls & Safety</h1>
      </div>

      {/* Action feedback toast */}
      {actionFeedback && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-md text-sm font-medium shadow-md border ${
            actionFeedback.isError
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-green-50 text-green-700 border-green-200"
          }`}
        >
          {actionFeedback.message}
        </div>
      )}

      {/* Kill Switch Panel */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--color-foreground)] mb-3 uppercase tracking-wide">
          Kill Switch
        </h2>
        <div className="border border-[var(--color-border)] rounded-lg overflow-hidden divide-y divide-[var(--color-border)]">
          {/* Kill specific node */}
          <div className="p-5 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-foreground)]">Kill agents on a specific node</p>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                Sends a critical kill_command event to the selected node
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative">
                <select
                  value={selectedKillNode}
                  onChange={(e) => setSelectedKillNode(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-1.5 text-sm border border-[var(--color-border)] rounded-md bg-[var(--color-background)] text-[var(--color-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--color-border)]"
                >
                  <option value="">Select node...</option>
                  {nodeRoles.map((node) => (
                    <option key={node.node_id} value={node.node_id}>
                      {node.display_name}
                    </option>
                  ))}
                </select>
                <CaretDown
                  size={12}
                  weight="thin"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-muted-foreground)]"
                />
              </div>
              <button
                type="button"
                disabled={!selectedKillNode}
                onClick={() => {
                  const node = nodeRoles.find((n) => n.node_id === selectedKillNode);
                  if (node) {
                    setConfirmDialog({
                      type: "kill_node",
                      nodeId: node.node_id,
                      nodeName: node.display_name,
                    });
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
              >
                <Skull size={15} weight="light" />
                Kill Node
              </button>
            </div>
          </div>

          {/* Kill all */}
          <div className="p-5 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-foreground)]">Kill all agents on all nodes</p>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                Emergency stop — broadcasts a critical kill_command with no target restriction
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmDialog({ type: "kill_all" })}
              className="shrink-0 flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
            >
              <Skull size={15} weight="light" />
              Kill All
            </button>
          </div>
        </div>
      </section>

      {/* Circuit Breaker Status */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--color-foreground)] mb-3 uppercase tracking-wide">
          Circuit Breaker Thresholds
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CIRCUIT_BREAKER_THRESHOLDS.map(({ icon: Icon, label, threshold, action }) => (
            <div
              key={label}
              className="border border-[var(--color-border)] rounded-lg p-4 flex items-start gap-3"
            >
              <Icon size={18} weight="thin" className="text-[var(--color-muted-foreground)] mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-[var(--color-foreground)]">{label}</p>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">{threshold}</p>
                <span className="inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--color-secondary)] text-[var(--color-muted-foreground)]">
                  {action}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Coordinator Management */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--color-foreground)] mb-3 uppercase tracking-wide">
          Coordinator Management
        </h2>
        <div className="border border-[var(--color-border)] rounded-lg p-5 space-y-4">
          {/* Current coordinator */}
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
            <div>
              <span className="text-xs text-[var(--color-muted-foreground)]">Current coordinator</span>
              <p className="text-sm font-medium text-[var(--color-foreground)]">
                {currentCoordinator
                  ? `${currentCoordinator.display_name} (${currentCoordinator.node_id})`
                  : "No coordinator assigned"}
              </p>
            </div>
          </div>

          {/* Manual failover */}
          <div className="border-t border-[var(--color-border)] pt-4">
            <p className="text-xs font-medium text-[var(--color-foreground)] mb-2">Manual failover</p>
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={selectedFailoverTarget}
                  onChange={(e) => setSelectedFailoverTarget(e.target.value)}
                  disabled={!currentCoordinator}
                  className="appearance-none pl-3 pr-8 py-1.5 text-sm border border-[var(--color-border)] rounded-md bg-[var(--color-background)] text-[var(--color-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--color-border)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select new coordinator...</option>
                  {nonCoordinatorNodes.map((node) => (
                    <option key={node.node_id} value={node.node_id}>
                      {node.display_name} — priority {node.failover_priority}
                    </option>
                  ))}
                </select>
                <CaretDown
                  size={12}
                  weight="thin"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-muted-foreground)]"
                />
              </div>
              <button
                type="button"
                disabled={!selectedFailoverTarget || !currentCoordinator}
                onClick={() => {
                  const target = nodeRoles.find((n) => n.node_id === selectedFailoverTarget);
                  if (target && currentCoordinator) {
                    setConfirmDialog({
                      type: "failover",
                      fromNode: currentCoordinator,
                      toNodeId: target.node_id,
                      toNodeName: target.display_name,
                    });
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowsClockwise size={15} weight="light" />
                Failover
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Confirmation Queue */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--color-foreground)] uppercase tracking-wide">
            Confirmation Queue
          </h2>
          {pendingConfirmations.length > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
              {pendingConfirmations.length} pending
            </span>
          )}
        </div>

        {pendingConfirmations.length === 0 ? (
          <div className="border border-[var(--color-border)] rounded-lg p-6 text-center">
            <CheckCircle size={24} weight="thin" className="mx-auto mb-2 text-[var(--color-muted-foreground)]" />
            <p className="text-sm text-[var(--color-muted-foreground)]">No pending confirmations</p>
          </div>
        ) : (
          <div className="border border-[var(--color-border)] rounded-lg overflow-hidden divide-y divide-[var(--color-border)]">
            {pendingConfirmations.map((event) => (
              <div key={event.id} className="p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono bg-[var(--color-secondary)] text-[var(--color-muted-foreground)] px-1.5 py-0.5 rounded">
                      {event.event_type}
                    </span>
                    <span
                      className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        event.priority === "critical"
                          ? "bg-red-100 text-red-700"
                          : event.priority === "high"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-[var(--color-secondary)] text-[var(--color-muted-foreground)]"
                      }`}
                    >
                      {event.priority}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-foreground)] truncate">
                    {event.summary ?? "No summary"}
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                    {event.source_node}
                    {event.target_node ? ` → ${event.target_node}` : ""} &middot;{" "}
                    {formatTime(event.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRejectEvent(event.id)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                  >
                    <XCircle size={13} weight="light" />
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApproveEvent(event.id)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors font-medium"
                  >
                    <CheckCircle size={13} weight="light" />
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Failover Timeline */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--color-foreground)] mb-3 uppercase tracking-wide">
          Failover Timeline
        </h2>

        {failoverEvents.length === 0 ? (
          <div className="border border-[var(--color-border)] rounded-lg p-6 text-center">
            <Clock size={24} weight="thin" className="mx-auto mb-2 text-[var(--color-muted-foreground)]" />
            <p className="text-sm text-[var(--color-muted-foreground)]">No failover events recorded</p>
          </div>
        ) : (
          <div className="border border-[var(--color-border)] rounded-lg overflow-hidden divide-y divide-[var(--color-border)]">
            {failoverEvents.map((event) => (
              <div key={event.id} className="p-4 flex items-start gap-4">
                <div className="mt-0.5 shrink-0">
                  {event.resolved_at ? (
                    <CheckCircle size={16} weight="light" className="text-green-600" />
                  ) : (
                    <Warning size={16} weight="light" className="text-amber-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-foreground)]">
                    <span className="font-mono text-xs bg-[var(--color-secondary)] px-1.5 py-0.5 rounded text-[var(--color-muted-foreground)]">
                      {event.from_node}
                    </span>
                    <ArrowRight size={13} weight="thin" className="text-[var(--color-muted-foreground)]" />
                    <span className="font-mono text-xs bg-[var(--color-secondary)] px-1.5 py-0.5 rounded text-[var(--color-muted-foreground)]">
                      {event.to_node}
                    </span>
                    {event.resolved_at && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">
                        Resolved
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-1">{event.reason}</p>
                  {event.crons_transferred && event.crons_transferred.length > 0 && (
                    <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                      Crons transferred: {event.crons_transferred.join(", ")}
                    </p>
                  )}
                </div>
                <div className="text-xs text-[var(--color-muted-foreground)] shrink-0 text-right">
                  <p>{formatTime(event.created_at)}</p>
                  {event.resolved_at && (
                    <p className="mt-0.5">Resolved {formatTime(event.resolved_at)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Confirmation Modal */}
      <ConfirmationModal
        dialog={confirmDialog}
        onCancel={() => setConfirmDialog(null)}
        onConfirm={handleConfirm}
        isLoading={isActionLoading}
      />
    </div>
  );
}
