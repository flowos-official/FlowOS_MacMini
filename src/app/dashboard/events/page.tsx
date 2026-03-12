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

	if (diff < 60) return `${diff}초 전`;
	if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
	if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
	return `${Math.floor(diff / 86400)}일 전`;
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
			{{ critical: "긴급", high: "높음", normal: "보통", low: "낮음" }[priority] ?? priority}
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
			{{ pending: "대기 중", claimed: "처리 중", processed: "완료", failed: "실패" }[status] ?? status}
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
								브로드캐스트
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
									처리자: <span className="font-medium text-[var(--color-foreground)]">{event.claimed_by}</span>
								</p>
							)}
							{event.processed_at && (
								<p className="text-xs text-[var(--color-muted-foreground)]">
									처리 시각: <span className="font-medium text-[var(--color-foreground)]">{new Date(event.processed_at).toLocaleString()}</span>
								</p>
							)}
							{event.project_id && (
								<p className="text-xs text-[var(--color-muted-foreground)]">
									프로젝트: <span className="font-medium text-[var(--color-foreground)] font-mono">{event.project_id}</span>
								</p>
							)}
							<div>
								<p className="text-xs text-[var(--color-muted-foreground)] mb-1.5">페이로드:</p>
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
					<span>{event.from_node} 에서</span>
					<ArrowsLeftRight size={14} weight="thin" className="text-[var(--color-muted-foreground)]" />
					<span>{event.to_node} (으)로</span>
				</div>
				<div className="flex items-center gap-2">
					<span
						className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${
							event.resolved_at
								? "bg-green-50 text-green-700 border border-green-200"
								: "bg-yellow-50 text-yellow-700 border border-yellow-200"
						}`}
					>
						{event.resolved_at ? "해결됨" : "활성"}
					</span>
					<span className="text-xs text-[var(--color-muted-foreground)]">{timeAgo(event.created_at)}</span>
				</div>
			</div>
			<p className="text-sm text-[var(--color-muted-foreground)]">{event.reason}</p>
			{event.crons_transferred && event.crons_transferred.length > 0 && (
				<div>
					<p className="text-xs text-[var(--color-muted-foreground)] mb-1">이관된 크론:</p>
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
					해결 시각: {new Date(event.resolved_at).toLocaleString()}
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
					<h1 className="text-xl font-semibold text-[var(--color-foreground)]">에이전트 이벤트</h1>
					{pendingCount > 0 && (
						<span className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200 text-xs font-medium">
							{pendingCount}개 대기 중
						</span>
					)}
				</div>
				<p className="text-sm text-[var(--color-muted-foreground)]">
					{events.length}개 중 {filtered.length}개 이벤트
				</p>
			</div>

			{/* Filter Bar */}
			<div className="flex flex-wrap items-center gap-4 p-4 bg-[var(--color-secondary)] border border-[var(--color-border)] rounded-lg">
				<FilterSelect<StatusFilter>
					label="상태"
					value={statusFilter}
					onChange={setStatusFilter}
					options={[
						{ value: "all", label: "전체 상태" },
						{ value: "pending", label: "대기 중" },
						{ value: "claimed", label: "처리 중" },
						{ value: "processed", label: "완료" },
						{ value: "failed", label: "실패" },
					]}
				/>
				<FilterSelect<PriorityFilter>
					label="우선순위"
					value={priorityFilter}
					onChange={setPriorityFilter}
					options={[
						{ value: "all", label: "전체 우선순위" },
						{ value: "critical", label: "긴급" },
						{ value: "high", label: "높음" },
						{ value: "normal", label: "보통" },
						{ value: "low", label: "낮음" },
					]}
				/>
				<FilterSelect<SourceFilter>
					label="소스 노드"
					value={sourceFilter}
					onChange={setSourceFilter}
					options={[
						{ value: "all", label: "전체 노드" },
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
								경로
							</th>
							<th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
								유형
							</th>
							<th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
								우선순위
							</th>
							<th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
								상태
							</th>
							<th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
								요약
							</th>
							<th className="px-4 py-2.5 text-right text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
								시간
							</th>
						</tr>
					</thead>
					<tbody>
						{filtered.length === 0 ? (
							<tr>
								<td colSpan={7} className="px-4 py-12 text-center text-sm text-[var(--color-muted-foreground)]">
									현재 필터에 일치하는 이벤트가 없습니다.
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
					<h2 className="text-base font-semibold text-[var(--color-foreground)]">장애 복구 이력</h2>
					<span className="text-sm text-[var(--color-muted-foreground)]">{failoverEvents.length}개 이벤트</span>
				</div>
				{failoverEvents.length === 0 ? (
					<div className="border border-[var(--color-border)] rounded-lg p-8 text-center text-sm text-[var(--color-muted-foreground)]">
						장애 복구 이벤트 없음
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
