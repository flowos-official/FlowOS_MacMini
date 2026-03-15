import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AgentTask } from "@/types/database";

export function useAgentTasks(limit = 50) {
	const [tasks, setTasks] = useState<AgentTask[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const supabase = createClient();

	useEffect(() => {
		const fetchTasks = async () => {
			const { data } = await supabase
				.from("agent_tasks")
				.select("*")
				.order("created_at", { ascending: false })
				.limit(limit);
			if (data) setTasks(data);
			setIsLoading(false);
		};

		fetchTasks();

		const channel = supabase
			.channel("agent_tasks_realtime")
			.on("postgres_changes", { event: "*", schema: "public", table: "agent_tasks" }, () => {
				fetchTasks();
			})
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [limit, supabase.from, supabase.channel, supabase.removeChannel]);

	return { data: tasks, isLoading };
}

export function useActiveTaskCounts() {
	const { data: tasks } = useAgentTasks(200);
	const active = tasks.filter((t) => t.status === "pending" || t.status === "running");
	const counts: Record<string, number> = {};
	for (const t of active) {
		counts[t.assignee] = (counts[t.assignee] ?? 0) + 1;
	}
	return { counts, total: active.length };
}
