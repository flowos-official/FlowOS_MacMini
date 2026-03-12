"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeSubscription } from "./use-realtime";
import type { ActiveSession } from "@/types/database";

export function useActiveSessions(nodeId?: string) {
	const supabase = createClient();
	useRealtimeSubscription("active_sessions", ["active_sessions", nodeId ?? "all"]);

	return useQuery({
		queryKey: ["active_sessions", nodeId ?? "all"],
		queryFn: async () => {
			let query = supabase
				.from("active_sessions")
				.select("*")
				.order("started_at", { ascending: false });
			if (nodeId) query = query.eq("node_id", nodeId);
			const { data, error } = await query;
			if (error) throw error;
			return data as ActiveSession[];
		},
	});
}
