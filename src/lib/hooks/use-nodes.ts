"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeSubscription } from "./use-realtime";
import type { NodeRole, NodeHeartbeat } from "@/types/database";

export function useNodeRoles() {
	const supabase = createClient();
	useRealtimeSubscription("node_roles", ["node_roles"]);

	return useQuery({
		queryKey: ["node_roles"],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("node_roles")
				.select("*")
				.order("failover_priority");
			if (error) throw error;
			return data as NodeRole[];
		},
	});
}

export function useNodeHeartbeats(nodeId?: string) {
	const supabase = createClient();
	useRealtimeSubscription("node_heartbeats", ["node_heartbeats", nodeId ?? "all"]);

	return useQuery({
		queryKey: ["node_heartbeats", nodeId ?? "all"],
		queryFn: async () => {
			let query = supabase
				.from("node_heartbeats")
				.select("*")
				.order("created_at", { ascending: false })
				.limit(100);
			if (nodeId) query = query.eq("node_id", nodeId);
			const { data, error } = await query;
			if (error) throw error;
			return data as NodeHeartbeat[];
		},
	});
}

export function useLatestHeartbeats() {
	const supabase = createClient();
	useRealtimeSubscription("node_heartbeats", ["latest_heartbeats"]);

	return useQuery({
		queryKey: ["latest_heartbeats"],
		queryFn: async () => {
			const { data, error } = await supabase.rpc("get_latest_heartbeats").select("*");
			if (error) {
				// Fallback: get latest per node manually
				const { data: all, error: fallbackError } = await supabase
					.from("node_heartbeats")
					.select("*")
					.order("created_at", { ascending: false })
					.limit(10);
				if (fallbackError) throw fallbackError;
				const latest = new Map<string, NodeHeartbeat>();
				for (const hb of all as NodeHeartbeat[]) {
					if (!latest.has(hb.node_id)) latest.set(hb.node_id, hb);
				}
				return Array.from(latest.values());
			}
			return data as NodeHeartbeat[];
		},
	});
}
