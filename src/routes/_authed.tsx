import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getAuthSnapshot, waitForAuthInit } from "#/lib/auth-store";

// The Firebase web SDK keeps its session in IndexedDB, not a cookie, so the
// server genuinely cannot know who's signed in. `ssr: false` keeps this
// whole subtree client-only rather than server-rendering a guess that's
// always "signed out" — public routes (Discover, Search, Title) stay fully
// server-rendered; only the library is gated here.
export const Route = createFileRoute("/_authed")({
	ssr: false,
	beforeLoad: async () => {
		await waitForAuthInit();
		const { user } = getAuthSnapshot();
		if (!user) {
			throw redirect({ to: "/login" });
		}
	},
	component: () => <Outlet />,
});
