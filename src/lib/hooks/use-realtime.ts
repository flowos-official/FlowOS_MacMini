"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function useRealtimeSubscription(table: string, queryKey: string[]) {
	const queryClient = useQueryClient();
	const supabase = createClient();

	useEffect(() => {
		const channel = supabase
			.channel(`realtime-${table}`)
			.on("postgres_changes", { event: "*", schema: "public", table }, () => {
				queryClient.invalidateQueries({ queryKey });
			})
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [table, queryKey, queryClient, supabase]);
}
