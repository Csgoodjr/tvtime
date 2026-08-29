import { Link } from "@tanstack/react-router";
import { Bookmark, Compass, Home, Search } from "lucide-react";

const ITEMS = [
	{ to: "/home" as const, label: "Home", icon: Home, exact: true },
	{ to: "/" as const, label: "Discover", icon: Compass, exact: true },
	{ to: "/search" as const, label: "Search", icon: Search, exact: false },
	{ to: "/my-list" as const, label: "My List", icon: Bookmark, exact: false },
];

/** Bottom tab bar shown on mobile only — the navbar covers this at sm and up. */
export function MobileDock() {
	return (
		<div className="dock sm:hidden">
			{ITEMS.map(({ to, label, icon: Icon, exact }) => (
				<Link
					key={to}
					to={to}
					className="min-w-0"
					activeOptions={{ exact }}
					activeProps={{ className: "dock-active text-primary" }}
				>
					<Icon className="size-5 shrink-0" aria-hidden />
					<span className="dock-label truncate">{label}</span>
				</Link>
			))}
		</div>
	);
}
