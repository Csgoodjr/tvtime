import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PosterRow } from "#/components/PosterRow";
import { discoverFeedQuery } from "#/lib/queries/tmdb";
import { backdropUrl, normalizeTitle, releaseYear } from "#/lib/tmdb-types";

export const Route = createFileRoute("/")({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(discoverFeedQuery());
	},
	component: Home,
});

function Home() {
	const { data } = useSuspenseQuery(discoverFeedQuery());
	const hero = data.trending[0];
	const heroTitle = hero ? normalizeTitle(hero) : null;
	const heroBackdrop = heroTitle
		? backdropUrl(heroTitle.backdropPath, "w1280")
		: null;

	return (
		<div className="flex flex-col gap-8 pb-16">
			{heroTitle && (
				<div className="relative h-[46vh] min-h-72 w-full overflow-hidden sm:h-[56vh]">
					{heroBackdrop && (
						<img
							src={heroBackdrop}
							alt=""
							className="absolute inset-0 h-full w-full object-cover"
						/>
					)}
					<div className="from-base-100 via-base-100/40 absolute inset-0 bg-gradient-to-t to-transparent" />
					<div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 px-4 pb-8 sm:px-6">
						<span className="badge badge-primary badge-soft w-fit">
							Trending this week
						</span>
						<h1 className="max-w-2xl text-3xl font-bold text-balance sm:text-5xl">
							{heroTitle.title}
						</h1>
						<p className="text-base-content/80 line-clamp-2 max-w-xl text-sm sm:text-base">
							{heroTitle.overview}
						</p>
						{releaseYear(heroTitle.date) && (
							<span className="text-base-content/60 text-sm">
								{releaseYear(heroTitle.date)}
							</span>
						)}
					</div>
				</div>
			)}

			<div className="flex flex-col gap-8">
				<PosterRow heading="Trending this week" items={data.trending} />
				<PosterRow heading="New movies" items={data.newMovies} />
				<PosterRow heading="New shows" items={data.newShows} />
				<PosterRow heading="Popular movies" items={data.popularMovies} />
				<PosterRow heading="Popular shows" items={data.popularShows} />
			</div>
		</div>
	);
}
