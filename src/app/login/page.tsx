"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Envelope, ArrowRight, CircleNotch } from "@phosphor-icons/react";

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [sent, setSent] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const supabase = createClient();

	async function handleLogin(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		setError("");

		const { error } = await supabase.auth.signInWithOtp({
			email,
			options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
		});

		if (error) {
			setError(error.message);
			setLoading(false);
			return;
		}

		setSent(true);
		setLoading(false);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
			<div className="w-full max-w-sm space-y-8 px-6">
				<div className="text-center space-y-2">
					<h1 className="text-2xl font-bold tracking-tight">FlowOS Mission Control</h1>
					<p className="text-sm text-[var(--color-muted-foreground)]">
						Mac Mini node monitoring dashboard
					</p>
				</div>

				{sent ? (
					<div className="rounded-lg border border-[var(--color-border)] p-6 text-center space-y-3">
						<Envelope size={32} weight="thin" className="mx-auto text-[var(--color-muted-foreground)]" />
						<p className="text-sm font-medium">Check your email</p>
						<p className="text-xs text-[var(--color-muted-foreground)]">
							We sent a magic link to <strong>{email}</strong>
						</p>
						<button
							type="button"
							onClick={() => setSent(false)}
							className="text-xs text-[var(--color-muted-foreground)] underline underline-offset-4 hover:text-[var(--color-foreground)]"
						>
							Try a different email
						</button>
					</div>
				) : (
					<form onSubmit={handleLogin} className="space-y-4">
						<div className="space-y-2">
							<label htmlFor="email" className="text-sm font-medium">
								Email
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
									Sign in with email
									<ArrowRight size={16} weight="thin" />
								</>
							)}
						</button>
					</form>
				)}
			</div>
		</div>
	);
}
