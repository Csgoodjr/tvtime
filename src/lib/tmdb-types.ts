// Minimal hand-rolled TMDB types covering only the fields this app uses.
// See the plan for why: no official SDK exists, and the community wrapper
// packages are runtime clients (they'd fight our own fetch/caching setup)
// rather than pure type packages.

export interface Paginated<T> {
	page: number;
	results: T[];
	total_pages: number;
	total_results: number;
}

interface MediaBase {
	id: number;
	overview: string;
	poster_path: string | null;
	backdrop_path: string | null;
	genre_ids?: number[];
	popularity: number;
	vote_average: number;
	vote_count: number;
	original_language: string;
}

export interface MovieListItem extends MediaBase {
	media_type?: "movie";
	title: string;
	original_title: string;
	release_date: string; // "YYYY-MM-DD" | ""
	adult: boolean;
	video: boolean;
}

export interface TvListItem extends MediaBase {
	media_type?: "tv";
	name: string;
	original_name: string;
	first_air_date: string; // "YYYY-MM-DD" | ""
	origin_country: string[];
}

export interface PersonListItem {
	media_type: "person";
	id: number;
	name: string;
	profile_path: string | null;
	known_for_department: string;
}

export type MultiItem = MovieListItem | TvListItem | PersonListItem;

export function isPerson(item: MultiItem): item is PersonListItem {
	return item.media_type === "person";
}

export function isMovie(item: MultiItem): item is MovieListItem {
	return !isPerson(item) && "title" in item;
}

export function isTv(item: MultiItem): item is TvListItem {
	return !isPerson(item) && "name" in item && "first_air_date" in item;
}

export type TitleItem = MovieListItem | TvListItem;
export type MediaType = "movie" | "tv";

interface Genre {
	id: number;
	name: string;
}

interface CastMember {
	id: number;
	name: string;
	character: string;
	profile_path: string | null;
	order: number;
}

interface Credits {
	cast: CastMember[];
}

export interface MovieDetails extends MediaBase {
	title: string;
	original_title: string;
	release_date: string;
	runtime: number | null;
	tagline: string;
	status: string;
	genres: Genre[];
	credits?: Credits;
	recommendations?: Paginated<MovieListItem>;
}

export interface TvSeasonSummary {
	id: number;
	season_number: number;
	name: string;
	episode_count: number;
	poster_path: string | null;
	air_date: string | null;
}

export interface TvDetails extends MediaBase {
	name: string;
	original_name: string;
	first_air_date: string;
	episode_run_time: number[];
	tagline: string;
	status: string;
	number_of_seasons: number;
	number_of_episodes: number;
	in_production: boolean;
	genres: Genre[];
	seasons: TvSeasonSummary[];
	last_episode_to_air: Episode | null;
	next_episode_to_air: Episode | null;
	credits?: Credits;
	recommendations?: Paginated<TvListItem>;
}

export interface Episode {
	id: number;
	episode_number: number;
	season_number: number;
	name: string;
	overview: string;
	still_path: string | null;
	air_date: string | null;
	runtime: number | null;
	vote_average: number;
}

// A "new season" reads as: the latest season premiered recently. Requiring
// last_episode_to_air to *be* that premiere (not just any recent episode)
// keeps this from firing on every mid-season episode drop, and requiring
// more than one season keeps a show's very first season from counting as
// "new" the moment someone adds it.
const NEW_SEASON_WINDOW_DAYS = 45;

export function hasRecentNewSeason(
	show: Pick<TvDetails, "number_of_seasons" | "last_episode_to_air">,
	referenceDate = new Date(),
): boolean {
	const last = show.last_episode_to_air;
	if (!last?.air_date) return false;
	if (show.number_of_seasons <= 1) return false;
	if (last.season_number !== show.number_of_seasons) return false;
	if (last.episode_number !== 1) return false;

	const airedAt = new Date(last.air_date).getTime();
	if (Number.isNaN(airedAt)) return false;

	const daysSinceAired = (referenceDate.getTime() - airedAt) / 86_400_000;
	return daysSinceAired >= 0 && daysSinceAired <= NEW_SEASON_WINDOW_DAYS;
}

// Wider than NEW_SEASON_WINDOW_DAYS on purpose: that constant flags a season
// *premiere*, but a season stays worth surfacing as "watching" for its whole
// run (a weekly drop can span months), not just its first ~6 weeks.
const RECENT_SEASON_WINDOW_DAYS = 120;

/** Is the show's current season still active, rather than a long-finished
 *  one nobody's actually watching anymore? */
export function isSeasonRecent(
	show: Pick<
		TvDetails,
		"number_of_seasons" | "last_episode_to_air" | "next_episode_to_air"
	>,
	referenceDate = new Date(),
): boolean {
	if (show.next_episode_to_air) return true;

	const last = show.last_episode_to_air;
	if (!last?.air_date) return false;
	if (last.season_number !== show.number_of_seasons) return false;

	const airedAt = new Date(last.air_date).getTime();
	if (Number.isNaN(airedAt)) return false;

	const daysSinceAired = (referenceDate.getTime() - airedAt) / 86_400_000;
	return daysSinceAired >= 0 && daysSinceAired <= RECENT_SEASON_WINDOW_DAYS;
}

/** Does the user still have unwatched episodes for this show? Prefers the
 *  live TMDB episode count over the entry's cached one, since a show can air
 *  new episodes after the entry was last written. */
export function hasEpisodesLeft(
	entry: { episodesWatched: number; totalEpisodes: number | null },
	show?: Pick<TvDetails, "number_of_episodes">,
): boolean {
	const total = show?.number_of_episodes ?? entry.totalEpisodes;
	if (total == null) return true;
	return entry.episodesWatched < total;
}

export interface SeasonDetails {
	id: number;
	season_number: number;
	name: string;
	episodes: Episode[];
}

/** Normalized shape every card/row renders from, regardless of source endpoint. */
export interface NormalizedTitle {
	mediaType: MediaType;
	id: number;
	title: string;
	overview: string;
	posterPath: string | null;
	backdropPath: string | null;
	date: string | null; // null rather than ""
	voteAverage: number;
}

export function normalizeTitle(item: TitleItem): NormalizedTitle {
	if (isMovie(item)) {
		return {
			mediaType: "movie",
			id: item.id,
			title: item.title,
			overview: item.overview,
			posterPath: item.poster_path,
			backdropPath: item.backdrop_path,
			date: item.release_date || null,
			voteAverage: item.vote_average,
		};
	}
	return {
		mediaType: "tv",
		id: item.id,
		title: item.name,
		overview: item.overview,
		posterPath: item.poster_path,
		backdropPath: item.backdrop_path,
		date: item.first_air_date || null,
		voteAverage: item.vote_average,
	};
}

const IMAGE_BASE = "https://image.tmdb.org/t/p/";

export type PosterSize = "w92" | "w185" | "w342" | "w500" | "original";
export type BackdropSize = "w300" | "w780" | "w1280" | "original";

export function posterUrl(
	path: string | null,
	size: PosterSize = "w342",
): string | null {
	return path ? `${IMAGE_BASE}${size}${path}` : null;
}

export function backdropUrl(
	path: string | null,
	size: BackdropSize = "w1280",
): string | null {
	return path ? `${IMAGE_BASE}${size}${path}` : null;
}

export function releaseYear(date: string | null): string | null {
	return date ? date.slice(0, 4) : null;
}
