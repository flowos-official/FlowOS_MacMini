"use client";

import { useQuery } from "@tanstack/react-query";

export type WorkerSession = {
	key: string;
	label: string;
	lastMessage: string;
	minutesAgo: number | null;
};

export type WorkerNode = {
	nodeId: string;
	sessions?: WorkerSession[];
	error?: string;
};

export type WorkersData = {
	nodes: WorkerNode[];
	fetchedAt: string;
};

export function useWorkers() {
	return useQuery<WorkersData>({
		queryKey: ["workers"],
		queryFn: () => fetch("/api/workers").then((r) => r.json()),
		refetchInterval: 10000,
		refetchIntervalInBackground: true,
	});
}
