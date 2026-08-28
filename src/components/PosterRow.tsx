import { PosterCard, PosterCardSkeleton } from "#/components/PosterCard";
import type { TitleItem } from "#/lib/tmdb-types";
import { normalizeTitle } from "#/lib/tmdb-types";

export function PosterRow({
	heading,
	items,
}: {
	heading: string;
	items: TitleItem[];
}) {
	if (items.length === 0) return null;

	return (
		<section className="flex flex-col gap-3">
			<h2 className="px-4 text-lg font-semibold sm:px-6">{heading}</h2>
			<div className="carousel carousel-center scrollbar-none gap-3 px-4 pb-1 sm:px-6">
				{items.map((item) => (
					<div
						key={`${item.id}-${"title" in item ? "movie" : "tv"}`}
						className="carousel-item"
					>
						<PosterCard title={normalizeTitle(item)} />
					</div>
				))}
			</div>
		</section>
	);
}

const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f"];

export function PosterRowSkeleton({ heading }: { heading: string }) {
	return (
		<section className="flex flex-col gap-3">
			<h2 className="px-4 text-lg font-semibold sm:px-6">{heading}</h2>
			<div className="flex gap-3 overflow-hidden px-4 sm:px-6">
				{SKELETON_KEYS.map((key) => (
					<PosterCardSkeleton key={key} />
				))}
			</div>
		</section>
	);
}
