"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
	SquaresFour,
	HardDrives,
	Folder,
	Lightning,
	Clock,
	ShieldWarning,
	SignOut,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
	{ href: "/dashboard", label: "Overview", icon: SquaresFour },
	{ href: "/dashboard/projects", label: "Projects", icon: Folder },
	{ href: "/dashboard/events", label: "Events", icon: Lightning },
	{ href: "/dashboard/crons", label: "Crons", icon: Clock },
	{ href: "/dashboard/controls", label: "Controls", icon: ShieldWarning },
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
		<div className="flex h-screen bg-[var(--color-background)]">
			<aside className="w-56 border-r border-[var(--color-border)] flex flex-col">
				<div className="p-4 border-b border-[var(--color-border)]">
					<Link href="/dashboard" className="flex items-center gap-2">
						<HardDrives size={20} weight="thin" />
						<span className="font-bold text-sm tracking-tight">FlowOS Control</span>
					</Link>
				</div>
				<nav className="flex-1 p-2 space-y-0.5">
					{navItems.map(({ href, label, icon: Icon }) => (
						<Link
							key={href}
							href={href}
							className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
								isActive(href)
									? "bg-[var(--color-secondary)] text-[var(--color-foreground)] font-medium"
									: "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
							}`}
						>
							<Icon size={18} weight={isActive(href) ? "light" : "thin"} />
							{label}
						</Link>
					))}
				</nav>
				<div className="p-2 border-t border-[var(--color-border)]">
					<button
						type="button"
						onClick={handleSignOut}
						className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] w-full transition-colors"
					>
						<SignOut size={18} weight="thin" />
						Sign out
					</button>
				</div>
			</aside>
			<main className="flex-1 overflow-auto">
				<div className="p-6">{children}</div>
			</main>
		</div>
	);
}
