"use client";

import { useQuery } from "@tanstack/react-query";
import { useRealtimeSubscription } from "./use-realtime";

export type WorkerSession = {
	key: string;
	label: string;
	lastMessage: string;
	minutesAgo: number | null;
	model?: string;
};

export type WorkerNode = {
	nodeId: string;
	sessions?: WorkerSession[];
	error?: string;
	lastHeartbeatAge?: number | null;
};

export type WorkersData = {
	nodes: WorkerNode[];
	fetchedAt: string;
};

export function useWorkers() {
	// Subscribe to realtime changes on active_sessions and node_heartbeats
	useRealtimeSubscription("active_sessions", ["workers"]);
	useRealtimeSubscription("node_heartbeats", ["workers"]);

	return useQuery<WorkersData>({
		queryKey: ["workers"],
		queryFn: () => fetch("/api/workers").then((r) => r.json()),
		refetchInterval: 10000,
		refetchIntervalInBackground: true,
	});
}
