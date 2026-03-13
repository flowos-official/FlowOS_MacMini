"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeSubscription } from "./use-realtime";
import type { NodeOpenclawLog } from "@/types/database";

export function useOpenclawLogs(nodeId: string, sessionKey?: string, limit = 200) {
	const supabase = createClient();
	useRealtimeSubscription("node_openclaw_logs", ["openclaw_logs", nodeId, sessionKey ?? "all"]);

	return useQuery({
		queryKey: ["openclaw_logs", nodeId, sessionKey ?? "all"],
		queryFn: async () => {
			let query = supabase
				.from("node_openclaw_logs")
				.select("*")
				.eq("node_id", nodeId)
				.order("created_at", { ascending: true })
				.limit(limit);
			if (sessionKey) query = query.eq("session_key", sessionKey);
			const { data, error } = await query;
			if (error) throw error;
			return data as NodeOpenclawLog[];
		},
		refetchInterval: 5000,
	});
}

export type SessionSummary = {
	session_key: string;
	session_type: string | null;
	model: string | null;
	created_at: string;
	message_count: number;
};

export function useOpenclawSessions(nodeId: string) {
	const supabase = createClient();
	useRealtimeSubscription("node_openclaw_logs", ["openclaw_sessions", nodeId]);

	return useQuery({
		queryKey: ["openclaw_sessions", nodeId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("node_openclaw_logs")
				.select("session_key, session_type, model, created_at")
				.eq("node_id", nodeId)
				.order("created_at", { ascending: false })
				.limit(500);
			if (error) throw error;

			// Deduplicate by session_key, keep most recent + count messages
			const sessionMap = new Map<string, SessionSummary>();
			for (const row of data ?? []) {
				const existing = sessionMap.get(row.session_key);
				if (!existing) {
					sessionMap.set(row.session_key, {
						session_key: row.session_key,
						session_type: row.session_type,
						model: row.model,
						created_at: row.created_at,
						message_count: 1,
					});
				} else {
					existing.message_count++;
				}
			}
			return Array.from(sessionMap.values());
		},
		refetchInterval: 10000,
	});
}
