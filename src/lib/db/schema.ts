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
	cpuUsage: doublePrecision("cpu_usage"),
	memoryUsage: doublePrecision("memory_usage"),
	diskFreeGb: doublePrecision("disk_free_gb"),
	lastError: text("last_error"),
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
