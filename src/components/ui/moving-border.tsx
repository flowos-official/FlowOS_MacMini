"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function MovingBorder({
	children,
	duration = 3000,
	className,
	containerClassName,
	borderClassName,
	as: Component = "div",
}: {
	children: ReactNode;
	duration?: number;
	className?: string;
	containerClassName?: string;
	borderClassName?: string;
	as?: React.ElementType;
}) {
	return (
		<Component
			className={cn(
				"relative overflow-hidden rounded-xl p-[1px] bg-transparent",
				containerClassName,
			)}
		>
			<motion.div
				className={cn(
					"absolute inset-0 rounded-xl",
					borderClassName,
				)}
				style={{
					background:
						"conic-gradient(from var(--angle, 0deg), transparent 60%, #3b82f6 80%, transparent 100%)",
				}}
				animate={{ "--angle": ["0deg", "360deg"] } as Record<string, string[]>}
				transition={{
					duration: duration / 1000,
					repeat: Number.POSITIVE_INFINITY,
					ease: "linear",
				}}
			/>
			<div
				className={cn(
					"relative rounded-xl bg-white",
					className,
				)}
			>
				{children}
			</div>
		</Component>
	);
}
