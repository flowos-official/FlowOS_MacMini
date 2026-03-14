"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from "recharts";
import { ChartLine, Cpu, Memory, HardDrive, CheckCircle } from "@phosphor-icons/react";
import { motion } from "framer-motion";

type Heartbeat = {
	node_id: string;
	created_at: string;
	cpu_usage: number | null;
	memory_usage: number | null;
	disk_free_gb: number | null;
	status: string | null;
};

function useHeartbeats24h() {
	const supabase = createClient();
	const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
	return useQuery({
		queryKey: ["heartbeats_24h"],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("node_heartbeats")
				.select("node_id, created_at, cpu_usage, memory_usage, disk_free_gb, status")
				.gte("created_at", since)
				.order("created_at", { ascending: true });
			if (error) throw error;
			return data as Heartbeat[];
		},
		refetchInterval: 60_000,
	});
}

function buildChartData(heartbeats: Heartbeat[], metric: "cpu_usage" | "memory_usage") {
	// Bucket by 30-min intervals
	const buckets: Record<string, Record<string, number | null>> = {};
	for (const hb of heartbeats) {
		const d = new Date(hb.created_at);
		d.setMinutes(Math.floor(d.getMinutes() / 30) * 30, 0, 0);
		const key = d.toISOString();
		if (!buckets[key]) buckets[key] = {};
		const vals = buckets[key][hb.node_id];
		const v = hb[metric];
		buckets[key][hb.node_id] = vals == null ? v : v == null ? vals : (vals + v) / 2;
	}
	return Object.entries(buckets)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([ts, nodes]) => ({
			time: new Date(ts).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
			anton: nodes.antoni != null ? +nodes.antoni.toFixed(1) : null,
			kyungjini: nodes.kyungjini != null ? +nodes.kyungjini.toFixed(1) : null,
		}));
}

function StatCard({
	label,
	value,
	unit,
	icon: Icon,
	color,
}: {
	label: string;
	value: string;
	unit: string;
	icon: React.ElementType;
	color: string;
}) {
	return (
		<div className="rounded-2xl border border-neutral-200 bg-white p-5">
			<div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl mb-3 ${color}`}>
				<Icon size={18} weight="light" />
			</div>
			<div className="text-2xl font-bold tabular-nums">{value}</div>
			<div className="text-xs text-neutral-500 mt-0.5">{label} <span className="text-neutral-400">{unit}</span></div>
		</div>
	);
}

export default function AnalyticsPage() {
	const { data: heartbeats = [], isLoading } = useHeartbeats24h();

	const cpuData = buildChartData(heartbeats, "cpu_usage");
	const memData = buildChartData(heartbeats, "memory_usage");

	const aliveCount = heartbeats.filter((h) => h.status === "alive").length;
	const uptimePct = heartbeats.length > 0 ? ((aliveCount / heartbeats.length) * 100).toFixed(1) : "—";

	const avgCpu = heartbeats.length > 0
		? (heartbeats.reduce((s, h) => s + (h.cpu_usage ?? 0), 0) / heartbeats.length).toFixed(1)
		: "—";
	const avgMem = heartbeats.length > 0
		? (heartbeats.reduce((s, h) => s + (h.memory_usage ?? 0), 0) / heartbeats.length).toFixed(1)
		: "—";
	const avgDisk = heartbeats.length > 0
		? (heartbeats.reduce((s, h) => s + (h.disk_free_gb ?? 0), 0) / heartbeats.length).toFixed(0)
		: "—";

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-64 text-neutral-400 text-sm">
				데이터 로딩 중...
			</div>
		);
	}

	return (
		<div className="max-w-[1100px] mx-auto">
			<motion.div
				initial={{ opacity: 0, y: -10 }}
				animate={{ opacity: 1, y: 0 }}
				className="mb-8"
			>
				<div className="flex items-center gap-3">
					<ChartLine size={28} weight="thin" className="text-blue-500" />
					<div>
						<h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
						<p className="text-sm text-neutral-500">최근 24시간 노드 성능 데이터</p>
					</div>
				</div>
			</motion.div>

			{/* Stat cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
				<StatCard label="평균 CPU" value={avgCpu} unit="%" icon={Cpu} color="bg-blue-50 text-blue-600" />
				<StatCard label="평균 메모리" value={avgMem} unit="%" icon={Memory} color="bg-purple-50 text-purple-600" />
				<StatCard label="평균 여유 디스크" value={avgDisk} unit="GB" icon={HardDrive} color="bg-emerald-50 text-emerald-600" />
				<StatCard label="업타임" value={uptimePct} unit="%" icon={CheckCircle} color="bg-amber-50 text-amber-600" />
			</div>

			{/* CPU Chart */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.1 }}
				className="rounded-2xl border border-neutral-200 bg-white p-6 mb-6"
			>
				<h2 className="text-sm font-semibold text-neutral-700 mb-5">CPU 사용률 (%) — 24h</h2>
				{cpuData.length === 0 ? (
					<div className="h-48 flex items-center justify-center text-neutral-400 text-sm">데이터 없음</div>
				) : (
					<ResponsiveContainer width="100%" height={240}>
						<LineChart data={cpuData}>
							<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
							<XAxis dataKey="time" tick={{ fontSize: 11, fill: "#9ca3af" }} />
							<YAxis unit="%" tick={{ fontSize: 11, fill: "#9ca3af" }} domain={[0, 100]} />
							<Tooltip
								contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
								formatter={(v: number) => [`${v}%`]}
							/>
							<Legend wrapperStyle={{ fontSize: 12 }} />
							<Line type="monotone" dataKey="anton" name="Antoni" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls />
							<Line type="monotone" dataKey="kyungjini" name="Kyungjini" stroke="#10b981" strokeWidth={2} dot={false} connectNulls />
						</LineChart>
					</ResponsiveContainer>
				)}
			</motion.div>

			{/* Memory Chart */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.2 }}
				className="rounded-2xl border border-neutral-200 bg-white p-6"
			>
				<h2 className="text-sm font-semibold text-neutral-700 mb-5">메모리 사용률 (%) — 24h</h2>
				{memData.length === 0 ? (
					<div className="h-48 flex items-center justify-center text-neutral-400 text-sm">데이터 없음</div>
				) : (
					<ResponsiveContainer width="100%" height={240}>
						<LineChart data={memData}>
							<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
							<XAxis dataKey="time" tick={{ fontSize: 11, fill: "#9ca3af" }} />
							<YAxis unit="%" tick={{ fontSize: 11, fill: "#9ca3af" }} domain={[0, 100]} />
							<Tooltip
								contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
								formatter={(v: number) => [`${v}%`]}
							/>
							<Legend wrapperStyle={{ fontSize: 12 }} />
							<Line type="monotone" dataKey="anton" name="Antoni" stroke="#8b5cf6" strokeWidth={2} dot={false} connectNulls />
							<Line type="monotone" dataKey="kyungjini" name="Kyungjini" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls />
						</LineChart>
					</ResponsiveContainer>
				)}
			</motion.div>
		</div>
	);
}
