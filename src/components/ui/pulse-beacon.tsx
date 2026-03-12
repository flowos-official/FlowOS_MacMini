"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function PulseBeacon({
	alive,
	size = 12,
	className,
}: {
	alive: boolean;
	size?: number;
	className?: string;
}) {
	const color = alive ? "bg-emerald-500" : "bg-red-500";
	const glowColor = alive ? "bg-emerald-400" : "bg-red-400";

	return (
		<span className={cn("relative inline-flex", className)}>
			{alive && (
				<motion.span
					className={cn("absolute inline-flex rounded-full opacity-75", glowColor)}
					style={{ width: size, height: size }}
					animate={{ scale: [1, 2, 1], opacity: [0.75, 0, 0.75] }}
					transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
				/>
			)}
			<span
				className={cn("relative inline-flex rounded-full", color)}
				style={{ width: size, height: size }}
			/>
		</span>
	);
}
