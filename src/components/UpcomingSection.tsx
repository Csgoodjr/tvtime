import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CalendarClock, Tv } from "lucide-react";
import { useMemo } from "react";
import { formatAirDate, isTodayOrFuture } from "#/lib/format-date";
import type { LibraryEntry, WatchStatus } from "#/lib/queries/library";
import { useLibraryQuery } from "#/lib/queries/library";
import { tvUpdatesQuery } from "#/lib/queries/tmdb";
import type { Episode } from "#/lib/tmdb-types";
import { posterUrl } from "#/lib/tmdb-types";
import { useAuth } from "#/lib/use-auth";

interface UpcomingItem {
	entry: LibraryEntry;
	episode: Episode;
	airDate: string;
}

const MAX_ITEMS = 25;

const BADGE_BY_STATUS: Record<
	WatchStatus,
	{ label: string; className: string }
> = {
	want: { label: "Watchlist", className: "badge-primary" },
	watching: { label: "Watching", className: "badge-secondary" },
	watched: { label: "Watched", className: "badge-ghost" },
};

/** Homepage list for the signed-in user's tracked shows with a scheduled
 *  future episode/season — whether that's the next episode of something
 *  they're watching, a new season for something they've finished, or the
 *  premiere of a watchlisted show they haven't started yet. Sorted soonest
 *  first. */
export function UpcomingSection() {
	const { user } = useAuth();
	const { data: entries = [] } = useLibraryQuery();

	const tvEntries = useMemo(
		() => entries.filter((e) => e.mediaType === "tv" && e.status != null),
		[entries],
	);
	const tvIds = useMemo(() => tvEntries.map((e) => e.tmdbId), [tvEntries]);
	const { data: updates = [] } = useQuery(tvUpdatesQuery(tvIds));

	const items = useMemo(() => {
		const updatesById = new Map(updates.map((u) => [u.id, u]));
		const result: UpcomingItem[] = [];
		for (const entry of tvEntries) {
			const episode = updatesById.get(entry.tmdbId)?.next_episode_to_air;
			if (!episode?.air_date || !isTodayOrFuture(episode.air_date)) continue;
			result.push({ entry, episode, airDate: episode.air_date });
		}
		return result
			.sort((a, b) => a.airDate.localeCompare(b.airDate))
			.slice(0, MAX_ITEMS);
	}, [tvEntries, updates]);

	if (!user || items.length === 0) return null;

	return (
		<section className="flex flex-col gap-3">
			<div className="flex items-center gap-2">
				<CalendarClock className="text-primary size-5" aria-hidden />
				<h2 className="text-lg font-semibold">Upcoming</h2>
			</div>
			<ul className="divide-base-300 bg-base-200 border-base-300 divide-y overflow-hidden rounded-box border">
				{items.map(({ entry, episode, airDate }) => {
					const poster = posterUrl(entry.posterPath, "w92");
					const badge = entry.status ? BADGE_BY_STATUS[entry.status] : null;
					return (
						<li key={entry.id}>
							<Link
								to="/title/$mediaType/$id"
								params={{ mediaType: "tv", id: String(entry.tmdbId) }}
								className="hover:bg-base-300/50 flex items-center gap-3 p-3 transition-colors"
							>
								<div className="bg-base-300 h-16 w-11 shrink-0 overflow-hidden rounded">
									{poster ? (
										<img
											src={poster}
											alt=""
											loading="lazy"
											className="h-full w-full object-cover"
										/>
									) : (
										<div className="text-base-content/30 flex h-full w-full items-center justify-center">
											<Tv className="size-5" aria-hidden />
										</div>
									)}
								</div>
								<div className="min-w-0 flex-1">
									<p className="line-clamp-1 text-sm font-semibold">
										{entry.title}
									</p>
									<p className="text-base-content/60 line-clamp-1 text-xs">
										{`S${episode.season_number}E${episode.episode_number}`}
										{episode.name ? ` · ${episode.name}` : ""}
									</p>
								</div>
								<div className="flex shrink-0 flex-col items-end gap-1">
									<span className="text-xs font-medium">
										{formatAirDate(airDate)}
									</span>
									{badge && (
										<span className={`badge badge-sm ${badge.className}`}>
											{badge.label}
										</span>
									)}
								</div>
							</Link>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
