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
    label: "동일 작업 실패",
    threshold: "3회 연속",
    action: "자동 중지",
  },
  {
    icon: Envelope,
    label: "이메일 발송 속도",
    threshold: ">10/시간 또는 >50/일",
    action: "속도 제한",
  },
  {
    icon: Rocket,
    label: "배포 속도",
    threshold: ">5/시간 (프로젝트당)",
    action: "배포 대기열",
  },
  {
    icon: CurrencyDollar,
    label: "에이전트별 API 비용",
    threshold: ">$5/시간",
    action: "에이전트 일시 중지",
  },
  {
    icon: Timer,
    label: "세션 실행 시간",
    threshold: ">2시간",
    action: "강제 종료",
  },
  {
    icon: Stack,
    label: "전체 세션 수",
    threshold: ">6개 동시",
    action: "새 작업 대기",
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
    title = "노드의 에이전트를 종료하시겠습니까?";
    description = `${dialog.nodeName}에서 실행 중인 모든 에이전트에 종료 명령을 보냅니다.`;
  } else if (dialog.type === "kill_all") {
    title = "모든 노드의 에이전트를 종료하시겠습니까?";
    description = "모든 노드의 모든 에이전트에 즉시 종료 명령을 보냅니다.";
  } else if (dialog.type === "failover") {
    title = "수동 장애 복구를 실행하시겠습니까?";
    description = `${dialog.fromNode.display_name}에서 ${dialog.toNodeName}(으)로 코디네이터 역할을 이전합니다.`;
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
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 font-medium"
          >
            {isLoading ? "처리 중..." : "확인"}
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
        summary: `노드의 모든 에이전트 종료: ${nodeName}`,
        status: "pending",
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["agent_events"] });
      showFeedback(`${nodeName}에 종료 명령 전송 완료`);
    } catch (err) {
      showFeedback(`종료 명령 전송 실패: ${(err as Error).message}`, true);
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
        summary: "모든 노드의 에이전트 전체 종료",
        status: "pending",
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["agent_events"] });
      showFeedback("전체 종료 명령 전송 완료");
    } catch (err) {
      showFeedback(`종료 명령 전송 실패: ${(err as Error).message}`, true);
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
      showFeedback("코디네이터 장애 복구 완료");
      setSelectedFailoverTarget("");
    } catch (err) {
      showFeedback(`장애 복구 실패: ${(err as Error).message}`, true);
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
      showFeedback(`승인 실패: ${error.message}`, true);
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
      showFeedback(`거부 실패: ${error.message}`, true);
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
        <h1 className="text-xl font-semibold text-[var(--color-foreground)]">제어 패널</h1>
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
          킬 스위치
        </h2>
        <div className="border border-[var(--color-border)] rounded-lg overflow-hidden divide-y divide-[var(--color-border)]">
          {/* Kill specific node */}
          <div className="p-5 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-foreground)]">특정 노드의 에이전트 종료</p>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                선택한 노드에 kill_command 이벤트를 전송합니다
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative">
                <select
                  value={selectedKillNode}
                  onChange={(e) => setSelectedKillNode(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-1.5 text-sm border border-[var(--color-border)] rounded-md bg-[var(--color-background)] text-[var(--color-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--color-border)]"
                >
                  <option value="">노드 선택...</option>
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
                노드 종료
              </button>
            </div>
          </div>

          {/* Kill all */}
          <div className="p-5 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-foreground)]">모든 노드의 에이전트 전체 종료</p>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                비상 정지 — 대상 제한 없이 kill_command를 전체 브로드캐스트합니다
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmDialog({ type: "kill_all" })}
              className="shrink-0 flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
            >
              <Skull size={15} weight="light" />
              전체 종료
            </button>
          </div>
        </div>
      </section>

      {/* Coordinator Management */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--color-foreground)] mb-3 uppercase tracking-wide">
          코디네이터 관리
        </h2>
        <div className="border border-[var(--color-border)] rounded-lg p-5 space-y-4">
          {/* Current coordinator */}
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
            <div>
              <span className="text-xs text-[var(--color-muted-foreground)]">현재 코디네이터</span>
              <p className="text-sm font-medium text-[var(--color-foreground)]">
                {currentCoordinator
                  ? `${currentCoordinator.display_name} (${currentCoordinator.node_id})`
                  : "코디네이터 미지정"}
              </p>
            </div>
          </div>

          {/* Manual failover */}
          <div className="border-t border-[var(--color-border)] pt-4">
            <p className="text-xs font-medium text-[var(--color-foreground)] mb-2">수동 장애 복구</p>
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={selectedFailoverTarget}
                  onChange={(e) => setSelectedFailoverTarget(e.target.value)}
                  disabled={!currentCoordinator}
                  className="appearance-none pl-3 pr-8 py-1.5 text-sm border border-[var(--color-border)] rounded-md bg-[var(--color-background)] text-[var(--color-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--color-border)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">새 코디네이터 선택...</option>
                  {nonCoordinatorNodes.map((node) => (
                    <option key={node.node_id} value={node.node_id}>
                      {node.display_name} — 우선순위 {node.failover_priority}
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
                장애 복구
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Confirmation Queue */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--color-foreground)] uppercase tracking-wide">
            확인 대기열
          </h2>
          {pendingConfirmations.length > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
              {pendingConfirmations.length}건 대기 중
            </span>
          )}
        </div>

        {pendingConfirmations.length === 0 ? (
          <div className="border border-[var(--color-border)] rounded-lg p-6 text-center">
            <CheckCircle size={24} weight="thin" className="mx-auto mb-2 text-[var(--color-muted-foreground)]" />
            <p className="text-sm text-[var(--color-muted-foreground)]">대기 중인 확인 요청 없음</p>
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
                    {event.summary ?? "요약 없음"}
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
                    거부
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApproveEvent(event.id)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors font-medium"
                  >
                    <CheckCircle size={13} weight="light" />
                    승인
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
          장애 복구 타임라인
        </h2>

        {failoverEvents.length === 0 ? (
          <div className="border border-[var(--color-border)] rounded-lg p-6 text-center">
            <Clock size={24} weight="thin" className="mx-auto mb-2 text-[var(--color-muted-foreground)]" />
            <p className="text-sm text-[var(--color-muted-foreground)]">기록된 장애 복구 이벤트 없음</p>
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
                        해결됨
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-1">{event.reason}</p>
                  {event.crons_transferred && event.crons_transferred.length > 0 && (
                    <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                      이전된 크론: {event.crons_transferred.join(", ")}
                    </p>
                  )}
                </div>
                <div className="text-xs text-[var(--color-muted-foreground)] shrink-0 text-right">
                  <p>{formatTime(event.created_at)}</p>
                  {event.resolved_at && (
                    <p className="mt-0.5">해결 {formatTime(event.resolved_at)}</p>
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
