"use client";

import { useActiveSessions } from "@/lib/hooks/use-sessions";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Circle, Hash, Globe, Robot, Spinner } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { ActiveSession } from "@/types/database";

const NODE_DISPLAY: Record<string, { name: string }> = {
	antoni: { name: "Antoni" },
	kyungjini: { name: "Kyungjini" },
	jaepini: { name: "Jaepini" },
};

function formatTokens(n: number | null | undefined): string {
	if (!n) return "0";
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
	return String(n);
}

function isSlackSession(displayName: string | null | undefined): boolean {
	if (!displayName) return false;
	return displayName.toLowerCase().startsWith("slack");
}

function ChannelIcon({ displayName, channel }: { displayName: string | null | undefined; channel: string | null | undefined }) {
	const name = displayName ?? channel ?? "";
	if (isSlackSession(name)) {
		return <Hash size={11} weight="bold" className="text-purple-500 shrink-0" />;
	}
	if (name === "webchat") {
		return <Globe size={11} weight="light" className="text-blue-400 shrink-0" />;
	}
	return <Robot size={11} weight="light" className="text-neutral-400 shrink-0" />;
}

function SessionRow({ session, index }: { session: ActiveSession; index: number }) {
	const displayName = session.display_name ?? session.channel ?? session.session_type ?? "—";
	const isSlack = isSlackSession(session.display_name);
	const tokens = session.total_tokens;
	const model = session.model;

	// Shorten model name: "claude-sonnet-4-6" -> "s-4-6"
	const shortModel = model
		? model.replace(/^claude-/, "").replace(/sonnet/, "s").replace(/opus/, "o").replace(/haiku/, "h")
		: "—";

	return (
		<motion.div
			initial={{ opacity: 0, x: -8 }}
			animate={{ opacity: 1, x: 0 }}
			exit={{ opacity: 0, x: 8 }}
			transition={{ delay: index * 0.04 }}
			className="flex items-center gap-2 py-1.5 px-3 rounded-lg hover:bg-neutral-50 transition-colors"
		>
			{/* Tree connector */}
			<span className="text-neutral-200 text-[11px] font-mono shrink-0 select-none">
				{index === 0 ? "├─" : "└─"}
			</span>

			{/* Channel icon */}
			<ChannelIcon displayName={session.display_name} channel={session.channel} />

			{/* Session type badge */}
			<span
				className={cn(
					"text-[10px] font-semibold px-1.5 py-0 rounded shrink-0",
					session.session_type === "main" || session.session_type === "other"
						? "bg-blue-50 text-blue-600"
						: "bg-neutral-100 text-neutral-500",
				)}
			>
				{session.session_type === "other" ? "main" : (session.session_type ?? "?")}
			</span>

			{/* Display name */}
			<span className={cn(
				"text-[11px] truncate flex-1",
				isSlack ? "text-purple-700 font-medium" : "text-neutral-600",
			)}>
				{displayName}
			</span>

			{/* Tokens */}
			{tokens != null && (
				<span className="text-[10px] text-neutral-400 tabular-nums shrink-0">
					{formatTokens(tokens)}
				</span>
			)}

			{/* Model */}
			{shortModel && (
				<span className="text-[10px] text-neutral-300 tabular-nums shrink-0 font-mono">
					{shortModel}
				</span>
			)}
		</motion.div>
	);
}

function NodeSection({
	nodeId,
	sessions,
	index,
}: {
	nodeId: string;
	sessions: ActiveSession[];
	index: number;
}) {
	const display = NODE_DISPLAY[nodeId] ?? { name: nodeId };
	const hasSlack = sessions.some((s) => isSlackSession(s.display_name));

	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3, delay: index * 0.08 }}
			className="mb-2 last:mb-0"
		>
			{/* Node header */}
			<div className="flex items-center gap-2 px-3 py-2">
				<Circle
					size={8}
					weight="fill"
					className={sessions.length > 0 ? "text-emerald-500" : "text-neutral-300"}
				/>
				<span className="font-semibold text-sm text-neutral-800">{display.name}</span>
				<span className="text-[11px] text-neutral-400 ml-auto tabular-nums">
					{sessions.length}개 세션
				</span>
			</div>

			{/* Sessions */}
			<AnimatePresence mode="popLayout">
				{sessions.length === 0 ? (
					<p className="text-[11px] text-neutral-300 px-3 pb-2">세션 없음</p>
				) : (
					sessions.map((s, i) => (
						<SessionRow
							key={s.session_key ?? s.id ?? i}
							session={s}
							index={i === sessions.length - 1 ? 1 : 0}
						/>
					))
				)}
			</AnimatePresence>
		</motion.div>
	);
}

export function ActiveSessionsPanel() {
	const { data: allSessions = [], isLoading } = useActiveSessions();

	const nodeIds = ["antoni", "kyungjini", "jaepini"];
	const sessionsByNode: Record<string, ActiveSession[]> = {};
	for (const nid of nodeIds) {
		sessionsByNode[nid] = allSessions.filter((s) => s.node_id === nid);
	}

	const totalSessions = allSessions.length;
	const activeNodes = nodeIds.filter((nid) => sessionsByNode[nid].length > 0).length;

	return (
		<div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
			{/* Header */}
			<div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-3">
				<Users size={18} weight="light" className="text-blue-500" />
				<div className="flex-1">
					<span className="font-bold text-sm text-neutral-800">실시간 세션</span>
					<p className="text-[11px] text-neutral-400">Supabase Realtime 자동 업데이트</p>
				</div>
				{isLoading ? (
					<Spinner size={14} weight="light" className="text-neutral-300 animate-spin" />
				) : (
					<span className="text-[11px] text-neutral-400 tabular-nums">
						{activeNodes}개 노드 · {totalSessions}개 세션
					</span>
				)}
			</div>

			{/* Node sections */}
			<div className="divide-y divide-neutral-50 py-1">
				{nodeIds.map((nodeId, i) => (
					<NodeSection
						key={nodeId}
						nodeId={nodeId}
						sessions={sessionsByNode[nodeId]}
						index={i}
					/>
				))}
			</div>
		</div>
	);
}
