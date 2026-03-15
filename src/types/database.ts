export type AgentTask = {
	id: string;
	title: string;
	description: string | null;
	assignee: "kyungjini" | "jaepini" | "antoni";
	status: "pending" | "running" | "done" | "failed" | "cancelled";
	priority: "urgent" | "normal" | "background";
	slack_channel: string | null;
	github_pr: string | null;
	result_summary: string | null;
	error_message: string | null;
	dispatched_by: string | null;
	session_id: string | null;
	created_at: string;
	started_at: string | null;
	completed_at: string | null;
};

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

export type ClaudePid = {
	pid: number;
	memory_mb: number;
	runtime_sec: number;
	model: string;
};

export type TopProcess = {
	name: string;
	cpu_pct: number;
	mem_mb: number;
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
	// Hardware
	cpu_temp_c: number | null;
	memory_wired_gb: number | null;
	memory_compressed_gb: number | null;
	memory_pressure: "normal" | "warn" | "critical" | null;
	swap_used_gb: number | null;
	uptime_seconds: number | null;
	power_watts: number | null;
	gpu_usage: number | null;
	ane_usage: number | null;
	fan_rpm: number | null;
	disk_read_mbps: number | null;
	disk_write_mbps: number | null;
	disk_total_gb: number | null;
	disk_used_gb: number | null;
	// Network
	net_in_mbps: number | null;
	net_out_mbps: number | null;
	tailscale_status: string | null;
	tailscale_latency_ms: number | null;
	latency_supabase_ms: number | null;
	latency_anthropic_ms: number | null;
	// AI
	claude_pids: ClaudePid[] | null;
	tokens_today: number | null;
	cost_today_usd: number | null;
	api_latency_ms: number | null;
	// Processes
	top_processes: TopProcess[] | null;
	// OpenClaw
	openclaw_status: string | null;
	openclaw_version: string | null;
	openclaw_connected_channels: number | null;
	// Misc
	git_repo_count: number | null;
};

export type NodeOpenclawLog = {
	id: string;
	node_id: string;
	session_key: string;
	session_type: string | null;
	model: string | null;
	role: string | null;
	content: string;
	tokens: number | null;
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
