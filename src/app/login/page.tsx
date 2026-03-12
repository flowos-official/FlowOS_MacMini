"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Lock, ArrowRight, CircleNotch } from "@phosphor-icons/react";

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const supabase = createClient();
	const router = useRouter();

	async function handleLogin(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		setError("");

		const { error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		if (error) {
			setError(error.message);
			setLoading(false);
			return;
		}

		router.push("/dashboard");
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
			<div className="w-full max-w-sm space-y-8 px-6">
				<div className="text-center space-y-2">
					<h1 className="text-2xl font-bold tracking-tight">FlowOS 관제센터</h1>
					<p className="text-sm text-[var(--color-muted-foreground)]">
						Mac Mini 노드 모니터링 대시보드
					</p>
				</div>

				<form onSubmit={handleLogin} className="space-y-4">
					<div className="space-y-2">
						<label htmlFor="email" className="text-sm font-medium">
							이메일
						</label>
						<input
							id="email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="you@flowos.work"
							required
							className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-foreground)] focus:ring-offset-1"
						/>
					</div>
					<div className="space-y-2">
						<label htmlFor="password" className="text-sm font-medium">
							비밀번호
						</label>
						<div className="relative">
							<input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="비밀번호 입력"
								required
								className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-foreground)] focus:ring-offset-1"
							/>
							<Lock
								size={16}
								weight="thin"
								className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
							/>
						</div>
					</div>
					{error && <p className="text-sm text-[var(--color-destructive)]">{error}</p>}
					<button
						type="submit"
						disabled={loading}
						className="w-full flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
					>
						{loading ? (
							<CircleNotch size={16} weight="thin" className="animate-spin" />
						) : (
							<>
								로그인
								<ArrowRight size={16} weight="thin" />
							</>
						)}
					</button>
				</form>
			</div>
		</div>
	);
}
