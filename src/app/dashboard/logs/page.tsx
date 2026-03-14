"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { List, CaretDown, CaretUp } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type AgentEvent = {
	id: string;
	source_node: string | null;
	target_node: string | null;
	event_type: string | null;
	status: string | null;
	priority: string | null;
	summary: string | null;
	data: unknown;
	created_at: string | null;
};

function useLogsQuery(nodeFilter: string, statusFilter: string) {
	const supabase = createClient();
	return useQuery({
		queryKey: ["agent_events_logs", nodeFilter, statusFilter],
		queryFn: async () => {
			let q = supabase
				.from("agent_events")
				.select("*")
				.order("created_at", { ascending: false })
				.limit(100);
			if (nodeFilter !== "all") {
				q = q.or(`source_node.eq.${nodeFilter},target_node.eq.${nodeFilter}`);
			}
			if (statusFilter !== "all") {
				q = q.eq("status", statusFilter);
			}
			const { data, error } = await q;
			if (error) throw error;
			return data as AgentEvent[];
		},
		refetchInterval: 5_000,
	});
}

function timeAgo(date: string | null | undefined): string {
	if (!date) return "—";
	const diffMs = Date.now() - new Date(date).getTime();
	const s = Math.floor(diffMs / 1000);
	if (s < 60) return `${s}초 전`;
	const m = Math.floor(s / 60);
	if (m < 60) return `${m}분 전`;
	return `${Math.floor(m / 60)}시간 전`;
}

const STATUS_STYLES: Record<string, string> = {
	pending: "bg-amber-100 text-amber-700",
	done: "bg-emerald-100 text-emerald-700",
	completed: "bg-emerald-100 text-emerald-700",
	failed: "bg-red-100 text-red-700",
	claimed: "bg-blue-100 text-blue-700",
};

const PRIORITY_STYLES: Record<string, string> = {
	critical: "bg-red-100 text-red-700",
	high: "bg-amber-100 text-amber-700",
	normal: "bg-neutral-100 text-neutral-600",
	low: "bg-neutral-50 text-neutral-400",
};

export default function LogsPage() {
	const [nodeFilter, setNodeFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");
	const [expandedId, setExpandedId] = useState<string | null>(null);

	const { data: events = [], isLoading, dataUpdatedAt } = useLogsQuery(nodeFilter, statusFilter);

	return (
		<div className="max-w-[1100px] mx-auto">
			<motion.div
				initial={{ opacity: 0, y: -10 }}
				animate={{ opacity: 1, y: 0 }}
				className="mb-8"
			>
				<div className="flex items-center gap-3">
					<List size={28} weight="thin" className="text-blue-500" />
					<div>
						<h1 className="text-2xl font-bold tracking-tight">Logs</h1>
						<p className="text-sm text-neutral-500">
							Agent 이벤트 실시간 로그
							{dataUpdatedAt > 0 && (
								<span className="ml-2 text-neutral-400">
									· 업데이트: {new Date(dataUpdatedAt).toLocaleTimeString("ko-KR")}
								</span>
							)}
						</p>
					</div>
				</div>
			</motion.div>

			{/* Filters */}
			<div className="flex gap-3 mb-5">
				<div className="flex items-center gap-2">
					<span className="text-xs text-neutral-500">노드</span>
					<select
						value={nodeFilter}
						onChange={(e) => setNodeFilter(e.target.value)}
						className="text-sm border border-neutral-200 rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-blue-400"
					>
						<option value="all">전체</option>
						<option value="antoni">Antoni</option>
						<option value="kyungjini">Kyungjini</option>
					</select>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-xs text-neutral-500">상태</span>
					<select
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value)}
						className="text-sm border border-neutral-200 rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-blue-400"
					>
						<option value="all">전체</option>
						<option value="pending">pending</option>
						<option value="done">done</option>
						<option value="failed">failed</option>
					</select>
				</div>
				<div className="ml-auto text-xs text-neutral-400 flex items-center">
					{events.length}개 이벤트
				</div>
			</div>

			{/* Table */}
			<div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
				{isLoading ? (
					<div className="py-16 text-center text-neutral-400 text-sm">로딩 중...</div>
				) : events.length === 0 ? (
					<div className="py-16 text-center text-neutral-400 text-sm">이벤트 없음</div>
				) : (
					<div>
						{/* Header */}
						<div className="grid grid-cols-[1fr_1.5fr_1fr_80px_80px_32px] gap-3 px-5 py-3 border-b border-neutral-100 text-xs font-semibold text-neutral-400 uppercase tracking-wide">
							<span>시간</span>
							<span>소스 → 타겟</span>
							<span>이벤트 타입</span>
							<span>상태</span>
							<span>우선순위</span>
							<span />
						</div>

						<div className="divide-y divide-neutral-50">
							{events.map((ev) => (
								<div key={ev.id}>
									<button
										type="button"
										onClick={() => setExpandedId(expandedId === ev.id ? null : ev.id)}
										className="grid grid-cols-[1fr_1.5fr_1fr_80px_80px_32px] gap-3 px-5 py-3.5 text-left w-full hover:bg-neutral-50 transition-colors items-center"
									>
										<span className="text-xs text-neutral-400">{timeAgo(ev.created_at)}</span>
										<span className="text-sm font-medium truncate">
											<span className="text-neutral-600">{ev.source_node ?? "—"}</span>
											<span className="text-neutral-300 mx-1.5">→</span>
											<span className="text-neutral-800">{ev.target_node ?? "—"}</span>
										</span>
										<span className="text-xs text-neutral-600 truncate">{ev.event_type ?? "—"}</span>
										<span>
											<span className={cn(
												"text-[11px] font-semibold px-2 py-0.5 rounded-full",
												STATUS_STYLES[ev.status ?? ""] ?? "bg-neutral-100 text-neutral-500"
											)}>
												{ev.status ?? "—"}
											</span>
										</span>
										<span>
											<span className={cn(
												"text-[11px] font-semibold px-2 py-0.5 rounded-full",
												PRIORITY_STYLES[ev.priority ?? ""] ?? PRIORITY_STYLES.normal
											)}>
												{ev.priority ?? "—"}
											</span>
										</span>
										<span className="flex items-center justify-center text-neutral-300">
											{expandedId === ev.id
												? <CaretUp size={14} weight="bold" />
												: <CaretDown size={14} weight="light" />}
										</span>
									</button>

									<AnimatePresence>
										{expandedId === ev.id && (
											<motion.div
												initial={{ height: 0, opacity: 0 }}
												animate={{ height: "auto", opacity: 1 }}
												exit={{ height: 0, opacity: 0 }}
												transition={{ duration: 0.2 }}
												className="overflow-hidden"
											>
												<div className="px-5 pb-4 pt-1 bg-neutral-50 border-t border-neutral-100">
													{ev.summary && (
														<p className="text-sm text-neutral-600 mb-3">{ev.summary}</p>
													)}
													<pre className="text-xs bg-white border border-neutral-200 rounded-lg p-3 overflow-auto max-h-48 text-neutral-700">
														{JSON.stringify(ev.data ?? {}, null, 2)}
													</pre>
													<div className="mt-2 text-[11px] text-neutral-400">
														ID: {ev.id} · {ev.created_at ? new Date(ev.created_at).toLocaleString("ko-KR") : "—"}
													</div>
												</div>
											</motion.div>
										)}
									</AnimatePresence>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
