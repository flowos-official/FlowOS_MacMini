"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
	ArrowLeft,
	CheckCircle,
	XCircle,
	Clock,
	HardDrive,
	Cpu,
	Timer,
	ArrowsClockwise,
	Thermometer,
	Lightning,
	Wind,
	ArrowUp,
	ArrowDown,
	WifiHigh,
	WifiSlash,
	Robot,
	CurrencyDollar,
	GitBranch,
	Terminal,
	CaretRight,
	CaretDown,
	Database,
	Pulse,
	Gauge,
	NetworkSlash,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { useNodeRoles, useNodeHeartbeats } from "@/lib/hooks/use-nodes";
import { useActiveSessions } from "@/lib/hooks/use-sessions";
import { useCronExecutions } from "@/lib/hooks/use-crons";
import { useOpenclawLogs, useOpenclawSessions } from "@/lib/hooks/use-openclaw-logs";
import type { NodeHeartbeat, NodeOpenclawLog, TopProcess, ClaudePid } from "@/types/database";

// ── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(date: string | Date | null | undefined): string {
	if (!date) return "—";
	const diff = Date.now() - new Date(date).getTime();
	const s = Math.floor(diff / 1000);
	if (s < 60) return `${s}초 전`;
	const m = Math.floor(s / 60);
	if (m < 60) return `${m}분 전`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h}시간 전`;
	return `${Math.floor(h / 24)}일 전`;
}

function formatUptime(seconds: number | null): string {
	if (!seconds) return "—";
	const d = Math.floor(seconds / 86400);
	const h = Math.floor((seconds % 86400) / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	if (d > 0) return `${d}일 ${h}시간`;
	if (h > 0) return `${h}시간 ${m}분`;
	return `${m}분`;
}

function formatDuration(ms: number | null): string {
	if (ms === null) return "—";
	if (ms < 1000) return `${ms}ms`;
	return `${(ms / 1000).toFixed(1)}s`;
}

function formatRuntime(sec: number): string {
	const h = Math.floor(sec / 3600);
	const m = Math.floor((sec % 3600) / 60);
	const s = sec % 60;
	if (h > 0) return `${h}h ${m}m`;
	if (m > 0) return `${m}m ${s}s`;
	return `${s}s`;
}

function metricColor(pct: number | null): string {
	if (pct === null) return "#e5e7eb";
	if (pct < 60) return "#10b981";
	if (pct < 80) return "#f59e0b";
	return "#ef4444";
}

// ── Sparkline SVG ────────────────────────────────────────────────────────────

function Sparkline({
	data,
	color,
	height = 60,
	label,
	unit = "%",
}: {
	data: (number | null)[];
	color: string;
	height?: number;
	label?: string;
	unit?: string;
}) {
	const width = 400;
	const padY = 4;
	const values = data.filter((v) => v !== null) as number[];
	if (values.length < 2) return <div className="h-16 bg-neutral-50 rounded flex items-center justify-center text-xs text-neutral-400">데이터 없음</div>;

	const max = Math.max(...values, 0.1);
	const min = 0;

	const pts = data
		.map((v, i) => {
			if (v === null) return null;
			const x = (i / (data.length - 1)) * width;
			const y = padY + (1 - (v - min) / (max - min)) * (height - padY * 2);
			return `${x},${y}`;
		})
		.filter(Boolean);

	const polyline = pts.join(" ");
	const lastVal = values[values.length - 1];

	// Fill area
	const firstPt = pts[0]?.split(",") ?? ["0", String(height)];
	const lastPtX = pts[pts.length - 1]?.split(",")[0] ?? String(width);
	const fillPath = `M ${firstPt[0]},${height} L ${polyline.split(" ").join(" L ")} L ${lastPtX},${height} Z`;

	return (
		<div className="relative">
			{label && <div className="text-xs text-neutral-500 mb-1">{label}</div>}
			<svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
				{/* Grid lines */}
				{[25, 50, 75].map((pct) => {
					const y = padY + (1 - pct / 100) * (height - padY * 2);
					return (
						<line key={pct} x1={0} y1={y} x2={width} y2={y} stroke="#f3f4f6" strokeWidth={1} />
					);
				})}
				{/* Fill */}
				<path d={fillPath} fill={color} fillOpacity={0.12} />
				{/* Line */}
				<polyline points={polyline} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
				{/* Last value dot */}
				{pts[pts.length - 1] && (
					<circle
						cx={Number(pts[pts.length - 1]!.split(",")[0])}
						cy={Number(pts[pts.length - 1]!.split(",")[1])}
						r={3}
						fill={color}
					/>
				)}
			</svg>
			<div className="flex justify-between text-[10px] text-neutral-400 mt-0.5">
				<span>0{unit}</span>
				<span className="font-semibold" style={{ color }}>{lastVal?.toFixed(1)}{unit}</span>
				<span>{max.toFixed(0)}{unit}</span>
			</div>
		</div>
	);
}

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
	icon: Icon,
	label,
	value,
	sub,
	accent,
	badge,
}: {
	// biome-ignore lint/suspicious/noExplicitAny: phosphor icon type
	icon: React.ComponentType<any>;
	label: string;
	value: React.ReactNode;
	sub?: React.ReactNode;
	accent?: string;
	badge?: React.ReactNode;
}) {
	return (
		<div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-2">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Icon size={14} weight="light" className="text-neutral-400" />
					<span className="text-xs text-neutral-500">{label}</span>
				</div>
				{badge}
			</div>
			<div className="text-xl font-bold tracking-tight" style={accent ? { color: accent } : {}}>
				{value}
			</div>
			{sub && <div className="text-xs text-neutral-400">{sub}</div>}
		</div>
	);
}

// ── Metric Bar ────────────────────────────────────────────────────────────────

function MiniBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
	const pct = Math.min(100, (value / max) * 100);
	return (
		<div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
			<motion.div
				className="h-full rounded-full"
				style={{ backgroundColor: color }}
				initial={{ width: 0 }}
				animate={{ width: `${pct}%` }}
				transition={{ duration: 0.6, ease: "easeOut" }}
			/>
		</div>
	);
}

// ── Memory Pressure Badge ────────────────────────────────────────────────────

function PressureBadge({ pressure }: { pressure: string | null }) {
	if (!pressure) return <span className="text-xs text-neutral-400">—</span>;
	const styles: Record<string, string> = {
		normal: "bg-emerald-100 text-emerald-700",
		warn: "bg-amber-100 text-amber-700",
		critical: "bg-red-100 text-red-700",
	};
	const labels: Record<string, string> = { normal: "정상", warn: "경고", critical: "위험" };
	return (
		<span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${styles[pressure] ?? "bg-neutral-100 text-neutral-600"}`}>
			{labels[pressure] ?? pressure}
		</span>
	);
}

// ── Tailscale Badge ───────────────────────────────────────────────────────────

function TailscaleBadge({ status, latencyMs }: { status: string | null; latencyMs: number | null }) {
	const isUp = status === "Running" || status === "running";
	return (
		<div className="flex items-center gap-1.5">
			{isUp ? (
				<WifiHigh size={13} weight="light" className="text-emerald-500" />
			) : (
				<WifiSlash size={13} weight="light" className="text-red-400" />
			)}
			<span className="text-xs text-neutral-500">
				{status ?? "—"}{latencyMs ? ` · ${latencyMs}ms` : ""}
			</span>
		</div>
	);
}

// ── OpenClaw Logs Viewer ─────────────────────────────────────────────────────

function OpenclawLogsViewer({ nodeId }: { nodeId: string }) {
	const [selectedSession, setSelectedSession] = useState<string | null>(null);
	const logsEndRef = useRef<HTMLDivElement>(null);

	const { data: sessions, isLoading: sessionsLoading } = useOpenclawSessions(nodeId);
	const { data: logs, isLoading: logsLoading } = useOpenclawLogs(
		nodeId,
		selectedSession ?? undefined,
		200,
	);

	// Auto-select first session
	useEffect(() => {
		if (!selectedSession && sessions && sessions.length > 0) {
			setSelectedSession(sessions[0].session_key);
		}
	}, [sessions, selectedSession]);

	// Auto-scroll to bottom
	useEffect(() => {
		logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [logs]);

	const sessionTypeBadge = (type: string | null) => {
		const styles: Record<string, string> = {
			main: "bg-blue-100 text-blue-700",
			isolated: "bg-purple-100 text-purple-700",
			cron: "bg-amber-100 text-amber-700",
		};
		return (
			<span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${styles[type ?? ""] ?? "bg-neutral-100 text-neutral-600"}`}>
				{type ?? "unknown"}
			</span>
		);
	};

	const roleBadge = (role: string | null) => {
		const styles: Record<string, string> = {
			user: "bg-blue-50 text-blue-600 border border-blue-200",
			assistant: "bg-neutral-50 text-neutral-600 border border-neutral-200",
			system: "bg-slate-100 text-slate-500 border border-slate-200",
		};
		return (
			<span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${styles[role ?? ""] ?? "bg-neutral-100 text-neutral-500"}`}>
				{role ?? "—"}
			</span>
		);
	};

	return (
		<section className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
			<div className="flex items-center gap-2 px-5 py-3.5 border-b border-neutral-100">
				<Terminal size={15} weight="light" className="text-neutral-400" />
				<h2 className="text-sm font-semibold text-neutral-800">OpenClaw 세션 로그</h2>
				{sessions && sessions.length > 0 && (
					<span className="ml-auto text-xs text-neutral-400">{sessions.length}개 세션</span>
				)}
			</div>

			{sessionsLoading ? (
				<div className="p-6 text-sm text-neutral-400">로딩 중…</div>
			) : !sessions || sessions.length === 0 ? (
				<div className="p-8 text-center space-y-2">
					<Terminal size={32} weight="thin" className="mx-auto text-neutral-300" />
					<p className="text-sm text-neutral-500">로그 없음</p>
					<p className="text-xs text-neutral-400">하트비트 스크립트에서 세션 데이터를 전송하면 여기에 표시됩니다.</p>
				</div>
			) : (
				<div className="flex h-[520px]">
					{/* Session list */}
					<div className="w-56 border-r border-neutral-100 overflow-y-auto bg-neutral-50/50 shrink-0">
						{sessions.map((s) => (
							<button
								key={s.session_key}
								type="button"
								onClick={() => setSelectedSession(s.session_key)}
								className={`w-full text-left px-3 py-3 border-b border-neutral-100 transition-colors ${
									selectedSession === s.session_key
										? "bg-white border-l-2 border-l-blue-500"
										: "hover:bg-white"
								}`}
							>
								<div className="flex items-center gap-1.5 mb-1">
									{sessionTypeBadge(s.session_type)}
									{s.model && (
										<span className="text-[10px] text-neutral-400 truncate">{s.model}</span>
									)}
								</div>
								<div className="text-[11px] text-neutral-500 font-mono truncate" title={s.session_key}>
									{s.session_key.length > 22 ? `…${s.session_key.slice(-18)}` : s.session_key}
								</div>
								<div className="flex items-center justify-between mt-1">
									<span className="text-[10px] text-neutral-400">{timeAgo(s.created_at)}</span>
									<span className="text-[10px] text-neutral-400">{s.message_count}개</span>
								</div>
							</button>
						))}
					</div>

					{/* Log messages */}
					<div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white">
						{logsLoading ? (
							<div className="text-sm text-neutral-400 py-4">로딩 중…</div>
						) : !logs || logs.length === 0 ? (
							<div className="text-sm text-neutral-400 py-4">선택한 세션에 로그가 없습니다.</div>
						) : (
							<>
								{logs.map((log: NodeOpenclawLog) => (
									<motion.div
										key={log.id}
										initial={{ opacity: 0, y: 4 }}
										animate={{ opacity: 1, y: 0 }}
										className="group"
									>
										<div className="flex items-start gap-2">
											{roleBadge(log.role)}
											<div className="flex-1 min-w-0">
												<div className={`text-xs leading-relaxed whitespace-pre-wrap break-words font-mono ${
													log.role === "assistant"
														? "text-neutral-700"
														: log.role === "user"
															? "text-blue-700"
															: "text-slate-500 italic"
												}`}>
													{log.content}
												</div>
												<div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
													<span className="text-[10px] text-neutral-400">{timeAgo(log.created_at)}</span>
													{log.tokens && (
														<span className="text-[10px] text-neutral-400">{log.tokens} tokens</span>
													)}
												</div>
											</div>
										</div>
									</motion.div>
								))}
								<div ref={logsEndRef} />
							</>
						)}
					</div>
				</div>
			)}
		</section>
	);
}

// ── Cron Status Badge ─────────────────────────────────────────────────────────

function CronStatusBadge({ status }: { status: string }) {
	if (status === "success") return <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle size={13} weight="light" />성공</span>;
	if (status === "failure") return <span className="inline-flex items-center gap-1 text-xs text-red-500"><XCircle size={13} weight="light" />실패</span>;
	if (status === "running") return <span className="inline-flex items-center gap-1 text-xs text-blue-500"><ArrowsClockwise size={13} weight="light" />실행 중</span>;
	if (status === "timeout") return <span className="inline-flex items-center gap-1 text-xs text-amber-500"><Timer size={13} weight="light" />시간 초과</span>;
	return <span className="text-xs text-neutral-400">{status}</span>;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const NODE_DISPLAY: Record<string, { name: string; role: string }> = {
	antoni: { name: "Antoni", role: "coordinator" },
	kyungjini: { name: "Kyungjini", role: "dev-lead" },
	jaepini: { name: "Jaepini", role: "quality" },
};

export default function NodeDetailPage({
	params,
}: {
	params: Promise<{ nodeId: string }>;
}) {
	const resolvedParams = React.use(params);
	const routeParams = useParams();
	const nodeId = (resolvedParams?.nodeId ?? routeParams?.nodeId ?? "") as string;

	const { data: allRoles } = useNodeRoles();
	const { data: heartbeats } = useNodeHeartbeats(nodeId);
	const { data: sessions } = useActiveSessions(nodeId);
	const { data: crons } = useCronExecutions(nodeId, 20);

	const role = allRoles?.find((r) => r.node_id === nodeId);
	const displayInfo = NODE_DISPLAY[nodeId] ?? { name: nodeId, role: "unknown" };
	const displayName = role?.display_name ?? displayInfo.name;

	// Latest heartbeat
	const hb: NodeHeartbeat | undefined = heartbeats?.[0];

	// Chart data (last 50 heartbeats, chronological)
	const chartBeats = [...(heartbeats ?? [])].slice(0, 50).reverse();
	const cpuSeries = chartBeats.map((h) => h.cpu_usage);
	const memSeries = chartBeats.map((h) => h.memory_usage);
	const powerSeries = chartBeats.map((h) => h.power_watts);
	const netInSeries = chartBeats.map((h) => h.net_in_mbps);

	const isAlive = hb ? Date.now() - new Date(hb.created_at).getTime() < 90_000 : false;

	const diskUsedPct =
		hb?.disk_total_gb && hb?.disk_used_gb
			? (hb.disk_used_gb / hb.disk_total_gb) * 100
			: hb?.disk_free_gb
				? Math.max(0, 100 - (hb.disk_free_gb / 500) * 100)
				: null;

	return (
		<div className="space-y-5 max-w-6xl">
			{/* Header */}
			<div className="flex items-start justify-between">
				<div className="space-y-2">
					<Link
						href="/dashboard"
						className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
					>
						<ArrowLeft size={13} weight="thin" />
						개요로 돌아가기
					</Link>
					<div className="flex items-center gap-3">
						<div className={`w-2.5 h-2.5 rounded-full ${isAlive ? "bg-emerald-400 shadow-emerald-300 shadow-[0_0_6px_2px]" : "bg-red-400"}`} />
						<h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
						{role?.primary_role && (
							<span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
								{role.primary_role === "dev-lead" ? "개발 리드" : role.primary_role === "quality" ? "품질 관리" : role.primary_role === "coordinator" ? "코디네이터" : role.primary_role}
							</span>
						)}
						{role?.is_coordinator && (
							<span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
								코디네이터
							</span>
						)}
					</div>
					{hb && (
						<p className="text-xs text-neutral-400">
							마지막 응답: {timeAgo(hb.created_at)}
						</p>
					)}
				</div>
			</div>

			{/* ── Row 1: Live Metrics Grid ────────────────────────────────── */}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
				{/* CPU */}
				<StatCard
					icon={Cpu}
					label="CPU"
					value={hb?.cpu_usage != null ? `${hb.cpu_usage.toFixed(0)}%` : "—"}
					accent={metricColor(hb?.cpu_usage ?? null)}
					sub={
						hb?.cpu_temp_c != null ? (
							<span className="flex items-center gap-1">
								<Thermometer size={11} weight="light" />
								{hb.cpu_temp_c.toFixed(0)}°C
							</span>
						) : undefined
					}
				/>

				{/* Memory */}
				<StatCard
					icon={Database}
					label="메모리"
					value={hb?.memory_usage != null ? `${hb.memory_usage.toFixed(0)}%` : "—"}
					accent={metricColor(hb?.memory_usage ?? null)}
					sub={
						<div className="space-y-0.5">
							{hb?.memory_wired_gb != null && <div>고정 {hb.memory_wired_gb.toFixed(1)}GB</div>}
							{hb?.memory_compressed_gb != null && <div>압축 {hb.memory_compressed_gb.toFixed(1)}GB</div>}
							{hb?.memory_pressure && <PressureBadge pressure={hb.memory_pressure} />}
						</div>
					}
				/>

				{/* Disk */}
				<StatCard
					icon={HardDrive}
					label="디스크"
					value={
						hb?.disk_total_gb && hb?.disk_used_gb
							? `${hb.disk_used_gb.toFixed(0)}/${hb.disk_total_gb.toFixed(0)}GB`
							: hb?.disk_free_gb != null
								? `${hb.disk_free_gb.toFixed(0)}GB 여유`
								: "—"
					}
					accent={metricColor(diskUsedPct)}
					sub={
						(hb?.disk_read_mbps != null || hb?.disk_write_mbps != null) ? (
							<div className="space-y-0.5">
								{hb?.disk_read_mbps != null && <div>읽기 {hb.disk_read_mbps.toFixed(1)} MB/s</div>}
								{hb?.disk_write_mbps != null && <div>쓰기 {hb.disk_write_mbps.toFixed(1)} MB/s</div>}
							</div>
						) : undefined
					}
				/>

				{/* Power */}
				<StatCard
					icon={Lightning}
					label="전력"
					value={hb?.power_watts != null ? `${hb.power_watts.toFixed(0)}W` : "—"}
					sub={
						hb?.fan_rpm != null ? (
							<span className="flex items-center gap-1">
								<Wind size={11} weight="light" />
								{hb.fan_rpm.toLocaleString()} RPM
							</span>
						) : undefined
					}
				/>

				{/* GPU / ANE */}
				<StatCard
					icon={Pulse}
					label="GPU / ANE"
					value={
						hb?.gpu_usage != null
							? `${hb.gpu_usage.toFixed(0)}%`
							: "—"
					}
					accent={metricColor(hb?.gpu_usage ?? null)}
					sub={
						hb?.ane_usage != null ? (
							<div>ANE {hb.ane_usage.toFixed(0)}%</div>
						) : undefined
					}
				/>

				{/* Network */}
				<StatCard
					icon={Gauge}
					label="네트워크"
					value={
						hb?.net_in_mbps != null || hb?.net_out_mbps != null ? (
							<div className="text-sm space-y-0.5">
								<div className="flex items-center gap-1 text-emerald-600">
									<ArrowDown size={11} weight="bold" />
									{(hb?.net_in_mbps ?? 0).toFixed(2)} MB/s
								</div>
								<div className="flex items-center gap-1 text-blue-600">
									<ArrowUp size={11} weight="bold" />
									{(hb?.net_out_mbps ?? 0).toFixed(2)} MB/s
								</div>
							</div>
						) : "—"
					}
				/>
			</div>

			{/* ── Row 2: Charts ──────────────────────────────────────────────── */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div className="rounded-xl border border-neutral-200 bg-white p-4">
					<div className="flex items-center gap-1.5 mb-3">
						<Cpu size={13} weight="light" className="text-neutral-400" />
						<span className="text-xs font-medium text-neutral-600">CPU 추이</span>
					</div>
					<Sparkline data={cpuSeries} color="#10b981" height={64} unit="%" />
				</div>
				<div className="rounded-xl border border-neutral-200 bg-white p-4">
					<div className="flex items-center gap-1.5 mb-3">
						<Database size={13} weight="light" className="text-neutral-400" />
						<span className="text-xs font-medium text-neutral-600">메모리 추이</span>
					</div>
					<Sparkline data={memSeries} color="#6366f1" height={64} unit="%" />
				</div>
				<div className="rounded-xl border border-neutral-200 bg-white p-4">
					<div className="flex items-center gap-1.5 mb-3">
						<Lightning size={13} weight="light" className="text-neutral-400" />
						<span className="text-xs font-medium text-neutral-600">전력 추이</span>
					</div>
					<Sparkline data={powerSeries} color="#f59e0b" height={64} unit="W" />
				</div>
				<div className="rounded-xl border border-neutral-200 bg-white p-4">
					<div className="flex items-center gap-1.5 mb-3">
						<ArrowDown size={13} weight="light" className="text-neutral-400" />
						<span className="text-xs font-medium text-neutral-600">수신 대역폭</span>
					</div>
					<Sparkline data={netInSeries} color="#3b82f6" height={64} unit=" MB/s" />
				</div>
			</div>

			{/* ── Row 3: System Info ──────────────────────────────────────────── */}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<div className="rounded-xl border border-neutral-200 bg-white p-4">
					<div className="flex items-center gap-1.5 mb-2">
						<Clock size={13} weight="light" className="text-neutral-400" />
						<span className="text-xs text-neutral-500">업타임</span>
					</div>
					<div className="text-lg font-bold text-neutral-800">{formatUptime(hb?.uptime_seconds ?? null)}</div>
				</div>

				<div className="rounded-xl border border-neutral-200 bg-white p-4">
					<div className="flex items-center gap-1.5 mb-2">
						<Database size={13} weight="light" className="text-neutral-400" />
						<span className="text-xs text-neutral-500">메모리 압력</span>
					</div>
					<PressureBadge pressure={hb?.memory_pressure ?? null} />
					{hb?.swap_used_gb != null && (
						<div className="text-xs text-neutral-400 mt-1.5">스왑 {hb.swap_used_gb.toFixed(1)}GB</div>
					)}
				</div>

				<div className="rounded-xl border border-neutral-200 bg-white p-4">
					<div className="flex items-center gap-1.5 mb-2">
						<WifiHigh size={13} weight="light" className="text-neutral-400" />
						<span className="text-xs text-neutral-500">Tailscale</span>
					</div>
					<TailscaleBadge status={hb?.tailscale_status ?? null} latencyMs={hb?.tailscale_latency_ms ?? null} />
					{hb?.latency_supabase_ms != null && (
						<div className="text-xs text-neutral-400 mt-1">Supabase {hb.latency_supabase_ms}ms</div>
					)}
					{hb?.latency_anthropic_ms != null && (
						<div className="text-xs text-neutral-400">Anthropic {hb.latency_anthropic_ms}ms</div>
					)}
				</div>

				<div className="rounded-xl border border-neutral-200 bg-white p-4">
					<div className="flex items-center gap-1.5 mb-2">
						<GitBranch size={13} weight="light" className="text-neutral-400" />
						<span className="text-xs text-neutral-500">Git 레포</span>
					</div>
					<div className="text-lg font-bold text-neutral-800">{hb?.git_repo_count ?? "—"}</div>
					<div className="text-xs text-neutral-400 mt-0.5">로컬 레포지토리</div>
				</div>
			</div>

			{/* ── Row 4: AI Activity ──────────────────────────────────────────── */}
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				{/* Claude PIDs */}
				<section className="rounded-xl border border-neutral-200 bg-white p-5">
					<div className="flex items-center gap-2 mb-4">
						<Robot size={15} weight="light" className="text-neutral-400" />
						<h2 className="text-sm font-semibold">Claude 프로세스</h2>
						<span className="ml-auto text-xs text-neutral-400">
							{hb?.active_claude_sessions ?? 0}개 실행 중
						</span>
					</div>
					{!hb?.claude_pids || hb.claude_pids.length === 0 ? (
						<p className="text-sm text-neutral-400">실행 중인 Claude 없음</p>
					) : (
						<div className="space-y-2">
							{(hb.claude_pids as ClaudePid[]).map((p) => (
								<div key={p.pid} className="flex items-center gap-3 text-xs text-neutral-600">
									<span className="font-mono text-neutral-400 w-14">{p.pid}</span>
									<span className="text-neutral-500 flex-1">{p.model}</span>
									<span>{(p.memory_mb).toFixed(0)}MB</span>
									<span className="text-neutral-400">{formatRuntime(p.runtime_sec)}</span>
								</div>
							))}
						</div>
					)}

					<div className="mt-4 pt-4 border-t border-neutral-100 grid grid-cols-3 gap-3">
						<div>
							<div className="text-[10px] text-neutral-400 mb-1">오늘 토큰</div>
							<div className="text-sm font-bold text-neutral-700">
								{hb?.tokens_today != null ? hb.tokens_today.toLocaleString() : "—"}
							</div>
						</div>
						<div>
							<div className="text-[10px] text-neutral-400 mb-1">오늘 비용</div>
							<div className="text-sm font-bold text-neutral-700 flex items-center gap-0.5">
								<CurrencyDollar size={13} weight="light" className="text-neutral-400" />
								{hb?.cost_today_usd != null ? hb.cost_today_usd.toFixed(3) : "—"}
							</div>
						</div>
						<div>
							<div className="text-[10px] text-neutral-400 mb-1">API 레이턴시</div>
							<div className="text-sm font-bold text-neutral-700">
								{hb?.api_latency_ms != null ? `${hb.api_latency_ms}ms` : "—"}
							</div>
						</div>
					</div>
				</section>

				{/* Top Processes */}
				<section className="rounded-xl border border-neutral-200 bg-white p-5">
					<div className="flex items-center gap-2 mb-4">
						<Pulse size={15} weight="light" className="text-neutral-400" />
						<h2 className="text-sm font-semibold">상위 프로세스</h2>
					</div>
					{!hb?.top_processes || (hb.top_processes as TopProcess[]).length === 0 ? (
						<p className="text-sm text-neutral-400">프로세스 데이터 없음</p>
					) : (
						<div className="space-y-3">
							{(hb.top_processes as TopProcess[]).map((p, i) => (
								<div key={`${p.name}-${i}`} className="space-y-1">
									<div className="flex items-center justify-between text-xs">
										<span className="font-mono text-neutral-700 truncate max-w-[140px]" title={p.name}>{p.name}</span>
										<div className="flex items-center gap-3 text-neutral-500">
											<span>{p.cpu_pct.toFixed(1)}%</span>
											<span>{p.mem_mb.toFixed(0)}MB</span>
										</div>
									</div>
									<MiniBar value={p.cpu_pct} color={metricColor(p.cpu_pct)} />
								</div>
							))}
						</div>
					)}
				</section>
			</div>

			{/* ── Row 5: OpenClaw Logs ──────────────────────────────────────── */}
			<OpenclawLogsViewer nodeId={nodeId} />

			{/* ── Row 6: Active Sessions ─────────────────────────────────────── */}
			<section className="rounded-xl border border-neutral-200 bg-white p-5">
				<div className="flex items-center gap-2 mb-4">
					<Robot size={15} weight="light" className="text-neutral-400" />
					<h2 className="text-sm font-semibold">
						활성 세션
						{sessions && sessions.length > 0 && (
							<span className="ml-2 text-xs bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded-full">{sessions.length}</span>
						)}
					</h2>
				</div>
				{!sessions || sessions.length === 0 ? (
					<p className="text-sm text-neutral-400">세션 없음</p>
				) : (
					<div className="overflow-x-auto -mx-5">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-neutral-100">
									{["유형", "모델", "프로젝트", "시작", "예상 시간", "마지막 활동"].map((h) => (
										<th key={h} className="px-5 py-2.5 text-left text-[11px] font-medium text-neutral-400 uppercase tracking-wide">{h}</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-neutral-50">
								{sessions.map((s) => (
									<tr key={s.id} className="hover:bg-neutral-50 transition-colors">
										<td className="px-5 py-3 font-mono text-xs text-neutral-600">{s.session_type}</td>
										<td className="px-5 py-3 font-mono text-xs text-neutral-400">{s.model}</td>
										<td className="px-5 py-3 text-xs text-neutral-400">{s.project_id ?? "—"}</td>
										<td className="px-5 py-3 text-xs text-neutral-400">{timeAgo(s.started_at)}</td>
										<td className="px-5 py-3 text-xs text-neutral-600">{s.estimated_minutes}분</td>
										<td className="px-5 py-3 text-xs text-neutral-400">{timeAgo(s.last_activity_at)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>

			{/* ── Row 7: Cron Executions ──────────────────────────────────────── */}
			<section className="rounded-xl border border-neutral-200 bg-white p-5">
				<div className="flex items-center gap-2 mb-4">
					<ArrowsClockwise size={15} weight="light" className="text-neutral-400" />
					<h2 className="text-sm font-semibold">최근 크론 실행</h2>
				</div>
				{!crons || crons.length === 0 ? (
					<p className="text-sm text-neutral-400">크론 실행 없음</p>
				) : (
					<div className="overflow-x-auto -mx-5">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-neutral-100">
									{["스킬", "상태", "시작", "소요 시간"].map((h) => (
										<th key={h} className="px-5 py-2.5 text-left text-[11px] font-medium text-neutral-400 uppercase tracking-wide">{h}</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-neutral-50">
								{crons.map((c) => (
									<tr key={c.id} className="hover:bg-neutral-50 transition-colors">
										<td className="px-5 py-3 font-mono text-xs text-neutral-600">{c.skill_name}</td>
										<td className="px-5 py-3"><CronStatusBadge status={c.status} /></td>
										<td className="px-5 py-3 text-xs text-neutral-400">{timeAgo(c.started_at)}</td>
										<td className="px-5 py-3 text-xs text-neutral-400 text-right">{formatDuration(c.duration_ms)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>

			{/* ── Row 8: Heartbeat Timeline (mini charts) ─────────────────── */}
			<section className="rounded-xl border border-neutral-200 bg-white p-5">
				<div className="flex items-center gap-2 mb-4">
					<Pulse size={15} weight="light" className="text-neutral-400" />
					<h2 className="text-sm font-semibold">하트비트 히스토리</h2>
					<span className="ml-auto text-xs text-neutral-400">최근 {chartBeats.length}개</span>
				</div>
				{chartBeats.length < 2 ? (
					<p className="text-sm text-neutral-400">데이터 없음</p>
				) : (
					<div className="space-y-4">
						<Sparkline data={cpuSeries} color="#10b981" height={48} label="CPU %" unit="%" />
						<Sparkline data={memSeries} color="#6366f1" height={48} label="메모리 %" unit="%" />
						{diskUsedPct !== null && (
							<Sparkline
								data={chartBeats.map((h) =>
									h.disk_total_gb && h.disk_used_gb
										? (h.disk_used_gb / h.disk_total_gb) * 100
										: h.disk_free_gb != null
											? Math.max(0, 100 - (h.disk_free_gb / 500) * 100)
											: null
								)}
								color="#f59e0b"
								height={48}
								label="디스크 사용 %"
								unit="%"
							/>
						)}
					</div>
				)}
			</section>
		</div>
	);
}
