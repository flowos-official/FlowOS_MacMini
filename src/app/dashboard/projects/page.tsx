"use client";

import {
	Folder,
	GithubLogo,
	Lock,
	CircleNotch,
	ArrowClockwise,
	Warning,
} from "@phosphor-icons/react";
import { useProjects } from "@/lib/hooks/use-projects";
import { useProjectLocks } from "@/lib/hooks/use-projects";
import type { Project, ProjectLock } from "@/types/database";

function timeAgo(dateStr: string): string {
	const now = Date.now();
	const then = new Date(dateStr).getTime();
	const diff = Math.floor((now - then) / 1000);

	if (diff < 60) return `${diff}s ago`;
	if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
	if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
	if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
	if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo ago`;
	return `${Math.floor(diff / 31536000)}y ago`;
}

function timeUntil(dateStr: string): string {
	const now = Date.now();
	const then = new Date(dateStr).getTime();
	const diff = Math.floor((then - now) / 1000);

	if (diff <= 0) return "expired";
	if (diff < 60) return `in ${diff}s`;
	if (diff < 3600) return `in ${Math.floor(diff / 60)}m`;
	if (diff < 86400) return `in ${Math.floor(diff / 3600)}h`;
	return `in ${Math.floor(diff / 86400)}d`;
}

function isExpired(dateStr: string): boolean {
	return new Date(dateStr).getTime() < Date.now();
}

type StatusConfig = {
	label: string;
	color: string;
	bg: string;
};

const STATUS_MAP: Record<string, StatusConfig> = {
	active: {
		label: "Active",
		color: "var(--color-success)",
		bg: "rgba(34,197,94,0.1)",
	},
	paused: {
		label: "Paused",
		color: "var(--color-warning)",
		bg: "rgba(245,158,11,0.1)",
	},
	archived: {
		label: "Archived",
		color: "var(--color-muted-foreground)",
		bg: "var(--color-muted)",
	},
};

const PRIORITY_MAP: Record<string, StatusConfig> = {
	critical: {
		label: "Critical",
		color: "var(--color-destructive)",
		bg: "rgba(239,68,68,0.1)",
	},
	high: {
		label: "High",
		color: "var(--color-warning)",
		bg: "rgba(245,158,11,0.1)",
	},
	normal: {
		label: "Normal",
		color: "var(--color-info)",
		bg: "rgba(59,130,246,0.1)",
	},
	low: {
		label: "Low",
		color: "var(--color-muted-foreground)",
		bg: "var(--color-muted)",
	},
};

function Badge({ value, map }: { value: string; map: Record<string, StatusConfig> }) {
	const config = map[value] ?? {
		label: value,
		color: "var(--color-muted-foreground)",
		bg: "var(--color-muted)",
	};
	return (
		<span
			className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium"
			style={{ color: config.color, backgroundColor: config.bg }}
		>
			{config.label}
		</span>
	);
}

function ProjectRow({ project, locked }: { project: Project; locked: boolean }) {
	return (
		<tr className="border-b border-[var(--color-border)] hover:bg-[var(--color-muted)] transition-colors">
			<td className="px-4 py-3">
				<div className="flex items-center gap-2">
					{locked && (
						<Lock
							size={13}
							weight="thin"
							className="shrink-0"
							style={{ color: "var(--color-warning)" }}
						/>
					)}
					<div>
						<span className="text-sm font-medium text-[var(--color-foreground)]">
							{project.name}
						</span>
						{project.slug && (
							<div className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
								/{project.slug}
							</div>
						)}
					</div>
				</div>
			</td>
			<td className="px-4 py-3">
				<Badge value={project.status} map={STATUS_MAP} />
			</td>
			<td className="px-4 py-3">
				<Badge value={project.priority} map={PRIORITY_MAP} />
			</td>
			<td className="px-4 py-3">
				{project.assigned_node ? (
					<span className="text-sm text-[var(--color-foreground)]">
						{project.assigned_node}
					</span>
				) : (
					<span className="text-sm text-[var(--color-muted-foreground)]">—</span>
				)}
			</td>
			<td className="px-4 py-3">
				{project.github_repo ? (
					<a
						href={`https://github.com/${project.github_repo}`}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
					>
						<GithubLogo size={14} weight="thin" />
						{project.github_repo}
					</a>
				) : (
					<span className="text-sm text-[var(--color-muted-foreground)]">—</span>
				)}
			</td>
			<td className="px-4 py-3 text-xs text-[var(--color-muted-foreground)] whitespace-nowrap">
				{timeAgo(project.updated_at)}
			</td>
			<td className="px-4 py-3 text-xs text-[var(--color-muted-foreground)] whitespace-nowrap">
				{timeAgo(project.created_at)}
			</td>
		</tr>
	);
}

function LockRow({ lock, projectName }: { lock: ProjectLock; projectName: string }) {
	const expired = isExpired(lock.expires_at);
	return (
		<tr
			className="border-b border-[var(--color-border)] transition-colors"
			style={
				expired
					? { backgroundColor: "rgba(239,68,68,0.04)" }
					: { backgroundColor: "transparent" }
			}
		>
			<td className="px-4 py-3">
				<div className="flex items-center gap-2">
					{expired && (
						<Warning
							size={13}
							weight="thin"
							className="shrink-0"
							style={{ color: "var(--color-destructive)" }}
						/>
					)}
					<span
						className="text-sm font-medium"
						style={{
							color: expired
								? "var(--color-destructive)"
								: "var(--color-foreground)",
						}}
					>
						{projectName}
					</span>
				</div>
			</td>
			<td className="px-4 py-3">
				<span className="text-sm text-[var(--color-foreground)]">{lock.locked_by}</span>
			</td>
			<td className="px-4 py-3">
				<span
					className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium"
					style={{
						color: "var(--color-info)",
						backgroundColor: "rgba(59,130,246,0.1)",
					}}
				>
					{lock.lock_type}
				</span>
			</td>
			<td className="px-4 py-3">
				{lock.reason ? (
					<span className="text-sm text-[var(--color-muted-foreground)]">{lock.reason}</span>
				) : (
					<span className="text-sm text-[var(--color-muted-foreground)]">—</span>
				)}
			</td>
			<td className="px-4 py-3 text-xs whitespace-nowrap">
				<span
					style={{
						color: expired ? "var(--color-destructive)" : "var(--color-muted-foreground)",
					}}
				>
					{expired ? "Expired " : ""}{timeUntil(lock.expires_at)}
					<span className="block text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>
						{new Date(lock.expires_at).toLocaleString()}
					</span>
				</span>
			</td>
			<td className="px-4 py-3 text-xs text-[var(--color-muted-foreground)] whitespace-nowrap">
				{timeAgo(lock.created_at)}
			</td>
		</tr>
	);
}

export default function ProjectsPage() {
	const { data: projects, isLoading: projectsLoading, error: projectsError } = useProjects();
	const { data: locks, isLoading: locksLoading } = useProjectLocks();

	const lockedProjectIds = new Set((locks ?? []).map((l) => l.project_id));

	const projectById = Object.fromEntries((projects ?? []).map((p) => [p.id, p]));

	const expiredLocksCount = (locks ?? []).filter((l) => isExpired(l.expires_at)).length;

	if (projectsLoading) {
		return (
			<div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
				<CircleNotch size={16} weight="thin" className="animate-spin" />
				Loading projects...
			</div>
		);
	}

	if (projectsError) {
		return (
			<div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-destructive)" }}>
				<Warning size={16} weight="thin" />
				Failed to load projects.
			</div>
		);
	}

	const projectList: Project[] = projects ?? [];
	const lockList: ProjectLock[] = locks ?? [];

	return (
		<div className="space-y-8">
			{/* Header */}
			<div className="flex items-center gap-3">
				<Folder size={22} weight="thin" className="text-[var(--color-muted-foreground)]" />
				<div>
					<h1 className="text-lg font-semibold text-[var(--color-foreground)]">Projects</h1>
					<p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
						{projectList.length} project{projectList.length !== 1 ? "s" : ""}
						{lockList.length > 0 && (
							<>
								{" "}
								&middot;{" "}
								<span
									style={{
										color:
											expiredLocksCount > 0
												? "var(--color-destructive)"
												: "var(--color-warning)",
									}}
								>
									{lockList.length} lock{lockList.length !== 1 ? "s" : ""}
									{expiredLocksCount > 0 && ` (${expiredLocksCount} expired)`}
								</span>
							</>
						)}
					</p>
				</div>
			</div>

			{/* Projects Table */}
			<section>
				<div
					className="rounded-lg border border-[var(--color-border)] overflow-hidden"
					style={{ backgroundColor: "var(--color-background)" }}
				>
					<table className="w-full text-sm">
						<thead>
							<tr
								className="border-b border-[var(--color-border)]"
								style={{ backgroundColor: "var(--color-muted)" }}
							>
								<th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide">
									Name
								</th>
								<th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide">
									Status
								</th>
								<th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide">
									Priority
								</th>
								<th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide">
									Node
								</th>
								<th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide">
									Repository
								</th>
								<th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide">
									Updated
								</th>
								<th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide">
									Created
								</th>
							</tr>
						</thead>
						<tbody>
							{projectList.length === 0 ? (
								<tr>
									<td
										colSpan={7}
										className="px-4 py-10 text-center text-sm text-[var(--color-muted-foreground)]"
									>
										No projects found.
									</td>
								</tr>
							) : (
								projectList.map((project) => (
									<ProjectRow
										key={project.id}
										project={project}
										locked={lockedProjectIds.has(project.id)}
									/>
								))
							)}
						</tbody>
					</table>
				</div>
			</section>

			{/* Project Locks Section */}
			{(lockList.length > 0 || locksLoading) && (
				<section>
					<div className="flex items-center gap-2 mb-3">
						<Lock
							size={16}
							weight="thin"
							className="text-[var(--color-muted-foreground)]"
						/>
						<h2 className="text-sm font-medium text-[var(--color-foreground)]">
							Active Locks
						</h2>
						{locksLoading && (
							<ArrowClockwise
								size={13}
								weight="thin"
								className="animate-spin text-[var(--color-muted-foreground)]"
							/>
						)}
						{lockList.length > 0 && (
							<span
								className="text-xs px-1.5 py-0.5 rounded font-medium"
								style={{
									color:
										expiredLocksCount > 0
											? "var(--color-destructive)"
											: "var(--color-warning)",
									backgroundColor:
										expiredLocksCount > 0
											? "rgba(239,68,68,0.1)"
											: "rgba(245,158,11,0.1)",
								}}
							>
								{lockList.length}
							</span>
						)}
					</div>

					<div
						className="rounded-lg border border-[var(--color-border)] overflow-hidden"
						style={{ backgroundColor: "var(--color-background)" }}
					>
						<table className="w-full text-sm">
							<thead>
								<tr
									className="border-b border-[var(--color-border)]"
									style={{ backgroundColor: "var(--color-muted)" }}
								>
									<th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide">
										Project
									</th>
									<th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide">
										Locked By
									</th>
									<th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide">
										Type
									</th>
									<th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide">
										Reason
									</th>
									<th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide">
										Expires
									</th>
									<th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide">
										Acquired
									</th>
								</tr>
							</thead>
							<tbody>
								{lockList.length === 0 ? (
									<tr>
										<td
											colSpan={6}
											className="px-4 py-8 text-center text-sm text-[var(--color-muted-foreground)]"
										>
											No active locks.
										</td>
									</tr>
								) : (
									lockList.map((lock) => (
										<LockRow
											key={`${lock.project_id}-${lock.locked_by}-${lock.created_at}`}
											lock={lock}
											projectName={
												projectById[lock.project_id]?.name ?? lock.project_id
											}
										/>
									))
								)}
							</tbody>
						</table>
					</div>
				</section>
			)}
		</div>
	);
}
