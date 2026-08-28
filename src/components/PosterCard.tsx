import { Link } from "@tanstack/react-router";
import { Film, Star, Tv } from "lucide-react";
import type { NormalizedTitle } from "#/lib/tmdb-types";
import { posterUrl, releaseYear } from "#/lib/tmdb-types";

export function PosterCard({
	title,
	className = "w-40 shrink-0 sm:w-44",
}: {
	title: NormalizedTitle;
	/** Sizing/layout classes — defaults to a fixed width for carousel rows; pass "w-full" in a grid. */
	className?: string;
}) {
	const poster = posterUrl(title.posterPath, "w342");
	const year = releaseYear(title.date);

	return (
		<Link
			to="/title/$mediaType/$id"
			params={{ mediaType: title.mediaType, id: String(title.id) }}
			className={`card card-sm bg-base-200 card-border border-base-300 overflow-hidden transition-transform hover:-translate-y-1 ${className}`}
		>
			<figure className="bg-base-300 aspect-2/3">
				{poster ? (
					<img
						src={poster}
						alt={title.title}
						loading="lazy"
						className="h-full w-full object-cover"
					/>
				) : (
					<div className="text-base-content/30 flex h-full w-full items-center justify-center">
						{title.mediaType === "movie" ? (
							<Film className="size-10" aria-hidden />
						) : (
							<Tv className="size-10" aria-hidden />
						)}
					</div>
				)}
			</figure>
			<div className="card-body gap-1 p-3">
				<h3 className="line-clamp-1 text-sm font-semibold">{title.title}</h3>
				<div className="text-base-content/60 flex items-center gap-2 text-xs">
					{year && <span>{year}</span>}
					{title.voteAverage > 0 && (
						<span className="inline-flex items-center gap-0.5">
							<Star className="text-warning size-3 fill-current" aria-hidden />
							{title.voteAverage.toFixed(1)}
						</span>
					)}
				</div>
			</div>
		</Link>
	);
}

export function PosterCardSkeleton({
	className = "w-40 shrink-0 sm:w-44",
}: {
	className?: string;
}) {
	return (
		<div className={className}>
			<div className="skeleton aspect-2/3 w-full rounded-box" />
			<div className="skeleton mt-2 h-4 w-3/4" />
			<div className="skeleton mt-1 h-3 w-1/3" />
		</div>
	);
}
