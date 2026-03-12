"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeSubscription } from "./use-realtime";
import type { AgentEvent, FailoverEvent } from "@/types/database";

export function useAgentEvents(limit = 50) {
	const supabase = createClient();
	useRealtimeSubscription("agent_events", ["agent_events"]);

	return useQuery({
		queryKey: ["agent_events"],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("agent_events")
				.select("*")
				.order("created_at", { ascending: false })
				.limit(limit);
			if (error) throw error;
			return data as AgentEvent[];
		},
	});
}

export function useFailoverEvents() {
	const supabase = createClient();
	useRealtimeSubscription("failover_events", ["failover_events"]);

	return useQuery({
		queryKey: ["failover_events"],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("failover_events")
				.select("*")
				.order("created_at", { ascending: false })
				.limit(20);
			if (error) throw error;
			return data as FailoverEvent[];
		},
	});
}
