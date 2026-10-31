import { createFileRoute } from "@tanstack/react-router";
import { Bookmark, Lock, ThumbsDown, ThumbsUp } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "#/components/EmptyState";
import { PosterCard, PosterCardSkeleton } from "#/components/PosterCard";
import { ProfileAvatar } from "#/components/ProfileAvatar";
import { normalizeLibraryEntry, type WatchStatus } from "#/lib/queries/library";
import { useProfiles, useUserLibrary } from "#/lib/queries/social";

export const Route = createFileRoute("/_authed/u/$uid")({
	component: UserLibraryPage,
});

const STATUS_FILTERS: { value: WatchStatus | "all"; label: string }[] = [
	{ value: "all", label: "All" },
	{ value: "watching", label: "Watching" },
	{ value: "want", label: "Want to watch" },
	{ value: "watched", label: "Watched" },
];

const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f", "g", "h"];

/** Read-only view of a user's list — only renders if they accepted us. */
function UserLibraryPage() {
	const { uid } = Route.useParams();
	const profile = useProfiles([uid]).get(uid);
	const { entries, loading, denied } = useUserLibrary(uid);
	const [statusFilter, setStatusFilter] = useState<WatchStatus | "all">("all");

	const filtered = useMemo(
		() =>
			entries
				.filter((e) => e.status !== null)
				.filter((e) => statusFilter === "all" || e.status === statusFilter)
				.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)),
		[entries, statusFilter],
	);

	return (
		<div className="flex flex-col gap-6 px-4 py-8 sm:px-6">
			<div className="flex items-center gap-3">
				<ProfileAvatar profile={profile} size="w-12" />
				<div>
					<h1 className="text-xl font-bold">
						{profile?.displayName || (profile ? `@${profile.handle}` : "…")}
					</h1>
					{profile && (
						<p className="text-base-content/60 text-sm">@{profile.handle}</p>
					)}
				</div>
			</div>

			{denied ? (
				<EmptyState
					icon={Lock}
					title="This list is private"
					description="You can see someone's list only after they accept your follow request."
					action={{ to: "/people", label: "Go to People" }}
				/>
			) : loading ? (
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
					{SKELETON_KEYS.map((key) => (
						<PosterCardSkeleton key={key} className="w-full" />
					))}
				</div>
			) : (
				<>
					<div role="tablist" className="tabs tabs-box self-start">
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
					{filtered.length === 0 ? (
						<EmptyState
							icon={Bookmark}
							title="Nothing here yet"
							description="They haven't added anything with this status."
						/>
					) : (
						<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
							{filtered.map((entry) => (
								<div key={entry.id} className="relative flex flex-col gap-1">
									<PosterCard
										title={normalizeLibraryEntry(entry)}
										className="w-full"
									/>
									{entry.rating && (
										<span
											className={`badge badge-sm absolute top-2 right-2 ${entry.rating === "up" ? "badge-success" : "badge-error"}`}
										>
											{entry.rating === "up" ? (
												<ThumbsUp className="size-3" aria-label="Liked" />
											) : (
												<ThumbsDown className="size-3" aria-label="Disliked" />
											)}
										</span>
									)}
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
				</>
			)}
		</div>
	);
}
