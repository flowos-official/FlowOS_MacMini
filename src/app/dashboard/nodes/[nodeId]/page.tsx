"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
	ArrowLeft,
	Circle,
	CheckCircle,
	XCircle,
	Clock,
	HardDrive,
	Cpu,
	Database,
	Timer,
	ArrowsClockwise,
} from "@phosphor-icons/react";
import { useNodeRoles } from "@/lib/hooks/use-nodes";
import { useNodeHeartbeats } from "@/lib/hooks/use-nodes";
import { useActiveSessions } from "@/lib/hooks/use-sessions";
import { useCronExecutions } from "@/lib/hooks/use-crons";

const NODE_DISPLAY: Record<string, string> = {
	antoni: "Antoni",
	kyungjini: "Kyungjini",
	jaepini: "Jaepini",
};

function formatRelativeTime(dateStr: string): string {
	const diff = Date.now() - new Date(dateStr).getTime();
	const s = Math.floor(diff / 1000);
	if (s < 60) return `${s}s ago`;
	const m = Math.floor(s / 60);
	if (m < 60) return `${m}m ago`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h}h ago`;
	return `${Math.floor(h / 24)}d ago`;
}

function formatDuration(ms: number | null): string {
	if (ms === null) return "—";
	if (ms < 1000) return `${ms}ms`;
	return `${(ms / 1000).toFixed(1)}s`;
}

function usageColor(value: number | null): string {
	if (value === null) return "#d4d4d4";
	if (value < 60) return "#22c55e";
	if (value < 80) return "#f59e0b";
	return "#ef4444";
}

function StatusDot({ status }: { status: string }) {
	const color =
		status === "online"
			? "bg-[var(--color-success)]"
			: status === "degraded"
				? "bg-[var(--color-warning)]"
				: "bg-[var(--color-destructive)]";
	return (
		<span
			className={`inline-block w-2 h-2 rounded-full ${color}`}
			title={status}
		/>
	);
}

function CronStatusBadge({ status }: { status: string }) {
	if (status === "success") {
		return (
			<span className="inline-flex items-center gap-1 text-xs text-[var(--color-success)]">
				<CheckCircle size={13} weight="light" />
				success
			</span>
		);
	}
	if (status === "failure") {
		return (
			<span className="inline-flex items-center gap-1 text-xs text-[var(--color-destructive)]">
				<XCircle size={13} weight="light" />
				failure
			</span>
		);
	}
	if (status === "running") {
		return (
			<span className="inline-flex items-center gap-1 text-xs text-[var(--color-info)]">
				<ArrowsClockwise size={13} weight="light" />
				running
			</span>
		);
	}
	if (status === "timeout") {
		return (
			<span className="inline-flex items-center gap-1 text-xs text-[var(--color-warning)]">
				<Timer size={13} weight="light" />
				timeout
			</span>
		);
	}
	return <span className="text-xs text-[var(--color-muted-foreground)]">{status}</span>;
}

export default function NodeDetailPage({
	params,
}: {
	params: Promise<{ nodeId: string }>;
}) {
	const resolvedParams = React.use(params);
	const routeParams = useParams();
	const nodeId = (resolvedParams?.nodeId ?? routeParams?.nodeId ?? "") as string;

	const { data: allRoles, isLoading: rolesLoading } = useNodeRoles();
	const { data: heartbeats, isLoading: hbLoading } = useNodeHeartbeats(nodeId);
	const { data: sessions, isLoading: sessionsLoading } = useActiveSessions(nodeId);
	const { data: crons, isLoading: cronsLoading } = useCronExecutions(nodeId, 20);

	const role = allRoles?.find((r) => r.node_id === nodeId);
	const displayName = role?.display_name ?? NODE_DISPLAY[nodeId] ?? nodeId;

	// Last 20 heartbeats for chart (reverse to chronological order)
	const chartBeats = [...(heartbeats ?? [])].slice(0, 20).reverse();

	const isLoading = rolesLoading || hbLoading || sessionsLoading || cronsLoading;

	return (
		<div className="space-y-6 max-w-5xl">
			{/* Header */}
			<div className="flex items-start justify-between">
				<div className="space-y-2">
					<Link
						href="/dashboard"
						className="inline-flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
					>
						<ArrowLeft size={13} weight="thin" />
						Back to dashboard
					</Link>
					<div className="flex items-center gap-3">
						<h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
						{role && <StatusDot status={role.status} />}
						{role?.primary_role && (
							<span className="inline-flex items-center rounded-full border border-[var(--color-border)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-foreground)]">
								{role.primary_role}
							</span>
						)}
						{role?.is_coordinator && (
							<span className="inline-flex items-center rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-2.5 py-0.5 text-xs font-medium">
								coordinator
							</span>
						)}
					</div>
					{role && (
						<p className="text-sm text-[var(--color-muted-foreground)]">
							Node ID: <code className="font-mono text-xs">{nodeId}</code>
						</p>
					)}
				</div>
			</div>

			{isLoading && (
				<p className="text-sm text-[var(--color-muted-foreground)]">Loading node data...</p>
			)}

			{/* Node Info Card */}
			{role && (
				<section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5 space-y-4">
					<h2 className="text-sm font-semibold">Node Configuration</h2>
					<div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
						<div className="space-y-0.5">
							<p className="text-xs text-[var(--color-muted-foreground)] uppercase tracking-wide">
								Status
							</p>
							<p className="font-medium capitalize">{role.status}</p>
						</div>
						<div className="space-y-0.5">
							<p className="text-xs text-[var(--color-muted-foreground)] uppercase tracking-wide">
								Failover Priority
							</p>
							<p className="font-medium">{role.failover_priority}</p>
						</div>
						<div className="space-y-0.5">
							<p className="text-xs text-[var(--color-muted-foreground)] uppercase tracking-wide">
								Session Quota
							</p>
							<p className="font-medium">{role.claude_session_quota}</p>
						</div>
						<div className="space-y-0.5">
							<p className="text-xs text-[var(--color-muted-foreground)] uppercase tracking-wide">
								Coordinator
							</p>
							<p className="font-medium">{role.is_coordinator ? "Yes" : "No"}</p>
						</div>
						<div className="space-y-0.5">
							<p className="text-xs text-[var(--color-muted-foreground)] uppercase tracking-wide">
								Scan Gmail
							</p>
							<div className="flex items-center gap-1.5">
								{role.can_scan_gmail ? (
									<CheckCircle
										size={15}
										weight="light"
										className="text-[var(--color-success)]"
									/>
								) : (
									<XCircle
										size={15}
										weight="light"
										className="text-[var(--color-muted-foreground)]"
									/>
								)}
								<span className="font-medium">{role.can_scan_gmail ? "Allowed" : "Denied"}</span>
							</div>
						</div>
						<div className="space-y-0.5">
							<p className="text-xs text-[var(--color-muted-foreground)] uppercase tracking-wide">
								Client Comms
							</p>
							<div className="flex items-center gap-1.5">
								{role.can_send_client_comms ? (
									<CheckCircle
										size={15}
										weight="light"
										className="text-[var(--color-success)]"
									/>
								) : (
									<XCircle
										size={15}
										weight="light"
										className="text-[var(--color-muted-foreground)]"
									/>
								)}
								<span className="font-medium">
									{role.can_send_client_comms ? "Allowed" : "Denied"}
								</span>
							</div>
						</div>
					</div>
					<p className="text-xs text-[var(--color-muted-foreground)]">
						Last updated {formatRelativeTime(role.updated_at)}
					</p>
				</section>
			)}

			{/* Heartbeat Timeline Chart */}
			<section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5 space-y-4">
				<h2 className="text-sm font-semibold">Heartbeat Timeline</h2>
				{chartBeats.length === 0 ? (
					<p className="text-sm text-[var(--color-muted-foreground)]">No heartbeat data available.</p>
				) : (
					<div className="space-y-3">
						{/* CPU */}
						<div className="space-y-1">
							<div className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
								<Cpu size={13} weight="thin" />
								<span>CPU</span>
							</div>
							<div className="flex items-end gap-0.5 h-10">
								{chartBeats.map((hb) => {
									const val = hb.cpu_usage ?? 0;
									const heightPct = Math.min(100, Math.max(2, val));
									return (
										<div
											key={`cpu-${hb.id}`}
											className="flex-1 rounded-sm min-w-0 transition-all"
											style={{
												height: `${heightPct}%`,
												backgroundColor: usageColor(hb.cpu_usage),
												opacity: 0.85,
											}}
											title={`CPU: ${hb.cpu_usage !== null ? `${hb.cpu_usage.toFixed(1)}%` : "N/A"} — ${formatRelativeTime(hb.created_at)}`}
										/>
									);
								})}
							</div>
						</div>

						{/* Memory */}
						<div className="space-y-1">
							<div className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
								<Database size={13} weight="thin" />
								<span>Memory</span>
							</div>
							<div className="flex items-end gap-0.5 h-10">
								{chartBeats.map((hb) => {
									const val = hb.memory_usage ?? 0;
									const heightPct = Math.min(100, Math.max(2, val));
									return (
										<div
											key={`mem-${hb.id}`}
											className="flex-1 rounded-sm min-w-0 transition-all"
											style={{
												height: `${heightPct}%`,
												backgroundColor: usageColor(hb.memory_usage),
												opacity: 0.85,
											}}
											title={`Memory: ${hb.memory_usage !== null ? `${hb.memory_usage.toFixed(1)}%` : "N/A"} — ${formatRelativeTime(hb.created_at)}`}
										/>
									);
								})}
							</div>
						</div>

						{/* Disk */}
						<div className="space-y-1">
							<div className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
								<HardDrive size={13} weight="thin" />
								<span>Disk Free (GB)</span>
							</div>
							<div className="flex items-end gap-0.5 h-10">
								{(() => {
									const maxDisk = Math.max(
										1,
										...chartBeats.map((hb) => hb.disk_free_gb ?? 0),
									);
									return chartBeats.map((hb) => {
										const val = hb.disk_free_gb ?? 0;
										const heightPct = Math.min(100, Math.max(2, (val / maxDisk) * 100));
										// For disk free: more is better — invert the color logic
										const diskColor =
											hb.disk_free_gb === null
												? "#d4d4d4"
												: val / maxDisk > 0.4
													? "#22c55e"
													: val / maxDisk > 0.2
														? "#f59e0b"
														: "#ef4444";
										return (
											<div
												key={`disk-${hb.id}`}
												className="flex-1 rounded-sm min-w-0 transition-all"
												style={{
													height: `${heightPct}%`,
													backgroundColor: diskColor,
													opacity: 0.85,
												}}
												title={`Disk Free: ${hb.disk_free_gb !== null ? `${hb.disk_free_gb.toFixed(1)} GB` : "N/A"} — ${formatRelativeTime(hb.created_at)}`}
											/>
										);
									});
								})()}
							</div>
						</div>

						{/* X-axis time labels */}
						<div className="flex justify-between text-xs text-[var(--color-muted-foreground)] pt-1">
							{chartBeats.length > 0 && (
								<>
									<span>{formatRelativeTime(chartBeats[0].created_at)}</span>
									{chartBeats.length > 2 && (
										<span>
											{formatRelativeTime(
												chartBeats[Math.floor(chartBeats.length / 2)].created_at,
											)}
										</span>
									)}
									<span>{formatRelativeTime(chartBeats[chartBeats.length - 1].created_at)}</span>
								</>
							)}
						</div>

						{/* Legend */}
						<div className="flex items-center gap-4 pt-1 border-t border-[var(--color-border)]">
							<div className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
								<span
									className="inline-block w-2.5 h-2.5 rounded-sm"
									style={{ backgroundColor: "#22c55e" }}
								/>
								&lt; 60%
							</div>
							<div className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
								<span
									className="inline-block w-2.5 h-2.5 rounded-sm"
									style={{ backgroundColor: "#f59e0b" }}
								/>
								60–80%
							</div>
							<div className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
								<span
									className="inline-block w-2.5 h-2.5 rounded-sm"
									style={{ backgroundColor: "#ef4444" }}
								/>
								&gt; 80%
							</div>
							<span className="ml-auto text-xs text-[var(--color-muted-foreground)]">
								Last {chartBeats.length} heartbeats
							</span>
						</div>
					</div>
				)}
			</section>

			{/* Active Sessions Table */}
			<section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5 space-y-3">
				<h2 className="text-sm font-semibold">
					Active Sessions{" "}
					{sessions && sessions.length > 0 && (
						<span className="ml-1 inline-flex items-center justify-center rounded-full bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] px-1.5 py-0.5 text-xs font-medium">
							{sessions.length}
						</span>
					)}
				</h2>
				{!sessions || sessions.length === 0 ? (
					<p className="text-sm text-[var(--color-muted-foreground)]">No active sessions.</p>
				) : (
					<div className="overflow-x-auto -mx-5">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-[var(--color-border)]">
									<th className="px-5 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide">
										Type
									</th>
									<th className="px-5 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide">
										Model
									</th>
									<th className="px-5 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide">
										Project
									</th>
									<th className="px-5 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide">
										Started
									</th>
									<th className="px-5 py-2.5 text-right text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide">
										Est. Min
									</th>
									<th className="px-5 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide">
										Last Activity
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--color-border)]">
								{sessions.map((s) => (
									<tr
										key={s.id}
										className="hover:bg-[var(--color-muted)] transition-colors"
									>
										<td className="px-5 py-3 font-mono text-xs">{s.session_type}</td>
										<td className="px-5 py-3 font-mono text-xs text-[var(--color-muted-foreground)]">
											{s.model}
										</td>
										<td className="px-5 py-3 text-xs text-[var(--color-muted-foreground)]">
											{s.project_id ?? (
												<span className="text-[var(--color-muted-foreground)] opacity-50">—</span>
											)}
										</td>
										<td className="px-5 py-3 text-xs text-[var(--color-muted-foreground)]">
											{formatRelativeTime(s.started_at)}
										</td>
										<td className="px-5 py-3 text-xs text-right">{s.estimated_minutes}</td>
										<td className="px-5 py-3 text-xs text-[var(--color-muted-foreground)]">
											{formatRelativeTime(s.last_activity_at)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>

			{/* Recent Cron Executions */}
			<section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5 space-y-3">
				<h2 className="text-sm font-semibold">Recent Cron Executions</h2>
				{!crons || crons.length === 0 ? (
					<p className="text-sm text-[var(--color-muted-foreground)]">No recent cron executions.</p>
				) : (
					<div className="overflow-x-auto -mx-5">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-[var(--color-border)]">
									<th className="px-5 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide">
										Skill
									</th>
									<th className="px-5 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide">
										Status
									</th>
									<th className="px-5 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide">
										Started
									</th>
									<th className="px-5 py-2.5 text-right text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide">
										Duration
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--color-border)]">
								{crons.map((c) => (
									<tr
										key={c.id}
										className="hover:bg-[var(--color-muted)] transition-colors"
									>
										<td className="px-5 py-3 font-mono text-xs">{c.skill_name}</td>
										<td className="px-5 py-3">
											<CronStatusBadge status={c.status} />
										</td>
										<td className="px-5 py-3 text-xs text-[var(--color-muted-foreground)]">
											{formatRelativeTime(c.started_at)}
										</td>
										<td className="px-5 py-3 text-xs text-right text-[var(--color-muted-foreground)]">
											{formatDuration(c.duration_ms)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>
		</div>
	);
}
