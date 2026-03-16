"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeSubscription } from "./use-realtime";
import type { FmpMessage, FmpTaskQueue } from "@/types/database";

export function useFmpMessages(limit = 20) {
	const supabase = createClient();
	useRealtimeSubscription("fmp_messages", ["fmp_messages"]);

	return useQuery({
		queryKey: ["fmp_messages", limit],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("fmp_messages")
				.select("*")
				.order("created_at", { ascending: false })
				.limit(limit);
			if (error) throw error;
			return data as FmpMessage[];
		},
		refetchInterval: 15_000,
	});
}

export function useFmpStats() {
	const supabase = createClient();
	useRealtimeSubscription("fmp_messages", ["fmp_stats"]);

	return useQuery({
		queryKey: ["fmp_stats"],
		queryFn: async () => {
			const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();

			const { data: recent, error } = await supabase
				.from("fmp_messages")
				.select("from_node, to_node, type, status, project")
				.gte("created_at", oneHourAgo);
			if (error) throw error;

			const msgs = (recent ?? []) as Pick<FmpMessage, "from_node" | "to_node" | "type" | "status" | "project">[];

			const byNode: Record<string, number> = {};
			const byType: Record<string, number> = {};
			const byStatus: Record<string, number> = {};
			const byProject: Record<string, number> = {};
			let slackPosts = 0;
			let nodeToNode = 0;

			for (const m of msgs) {
				byNode[m.from_node] = (byNode[m.from_node] ?? 0) + 1;
				byType[m.type] = (byType[m.type] ?? 0) + 1;
				byStatus[m.status] = (byStatus[m.status] ?? 0) + 1;
				if (m.project) byProject[m.project] = (byProject[m.project] ?? 0) + 1;
				if (m.to_node === "slack") slackPosts++;
				else nodeToNode++;
			}

			return {
				total: msgs.length,
				slackPosts,
				nodeToNode,
				byNode,
				byType,
				byStatus,
				byProject,
			};
		},
		refetchInterval: 30_000,
	});
}

export function useFmpTaskQueue() {
	const supabase = createClient();
	useRealtimeSubscription("fmp_task_queue", ["fmp_task_queue"]);

	return useQuery({
		queryKey: ["fmp_task_queue"],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("fmp_task_queue")
				.select("*")
				.in("status", ["pending", "assigned", "running"])
				.order("created_at", { ascending: false })
				.limit(20);
			if (error) throw error;
			return data as FmpTaskQueue[];
		},
		refetchInterval: 15_000,
	});
}
