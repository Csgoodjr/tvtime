import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { PosterRow } from "#/components/PosterRow";
import { RatingButtons } from "#/components/RatingButtons";
import { SeasonAccordion } from "#/components/SeasonAccordion";
import { StatusSelect } from "#/components/StatusSelect";
import { useLibraryEntry } from "#/lib/queries/library";
import { titleDetailsQuery } from "#/lib/queries/tmdb";
import type {
	MediaType,
	MovieDetails,
	NormalizedTitle,
	TvDetails,
} from "#/lib/tmdb-types";
import { backdropUrl, posterUrl, releaseYear } from "#/lib/tmdb-types";

export const Route = createFileRoute("/title/$mediaType/$id")({
	loader: async ({ context, params }) => {
		const mediaType = parseMediaType(params.mediaType);
		const id = Number(params.id);
		if (!mediaType || Number.isNaN(id)) throw notFound();
		await context.queryClient.ensureQueryData(titleDetailsQuery(mediaType, id));
	},
	component: TitleDetail,
});

function parseMediaType(value: string): MediaType | null {
	return value === "movie" || value === "tv" ? value : null;
}

function isMovieDetails(data: MovieDetails | TvDetails): data is MovieDetails {
	return "title" in data;
}

function TitleDetail() {
	const { mediaType, id } = Route.useParams();
	const mt = parseMediaType(mediaType) ?? "movie";
	const tmdbId = Number(id);
	const { data } = useSuspenseQuery(titleDetailsQuery(mt, tmdbId));
	const entry = useLibraryEntry(mt, tmdbId);

	const isMovie = isMovieDetails(data);
	const displayTitle = isMovie ? data.title : data.name;
	const date = (isMovie ? data.release_date : data.first_air_date) || null;
	const year = releaseYear(date);
	const backdrop = backdropUrl(data.backdrop_path, "w1280");
	const poster = posterUrl(data.poster_path, "w500");
	const totalEpisodes = isMovie ? undefined : data.number_of_episodes;

	const normalized: NormalizedTitle = {
		mediaType: mt,
		id: data.id,
		title: displayTitle,
		overview: data.overview,
		posterPath: data.poster_path,
		backdropPath: data.backdrop_path,
		date,
		voteAverage: data.vote_average,
	};

	const runtimeMinutes = isMovie ? data.runtime : data.episode_run_time[0];
	const cast = data.credits?.cast.slice(0, 12) ?? [];
	const recommendations = data.recommendations?.results ?? [];
	const seasons = !isMovie
		? data.seasons.filter((s) => s.season_number > 0)
		: [];

	return (
		<div className="flex flex-col gap-8 pb-16">
			<div className="relative h-[38vh] min-h-64 w-full overflow-hidden sm:h-[46vh]">
				{backdrop && (
					<img
						src={backdrop}
						alt=""
						className="absolute inset-0 h-full w-full object-cover"
					/>
				)}
				<div className="from-base-100 via-base-100/50 absolute inset-0 bg-gradient-to-t to-transparent" />
			</div>

			<div className="-mt-32 flex flex-col gap-6 px-4 sm:-mt-40 sm:flex-row sm:px-6">
				<div className="w-40 shrink-0 self-start sm:w-56 z-1000">
					{poster ? (
						// No fixed aspect ratio/crop here on purpose — TMDB posters
						// aren't reliably exactly 2:3, and object-cover was clipping
						// some. Rendering at natural aspect ratio always shows the
						// full poster; the row's negative top margin means a taller
						// poster just extends further up over the backdrop, which is
						// fine — better than losing part of the art.
						<img
							src={poster}
							alt={displayTitle}
							className="w-full rounded-box shadow-xl"
						/>
					) : (
						<div className="bg-base-300 aspect-2/3 w-full rounded-box shadow-xl" />
					)}
				</div>

				<div className="flex min-w-0 flex-col gap-4">
					<div className="flex flex-col gap-2">
						<span className="badge badge-soft w-fit">
							{isMovie ? "Movie" : "TV Series"}
						</span>
						<h1 className="text-3xl font-bold text-balance sm:text-4xl">
							{displayTitle}
						</h1>
						{data.tagline && (
							<p className="text-base-content/60 text-sm italic">
								{data.tagline}
							</p>
						)}
						<div className="text-base-content/70 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
							{year && <span>{year}</span>}
							{runtimeMinutes ? <span>{runtimeMinutes} min</span> : null}
							{!isMovie && <span>{data.number_of_seasons} seasons</span>}
							{data.vote_average > 0 && (
								<span>★ {data.vote_average.toFixed(1)}</span>
							)}
						</div>
						{data.genres.length > 0 && (
							<div className="flex flex-wrap gap-1.5">
								{data.genres.map((g) => (
									<span key={g.id} className="badge badge-outline badge-sm">
										{g.name}
									</span>
								))}
							</div>
						)}
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<RatingButtons
							mediaType={mt}
							tmdbId={tmdbId}
							title={normalized}
							rating={entry?.rating ?? null}
						/>
						<StatusSelect
							mediaType={mt}
							tmdbId={tmdbId}
							title={normalized}
							status={entry?.status ?? null}
							totalEpisodes={totalEpisodes}
						/>
					</div>

					{!isMovie && entry && entry.totalEpisodes ? (
						<div className="flex max-w-sm items-center gap-2">
							<progress
								className="progress progress-primary flex-1"
								value={entry.episodesWatched}
								max={entry.totalEpisodes}
							/>
							<span className="text-base-content/60 text-xs whitespace-nowrap">
								{entry.episodesWatched}/{entry.totalEpisodes}
							</span>
						</div>
					) : null}

					<p className="max-w-3xl text-sm leading-relaxed">{data.overview}</p>
				</div>
			</div>

			{cast.length > 0 && (
				<section className="flex flex-col gap-3">
					<h2 className="px-4 text-lg font-semibold sm:px-6">Cast</h2>
					<div className="carousel carousel-center scrollbar-none gap-3 px-4 pb-1 sm:px-6">
						{cast.map((member) => {
							const photo = posterUrl(member.profile_path, "w185");
							return (
								<div
									key={member.id}
									className="carousel-item w-24 flex-col gap-1 text-center"
								>
									<div className="avatar">
										<div className="bg-base-300 w-24 rounded-full">
											{photo && <img src={photo} alt={member.name} />}
										</div>
									</div>
									<div className="line-clamp-1 text-xs font-medium">
										{member.name}
									</div>
									<div className="text-base-content/50 line-clamp-1 text-xs">
										{member.character}
									</div>
								</div>
							);
						})}
					</div>
				</section>
			)}

			{!isMovie && (
				<section className="flex flex-col gap-3 px-4 sm:px-6">
					<h2 className="text-lg font-semibold">Episodes</h2>
					<div className="flex flex-col gap-2">
						{seasons.map((season) => (
							<SeasonAccordion
								key={season.id}
								tvId={tmdbId}
								season={season}
								title={normalized}
								totalEpisodes={data.number_of_episodes}
							/>
						))}
					</div>
				</section>
			)}

			<PosterRow heading="More like this" items={recommendations} />
		</div>
	);
}
