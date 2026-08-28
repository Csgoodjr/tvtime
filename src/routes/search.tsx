import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Film, Search as SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "#/components/EmptyState";
import { PosterCard, PosterCardSkeleton } from "#/components/PosterCard";
import { searchTitlesQuery } from "#/lib/queries/tmdb";
import { normalizeTitle } from "#/lib/tmdb-types";
import { useDebouncedValue } from "#/lib/use-debounced-value";

const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];

interface SearchParams {
	q?: string;
}

export const Route = createFileRoute("/search")({
	validateSearch: (search: Record<string, unknown>): SearchParams => ({
		q: typeof search.q === "string" ? search.q : undefined,
	}),
	component: SearchPage,
});

function SearchPage() {
	const { q } = Route.useSearch();
	const navigate = Route.useNavigate();
	const [input, setInput] = useState(q ?? "");
	const debounced = useDebouncedValue(input, 300);

	// Keep the URL's `q` in sync with typing (debounced), so results stay
	// linkable/shareable and back/forward navigation works.
	useEffect(() => {
		navigate({ search: { q: debounced || undefined }, replace: true });
	}, [debounced, navigate]);

	const { data: results = [], isFetching } = useQuery({
		...searchTitlesQuery(debounced),
		enabled: debounced.trim().length > 0,
	});

	return (
		<div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
			<label className="input input-lg w-full items-center gap-3">
				<SearchIcon className="text-base-content/50 size-5" aria-hidden />
				<input
					className="grow"
					placeholder="Search movies & TV shows…"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					// biome-ignore lint/a11y/noAutofocus: this route's entire purpose is the search box
					autoFocus
				/>
			</label>

			{debounced.trim().length === 0 ? (
				<EmptyState
					icon={SearchIcon}
					title="Search TVTime"
					description="Find any movie or show and add it to your list."
				/>
			) : isFetching && results.length === 0 ? (
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
					{SKELETON_KEYS.map((key) => (
						<PosterCardSkeleton key={key} className="w-full" />
					))}
				</div>
			) : results.length === 0 ? (
				<EmptyState
					icon={Film}
					title="No results"
					description={`Nothing matched "${debounced}". Try a different title.`}
				/>
			) : (
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
					{results.map((item) => (
						<PosterCard
							key={`${item.media_type ?? "x"}-${item.id}`}
							title={normalizeTitle(item)}
							className="w-full"
						/>
					))}
				</div>
			)}
		</div>
	);
}
