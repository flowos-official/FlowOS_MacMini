import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const NODE_IDS = ["antoni", "kyungjini", "jaepini"];

export async function GET() {
	// Use service role key to bypass RLS (server-side only)
	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_SERVICE_ROLE_KEY!,
		{ cookies: { getAll: () => [], setAll: () => {} } },
	);

	// Fetch active sessions grouped by node
	const { data: sessions } = await supabase
		.from("active_sessions")
		.select("*")
		.order("last_activity_at", { ascending: false });

	// Fetch latest heartbeat per node for online/offline status
	const { data: heartbeats } = await supabase
		.from("node_heartbeats")
		.select("node_id, status, created_at")
		.order("created_at", { ascending: false })
		.limit(30);

	// Build latest heartbeat map
	const latestHeartbeat = new Map<string, { status: string; createdAt: string }>();
	for (const hb of heartbeats ?? []) {
		if (!latestHeartbeat.has(hb.node_id)) {
			latestHeartbeat.set(hb.node_id, {
				status: hb.status ?? "unknown",
				createdAt: hb.created_at,
			});
		}
	}

	const nodes = NODE_IDS.map((nodeId) => {
		const hb = latestHeartbeat.get(nodeId);
		const lastHeartbeatAge = hb
			? Math.floor((Date.now() - new Date(hb.createdAt).getTime()) / 1000)
			: null;
		const isOnline = lastHeartbeatAge !== null && lastHeartbeatAge < 120; // 2 min threshold

		const nodeSessions = (sessions ?? [])
			.filter((s) => s.node_id === nodeId)
			.map((s) => {
				const key = s.session_type ?? "unknown";
				const label = key.split(":").pop() ?? key;
				const minutesAgo = s.last_activity_at
					? Math.floor((Date.now() - new Date(s.last_activity_at).getTime()) / 60000)
					: null;

				return {
					key: s.id,
					label,
					lastMessage: s.session_type ?? "idle",
					minutesAgo,
					model: s.model,
				};
			});

		if (!isOnline && nodeSessions.length === 0) {
			return { nodeId, error: "offline" };
		}

		return {
			nodeId,
			sessions: nodeSessions,
			lastHeartbeatAge,
		};
	});

	return NextResponse.json({ nodes, fetchedAt: new Date().toISOString() });
}
