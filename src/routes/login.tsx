import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Film, LogIn } from "lucide-react";
import { type FormEvent, useState } from "react";
import {
	signInWithEmail,
	signInWithGoogle,
	signUpWithEmail,
} from "#/lib/auth-store";

export const Route = createFileRoute("/login")({
	component: LoginPage,
});

function errorMessage(err: unknown): string {
	if (err instanceof Error) {
		const match = err.message.match(/\(auth\/([a-z-]+)\)/);
		if (match) return match[1].replace(/-/g, " ");
		return err.message;
	}
	return "Something went wrong. Please try again.";
}

function LoginPage() {
	const navigate = useNavigate();
	const [mode, setMode] = useState<"signin" | "signup">("signin");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	async function handleGoogle() {
		setError(null);
		setBusy(true);
		try {
			await signInWithGoogle();
			navigate({ to: "/" });
		} catch (err) {
			setError(errorMessage(err));
		} finally {
			setBusy(false);
		}
	}

	async function handleEmailSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);
		setBusy(true);
		try {
			if (mode === "signin") await signInWithEmail(email, password);
			else await signUpWithEmail(email, password);
			navigate({ to: "/" });
		} catch (err) {
			setError(errorMessage(err));
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
			<div className="card bg-base-200 card-border border-base-300 w-full max-w-sm">
				<div className="card-body gap-4">
					<div className="flex flex-col items-center gap-2 text-center">
						<Film className="text-primary size-8" aria-hidden />
						<h1 className="text-xl font-bold">
							{mode === "signin" ? "Welcome back" : "Create your account"}
						</h1>
						<p className="text-base-content/60 text-sm">
							Track what you watch, rate it, and pick up where you left off.
						</p>
					</div>

					<button
						type="button"
						className="btn btn-outline gap-2"
						onClick={handleGoogle}
						disabled={busy}
					>
						<LogIn className="size-4" aria-hidden />
						Continue with Google
					</button>

					<div className="divider text-base-content/40 text-xs">or</div>

					<form className="flex flex-col gap-3" onSubmit={handleEmailSubmit}>
						<input
							type="email"
							required
							placeholder="Email"
							className="input w-full"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
						/>
						<input
							type="password"
							required
							minLength={6}
							placeholder="Password"
							className="input w-full"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
						/>
						{error && (
							<div
								role="alert"
								className="alert alert-error alert-soft text-sm"
							>
								{error}
							</div>
						)}
						<button type="submit" className="btn btn-primary" disabled={busy}>
							{mode === "signin" ? "Sign in" : "Sign up"}
						</button>
					</form>

					<button
						type="button"
						className="link link-hover text-base-content/60 text-center text-sm"
						onClick={() =>
							setMode((m) => (m === "signin" ? "signup" : "signin"))
						}
					>
						{mode === "signin"
							? "Don't have an account? Sign up"
							: "Already have an account? Sign in"}
					</button>
				</div>
			</div>
		</div>
	);
}
