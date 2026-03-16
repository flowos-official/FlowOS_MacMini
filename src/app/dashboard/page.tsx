"use client";

import {
	ArrowDown,
	ArrowRight,
	ArrowUp,
	ArrowsClockwise,
	ChatCircleDots,
	ChatsCircle,
	Monitor,
	CalendarCheck,
	Clock,
	Cpu,
	CurrencyDollar,
	HardDrive,
	Lightning,
	ListChecks,
	Memory,
	Pulse,
	ShieldCheck,
	Skull,
	Thermometer,
	Users,
	Warning,
	WifiHigh,
	WifiSlash,
} from "@phosphor-icons/react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { PulseBeacon } from "@/components/ui/pulse-beacon";
import { useAgentEvents, useFailoverEvents } from "@/lib/hooks/use-events";
import { useFmpMessages, useFmpStats } from "@/lib/hooks/use-fmp";
import { useLatestHeartbeats, useNodeHeartbeats, useNodeRoles } from "@/lib/hooks/use-nodes";
import { useActiveSessions } from "@/lib/hooks/use-sessions";
import { useActiveTaskCounts } from "@/lib/hooks/use-tasks";
import { useWorkers } from "@/lib/hooks/use-workers";
import { cn } from "@/lib/utils";
import type {
	ActiveSession,
	AgentEvent,
	FailoverEvent,
	FmpMessage,
	NodeHeartbeat,
	NodeRole,
} from "@/types/database";

const NODE_ACCENT: Record<string, string> = {
	antoni: "text-blue-600",
	kyungjini: "text-green-600",
	jaepini: "text-purple-600",
};

const NODE_BG: Record<string, string> = {
	antoni: "bg-blue-50",
	kyungjini: "bg-green-50",
	jaepini: "bg-purple-50",
};

function parseSessionType(key: string): { type: string; detail: string | null } {
	// agent:main:main → {type:"main", detail:null}
	// agent:main:slack:channel:C123 → {type:"slack", detail:"#C123"}
	// agent:main:subagent:xxx → {type:"subagent", detail:null}
	const parts = key.split(":");
	if (parts.length >= 3) {
		const kind = parts[2];
		if (kind === "main") return { type: "main", detail: null };
		if (kind === "slack") {
			const ch = parts[4] ?? parts[3] ?? null;
			return { type: "slack", detail: ch ? `#${ch}` : null };
		}
		if (kind === "subagent") return { type: "subagent", detail: parts[3] ?? null };
		return { type: kind, detail: parts.slice(3).join(":") || null };
	}
	return { type: key, detail: null };
}

function formatModel(model: string): string {
	if (model.includes("claude-sonnet")) return "claude-sonnet";
	if (model.includes("claude-opus")) return "claude-opus";
	if (model.includes("claude-haiku")) return "claude-haiku";
	return model.split("/").pop() ?? model;
}

function timeAgo(date: string | Date | null | undefined): string {
	if (!date) return "없음";
	const now = new Date();
	const then = new Date(date);
	const diffMs = now.getTime() - then.getTime();
	const diffSec = Math.floor(diffMs / 1000);
	if (diffSec < 60) return `${diffSec}초 전`;
	const diffMin = Math.floor(diffSec / 60);
	if (diffMin < 60) return `${diffMin}분 전`;
	const diffHr = Math.floor(diffMin / 60);
	if (diffHr < 24) return `${diffHr}시간 전`;
	const diffDay = Math.floor(diffHr / 24);
	return `${diffDay}일 전`;
}

function isNodeAlive(hb: NodeHeartbeat | undefined): boolean {
	if (!hb?.created_at) return false;
	const diffMs = Date.now() - new Date(hb.created_at).getTime();
	return diffMs < 60_000; // alive if heartbeat within 60s
}

const ROLE_LABELS: Record<string, string> = {
	coordinator: "코디네이터",
	"dev-lead": "개발 리드",
	quality: "품질 관리",
};

const NODE_DISPLAY: Record<string, { name: string; role: string; emoji: string }> = {
	antoni: { name: "Antoni", role: "coordinator", emoji: "" },
	kyungjini: { name: "Kyungjini", role: "dev-lead", emoji: "" },
	jaepini: { name: "Jaepini", role: "quality", emoji: "" },
};

const FAILOVER_CHAIN = ["antoni", "kyungjini", "jaepini"];

function MetricBar({
	label,
	value,
	icon: Icon,
}: {
	label: string;
	value: number | null | undefined;
	icon: React.ComponentType<{
		size: number;
		weight: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
		className?: string;
	}>;
}) {
	const pct = value ?? 0;
	const color = pct > 85 ? "bg-red-500" : pct > 60 ? "bg-amber-500" : "bg-emerald-500";
	return (
		<div className="flex items-center gap-2">
			<Icon size={13} weight="light" className="text-neutral-400 shrink-0" />
			<span className="text-[11px] text-neutral-500 w-8 shrink-0">{label}</span>
			<div className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
				<motion.div
					className={cn("h-full rounded-full", color)}
					initial={{ width: 0 }}
					animate={{ width: `${pct}%` }}
					transition={{ duration: 0.8, ease: "easeOut" }}
				/>
			</div>
			<span className="text-[11px] text-neutral-500 w-9 text-right tabular-nums">
				{pct.toFixed(0)}%
			</span>
		</div>
	);
}

function NodeSparkline({ nodeId }: { nodeId: string }) {
	const { data: hbs = [] } = useNodeHeartbeats(nodeId);
	const points = hbs
		.slice(0, 10)
		.reverse()
		.map((h, i) => ({ i, v: h.cpu_usage ?? 0 }));
	if (points.length < 2) return null;
	return (
		<div className="h-10 w-full">
			<ResponsiveContainer width="100%" height={40}>
				<LineChart data={points}>
					<Line
						type="monotone"
						dataKey="v"
						stroke="#3b82f6"
						strokeWidth={1.5}
						dot={false}
						isAnimationActive={false}
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}

function NodeCard({
	nodeId,
	role,
	hb,
	sessions,
	index,
}: {
	nodeId: string;
	role: NodeRole | undefined;
	hb: NodeHeartbeat | undefined;
	sessions: ActiveSession[];
	index: number;
}) {
	const display = NODE_DISPLAY[nodeId] ?? { name: nodeId, role: "unknown" };
	const alive = isNodeAlive(hb);
	const sessionCount = sessions.length;
	const quota = role?.claude_session_quota ?? 0;
	const cpuPct = hb?.cpu_usage ?? null;
	const memPct = hb?.memory_usage ?? null;
	const diskPct =
		hb?.disk_free_gb != null ? Math.max(0, 100 - (hb.disk_free_gb / 500) * 100) : null;

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, delay: index * 0.1 }}
		>
			<Link href={`/dashboard/nodes/${nodeId}`} className="block group">
				<div
					className={cn(
						"relative rounded-2xl border p-5 transition-all duration-300",
						"hover:shadow-lg hover:-translate-y-1",
						alive
							? "border-neutral-200 bg-white hover:border-blue-300 hover:shadow-blue-100/50"
							: "border-red-200 bg-red-50/30 hover:border-red-300",
					)}
				>
					{/* Alive glow effect */}
					{alive && (
						<motion.div
							className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
							aria-hidden
						/>
					)}

					{/* Dead overlay */}
					{!alive && (
						<div className="absolute top-3 right-3">
							<motion.div
								animate={{ scale: [1, 1.1, 1] }}
								transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
							>
								<Skull size={20} weight="light" className="text-red-400" />
							</motion.div>
						</div>
					)}

					{/* Header */}
					<div className="relative flex items-center gap-3 mb-4">
						<PulseBeacon alive={alive} size={10} />
						<span className="font-bold text-base tracking-tight">{display.name}</span>
						{role?.is_coordinator && (
							<ShieldCheck size={16} weight="light" className="text-blue-500" />
						)}
					</div>

					{/* Badges */}
					<div className="relative flex gap-2 flex-wrap mb-4">
						<span
							className={cn(
								"text-[11px] font-semibold px-2.5 py-0.5 rounded-full",
								display.role === "coordinator"
									? "bg-blue-100 text-blue-700"
									: display.role === "dev-lead"
										? "bg-amber-100 text-amber-700"
										: "bg-emerald-100 text-emerald-700",
							)}
						>
							{ROLE_LABELS[display.role] ?? display.role}
						</span>
						<span
							className={cn(
								"text-[11px] font-medium px-2.5 py-0.5 rounded-full",
								alive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700",
							)}
						>
							{alive ? "활성" : "비활성"}
						</span>
					</div>

					{/* Claude Sessions */}
					<div className="relative mb-4">
						<div className="flex justify-between text-xs text-neutral-500 mb-1.5">
							<span>Claude 세션</span>
							<span className={cn(
								"font-semibold tabular-nums",
								sessionCount > quota
									? "text-red-600"
									: sessionCount === quota && quota > 0
										? "text-amber-600"
										: "text-neutral-800",
							)}>
								{sessionCount} / {quota}
							</span>
						</div>
						<div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
							<motion.div
								className={cn(
									"h-full rounded-full",
									sessionCount > quota
										? "bg-red-500"
										: sessionCount === quota && quota > 0
											? "bg-amber-500"
											: sessionCount > 0
												? "bg-blue-500"
												: "bg-neutral-200",
								)}
								initial={{ width: 0 }}
								animate={{ width: quota > 0 ? `${Math.min(100, (sessionCount / quota) * 100)}%` : "0%" }}
								transition={{ duration: 0.8, ease: "easeOut" }}
							/>
						</div>
					</div>

					{/* Metrics */}
					<div className="relative flex flex-col gap-2 mb-3">
						<MetricBar label="CPU" value={cpuPct} icon={Cpu} />
						<MetricBar label="MEM" value={memPct} icon={Memory} />
						<MetricBar label="DSK" value={diskPct} icon={HardDrive} />
					</div>

					{/* Extended metrics row */}
					<div className="relative flex flex-wrap gap-x-3 gap-y-1 mb-3 text-[11px] text-neutral-500">
						{hb?.power_watts != null && (
							<span className="flex items-center gap-0.5">
								<Lightning size={11} weight="light" className="text-amber-400" />
								{hb.power_watts.toFixed(0)}W
							</span>
						)}
						{hb?.cpu_temp_c != null && (
							<span className="flex items-center gap-0.5">
								<Thermometer size={11} weight="light" className="text-orange-400" />
								{hb.cpu_temp_c.toFixed(0)}°C
							</span>
						)}
						{hb?.uptime_seconds != null && (
							<span className="flex items-center gap-0.5">
								<Clock size={11} weight="light" />
								{(() => {
									const d = Math.floor(hb.uptime_seconds / 86400);
									const h = Math.floor((hb.uptime_seconds % 86400) / 3600);
									return d > 0 ? `${d}일` : `${h}시간`;
								})()}
							</span>
						)}
						{hb?.memory_pressure && hb.memory_pressure !== "normal" && (
							<span
								className={cn(
									"px-1.5 py-0 rounded-full font-semibold",
									hb.memory_pressure === "warn"
										? "bg-amber-100 text-amber-700"
										: "bg-red-100 text-red-700",
								)}
							>
								MEM {hb.memory_pressure === "warn" ? "경고" : "위험"}
							</span>
						)}
						{hb?.tailscale_status && (
							<span className="flex items-center gap-0.5">
								{hb.tailscale_status === "Running" ? (
									<WifiHigh size={11} weight="light" className="text-emerald-500" />
								) : (
									<WifiSlash size={11} weight="light" className="text-red-400" />
								)}
								TS
							</span>
						)}
						{hb?.cost_today_usd != null && hb.cost_today_usd > 0 && (
							<span className="flex items-center gap-0.5 text-emerald-600">
								<CurrencyDollar size={11} weight="light" />
								{hb.cost_today_usd.toFixed(2)}
							</span>
						)}
						{hb?.openclaw_status && (
							<span
								className={cn(
									"px-1.5 py-0 rounded-full font-semibold",
									hb.openclaw_status === "running"
										? "bg-blue-100 text-blue-700"
										: "bg-neutral-100 text-neutral-500",
								)}
							>
								OCL
							</span>
						)}
					</div>

					{/* Net I/O row */}
					{(hb?.net_in_mbps != null || hb?.net_out_mbps != null) && (
						<div className="relative flex items-center gap-3 mb-3 text-[11px] text-neutral-500">
							<span className="flex items-center gap-0.5 text-emerald-600">
								<ArrowDown size={11} weight="bold" />
								{(hb?.net_in_mbps ?? 0).toFixed(2)} MB/s
							</span>
							<span className="flex items-center gap-0.5 text-blue-500">
								<ArrowUp size={11} weight="bold" />
								{(hb?.net_out_mbps ?? 0).toFixed(2)} MB/s
							</span>
						</div>
					)}

					{/* CPU Sparkline */}
					<div className="relative mb-3">
						<div className="text-[10px] text-neutral-400 mb-1">CPU 추이</div>
						<NodeSparkline nodeId={nodeId} />
					</div>

					{/* Last heartbeat */}
					<div className="relative flex items-center gap-1.5 text-xs text-neutral-400">
						<Clock size={12} weight="light" />
						<span>마지막 응답 {timeAgo(hb?.created_at)}</span>
					</div>
				</div>
			</Link>
		</motion.div>
	);
}

function PriorityBadge({ priority }: { priority: string }) {
	const styles: Record<string, string> = {
		critical: "bg-red-100 text-red-700",
		high: "bg-amber-100 text-amber-700",
		normal: "bg-blue-100 text-blue-700",
		low: "bg-neutral-100 text-neutral-500",
	};
	return (
		<span
			className={cn(
				"text-[10px] font-semibold px-2 py-0.5 rounded-full",
				styles[priority] ?? styles.low,
			)}
		>
			{priority}
		</span>
	);
}

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
	const aliveCount = FAILOVER_CHAIN.filter((id) => isNodeAlive(heartbeatMap[id])).length;
	const { counts: taskCounts, total: totalActiveTasks } = useActiveTaskCounts();
	const { data: workersData, isFetching: workersFetching } = useWorkers();
	const { data: fmpMessages = [] } = useFmpMessages(15);
	const { data: fmpStats } = useFmpStats();

	return (
		<div className="max-w-[1280px] mx-auto">
			{/* Header */}
			<motion.div
				initial={{ opacity: 0, y: -10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4 }}
				className="mb-8"
			>
				<div className="flex items-center gap-3">
					<Pulse size={28} weight="thin" className="text-blue-500" />
					<div>
						<h1 className="text-2xl font-bold tracking-tight">관제센터</h1>
						<p className="text-sm text-neutral-500 tracking-wide">FlowOS Mac Mini 노드 모니터링</p>
					</div>
				</div>

				{/* Quick status bar */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.3 }}
					className="mt-4 flex items-center gap-6 text-sm"
				>
					<div className="flex items-center gap-2">
						<PulseBeacon alive={aliveCount > 0} size={8} />
						<span className="text-neutral-600">
							활성 노드 <span className="font-bold text-neutral-900">{aliveCount}</span> /{" "}
							{FAILOVER_CHAIN.length}
						</span>
					</div>
					<div className="flex items-center gap-2 text-neutral-600">
						<Users size={14} weight="light" />총 세션{" "}
						<span className="font-bold text-neutral-900">{activeSessions.length}</span>
					</div>
					{coordinator && (
						<div className="flex items-center gap-2 text-neutral-600">
							<ShieldCheck size={14} weight="light" className="text-blue-500" />
							코디네이터:{" "}
							<span className="font-bold text-neutral-900">
								{coordinator.display_name ?? coordinator.node_id}
							</span>
						</div>
					)}
				</motion.div>
			</motion.div>

			{/* Active Tasks Widget */}
			{totalActiveTasks > 0 && (
				<motion.section
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.35 }}
					className="mb-6"
				>
					<Link href="/dashboard/tasks" className="block group">
						<div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 flex items-center gap-4 transition-all hover:shadow-md hover:border-amber-300">
							<ListChecks size={24} weight="thin" className="text-amber-600 shrink-0" />
							<div className="flex-1">
								<div className="flex items-center gap-2 mb-1">
									<span className="font-bold text-sm">활성 Tasks</span>
									<span className="text-xl font-bold text-amber-700 tabular-nums">
										{totalActiveTasks}
									</span>
								</div>
								<div className="flex gap-3 text-[11px] text-neutral-500">
									{FAILOVER_CHAIN.map((nodeId) => {
										const count = taskCounts[nodeId];
										if (!count) return null;
										const display = NODE_DISPLAY[nodeId];
										return (
											<span key={nodeId}>
												{display?.name ?? nodeId}:{" "}
												<span className="font-semibold text-neutral-700">{count}</span>
											</span>
										);
									})}
								</div>
							</div>
							<ArrowRight
								size={16}
								weight="light"
								className="text-neutral-400 group-hover:text-neutral-600 transition-colors"
							/>
						</div>
					</Link>
				</motion.section>
			)}

			{/* Node Status Cards */}
			<section className="mb-8">
				<h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">
					노드 상태
				</h2>
				{rolesLoading ? (
					<div className="text-neutral-400 text-sm">노드 로딩 중...</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{FAILOVER_CHAIN.map((nodeId, idx) => (
							<NodeCard
								key={nodeId}
								nodeId={nodeId}
								role={roleMap[nodeId]}
								hb={heartbeatMap[nodeId]}
								sessions={activeSessions.filter((s) => s.node_id === nodeId)}
								index={idx}
							/>
						))}
					</div>
				)}
			</section>

			{/* Worker Activity Panel */}
			<motion.section
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4, delay: 0.28 }}
				className="mb-8"
			>
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
						Worker Activity
					</h2>
					<div className="flex items-center gap-2 text-[11px] text-neutral-400">
						{workersFetching && (
							<ArrowsClockwise size={12} weight="light" className="animate-spin" />
						)}
						{workersData?.fetchedAt && (
							<span>
								{new Date(workersData.fetchedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
							</span>
						)}
					</div>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{(workersData?.nodes ?? [
						{ nodeId: "antoni" },
						{ nodeId: "kyungjini" },
						{ nodeId: "jaepini" },
					]).map((node) => {
						const isOffline = "error" in node && node.error === "offline";
						const sessions = "sessions" in node ? (node.sessions ?? []) : [];
						const sessionColors: Record<string, { bg: string; text: string }> = {
							main: { bg: "#dbeafe", text: "#1d4ed8" },
							"worker-1": { bg: "#dcfce7", text: "#15803d" },
							"worker-2": { bg: "#f3e8ff", text: "#7e22ce" },
						};

						return (
							<div
								key={node.nodeId}
								className={cn(
									"rounded-2xl border p-4",
									isOffline
										? "border-neutral-100 bg-neutral-50"
										: "border-neutral-200 bg-white",
								)}
							>
								{/* Card header */}
								<div className="flex items-center gap-2 mb-3">
									<Monitor size={15} weight="thin" className={isOffline ? "text-neutral-300" : "text-neutral-500"} />
									<span className={cn("font-semibold text-sm", isOffline && "text-neutral-400")}>
										{node.nodeId}
									</span>
									{isOffline && (
										<span className="ml-auto text-[10px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
											Offline
										</span>
									)}
								</div>

								{isOffline ? (
									<p className="text-xs text-neutral-400 text-center py-3">연결 없음</p>
								) : sessions.length === 0 ? (
									<p className="text-xs text-neutral-400 text-center py-3">활성 세션 없음</p>
								) : (
									<div className="flex flex-col gap-2">
										{sessions.map((s) => {
											const colors = sessionColors[s.label] ?? { bg: "#f3f4f6", text: "#6b7280" };
											const isActive = s.minutesAgo !== null && s.minutesAgo < 3;
											return (
												<div key={s.key} className="flex items-start gap-2">
													{/* Active dot */}
													<span
														className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0"
														style={{ background: isActive ? "#22c55e" : "#d1d5db" }}
													/>
													<div className="flex-1 min-w-0">
														<div className="flex items-center gap-1.5 mb-0.5">
															<span
																className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
																style={{ background: colors.bg, color: colors.text }}
															>
																{s.label}
															</span>
															{s.minutesAgo !== null && (
																<span className="text-[10px] text-neutral-400">
																	{s.minutesAgo}m ago
																</span>
															)}
														</div>
														<p className="text-[11px] text-neutral-500 truncate">
															{s.lastMessage || "idle"}
														</p>
													</div>
												</div>
											);
										})}
									</div>
								)}
							</div>
						);
					})}
				</div>
			</motion.section>

			{/* FlowMesh Protocol */}
			<motion.section
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4, delay: 0.32 }}
				className="mb-8"
			>
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
						FlowMesh Protocol
					</h2>
					{fmpStats && (
						<span className="text-[11px] text-neutral-400">최근 1시간</span>
					)}
				</div>

				{/* FMP Stats Row */}
				{fmpStats && fmpStats.total > 0 && (
					<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
						<div className="rounded-xl border border-neutral-200 bg-white p-3">
							<div className="text-[11px] text-neutral-400 mb-1">총 메시지</div>
							<div className="text-xl font-bold tabular-nums">{fmpStats.total}</div>
						</div>
						<div className="rounded-xl border border-neutral-200 bg-white p-3">
							<div className="text-[11px] text-neutral-400 mb-1">Slack 포스팅</div>
							<div className="text-xl font-bold tabular-nums text-blue-600">{fmpStats.slackPosts}</div>
						</div>
						<div className="rounded-xl border border-neutral-200 bg-white p-3">
							<div className="text-[11px] text-neutral-400 mb-1">노드 간 통신</div>
							<div className="text-xl font-bold tabular-nums text-emerald-600">{fmpStats.nodeToNode}</div>
						</div>
						<div className="rounded-xl border border-neutral-200 bg-white p-3">
							<div className="text-[11px] text-neutral-400 mb-1">실패</div>
							<div className={cn(
								"text-xl font-bold tabular-nums",
								(fmpStats.byStatus["failed"] ?? 0) > 0 ? "text-red-600" : "text-neutral-300",
							)}>
								{fmpStats.byStatus["failed"] ?? 0}
							</div>
						</div>
					</div>
				)}

				{/* FMP Message Flow */}
				<div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
					<div className="px-5 py-3 border-b border-neutral-100 flex items-center gap-3">
						<ChatsCircle size={16} weight="light" className="text-blue-500" />
						<span className="font-semibold text-sm">메시지 흐름</span>
						<span className="ml-auto text-[11px] text-neutral-400">{fmpMessages.length}건</span>
					</div>
					{fmpMessages.length === 0 ? (
						<div className="px-5 py-8 text-center text-neutral-400 text-sm">
							FMP 메시지 없음
						</div>
					) : (
						<div className="max-h-72 overflow-y-auto divide-y divide-neutral-100">
							{fmpMessages.map((msg: FmpMessage, i: number) => {
								const isSlack = msg.to_node === "slack";
								const typeColors: Record<string, string> = {
									cmd: "bg-blue-100 text-blue-700",
									result: "bg-emerald-100 text-emerald-700",
									ack: "bg-neutral-100 text-neutral-600",
									event: "bg-amber-100 text-amber-700",
									query: "bg-purple-100 text-purple-700",
								};
								const statusColors: Record<string, string> = {
									delivered: "text-emerald-600",
									sent: "text-blue-500",
									acked: "text-emerald-600",
									failed: "text-red-500",
									expired: "text-neutral-400",
								};
								const payload = msg.payload as Record<string, unknown>;
								const summary = (payload?.summary as string) ?? (payload?.action as string) ?? (payload?.event as string) ?? "";
								const project = msg.project;

								return (
									<motion.div
										key={msg.id}
										initial={{ opacity: 0, x: -8 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{ delay: i * 0.03 }}
										className="px-5 py-2.5 flex items-center gap-3"
									>
										{isSlack ? (
											<ChatCircleDots size={14} weight="light" className="text-blue-400 shrink-0" />
										) : (
											<ArrowRight size={14} weight="light" className="text-neutral-400 shrink-0" />
										)}
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
												<span className="font-semibold text-xs">
													{msg.from_node}
												</span>
												<span className="text-neutral-300 text-xs">→</span>
												<span className="font-semibold text-xs">
													{isSlack ? `#${project ?? "slack"}` : msg.to_node}
												</span>
												<span className={cn(
													"text-[10px] font-semibold px-1.5 py-0 rounded-full",
													typeColors[msg.type] ?? "bg-neutral-100 text-neutral-500",
												)}>
													{msg.type}
												</span>
												{project && !isSlack && (
													<span className="text-[10px] text-neutral-400">{project}</span>
												)}
											</div>
											{summary && (
												<p className="text-[11px] text-neutral-500 truncate">{summary}</p>
											)}
										</div>
										<div className="flex items-center gap-2 shrink-0">
											<span className={cn("text-[10px] font-medium", statusColors[msg.status] ?? "text-neutral-400")}>
												{msg.status}
											</span>
											<span className="text-[10px] text-neutral-400">
												{timeAgo(msg.created_at)}
											</span>
										</div>
									</motion.div>
								);
							})}
						</div>
					)}
				</div>

				{/* Per-node + per-project breakdown */}
				{fmpStats && fmpStats.total > 0 && (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
						{/* By Node */}
						<div className="rounded-xl border border-neutral-200 bg-white p-4">
							<div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-2">노드별 발신</div>
							<div className="flex flex-col gap-1.5">
								{Object.entries(fmpStats.byNode).sort(([,a],[,b]) => b - a).map(([node, count]) => (
									<div key={node} className="flex items-center gap-2">
										<span className={cn("text-xs font-semibold w-20", NODE_ACCENT[node] ?? "text-neutral-700")}>{NODE_DISPLAY[node]?.name ?? node}</span>
										<div className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
											<div
												className={cn("h-full rounded-full", node === "antoni" ? "bg-blue-400" : node === "kyungjini" ? "bg-green-400" : "bg-purple-400")}
												style={{ width: `${Math.min(100, (count / fmpStats.total) * 100)}%` }}
											/>
										</div>
										<span className="text-xs text-neutral-500 tabular-nums w-6 text-right">{count}</span>
									</div>
								))}
							</div>
						</div>
						{/* By Project */}
						<div className="rounded-xl border border-neutral-200 bg-white p-4">
							<div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-2">프로젝트별</div>
							{Object.keys(fmpStats.byProject).length === 0 ? (
								<div className="text-xs text-neutral-400">프로젝트 데이터 없음</div>
							) : (
								<div className="flex flex-col gap-1.5">
									{Object.entries(fmpStats.byProject).sort(([,a],[,b]) => b - a).slice(0, 6).map(([proj, count]) => (
										<div key={proj} className="flex items-center justify-between">
											<span className="text-xs text-neutral-600 truncate">{proj}</span>
											<span className="text-xs font-semibold text-neutral-700 tabular-nums">{count}</span>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				)}
			</motion.section>

			{/* Active Sessions + Recent Events */}
			<div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-8">
				{/* Active Sessions */}
				<motion.section
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4, delay: 0.3 }}
					className="lg:col-span-2"
				>
					<h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">
						활성 세션
					</h2>
					<div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
						<div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-3">
							<Users size={18} weight="light" className="text-blue-500" />
							<span className="font-bold text-xl tabular-nums">{activeSessions.length}</span>
							<span className="text-neutral-500 text-sm">개 활성 세션</span>
						</div>
						{activeSessions.length === 0 ? (
							<div className="px-5 py-10 text-center text-neutral-400 text-sm">
								현재 활성 세션 없음
							</div>
						) : (
							<div className="max-h-80 overflow-y-auto">
								{FAILOVER_CHAIN.map((nodeId) => {
									const nodeSessions = activeSessions.filter((s) => s.node_id === nodeId);
									if (nodeSessions.length === 0) return null;
									const alive = isNodeAlive(heartbeatMap[nodeId]);
									const accentClass = NODE_ACCENT[nodeId] ?? "text-neutral-700";
									const bgClass = NODE_BG[nodeId] ?? "bg-neutral-50";
									return (
										<div key={nodeId} className="border-b border-neutral-100 last:border-0">
											<div className={cn("px-5 py-2.5 flex items-center gap-2", bgClass)}>
												<PulseBeacon alive={alive} size={8} />
												<span className={cn("font-bold text-sm", accentClass)}>
													{NODE_DISPLAY[nodeId]?.name ?? nodeId}
												</span>
												<span className="ml-auto text-[11px] text-neutral-400">
													{nodeSessions.length}개 세션
												</span>
											</div>
											<div>
												{nodeSessions.map((s: ActiveSession, si: number) => {
													const parsed = parseSessionType(s.session_type ?? "");
													const isLast = si === nodeSessions.length - 1;
													const prefix = isLast ? "└─" : "├─";
													return (
														<motion.div
															key={s.id ?? si}
															initial={{ opacity: 0, x: -8 }}
															animate={{ opacity: 1, x: 0 }}
															transition={{ delay: si * 0.04 }}
															className="px-5 py-2 flex items-center gap-2 hover:bg-neutral-50"
														>
															<span className="text-neutral-300 text-xs font-mono shrink-0">{prefix}</span>
															<span className="text-xs font-semibold text-neutral-700 w-14 shrink-0">{parsed.type}</span>
															{parsed.detail && (
																<span className="text-xs text-neutral-500 shrink-0">{parsed.detail}</span>
															)}
															{s.model && (
																<span className="ml-auto text-[11px] text-neutral-400 shrink-0">
																	{formatModel(s.model)}
																</span>
															)}
														</motion.div>
													);
												})}
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>
				</motion.section>

				{/* Recent Events */}
				<motion.section
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4, delay: 0.4 }}
					className="lg:col-span-3"
				>
					<h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">
						최근 이벤트
					</h2>
					<div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
						{agentEvents.length === 0 ? (
							<div className="px-5 py-10 text-center text-neutral-400 text-sm">
								최근 이벤트 없음
							</div>
						) : (
							<div className="max-h-96 overflow-y-auto divide-y divide-neutral-100">
								{agentEvents.map((ev: AgentEvent, i: number) => (
									<motion.div
										key={ev.id ?? i}
										initial={{ opacity: 0, x: 10 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{ delay: i * 0.05 }}
										className="px-5 py-3 flex items-center gap-3"
									>
										<Lightning size={14} weight="light" className="text-neutral-400 shrink-0" />
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 mb-0.5">
												<span className="font-semibold text-sm truncate">
													{ev.source_node ?? "—"}
												</span>
												<PriorityBadge priority={ev.priority ?? "normal"} />
											</div>
											<div className="text-xs text-neutral-500 flex gap-2 flex-wrap">
												<span>{ev.event_type ?? "—"}</span>
												{ev.status && (
													<span
														className={cn(
															ev.status === "completed"
																? "text-emerald-600"
																: ev.status === "failed"
																	? "text-red-500"
																	: "text-neutral-400",
														)}
													>
														{ev.status}
													</span>
												)}
											</div>
										</div>
										<span className="text-[11px] text-neutral-400 shrink-0">
											{timeAgo(ev.created_at)}
										</span>
									</motion.div>
								))}
							</div>
						)}
					</div>
				</motion.section>
			</div>

			{/* Failover Status */}
			<motion.section
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4, delay: 0.5 }}
				className="mb-8"
			>
				<h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">
					장애 복구 체인
				</h2>
				<div className="rounded-2xl border border-neutral-200 bg-white p-6">
					<div className="flex items-center justify-between mb-6">
						<div className="flex items-center gap-3">
							<ShieldCheck size={20} weight="light" className="text-blue-500" />
							<span className="font-semibold text-sm">현재 코디네이터:</span>
							<span className="font-bold text-sm text-blue-600">
								{coordinator?.display_name ?? coordinator?.node_id ?? "없음"}
							</span>
						</div>
						{failoverEvents.length > 0 && (
							<div className="flex items-center gap-1.5 text-xs text-neutral-400">
								<CalendarCheck size={13} weight="light" />
								마지막 장애 복구 {timeAgo(failoverEvents[0]?.created_at)}
							</div>
						)}
					</div>

					{/* Chain */}
					<div className="flex items-center gap-0 flex-wrap justify-center">
						{FAILOVER_CHAIN.map((nodeId, idx) => {
							const role = roleMap[nodeId];
							const hb = heartbeatMap[nodeId];
							const alive = isNodeAlive(hb);
							const isCoord = role?.is_coordinator ?? false;

							return (
								<div key={nodeId} className="flex items-center">
									<motion.div
										initial={{ opacity: 0, scale: 0.9 }}
										animate={{ opacity: 1, scale: 1 }}
										transition={{ delay: 0.6 + idx * 0.1 }}
										className={cn(
											"flex flex-col items-center gap-2 px-6 py-4 rounded-xl border min-w-[130px] transition-all",
											isCoord
												? "border-blue-300 bg-blue-50/50 shadow-sm"
												: alive
													? "border-neutral-200 bg-neutral-50"
													: "border-red-200 bg-red-50/50",
										)}
									>
										<div className="flex items-center gap-2">
											<PulseBeacon alive={alive} size={8} />
											<span className="font-bold text-sm">
												{NODE_DISPLAY[nodeId]?.name ?? nodeId}
											</span>
											{isCoord && (
												<ShieldCheck size={14} weight="light" className="text-blue-500" />
											)}
										</div>
										<span className="text-[11px] text-neutral-500">우선순위 {idx + 1}</span>
										<span
											className={cn(
												"text-[11px] font-semibold",
												alive ? "text-emerald-600" : "text-red-500",
											)}
										>
											{alive ? "활성" : "비활성"}
										</span>
									</motion.div>
									{idx < FAILOVER_CHAIN.length - 1 && (
										<div className="px-3 text-neutral-300">
											<ArrowRight size={18} weight="light" />
										</div>
									)}
								</div>
							);
						})}
					</div>

					{/* Failover history */}
					{failoverEvents.length > 0 && (
						<div className="mt-6 pt-4 border-t border-neutral-100">
							<div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-3">
								장애 복구 이력
							</div>
							<div className="flex flex-col gap-2">
								{failoverEvents.slice(0, 3).map((fe: FailoverEvent, i: number) => (
									<div
										key={fe.id ?? i}
										className="flex items-center gap-3 text-xs text-neutral-500"
									>
										<Warning size={12} weight="light" className="text-amber-500 shrink-0" />
										<span>
											{fe.from_node ?? "?"} →{" "}
											<strong className="text-neutral-800">{fe.to_node ?? "?"}</strong> 코디네이터
											이전
										</span>
										<span className="ml-auto">{timeAgo(fe.created_at)}</span>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</motion.section>
		</div>
	);
}
