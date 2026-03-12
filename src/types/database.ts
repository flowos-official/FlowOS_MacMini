export type NodeRole = {
	node_id: string;
	display_name: string;
	primary_role: string;
	is_coordinator: boolean;
	can_scan_gmail: boolean;
	can_send_client_comms: boolean;
	claude_session_quota: number;
	failover_priority: number;
	status: string;
	updated_at: string;
};

export type NodeHeartbeat = {
	id: string;
	node_id: string;
	status: string;
	active_agents: number;
	active_claude_sessions: number;
	cpu_usage: number | null;
	memory_usage: number | null;
	disk_free_gb: number | null;
	last_error: string | null;
	created_at: string;
};

export type FailoverEvent = {
	id: string;
	from_node: string;
	to_node: string;
	reason: string;
	crons_transferred: string[] | null;
	resolved_at: string | null;
	created_at: string;
};

export type Project = {
	id: string;
	name: string;
	slug: string | null;
	github_repo: string | null;
	status: string;
	priority: string;
	assigned_node: string | null;
	description: string | null;
	created_at: string;
	updated_at: string;
};

export type ProjectLock = {
	project_id: string;
	locked_by: string;
	lock_type: string;
	reason: string | null;
	expires_at: string;
	created_at: string;
};

export type ActiveSession = {
	id: string;
	node_id: string;
	project_id: string | null;
	session_type: string;
	model: string;
	pid: number | null;
	started_at: string;
	estimated_minutes: number;
	last_activity_at: string;
};

export type CronExecution = {
	id: string;
	node_id: string;
	skill_name: string;
	started_at: string;
	completed_at: string | null;
	status: string;
	error_message: string | null;
	duration_ms: number | null;
};

export type AgentEvent = {
	id: string;
	source_node: string;
	target_node: string | null;
	project_id: string | null;
	event_type: string;
	priority: string;
	summary: string | null;
	data: Record<string, unknown> | null;
	status: string;
	claimed_by: string | null;
	processed_at: string | null;
	created_at: string;
};
