"use client";

import { CaretDown, CaretUp, Lightning, List, Terminal, Warning } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
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

type OpenclawLogRow = {
	id: string;
	node_id: string;
	session_key: string;
	session_type: string | null;
	model: string | null;
	role: string | null;
	content: string | null;
	input_tokens: number | null;
	output_tokens: number | null;
	created_at: string;
};

type HeartbeatError = {
	id: string;
	node_id: string;
	last_error: string | null;
	created_at: string;
};

// ── Hooks ────────────────────────────────────────────────────────────────

function useAgentEventsLogs(nodeFilter: string, statusFilter: string) {
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

function useOpenclawSessionLogs(nodeFilter: string, limit = 100) {
	const supabase = createClient();
	return useQuery({
		queryKey: ["openclaw_session_logs", nodeFilter],
		queryFn: async () => {
			let q = supabase
				.from("node_openclaw_logs")
				.select(
					"id, node_id, session_key, session_type, model, role, content, input_tokens, output_tokens, created_at",
				)
				.order("created_at", { ascending: false })
				.limit(limit);
			if (nodeFilter !== "all") {
				q = q.eq("node_id", nodeFilter);
			}
			const { data, error } = await q;
			if (error) throw error;
			return data as OpenclawLogRow[];
		},
		refetchInterval: 5_000,
	});
}

function useHeartbeatErrors() {
	const supabase = createClient();
	return useQuery({
		queryKey: ["heartbeat_errors"],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("node_heartbeats")
				.select("id, node_id, last_error, created_at")
				.not("last_error", "is", null)
				.order("created_at", { ascending: false })
				.limit(50);
			if (error) throw error;
			return data as HeartbeatError[];
		},
		refetchInterval: 10_000,
	});
}

// ── Helpers ──────────────────────────────────────────────────────────────

function timeAgo(date: string | null | undefined): string {
	if (!date) return "\u2014";
	const diffMs = Date.now() - new Date(date).getTime();
	const s = Math.floor(diffMs / 1000);
	if (s < 60) return `${s}\uCD08 \uC804`;
	const m = Math.floor(s / 60);
	if (m < 60) return `${m}\uBD84 \uC804`;
	return `${Math.floor(m / 60)}\uC2DC\uAC04 \uC804`;
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

const NODE_COLORS: Record<string, string> = {
	antoni: "text-blue-600",
	kyungjini: "text-emerald-600",
	jaepini: "text-purple-600",
};

const TABS = [
	{ key: "events", label: "Agent Events", icon: Lightning },
	{ key: "sessions", label: "OpenClaw Sessions", icon: Terminal },
	{ key: "errors", label: "Errors", icon: Warning },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ── Tab: Agent Events ────────────────────────────────────────────────────

function AgentEventsTab({
	nodeFilter,
	statusFilter,
	setNodeFilter,
	setStatusFilter,
}: {
	nodeFilter: string;
	statusFilter: string;
	setNodeFilter: (v: string) => void;
	setStatusFilter: (v: string) => void;
}) {
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const { data: events = [], isLoading } = useAgentEventsLogs(nodeFilter, statusFilter);

	return (
		<>
			<div className="flex gap-3 mb-5">
				<div className="flex items-center gap-2">
					<span className="text-xs text-neutral-500">\uB178\uB4DC</span>
					<select
						value={nodeFilter}
						onChange={(e) => setNodeFilter(e.target.value)}
						className="text-sm border border-neutral-200 rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-blue-400"
					>
						<option value="all">\uC804\uCCB4</option>
						<option value="antoni">Antoni</option>
						<option value="kyungjini">Kyungjini</option>
						<option value="jaepini">Jaepini</option>
					</select>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-xs text-neutral-500">\uC0C1\uD0DC</span>
					<select
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value)}
						className="text-sm border border-neutral-200 rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-blue-400"
					>
						<option value="all">\uC804\uCCB4</option>
						<option value="pending">pending</option>
						<option value="done">done</option>
						<option value="failed">failed</option>
					</select>
				</div>
				<div className="ml-auto text-xs text-neutral-400 flex items-center">
					{events.length}\uAC1C \uC774\uBCA4\uD2B8
				</div>
			</div>

			<div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
				{isLoading ? (
					<div className="py-16 text-center text-neutral-400 text-sm">\uB85C\uB529 \uC911...</div>
				) : events.length === 0 ? (
					<div className="py-16 text-center text-neutral-400 text-sm">
						\uC774\uBCA4\uD2B8 \uC5C6\uC74C
					</div>
				) : (
					<div>
						<div className="grid grid-cols-[1fr_1.5fr_1fr_80px_80px_32px] gap-3 px-5 py-3 border-b border-neutral-100 text-xs font-semibold text-neutral-400 uppercase tracking-wide">
							<span>\uC2DC\uAC04</span>
							<span>\uC18C\uC2A4 \u2192 \uD0C0\uAC9F</span>
							<span>\uC774\uBCA4\uD2B8 \uD0C0\uC785</span>
							<span>\uC0C1\uD0DC</span>
							<span>\uC6B0\uC120\uC21C\uC704</span>
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
											<span className="text-neutral-600">{ev.source_node ?? "\u2014"}</span>
											<span className="text-neutral-300 mx-1.5">\u2192</span>
											<span className="text-neutral-800">{ev.target_node ?? "\u2014"}</span>
										</span>
										<span className="text-xs text-neutral-600 truncate">
											{ev.event_type ?? "\u2014"}
										</span>
										<span>
											<span
												className={cn(
													"text-[11px] font-semibold px-2 py-0.5 rounded-full",
													STATUS_STYLES[ev.status ?? ""] ?? "bg-neutral-100 text-neutral-500",
												)}
											>
												{ev.status ?? "\u2014"}
											</span>
										</span>
										<span>
											<span
												className={cn(
													"text-[11px] font-semibold px-2 py-0.5 rounded-full",
													PRIORITY_STYLES[ev.priority ?? ""] ?? PRIORITY_STYLES.normal,
												)}
											>
												{ev.priority ?? "\u2014"}
											</span>
										</span>
										<span className="flex items-center justify-center text-neutral-300">
											{expandedId === ev.id ? (
												<CaretUp size={14} weight="bold" />
											) : (
												<CaretDown size={14} weight="light" />
											)}
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
														ID: {ev.id} ·{" "}
														{ev.created_at
															? new Date(ev.created_at).toLocaleString("ko-KR")
															: "\u2014"}
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
		</>
	);
}

// ── Tab: OpenClaw Sessions ───────────────────────────────────────────────

function OpenclawSessionsTab({ nodeFilter }: { nodeFilter: string }) {
	const { data: logs = [], isLoading } = useOpenclawSessionLogs(nodeFilter);

	return (
		<>
			<div className="flex gap-3 mb-5">
				<div className="ml-auto text-xs text-neutral-400">{logs.length}\uAC1C \uB85C\uADF8</div>
			</div>
			<div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
				{isLoading ? (
					<div className="py-16 text-center text-neutral-400 text-sm">\uB85C\uB529 \uC911...</div>
				) : logs.length === 0 ? (
					<div className="py-16 text-center text-neutral-400 text-sm">
						\uC138\uC158 \uB85C\uADF8 \uC5C6\uC74C
					</div>
				) : (
					<div>
						<div className="grid grid-cols-[80px_1fr_120px_80px_80px_100px_80px] gap-3 px-5 py-3 border-b border-neutral-100 text-xs font-semibold text-neutral-400 uppercase tracking-wide">
							<span>\uB178\uB4DC</span>
							<span>\uC138\uC158</span>
							<span>\uBAA8\uB378</span>
							<span>Role</span>
							<span>Tokens</span>
							<span>Content</span>
							<span>\uC2DC\uAC04</span>
						</div>
						<div className="divide-y divide-neutral-50 max-h-[600px] overflow-y-auto">
							{logs.map((log) => (
								<div
									key={log.id}
									className="grid grid-cols-[80px_1fr_120px_80px_80px_100px_80px] gap-3 px-5 py-3 text-sm items-center hover:bg-neutral-50 transition-colors"
								>
									<span
										className={cn(
											"font-semibold text-xs",
											NODE_COLORS[log.node_id] ?? "text-neutral-600",
										)}
									>
										{log.node_id}
									</span>
									<span
										className="text-xs text-neutral-600 truncate font-mono"
										title={log.session_key}
									>
										{log.session_key.length > 24
											? `${log.session_key.slice(0, 24)}...`
											: log.session_key}
									</span>
									<span className="text-[11px] text-neutral-500 truncate">
										{log.model ?? "\u2014"}
									</span>
									<span>
										<span
											className={cn(
												"text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
												log.role === "assistant"
													? "bg-blue-100 text-blue-700"
													: log.role === "user"
														? "bg-emerald-100 text-emerald-700"
														: "bg-neutral-100 text-neutral-500",
											)}
										>
											{log.role ?? "\u2014"}
										</span>
									</span>
									<span className="text-[11px] text-neutral-400 tabular-nums">
										{(log.input_tokens ?? 0) + (log.output_tokens ?? 0) > 0
											? `${log.input_tokens ?? 0}/${log.output_tokens ?? 0}`
											: "\u2014"}
									</span>
									<span className="text-[11px] text-neutral-500 truncate" title={log.content ?? ""}>
										{log.content
											? log.content.slice(0, 60) + (log.content.length > 60 ? "..." : "")
											: "\u2014"}
									</span>
									<span className="text-[11px] text-neutral-400">{timeAgo(log.created_at)}</span>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</>
	);
}

// ── Tab: Errors ──────────────────────────────────────────────────────────

function ErrorsTab() {
	const { data: errors = [], isLoading } = useHeartbeatErrors();

	// Group by node
	const grouped = new Map<string, HeartbeatError[]>();
	for (const err of errors) {
		const existing = grouped.get(err.node_id) ?? [];
		existing.push(err);
		grouped.set(err.node_id, existing);
	}

	return (
		<div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
			{isLoading ? (
				<div className="py-16 text-center text-neutral-400 text-sm">\uB85C\uB529 \uC911...</div>
			) : errors.length === 0 ? (
				<div className="py-16 text-center">
					<Warning size={36} weight="thin" className="text-neutral-300 mx-auto mb-2" />
					<p className="text-neutral-400 text-sm">\uC5D0\uB7EC \uC5C6\uC74C</p>
				</div>
			) : (
				<div className="divide-y divide-neutral-100">
					{Array.from(grouped.entries()).map(([nodeId, nodeErrors]) => (
						<div key={nodeId} className="p-5">
							<div className="flex items-center gap-2 mb-3">
								<span
									className={cn("font-bold text-sm", NODE_COLORS[nodeId] ?? "text-neutral-700")}
								>
									{nodeId}
								</span>
								<span className="text-[11px] bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">
									{nodeErrors.length}\uAC1C \uC5D0\uB7EC
								</span>
							</div>
							<div className="flex flex-col gap-2">
								{nodeErrors.slice(0, 10).map((err) => (
									<div key={err.id} className="flex items-start gap-3 text-xs">
										<span className="text-neutral-400 shrink-0 w-16">
											{timeAgo(err.created_at)}
										</span>
										<span className="text-red-600 font-mono break-all">{err.last_error}</span>
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

// ── Main Page ────────────────────────────────────────────────────────────

export default function LogsPage() {
	const [activeTab, setActiveTab] = useState<TabKey>("events");
	const [nodeFilter, setNodeFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");

	return (
		<div className="max-w-[1100px] mx-auto">
			<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
				<div className="flex items-center gap-3">
					<List size={28} weight="thin" className="text-blue-500" />
					<div>
						<h1 className="text-2xl font-bold tracking-tight">Logs</h1>
						<p className="text-sm text-neutral-500">
							\uC2E4\uC2DC\uAC04 \uBAA8\uB2C8\uD130\uB9C1 \uB85C\uADF8
						</p>
					</div>
				</div>
			</motion.div>

			{/* Tab switcher */}
			<div className="flex gap-1 mb-6 p-1 bg-neutral-100 rounded-xl w-fit">
				{TABS.map(({ key, label, icon: Icon }) => (
					<button
						key={key}
						type="button"
						onClick={() => setActiveTab(key)}
						className={cn(
							"flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
							activeTab === key
								? "bg-white text-neutral-900 shadow-sm"
								: "text-neutral-500 hover:text-neutral-700",
						)}
					>
						<Icon size={16} weight={activeTab === key ? "light" : "thin"} />
						{label}
					</button>
				))}
			</div>

			{/* Node filter (shared for events & sessions tabs) */}
			{(activeTab === "events" || activeTab === "sessions") && (
				<div className="flex gap-3 mb-5">
					<div className="flex items-center gap-2">
						<span className="text-xs text-neutral-500">\uB178\uB4DC</span>
						<select
							value={nodeFilter}
							onChange={(e) => setNodeFilter(e.target.value)}
							className="text-sm border border-neutral-200 rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-blue-400"
						>
							<option value="all">\uC804\uCCB4</option>
							<option value="antoni">Antoni</option>
							<option value="kyungjini">Kyungjini</option>
							<option value="jaepini">Jaepini</option>
						</select>
					</div>
				</div>
			)}

			{/* Tab content */}
			{activeTab === "events" && (
				<AgentEventsTab
					nodeFilter={nodeFilter}
					statusFilter={statusFilter}
					setNodeFilter={setNodeFilter}
					setStatusFilter={setStatusFilter}
				/>
			)}
			{activeTab === "sessions" && <OpenclawSessionsTab nodeFilter={nodeFilter} />}
			{activeTab === "errors" && <ErrorsTab />}
		</div>
	);
}
