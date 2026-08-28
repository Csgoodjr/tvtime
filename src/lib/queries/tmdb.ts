import { queryOptions } from "@tanstack/react-query";
import type { MediaType } from "#/lib/tmdb-types";
import {
	getDiscoverFeed,
	getSeasonDetails,
	getTitleDetails,
	getTvUpdates,
	searchTitles,
} from "#/server/tmdb";

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

// TMDB's own guidance is to cache aggressively — trending/popular data
// changes at most a few times a day, and detail records rarely at all.
export const discoverFeedQuery = () =>
	queryOptions({
		queryKey: ["tmdb", "discover"] as const,
		queryFn: () => getDiscoverFeed(),
		staleTime: HOUR,
	});

export const searchTitlesQuery = (query: string) =>
	queryOptions({
		queryKey: ["tmdb", "search", query] as const,
		queryFn: () => searchTitles({ data: { query } }),
		staleTime: 5 * MINUTE,
	});

export const titleDetailsQuery = (mediaType: MediaType, id: number) =>
	queryOptions({
		queryKey: ["tmdb", "title", mediaType, id] as const,
		queryFn: () => getTitleDetails({ data: { mediaType, id } }),
		staleTime: 24 * HOUR,
	});

export const seasonDetailsQuery = (tvId: number, seasonNumber: number) =>
	queryOptions({
		queryKey: ["tmdb", "season", tvId, seasonNumber] as const,
		queryFn: () => getSeasonDetails({ data: { tvId, seasonNumber } }),
		staleTime: 24 * HOUR,
	});

/** Batch season/episode info for a set of watchlisted TV shows, used to
 *  detect ones with a new season out. */
export const tvUpdatesQuery = (tvIds: number[]) => {
	const sortedIds = [...new Set(tvIds)].sort((a, b) => a - b);
	return queryOptions({
		queryKey: ["tmdb", "tv-updates", sortedIds] as const,
		queryFn: () => getTvUpdates({ data: { tvIds: sortedIds } }),
		staleTime: HOUR,
		enabled: sortedIds.length > 0,
	});
};
