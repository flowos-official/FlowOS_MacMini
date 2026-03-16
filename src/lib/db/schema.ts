import { pgTable, text, uuid, boolean, integer, doublePrecision, timestamp, jsonb } from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: text("name").notNull(),
	slug: text("slug").unique(),
	githubRepo: text("github_repo"),
	status: text("status").default("active"),
	priority: text("priority").default("normal"),
	assignedNode: text("assigned_node"),
	description: text("description"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const nodeRoles = pgTable("node_roles", {
	nodeId: text("node_id").primaryKey(),
	displayName: text("display_name").notNull(),
	primaryRole: text("primary_role").notNull(),
	isCoordinator: boolean("is_coordinator").default(false),
	canScanGmail: boolean("can_scan_gmail").default(false),
	canSendClientComms: boolean("can_send_client_comms").default(false),
	claudeSessionQuota: integer("claude_session_quota").default(2),
	failoverPriority: integer("failover_priority").notNull(),
	status: text("status").default("online"),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const nodeHeartbeats = pgTable("node_heartbeats", {
	id: uuid("id").defaultRandom().primaryKey(),
	nodeId: text("node_id").notNull().references(() => nodeRoles.nodeId),
	status: text("status").default("alive"),
	activeAgents: integer("active_agents").default(0),
	activeClaudeSessions: integer("active_claude_sessions").default(0),
	// Basic metrics (existing)
	cpuUsage: doublePrecision("cpu_usage"),
	memoryUsage: doublePrecision("memory_usage"),
	diskFreeGb: doublePrecision("disk_free_gb"),
	lastError: text("last_error"),
	// NEW: Hardware
	cpuTempC: doublePrecision("cpu_temp_c"),
	memoryWiredGb: doublePrecision("memory_wired_gb"),
	memoryCompressedGb: doublePrecision("memory_compressed_gb"),
	memoryPressure: text("memory_pressure"), // 'normal' | 'warn' | 'critical'
	swapUsedGb: doublePrecision("swap_used_gb"),
	uptimeSeconds: integer("uptime_seconds"),
	powerWatts: doublePrecision("power_watts"),
	gpuUsage: doublePrecision("gpu_usage"),
	aneUsage: doublePrecision("ane_usage"),
	fanRpm: integer("fan_rpm"),
	diskReadMbps: doublePrecision("disk_read_mbps"),
	diskWriteMbps: doublePrecision("disk_write_mbps"),
	diskTotalGb: doublePrecision("disk_total_gb"),
	diskUsedGb: doublePrecision("disk_used_gb"),
	// NEW: Network
	netInMbps: doublePrecision("net_in_mbps"),
	netOutMbps: doublePrecision("net_out_mbps"),
	tailscaleStatus: text("tailscale_status"),
	tailscaleLatencyMs: integer("tailscale_latency_ms"),
	latencySupabaseMs: integer("latency_supabase_ms"),
	latencyAnthropicMs: integer("latency_anthropic_ms"),
	// NEW: AI
	claudePids: jsonb("claude_pids"),
	tokensToday: integer("tokens_today"),
	costTodayUsd: doublePrecision("cost_today_usd"),
	apiLatencyMs: integer("api_latency_ms"),
	// NEW: Processes
	topProcesses: jsonb("top_processes"),
	// NEW: OpenClaw
	openclawStatus: text("openclaw_status"),
	openclawVersion: text("openclaw_version"),
	openclawConnectedChannels: integer("openclaw_connected_channels"),
	// NEW: Misc
	gitRepoCount: integer("git_repo_count"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const nodeOpenclawLogs = pgTable("node_openclaw_logs", {
	id: uuid("id").defaultRandom().primaryKey(),
	nodeId: text("node_id").notNull().references(() => nodeRoles.nodeId),
	sessionKey: text("session_key").notNull(),
	sessionType: text("session_type"), // 'main' | 'isolated' | 'cron'
	model: text("model"),
	role: text("role"), // 'user' | 'assistant' | 'system'
	content: text("content").notNull(),
	tokens: integer("tokens"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const failoverEvents = pgTable("failover_events", {
	id: uuid("id").defaultRandom().primaryKey(),
	fromNode: text("from_node").notNull(),
	toNode: text("to_node").notNull(),
	reason: text("reason").notNull(),
	cronsTransferred: text("crons_transferred").array(),
	resolvedAt: timestamp("resolved_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const projectLocks = pgTable("project_locks", {
	projectId: uuid("project_id").primaryKey().references(() => projects.id),
	lockedBy: text("locked_by").notNull().references(() => nodeRoles.nodeId),
	lockType: text("lock_type").default("exclusive"),
	reason: text("reason"),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const activeSessions = pgTable("active_sessions", {
	id: uuid("id").defaultRandom().primaryKey(),
	nodeId: text("node_id").notNull().references(() => nodeRoles.nodeId),
	projectId: uuid("project_id").references(() => projects.id),
	sessionType: text("session_type").notNull(),
	model: text("model").default("opus"),
	pid: integer("pid"),
	startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
	estimatedMinutes: integer("estimated_minutes").default(30),
	lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).defaultNow(),
});

export const cronExecutions = pgTable("cron_executions", {
	id: uuid("id").defaultRandom().primaryKey(),
	nodeId: text("node_id").notNull().references(() => nodeRoles.nodeId),
	skillName: text("skill_name").notNull(),
	startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
	completedAt: timestamp("completed_at", { withTimezone: true }),
	status: text("status").default("running"),
	errorMessage: text("error_message"),
	durationMs: integer("duration_ms"),
});

export const fmpMessages = pgTable("fmp_messages", {
	id: text("id").primaryKey(),
	ts: timestamp("ts", { withTimezone: true }).defaultNow(),
	fromNode: text("from_node").notNull(),
	toNode: text("to_node").notNull(),
	type: text("type").notNull(),
	priority: text("priority").default("normal"),
	payload: jsonb("payload").notNull().default({}),
	replyTo: text("reply_to"),
	channel: text("channel"),
	project: text("project"),
	session: text("session"),
	status: text("status").default("sent"),
	ttl: integer("ttl"),
	retries: integer("retries").default(0),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const fmpNodeStatus = pgTable("fmp_node_status", {
	node: text("node").primaryKey(),
	cpu: doublePrecision("cpu"),
	load: doublePrecision("load"),
	freeMb: integer("free_mb"),
	activeSessions: jsonb("active_sessions"),
	queueDepth: integer("queue_depth").default(0),
	lastHeartbeat: timestamp("last_heartbeat", { withTimezone: true }),
	status: text("status").default("up"),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const fmpTaskQueue = pgTable("fmp_task_queue", {
	id: text("id").primaryKey(),
	messageId: text("message_id"),
	targetNode: text("target_node"),
	priority: text("priority").default("normal"),
	status: text("status").default("pending"),
	assignedSession: text("assigned_session"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
	startedAt: timestamp("started_at", { withTimezone: true }),
	completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const agentEvents = pgTable("agent_events", {
	id: uuid("id").defaultRandom().primaryKey(),
	sourceNode: text("source_node").notNull().references(() => nodeRoles.nodeId),
	targetNode: text("target_node"),
	projectId: uuid("project_id").references(() => projects.id),
	eventType: text("event_type").notNull(),
	priority: text("priority").default("normal"),
	summary: text("summary"),
	data: jsonb("data"),
	status: text("status").default("pending"),
	claimedBy: text("claimed_by"),
	processedAt: timestamp("processed_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
