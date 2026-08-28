import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { useMemo } from "react";
import { PosterCard } from "#/components/PosterCard";
import type { LibraryEntry } from "#/lib/queries/library";
import { normalizeLibraryEntry, useLibraryQuery } from "#/lib/queries/library";
import { tvUpdatesQuery } from "#/lib/queries/tmdb";
import { hasRecentNewSeason } from "#/lib/tmdb-types";
import { useAuth } from "#/lib/use-auth";

type Badge = "new-season" | "watching";

interface ShelfItem {
	entry: LibraryEntry;
	badge: Badge;
}

/** Homepage shelf for the watchlist: shows with a newly aired season surface
 *  here, and anything currently being watched is always pinned alongside
 *  them (a "new season" badge wins over "watching" when both apply). */
export function NewSeasonsSection() {
	const { user } = useAuth();
	const { data: entries = [] } = useLibraryQuery();

	const tvEntries = useMemo(
		() =>
			entries.filter(
				(e) =>
					e.mediaType === "tv" &&
					(e.status === "want" || e.status === "watching"),
			),
		[entries],
	);
	const tvIds = useMemo(() => tvEntries.map((e) => e.tmdbId), [tvEntries]);
	const { data: updates = [] } = useQuery(tvUpdatesQuery(tvIds));

	const items = useMemo(() => {
		const updatesById = new Map(updates.map((u) => [u.id, u]));
		const result: ShelfItem[] = [];
		for (const entry of tvEntries) {
			const update = updatesById.get(entry.tmdbId);
			const newSeason = update ? hasRecentNewSeason(update) : false;
			if (newSeason) {
				result.push({ entry, badge: "new-season" });
			} else if (entry.status === "watching") {
				result.push({ entry, badge: "watching" });
			}
		}
		return result.sort((a, b) =>
			a.badge === b.badge ? 0 : a.badge === "new-season" ? -1 : 1,
		);
	}, [tvEntries, updates]);

	if (!user || items.length === 0) return null;

	return (
		<section className="flex flex-col gap-3">
			<div className="flex items-center gap-2 px-4 sm:px-6">
				<CalendarDays className="text-primary size-5" aria-hidden />
				<h2 className="text-lg font-semibold">New seasons for you</h2>
			</div>
			<div className="carousel carousel-center scrollbar-none gap-3 px-4 pb-1 sm:px-6">
				{items.map(({ entry, badge }) => (
					<div key={entry.id} className="carousel-item relative">
						<PosterCard title={normalizeLibraryEntry(entry)} />
						<span
							className={`badge badge-sm absolute top-2 left-2 ${
								badge === "new-season" ? "badge-primary" : "badge-secondary"
							}`}
						>
							{badge === "new-season" ? "New season" : "Watching"}
						</span>
					</div>
				))}
			</div>
		</section>
	);
}
