import { NextResponse } from "next/server";

const NODES = [
	{
		nodeId: "Antoni",
		url: "http://100.88.238.69:18789",
		token: "a5e74f78bf90196d153769a50c4d7a769a67a7d636559b5f",
	},
	{
		nodeId: "Kyungjini",
		url: "http://100.96.10.3:18790",
		token: "4020bd24cc5b33483c93a9d45e68e642d3e63de1fb00c984",
	},
	{
		nodeId: "Jaepini",
		url: "http://100.110.12.82:18790",
		token: "4020bd24cc5b33483c93a9d45e68e642d3e63de1fb00c984",
	},
];

async function fetchNodeSessions(node: (typeof NODES)[number]) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 3000);

	try {
		const res = await fetch(`${node.url}/tools/invoke`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${node.token}`,
			},
			body: JSON.stringify({
				tool: "sessions_list",
				args: { activeMinutes: 5, messageLimit: 1 },
			}),
			signal: controller.signal,
		});

		clearTimeout(timeout);

		if (!res.ok) return { nodeId: node.nodeId, error: "offline" };

		const data = await res.json();
		// sessions_list returns {ok, result: {content: [{type:"text", text: JSON}]}}
		const raw = data?.result?.content?.[0]?.text;
		let sessions: unknown[] = [];
		if (raw) {
			try {
				const parsed = JSON.parse(raw);
				sessions = Array.isArray(parsed) ? parsed : parsed?.sessions ?? [];
			} catch {
				sessions = [];
			}
		}

		return {
			nodeId: node.nodeId,
			sessions: (sessions as Array<Record<string, unknown>>).map((s) => {
				const key = String(s.key ?? s.sessionKey ?? "");
				const label = key.split(":").pop() ?? key;
				const msgs = (s.lastMessages as Array<Record<string, unknown>>) ?? [];
				const lastMsg = msgs[0];
				const lastContent = String(
					lastMsg?.content ?? lastMsg?.text ?? "",
				).slice(0, 120);

				const updatedAt = String(s.updatedAt ?? s.updated_at ?? "");
				let minutesAgo: number | null = null;
				if (updatedAt) {
					minutesAgo = Math.floor(
						(Date.now() - new Date(updatedAt).getTime()) / 60000,
					);
				}

				return { key, label, lastMessage: lastContent || "idle", minutesAgo };
			}),
		};
	} catch {
		clearTimeout(timeout);
		return { nodeId: node.nodeId, error: "offline" };
	}
}

export async function GET() {
	const results = await Promise.allSettled(NODES.map(fetchNodeSessions));

	const nodes = results.map((r, i) => {
		if (r.status === "fulfilled") return r.value;
		return { nodeId: NODES[i].nodeId, error: "offline" };
	});

	return NextResponse.json({ nodes, fetchedAt: new Date().toISOString() });
}
