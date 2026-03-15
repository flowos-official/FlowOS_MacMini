"use client";

import {
	ChartLine,
	Clock,
	Folder,
	HardDrives,
	Lightning,
	List,
	ListChecks,
	ShieldWarning,
	SignOut,
	SquaresFour,
} from "@phosphor-icons/react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const navItems = [
	{ href: "/dashboard", label: "개요", icon: SquaresFour },
	{ href: "/dashboard/projects", label: "프로젝트", icon: Folder },
	{ href: "/dashboard/events", label: "이벤트", icon: Lightning },
	{ href: "/dashboard/analytics", label: "Analytics", icon: ChartLine },
	{ href: "/dashboard/logs", label: "Logs", icon: List },
	{ href: "/dashboard/tasks", label: "Tasks", icon: ListChecks },
	{ href: "/dashboard/crons", label: "크론 작업", icon: Clock },
	{ href: "/dashboard/controls", label: "제어 패널", icon: ShieldWarning },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const router = useRouter();
	const supabase = createClient();

	const isActive = (href: string) => {
		if (href === "/dashboard") return pathname === "/dashboard";
		return pathname.startsWith(href);
	};

	async function handleSignOut() {
		await supabase.auth.signOut();
		router.push("/login");
	}

	return (
		<div className="flex h-screen bg-white">
			<aside className="w-56 border-r border-neutral-200 flex flex-col bg-neutral-50/50">
				<div className="p-4 border-b border-neutral-200">
					<Link href="/dashboard" className="flex items-center gap-2">
						<HardDrives size={20} weight="thin" />
						<span className="font-bold text-sm tracking-tight">FlowOS 관제센터</span>
					</Link>
				</div>
				<nav className="flex-1 p-2 space-y-0.5">
					{navItems.map(({ href, label, icon: Icon }) => (
						<Link
							key={href}
							href={href}
							className={`relative flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
								isActive(href)
									? "text-neutral-900 font-medium"
									: "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
							}`}
						>
							{isActive(href) && (
								<motion.div
									layoutId="activeNav"
									className="absolute inset-0 bg-neutral-200/70 rounded-md"
									transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
								/>
							)}
							<span className="relative z-10 flex items-center gap-2.5">
								<Icon size={18} weight={isActive(href) ? "light" : "thin"} />
								{label}
							</span>
						</Link>
					))}
				</nav>
				<div className="p-2 border-t border-neutral-200">
					<button
						type="button"
						onClick={handleSignOut}
						className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 w-full transition-colors"
					>
						<SignOut size={18} weight="thin" />
						로그아웃
					</button>
				</div>
			</aside>
			<main className="flex-1 overflow-auto">
				<div className="p-6">{children}</div>
			</main>
		</div>
	);
}
