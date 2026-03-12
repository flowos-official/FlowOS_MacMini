"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeSubscription } from "./use-realtime";
import type { CronExecution } from "@/types/database";

export function useCronExecutions(nodeId?: string, limit = 100) {
	const supabase = createClient();
	useRealtimeSubscription("cron_executions", ["cron_executions", nodeId ?? "all"]);

	return useQuery({
		queryKey: ["cron_executions", nodeId ?? "all"],
		queryFn: async () => {
			let query = supabase
				.from("cron_executions")
				.select("*")
				.order("started_at", { ascending: false })
				.limit(limit);
			if (nodeId) query = query.eq("node_id", nodeId);
			const { data, error } = await query;
			if (error) throw error;
			return data as CronExecution[];
		},
	});
}
