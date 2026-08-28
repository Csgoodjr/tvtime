import { createServerFn } from "@tanstack/react-start";
import type {
	MediaType,
	MovieDetails,
	MovieListItem,
	MultiItem,
	Paginated,
	SeasonDetails,
	TitleItem,
	TvDetails,
	TvListItem,
} from "#/lib/tmdb-types";

const TMDB_BASE = "https://api.themoviedb.org/3";

// Server-only fetch. The bearer token never reaches the client — every
// route below is a createServerFn, so this module only ever runs on the
// server (Vite strips it from the client bundle).
async function tmdbFetch<T>(
	path: string,
	params: Record<string, string | number | boolean | undefined> = {},
): Promise<T> {
	const token = process.env.TMDB_READ_TOKEN;
	if (!token) {
		throw new Error("TMDB_READ_TOKEN is not set. Add it to .env.local.");
	}

	const url = new URL(TMDB_BASE + path);
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined) url.searchParams.set(key, String(value));
	}

	const res = await fetch(url, {
		headers: {
			Authorization: `Bearer ${token}`,
			accept: "application/json",
		},
	});

	if (!res.ok) {
		const body = await res.text();
		throw new Error(`TMDB ${res.status} on ${path}: ${body}`);
	}

	return res.json() as Promise<T>;
}

function today(): string {
	return new Date().toISOString().slice(0, 10);
}

export interface DiscoverFeed {
	trending: TitleItem[];
	newMovies: TitleItem[];
	newShows: TitleItem[];
	popularMovies: TitleItem[];
	popularShows: TitleItem[];
}

export const getDiscoverFeed = createServerFn({ method: "GET" }).handler(
	async (): Promise<DiscoverFeed> => {
		const [trending, newMovies, newShows, popularMovies, popularShows] =
			await Promise.all([
				tmdbFetch<Paginated<MultiItem>>("/trending/all/week"),
				tmdbFetch<Paginated<MovieListItem>>("/discover/movie", {
					sort_by: "primary_release_date.desc",
					"primary_release_date.lte": today(),
					"vote_count.gte": 50,
					include_adult: false,
				}),
				tmdbFetch<Paginated<TvListItem>>("/discover/tv", {
					sort_by: "first_air_date.desc",
					"first_air_date.lte": today(),
					"vote_count.gte": 20,
					include_null_first_air_dates: false,
				}),
				tmdbFetch<Paginated<MovieListItem>>("/movie/popular"),
				tmdbFetch<Paginated<TvListItem>>("/tv/popular"),
			]);

		// Trending mixes in "person" results; drop them and inject media_type
		// where it's missing (discover/popular never carry it).
		const trendingTitles = trending.results.filter(
			(item): item is TitleItem =>
				item.media_type === "movie" || item.media_type === "tv",
		);

		return {
			trending: trendingTitles,
			newMovies: newMovies.results.map((m) => ({
				...m,
				media_type: "movie" as const,
			})),
			newShows: newShows.results.map((s) => ({
				...s,
				media_type: "tv" as const,
			})),
			popularMovies: popularMovies.results.map((m) => ({
				...m,
				media_type: "movie" as const,
			})),
			popularShows: popularShows.results.map((s) => ({
				...s,
				media_type: "tv" as const,
			})),
		};
	},
);

export const searchTitles = createServerFn({ method: "GET" })
	.validator((data: { query: string }) => data)
	.handler(async ({ data }): Promise<TitleItem[]> => {
		if (!data.query.trim()) return [];
		const res = await tmdbFetch<Paginated<MultiItem>>("/search/multi", {
			query: data.query,
			include_adult: false,
		});
		return res.results.filter(
			(item): item is TitleItem =>
				item.media_type === "movie" || item.media_type === "tv",
		);
	});

export const getTitleDetails = createServerFn({ method: "GET" })
	.validator((data: { mediaType: MediaType; id: number }) => data)
	.handler(async ({ data }): Promise<MovieDetails | TvDetails> => {
		const path =
			data.mediaType === "movie" ? `/movie/${data.id}` : `/tv/${data.id}`;
		return tmdbFetch<MovieDetails | TvDetails>(path, {
			append_to_response: "credits,videos,recommendations",
		});
	});

export const getSeasonDetails = createServerFn({ method: "GET" })
	.validator((data: { tvId: number; seasonNumber: number }) => data)
	.handler(async ({ data }): Promise<SeasonDetails> => {
		return tmdbFetch<SeasonDetails>(
			`/tv/${data.tvId}/season/${data.seasonNumber}`,
		);
	});
