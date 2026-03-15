"use client";

import {
	ChatCircle,
	CheckCircle,
	CircleNotch,
	Clock,
	GitPullRequest,
	ListChecks,
	Prohibit,
	XCircle,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { useAgentTasks } from "@/lib/hooks/use-tasks";
import { cn } from "@/lib/utils";
import type { AgentTask } from "@/types/database";

const ASSIGNEE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
	kyungjini: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Kyungjini" },
	jaepini: { bg: "bg-purple-100", text: "text-purple-700", label: "Jaepini" },
	antoni: { bg: "bg-blue-100", text: "text-blue-700", label: "Antoni" },
};

const PRIORITY_STYLES: Record<string, { bg: string; text: string }> = {
	urgent: { bg: "bg-red-100", text: "text-red-700" },
	normal: { bg: "bg-blue-100", text: "text-blue-700" },
	background: { bg: "bg-neutral-100", text: "text-neutral-500" },
};

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
	pending: { icon: Clock, color: "text-amber-500", label: "대기 중" },
	running: { icon: CircleNotch, color: "text-blue-500", label: "실행 중" },
	done: { icon: CheckCircle, color: "text-emerald-500", label: "완료" },
	failed: { icon: XCircle, color: "text-red-500", label: "실패" },
	cancelled: { icon: Prohibit, color: "text-neutral-400", label: "취소됨" },
};

function timeAgo(date: string | null | undefined): string {
	if (!date) return "";
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

function elapsedTime(start: string | null, end: string | null): string {
	if (!start) return "";
	const s = new Date(start).getTime();
	const e = end ? new Date(end).getTime() : Date.now();
	const diffSec = Math.floor((e - s) / 1000);
	if (diffSec < 60) return `${diffSec}초`;
	const min = Math.floor(diffSec / 60);
	const sec = diffSec % 60;
	if (min < 60) return `${min}분 ${sec}초`;
	const hr = Math.floor(min / 60);
	return `${hr}시간 ${min % 60}분`;
}

function TaskCard({ task, index }: { task: AgentTask; index: number }) {
	const assignee = ASSIGNEE_STYLES[task.assignee] ?? ASSIGNEE_STYLES.antoni;
	const priority = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.normal;
	const status = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.pending;
	const StatusIcon = status.icon;
	const isActive = task.status === "pending" || task.status === "running";

	return (
		<motion.div
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3, delay: index * 0.04 }}
			className={cn(
				"rounded-xl border p-4 transition-all",
				isActive ? "border-neutral-200 bg-white shadow-sm" : "border-neutral-100 bg-neutral-50/50",
			)}
		>
			{/* Header */}
			<div className="flex items-start justify-between gap-3 mb-2">
				<div className="flex items-center gap-2 min-w-0">
					<StatusIcon
						size={18}
						weight="light"
						className={cn(status.color, task.status === "running" && "animate-spin")}
					/>
					<h3 className={cn("font-semibold text-sm truncate", !isActive && "text-neutral-500")}>
						{task.title}
					</h3>
				</div>
				<div className="flex items-center gap-1.5 shrink-0">
					<span
						className={cn(
							"text-[10px] font-semibold px-2 py-0.5 rounded-full",
							priority.bg,
							priority.text,
						)}
					>
						{task.priority}
					</span>
					<span
						className={cn(
							"text-[10px] font-semibold px-2 py-0.5 rounded-full",
							assignee.bg,
							assignee.text,
						)}
					>
						{assignee.label}
					</span>
				</div>
			</div>

			{/* Description */}
			{task.description && (
				<p className="text-xs text-neutral-500 mb-3 line-clamp-2">{task.description}</p>
			)}

			{/* Meta row */}
			<div className="flex items-center gap-3 flex-wrap text-[11px] text-neutral-400">
				<span className={cn("font-medium", status.color)}>{status.label}</span>

				{task.status === "running" && task.started_at && (
					<span className="flex items-center gap-1">
						<Clock size={11} weight="light" />
						{elapsedTime(task.started_at, null)}
					</span>
				)}

				{task.status === "done" && task.started_at && (
					<span className="flex items-center gap-1">
						<Clock size={11} weight="light" />
						{elapsedTime(task.started_at, task.completed_at)}
					</span>
				)}

				{task.github_pr && (
					<a
						href={task.github_pr}
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-1 text-blue-500 hover:text-blue-700 transition-colors"
					>
						<GitPullRequest size={11} weight="light" />
						PR
					</a>
				)}

				{task.slack_channel && (
					<span className="flex items-center gap-1">
						<ChatCircle size={11} weight="light" />
						{task.slack_channel}
					</span>
				)}

				<span className="ml-auto">{timeAgo(task.created_at)}</span>
			</div>

			{/* Result / Error */}
			{task.status === "done" && task.result_summary && (
				<div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
					<p className="text-xs text-emerald-700">{task.result_summary}</p>
				</div>
			)}

			{task.status === "failed" && task.error_message && (
				<div className="mt-3 p-2.5 rounded-lg bg-red-50 border border-red-100">
					<p className="text-xs text-red-700 font-mono">{task.error_message}</p>
				</div>
			)}
		</motion.div>
	);
}

export default function TasksPage() {
	const { data: tasks, isLoading } = useAgentTasks(100);

	const activeTasks = tasks.filter((t) => t.status === "pending" || t.status === "running");
	const completedTasks = tasks.filter(
		(t) => t.status === "done" || t.status === "failed" || t.status === "cancelled",
	);

	const stats = {
		pending: tasks.filter((t) => t.status === "pending").length,
		running: tasks.filter((t) => t.status === "running").length,
		done: tasks.filter((t) => t.status === "done").length,
		failed: tasks.filter((t) => t.status === "failed").length,
	};

	return (
		<div className="max-w-[960px] mx-auto">
			{/* Header */}
			<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
				<div className="flex items-center gap-3">
					<ListChecks size={28} weight="thin" className="text-blue-500" />
					<div>
						<h1 className="text-2xl font-bold tracking-tight">Task 관리</h1>
						<p className="text-sm text-neutral-500">에이전트 작업 현황 및 이력</p>
					</div>
				</div>
			</motion.div>

			{/* Stats bar */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.15 }}
				className="grid grid-cols-4 gap-3 mb-8"
			>
				{[
					{
						label: "대기 중",
						value: stats.pending,
						color: "text-amber-600",
						bg: "bg-amber-50 border-amber-100",
					},
					{
						label: "실행 중",
						value: stats.running,
						color: "text-blue-600",
						bg: "bg-blue-50 border-blue-100",
					},
					{
						label: "완료",
						value: stats.done,
						color: "text-emerald-600",
						bg: "bg-emerald-50 border-emerald-100",
					},
					{
						label: "실패",
						value: stats.failed,
						color: "text-red-600",
						bg: "bg-red-50 border-red-100",
					},
				].map((s) => (
					<div key={s.label} className={cn("rounded-xl border p-4 text-center", s.bg)}>
						<div className={cn("text-2xl font-bold tabular-nums", s.color)}>{s.value}</div>
						<div className="text-xs text-neutral-500 mt-1">{s.label}</div>
					</div>
				))}
			</motion.div>

			{isLoading ? (
				<div className="text-center py-20 text-neutral-400 text-sm">로딩 중...</div>
			) : tasks.length === 0 ? (
				<div className="text-center py-20">
					<ListChecks size={48} weight="thin" className="text-neutral-300 mx-auto mb-3" />
					<p className="text-neutral-400 text-sm">아직 등록된 작업이 없습니다</p>
				</div>
			) : (
				<>
					{/* Active Tasks */}
					{activeTasks.length > 0 && (
						<section className="mb-8">
							<h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">
								진행 중인 작업
							</h2>
							<div className="flex flex-col gap-3">
								<AnimatePresence>
									{activeTasks.map((task, i) => (
										<TaskCard key={task.id} task={task} index={i} />
									))}
								</AnimatePresence>
							</div>
						</section>
					)}

					{/* Completed Tasks */}
					{completedTasks.length > 0 && (
						<section>
							<h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">
								완료된 작업
							</h2>
							<div className="flex flex-col gap-2">
								{completedTasks.map((task, i) => (
									<TaskCard key={task.id} task={task} index={i} />
								))}
							</div>
						</section>
					)}
				</>
			)}
		</div>
	);
}
