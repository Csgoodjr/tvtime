import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useState } from "react";
import {
	entryId,
	useSeasonWatched,
	useSetSeasonWatched,
	useToggleEpisode,
} from "#/lib/queries/library";
import { seasonDetailsQuery } from "#/lib/queries/tmdb";
import type { NormalizedTitle, TvSeasonSummary } from "#/lib/tmdb-types";
import { useAuth } from "#/lib/use-auth";

const SKELETON_ROWS = ["a", "b", "c"];

interface Props {
	tvId: number;
	season: TvSeasonSummary;
	title: NormalizedTitle;
	totalEpisodes: number;
}

export function SeasonAccordion({ tvId, season, title, totalEpisodes }: Props) {
	const [open, setOpen] = useState(false);
	const { status: authStatus } = useAuth();

	const { data, isLoading } = useQuery({
		...seasonDetailsQuery(tvId, season.season_number),
		enabled: open,
	});
	const { watched, loading: watchedLoading } = useSeasonWatched(
		entryId("tv", tvId),
		season.season_number,
		authStatus === "signed-in",
	);
	const toggleEpisode = useToggleEpisode();
	const setSeasonWatched = useSetSeasonWatched();

	const episodes = data?.episodes ?? [];
	const seed = { mediaType: "tv" as const, tmdbId: tvId, title, totalEpisodes };

	function toggle(episodeNumber: number) {
		const isWatched = watched.includes(episodeNumber);
		const next = isWatched
			? watched.filter((n) => n !== episodeNumber)
			: [...watched, episodeNumber].sort((a, b) => a - b);
		toggleEpisode.mutate({
			seed,
			seasonNumber: season.season_number,
			episodeNumber,
			watched: !isWatched,
			watchedInSeasonAfter: next,
		});
	}

	function markAllWatched() {
		setSeasonWatched.mutate({
			seed,
			seasonNumber: season.season_number,
			episodeNumbers: episodes.map((e) => e.episode_number),
		});
	}

	const allWatched =
		episodes.length > 0 &&
		episodes.every((e) => watched.includes(e.episode_number));

	return (
		<div className="collapse-arrow bg-base-200 border-base-300 collapse border">
			<input
				type="checkbox"
				checked={open}
				onChange={() => setOpen((o) => !o)}
			/>
			<div className="collapse-title flex items-center justify-between gap-2 pr-10 text-sm font-medium">
				<span>{season.name}</span>
				{authStatus === "signed-in" && (
					<span className="text-base-content/60 text-xs font-normal">
						{watched.length}/{season.episode_count} watched
					</span>
				)}
			</div>
			<div className="collapse-content">
				{isLoading || watchedLoading ? (
					<div className="flex flex-col gap-2">
						{SKELETON_ROWS.map((key) => (
							<div key={key} className="skeleton h-12 w-full" />
						))}
					</div>
				) : (
					<div className="flex flex-col gap-1">
						{authStatus === "signed-in" && episodes.length > 0 && (
							<button
								type="button"
								className="btn btn-ghost btn-xs self-end"
								disabled={allWatched}
								onClick={markAllWatched}
							>
								Mark all watched
							</button>
						)}
						{episodes.map((ep) => {
							const isWatched = watched.includes(ep.episode_number);
							const rowContent = (
								<>
									<div className="min-w-0 flex-1">
										<div className="truncate text-sm">
											{ep.episode_number}. {ep.name}
										</div>
									</div>
									{isWatched && (
										<Check
											className="text-success size-4 shrink-0"
											aria-hidden
										/>
									)}
								</>
							);
							// Signed-in rows are real <label>s wrapping the checkbox, so
							// clicking anywhere in the row toggles it — the standard
							// label-click behavior, not just the checkbox hitbox.
							return authStatus === "signed-in" ? (
								<label
									key={ep.id}
									className="hover:bg-base-300 flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2"
								>
									<input
										type="checkbox"
										className="checkbox checkbox-primary checkbox-sm"
										checked={isWatched}
										onChange={() => toggle(ep.episode_number)}
									/>
									{rowContent}
								</label>
							) : (
								<div
									key={ep.id}
									className="flex items-center gap-3 rounded-lg px-2 py-2"
								>
									<span className="text-base-content/40 w-4 text-center text-xs">
										{ep.episode_number}
									</span>
									{rowContent}
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
