import { createFileRoute } from "@tanstack/react-router";
import { Bookmark, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "#/components/EmptyState";
import { PosterCard, PosterCardSkeleton } from "#/components/PosterCard";
import type { Rating, WatchStatus } from "#/lib/queries/library";
import {
	normalizeLibraryEntry,
	useLibraryQuery,
	useRemoveEntry,
} from "#/lib/queries/library";

export const Route = createFileRoute("/_authed/my-list")({
	component: MyListPage,
});

const STATUS_FILTERS: { value: WatchStatus | "all"; label: string }[] = [
	{ value: "all", label: "All" },
	{ value: "want", label: "Want to watch" },
	{ value: "watching", label: "Watching" },
	{ value: "watched", label: "Watched" },
];

const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f", "g", "h"];

function MyListPage() {
	const { data: entries = [], isLoading } = useLibraryQuery();
	const removeEntry = useRemoveEntry();
	const [statusFilter, setStatusFilter] = useState<WatchStatus | "all">("all");
	const [ratingFilter, setRatingFilter] = useState<Rating | "all">("all");

	const filtered = useMemo(() => {
		return entries
			.filter((e) => statusFilter === "all" || e.status === statusFilter)
			.filter((e) => ratingFilter === "all" || e.rating === ratingFilter)
			.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
	}, [entries, statusFilter, ratingFilter]);

	if (isLoading) {
		return (
			<div className="grid grid-cols-2 gap-4 px-4 py-8 sm:grid-cols-3 sm:px-6 md:grid-cols-4 lg:grid-cols-5">
				{SKELETON_KEYS.map((key) => (
					<PosterCardSkeleton key={key} className="w-full" />
				))}
			</div>
		);
	}

	if (entries.length === 0) {
		return (
			<EmptyState
				icon={Bookmark}
				title="Your list is empty"
				description="Rate or save a movie or show from Discover or Search to see it here."
				action={{ to: "/", label: "Discover something to watch" }}
			/>
		);
	}

	return (
		<div className="flex flex-col gap-6 px-4 py-8 sm:px-6">
			<div className="flex flex-wrap items-center gap-2">
				<div role="tablist" className="tabs tabs-box">
					{STATUS_FILTERS.map((f) => (
						<button
							key={f.value}
							type="button"
							role="tab"
							className={`tab ${statusFilter === f.value ? "tab-active" : ""}`}
							onClick={() => setStatusFilter(f.value)}
						>
							{f.label}
						</button>
					))}
				</div>
				<div className="join ml-auto">
					<button
						type="button"
						className={`btn join-item btn-sm ${ratingFilter === "up" ? "btn-success" : "btn-ghost"}`}
						aria-label="Filter: thumbs up"
						aria-pressed={ratingFilter === "up"}
						onClick={() =>
							setRatingFilter(ratingFilter === "up" ? "all" : "up")
						}
					>
						<ThumbsUp className="size-4" aria-hidden />
					</button>
					<button
						type="button"
						className={`btn join-item btn-sm ${ratingFilter === "down" ? "btn-error" : "btn-ghost"}`}
						aria-label="Filter: thumbs down"
						aria-pressed={ratingFilter === "down"}
						onClick={() =>
							setRatingFilter(ratingFilter === "down" ? "all" : "down")
						}
					>
						<ThumbsDown className="size-4" aria-hidden />
					</button>
				</div>
			</div>

			{filtered.length === 0 ? (
				<EmptyState
					icon={Bookmark}
					title="Nothing here"
					description="Try a different filter."
				/>
			) : (
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
					{filtered.map((entry) => (
						<div key={entry.id} className="group relative flex flex-col gap-1">
							<div className="relative">
								<PosterCard
									title={normalizeLibraryEntry(entry)}
									className="w-full"
								/>
								<button
									type="button"
									className="btn btn-circle btn-xs btn-error absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
									aria-label="Remove from list"
									onClick={(e) => {
										e.preventDefault();
										removeEntry.mutate(entry.id);
									}}
								>
									<Trash2 className="size-3" aria-hidden />
								</button>
							</div>
							{entry.mediaType === "tv" && entry.totalEpisodes ? (
								<progress
									className="progress progress-primary w-full"
									value={entry.episodesWatched}
									max={entry.totalEpisodes}
								/>
							) : null}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
