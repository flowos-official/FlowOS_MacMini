"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeSubscription } from "./use-realtime";
import type { Project, ProjectLock } from "@/types/database";

export function useProjects() {
	const supabase = createClient();
	useRealtimeSubscription("projects", ["projects"]);

	return useQuery({
		queryKey: ["projects"],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("projects")
				.select("*")
				.order("updated_at", { ascending: false });
			if (error) throw error;
			return data as Project[];
		},
	});
}

export function useProjectLocks() {
	const supabase = createClient();
	useRealtimeSubscription("project_locks", ["project_locks"]);

	return useQuery({
		queryKey: ["project_locks"],
		queryFn: async () => {
			const { data, error } = await supabase.from("project_locks").select("*");
			if (error) throw error;
			return data as ProjectLock[];
		},
	});
}
