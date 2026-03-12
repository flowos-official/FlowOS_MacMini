"use client";

import { useState } from "react";
import {
	Lightning,
	ArrowRight,
	CaretDown,
	CaretRight,
	Broadcast,
	ArrowsLeftRight,
} from "@phosphor-icons/react";
import { useAgentEvents, useFailoverEvents } from "@/lib/hooks/use-events";
import type { AgentEvent, FailoverEvent } from "@/types/database";

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
	const now = Date.now();
	const then = new Date(dateStr).getTime();
	const diff = Math.floor((now - then) / 1000);

	if (diff < 60) return `${diff}s ago`;
	if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
	if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
	return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Badge components ────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: string }) {
	const styles: Record<string, string> = {
		critical: "bg-red-50 text-red-700 border border-red-200",
		high: "bg-orange-50 text-orange-700 border border-orange-200",
		normal: "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] border border-[var(--color-border)]",
		low: "bg-[var(--color-secondary)] text-[var(--color-muted-foreground)] border border-[var(--color-border)]",
	};
	const cls = styles[priority] ?? styles.normal;
	return (
		<span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${cls}`}>
			{priority}
		</span>
	);
}

function StatusBadge({ status }: { status: string }) {
	const styles: Record<string, string> = {
		pending: "bg-yellow-50 text-yellow-700 border border-yellow-200",
		claimed: "bg-blue-50 text-blue-700 border border-blue-200",
		processed: "bg-green-50 text-green-700 border border-green-200",
		failed: "bg-red-50 text-red-700 border border-red-200",
	};
	const cls = styles[status] ?? styles.pending;
	return (
		<span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${cls}`}>
			{status}
		</span>
	);
}

// ─── Filter types ────────────────────────────────────────────────────────────

type StatusFilter = "all" | "pending" | "claimed" | "processed" | "failed";
type PriorityFilter = "all" | "critical" | "high" | "normal" | "low";
type SourceFilter = "all" | "antoni" | "kyungjini" | "jaepini";

// ─── Event row ───────────────────────────────────────────────────────────────

function EventRow({ event }: { event: AgentEvent }) {
	const [expanded, setExpanded] = useState(false);

	return (
		<>
			<tr
				className="border-b border-[var(--color-border)] hover:bg-[var(--color-muted)] cursor-pointer transition-colors"
				onClick={() => setExpanded((v) => !v)}
			>
				<td className="px-4 py-3 w-8">
					{expanded ? (
						<CaretDown size={14} weight="thin" className="text-[var(--color-muted-foreground)]" />
					) : (
						<CaretRight size={14} weight="thin" className="text-[var(--color-muted-foreground)]" />
					)}
				</td>
				<td className="px-4 py-3">
					<div className="flex items-center gap-1.5 text-sm text-[var(--color-foreground)]">
						<span className="font-medium">{event.source_node}</span>
						<ArrowRight size={13} weight="thin" className="text-[var(--color-muted-foreground)] shrink-0" />
						{event.target_node ? (
							<span className="font-medium">{event.target_node}</span>
						) : (
							<span className="flex items-center gap-1 text-[var(--color-muted-foreground)]">
								<Broadcast size={13} weight="thin" />
								broadcast
							</span>
						)}
					</div>
				</td>
				<td className="px-4 py-3">
					<span className="text-sm font-mono text-[var(--color-foreground)]">{event.event_type}</span>
				</td>
				<td className="px-4 py-3">
					<PriorityBadge priority={event.priority} />
				</td>
				<td className="px-4 py-3">
					<StatusBadge status={event.status} />
				</td>
				<td className="px-4 py-3 max-w-xs">
					{event.summary ? (
						<p className="text-sm text-[var(--color-muted-foreground)] truncate">{event.summary}</p>
					) : (
						<span className="text-sm text-[var(--color-muted-foreground)] opacity-40">—</span>
					)}
				</td>
				<td className="px-4 py-3 text-right whitespace-nowrap">
					<span className="text-xs text-[var(--color-muted-foreground)]">{timeAgo(event.created_at)}</span>
				</td>
			</tr>
			{expanded && (
				<tr className="border-b border-[var(--color-border)] bg-[var(--color-secondary)]">
					<td colSpan={7} className="px-8 py-4">
						<div className="space-y-2">
							{event.claimed_by && (
								<p className="text-xs text-[var(--color-muted-foreground)]">
									Claimed by: <span className="font-medium text-[var(--color-foreground)]">{event.claimed_by}</span>
								</p>
							)}
							{event.processed_at && (
								<p className="text-xs text-[var(--color-muted-foreground)]">
									Processed at: <span className="font-medium text-[var(--color-foreground)]">{new Date(event.processed_at).toLocaleString()}</span>
								</p>
							)}
							{event.project_id && (
								<p className="text-xs text-[var(--color-muted-foreground)]">
									Project: <span className="font-medium text-[var(--color-foreground)] font-mono">{event.project_id}</span>
								</p>
							)}
							<div>
								<p className="text-xs text-[var(--color-muted-foreground)] mb-1.5">Payload:</p>
								<pre className="text-xs bg-[var(--color-background)] border border-[var(--color-border)] rounded-md p-3 overflow-auto max-h-64 text-[var(--color-foreground)]">
									{event.data ? JSON.stringify(event.data, null, 2) : "null"}
								</pre>
							</div>
						</div>
					</td>
				</tr>
			)}
		</>
	);
}

// ─── Failover row ─────────────────────────────────────────────────────────────

function FailoverRow({ event }: { event: FailoverEvent }) {
	return (
		<div className="border border-[var(--color-border)] rounded-lg p-4 space-y-2">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 text-sm font-medium text-[var(--color-foreground)]">
					<span>{event.from_node}</span>
					<ArrowsLeftRight size={14} weight="thin" className="text-[var(--color-muted-foreground)]" />
					<span>{event.to_node}</span>
				</div>
				<div className="flex items-center gap-2">
					<span
						className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${
							event.resolved_at
								? "bg-green-50 text-green-700 border border-green-200"
								: "bg-yellow-50 text-yellow-700 border border-yellow-200"
						}`}
					>
						{event.resolved_at ? "resolved" : "active"}
					</span>
					<span className="text-xs text-[var(--color-muted-foreground)]">{timeAgo(event.created_at)}</span>
				</div>
			</div>
			<p className="text-sm text-[var(--color-muted-foreground)]">{event.reason}</p>
			{event.crons_transferred && event.crons_transferred.length > 0 && (
				<div>
					<p className="text-xs text-[var(--color-muted-foreground)] mb-1">Crons transferred:</p>
					<div className="flex flex-wrap gap-1.5">
						{event.crons_transferred.map((cron) => (
							<span
								key={cron}
								className="inline-flex items-center px-2 py-0.5 rounded bg-[var(--color-muted)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-foreground)]"
							>
								{cron}
							</span>
						))}
					</div>
				</div>
			)}
			{event.resolved_at && (
				<p className="text-xs text-[var(--color-muted-foreground)]">
					Resolved: {new Date(event.resolved_at).toLocaleString()}
				</p>
			)}
		</div>
	);
}

// ─── Filter select ────────────────────────────────────────────────────────────

function FilterSelect<T extends string>({
	label,
	value,
	options,
	onChange,
}: {
	label: string;
	value: T;
	options: { value: T; label: string }[];
	onChange: (v: T) => void;
}) {
	return (
		<div className="flex items-center gap-2">
			<label className="text-xs text-[var(--color-muted-foreground)] whitespace-nowrap">{label}</label>
			<select
				value={value}
				onChange={(e) => onChange(e.target.value as T)}
				className="text-sm border border-[var(--color-border)] rounded-md px-2.5 py-1.5 bg-[var(--color-background)] text-[var(--color-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
			>
				{options.map((opt) => (
					<option key={opt.value} value={opt.value}>
						{opt.label}
					</option>
				))}
			</select>
		</div>
	);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EventsPage() {
	const { data: events = [] } = useAgentEvents(100);
	const { data: failoverEvents = [] } = useFailoverEvents();

	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
	const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

	const pendingCount = events.filter((e) => e.status === "pending").length;

	const filtered = events.filter((e) => {
		if (statusFilter !== "all" && e.status !== statusFilter) return false;
		if (priorityFilter !== "all" && e.priority !== priorityFilter) return false;
		if (sourceFilter !== "all" && e.source_node !== sourceFilter) return false;
		return true;
	});

	return (
		<div className="space-y-8">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Lightning size={22} weight="thin" className="text-[var(--color-foreground)]" />
					<h1 className="text-xl font-semibold text-[var(--color-foreground)]">Agent Events</h1>
					{pendingCount > 0 && (
						<span className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200 text-xs font-medium">
							{pendingCount} pending
						</span>
					)}
				</div>
				<p className="text-sm text-[var(--color-muted-foreground)]">
					{filtered.length} of {events.length} events
				</p>
			</div>

			{/* Filter Bar */}
			<div className="flex flex-wrap items-center gap-4 p-4 bg-[var(--color-secondary)] border border-[var(--color-border)] rounded-lg">
				<FilterSelect<StatusFilter>
					label="Status"
					value={statusFilter}
					onChange={setStatusFilter}
					options={[
						{ value: "all", label: "All statuses" },
						{ value: "pending", label: "Pending" },
						{ value: "claimed", label: "Claimed" },
						{ value: "processed", label: "Processed" },
						{ value: "failed", label: "Failed" },
					]}
				/>
				<FilterSelect<PriorityFilter>
					label="Priority"
					value={priorityFilter}
					onChange={setPriorityFilter}
					options={[
						{ value: "all", label: "All priorities" },
						{ value: "critical", label: "Critical" },
						{ value: "high", label: "High" },
						{ value: "normal", label: "Normal" },
						{ value: "low", label: "Low" },
					]}
				/>
				<FilterSelect<SourceFilter>
					label="Source node"
					value={sourceFilter}
					onChange={setSourceFilter}
					options={[
						{ value: "all", label: "All nodes" },
						{ value: "antoni", label: "Antoni" },
						{ value: "kyungjini", label: "Kyungjini" },
						{ value: "jaepini", label: "Jaepini" },
					]}
				/>
			</div>

			{/* Events Table */}
			<div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
				<table className="w-full table-auto">
					<thead>
						<tr className="border-b border-[var(--color-border)] bg-[var(--color-secondary)]">
							<th className="px-4 py-2.5 w-8" />
							<th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
								Route
							</th>
							<th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
								Type
							</th>
							<th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
								Priority
							</th>
							<th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
								Status
							</th>
							<th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
								Summary
							</th>
							<th className="px-4 py-2.5 text-right text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
								Time
							</th>
						</tr>
					</thead>
					<tbody>
						{filtered.length === 0 ? (
							<tr>
								<td colSpan={7} className="px-4 py-12 text-center text-sm text-[var(--color-muted-foreground)]">
									No events match the current filters.
								</td>
							</tr>
						) : (
							filtered.map((event) => <EventRow key={event.id} event={event} />)
						)}
					</tbody>
				</table>
			</div>

			{/* Failover Events Section */}
			<div className="space-y-4">
				<div className="flex items-center gap-3">
					<ArrowsLeftRight size={18} weight="thin" className="text-[var(--color-foreground)]" />
					<h2 className="text-base font-semibold text-[var(--color-foreground)]">Failover History</h2>
					<span className="text-sm text-[var(--color-muted-foreground)]">{failoverEvents.length} events</span>
				</div>
				{failoverEvents.length === 0 ? (
					<div className="border border-[var(--color-border)] rounded-lg p-8 text-center text-sm text-[var(--color-muted-foreground)]">
						No failover events recorded.
					</div>
				) : (
					<div className="space-y-3">
						{failoverEvents.map((event) => (
							<FailoverRow key={event.id} event={event} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}
