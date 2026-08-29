import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Bookmark,
	ChevronRight,
	Clapperboard,
	Clock,
	ListChecks,
	Tv,
} from "lucide-react";
import type { ComponentType } from "react";
import { useMemo } from "react";
import { EmptyState } from "#/components/EmptyState";
import { PosterCard } from "#/components/PosterCard";
import {
	type LibraryEntry,
	normalizeLibraryEntry,
	useLibraryQuery,
	type WatchStatus,
} from "#/lib/queries/library";
import { useAuth } from "#/lib/use-auth";

export const Route = createFileRoute("/_authed/home")({
	component: HomePage,
});

function byStatus(entries: LibraryEntry[], status: WatchStatus) {
	return entries
		.filter((e) => e.status === status)
		.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

function HomePage() {
	const { user } = useAuth();
	const { data: entries = [], isLoading } = useLibraryQuery();

	const stats = useMemo(
		() => ({
			moviesWatched: entries.filter(
				(e) => e.mediaType === "movie" && e.status === "watched",
			).length,
			showsWatching: entries.filter(
				(e) => e.mediaType === "tv" && e.status === "watching",
			).length,
			episodesWatched: entries.reduce(
				(sum, e) => sum + (e.mediaType === "tv" ? e.episodesWatched : 0),
				0,
			),
			total: entries.length,
		}),
		[entries],
	);

	const watching = useMemo(() => byStatus(entries, "watching"), [entries]);
	const want = useMemo(() => byStatus(entries, "want"), [entries]);
	const watched = useMemo(() => byStatus(entries, "watched"), [entries]);

	if (isLoading) {
		return (
			<div className="flex flex-col gap-8 px-4 py-8 sm:px-6">
				<div className="skeleton h-8 w-56" />
				<div className="stats stats-vertical sm:stats-horizontal bg-base-200 border-base-300 w-full border">
					{["a", "b", "c", "d"].map((key) => (
						<div key={key} className="stat">
							<div className="skeleton h-4 w-24" />
							<div className="skeleton mt-2 h-8 w-12" />
						</div>
					))}
				</div>
			</div>
		);
	}

	if (entries.length === 0) {
		return (
			<EmptyState
				icon={Bookmark}
				title="Nothing tracked yet"
				description="Rate or save a movie or show from Discover or Search to start building your stats."
				action={{ to: "/", label: "Discover something to watch" }}
			/>
		);
	}

	const firstName = user?.displayName?.split(" ")[0];

	return (
		<div className="flex flex-col gap-8 px-4 py-8 sm:px-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold">
					Welcome back{firstName ? `, ${firstName}` : ""}
				</h1>
				<p className="text-base-content/60 text-sm">
					Here's what you've been watching.
				</p>
			</div>

			<div className="stats stats-vertical sm:stats-horizontal bg-base-200 border-base-300 w-full border shadow-sm">
				<Stat
					icon={Clapperboard}
					label="Movies watched"
					value={stats.moviesWatched}
				/>
				<Stat icon={Tv} label="Shows watching" value={stats.showsWatching} />
				<Stat
					icon={Clock}
					label="Episodes watched"
					value={stats.episodesWatched}
				/>
				<Stat icon={ListChecks} label="In your list" value={stats.total} />
			</div>

			<LibraryRow
				heading="Continue watching"
				status="watching"
				entries={watching}
			/>
			<LibraryRow heading="Want to watch" status="want" entries={want} />
			<LibraryRow
				heading="Recently watched"
				status="watched"
				entries={watched}
			/>
		</div>
	);
}

function Stat({
	icon: Icon,
	label,
	value,
}: {
	icon: ComponentType<{ className?: string }>;
	label: string;
	value: number;
}) {
	return (
		<div className="stat">
			<div className="stat-figure text-primary">
				<Icon className="size-6" aria-hidden />
			</div>
			<div className="stat-title">{label}</div>
			<div className="stat-value text-2xl">{value}</div>
		</div>
	);
}

function LibraryRow({
	heading,
	status,
	entries,
}: {
	heading: string;
	status: WatchStatus;
	entries: LibraryEntry[];
}) {
	if (entries.length === 0) return null;

	return (
		<section className="flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">{heading}</h2>
				<Link
					to="/my-list"
					search={{ status }}
					className="text-base-content/60 hover:text-base-content flex items-center gap-0.5 text-sm"
				>
					See all
					<ChevronRight className="size-4" aria-hidden />
				</Link>
			</div>
			<div className="carousel carousel-center scrollbar-none gap-3 pb-1">
				{entries.slice(0, 12).map((entry) => (
					<div key={entry.id} className="carousel-item">
						<PosterCard title={normalizeLibraryEntry(entry)} />
					</div>
				))}
			</div>
		</section>
	);
}
