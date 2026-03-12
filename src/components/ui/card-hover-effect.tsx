"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

export function HoverEffect({
	items,
	className,
}: {
	items: {
		id: string;
		content: React.ReactNode;
	}[];
	className?: string;
}) {
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

	return (
		<div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4", className)}>
			{items.map((item, idx) => (
				<div
					key={item.id}
					className="relative group block p-2"
					onMouseEnter={() => setHoveredIndex(idx)}
					onMouseLeave={() => setHoveredIndex(null)}
				>
					<AnimatePresence>
						{hoveredIndex === idx && (
							<motion.span
								className="absolute inset-0 h-full w-full bg-neutral-200/60 block rounded-2xl"
								layoutId="hoverBackground"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1, transition: { duration: 0.15 } }}
								exit={{ opacity: 0, transition: { duration: 0.15, delay: 0.2 } }}
							/>
						)}
					</AnimatePresence>
					<div className="relative z-10">{item.content}</div>
				</div>
			))}
		</div>
	);
}
