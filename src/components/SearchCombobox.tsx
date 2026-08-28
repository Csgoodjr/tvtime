import {
	Combobox,
	ComboboxInput,
	ComboboxOption,
	ComboboxOptions,
} from "@headlessui/react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
import { searchTitlesQuery } from "#/lib/queries/tmdb";
import type { TitleItem } from "#/lib/tmdb-types";
import { normalizeTitle, posterUrl, releaseYear } from "#/lib/tmdb-types";
import { useDebouncedValue } from "#/lib/use-debounced-value";

/** Compact quick-jump search used in the navbar; Enter goes to the full /search page. */
export function SearchCombobox() {
	const navigate = useNavigate();
	const [query, setQuery] = useState("");
	const debounced = useDebouncedValue(query, 300);

	const { data: results = [], isFetching } = useQuery({
		...searchTitlesQuery(debounced),
		enabled: debounced.trim().length > 1,
	});

	function goToTitle(item: TitleItem) {
		const normalized = normalizeTitle(item);
		setQuery("");
		navigate({
			to: "/title/$mediaType/$id",
			params: { mediaType: normalized.mediaType, id: String(normalized.id) },
		});
	}

	function submitFullSearch() {
		if (!query.trim()) return;
		navigate({ to: "/search", search: { q: query } });
	}

	return (
		<Combobox
			as="div"
			className="relative"
			onChange={(item: TitleItem | null) => item && goToTitle(item)}
		>
			<div className="input join-item hidden w-64 items-center gap-2 sm:flex">
				<Search className="text-base-content/50 size-4" aria-hidden />
				<ComboboxInput
					aria-label="Search movies & shows"
					className="w-full grow bg-transparent outline-none"
					placeholder="Search movies & shows…"
					displayValue={() => query}
					onChange={(e) => setQuery(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") submitFullSearch();
					}}
				/>
			</div>

			<ComboboxOptions
				anchor={{ to: "bottom start", gap: "8px" }}
				className="menu bg-base-200 rounded-box z-50 max-h-96 w-80 overflow-y-auto p-2 shadow-lg empty:hidden"
			>
				{isFetching && (
					<div className="text-base-content/60 px-3 py-2 text-sm">
						Searching…
					</div>
				)}
				{results.slice(0, 8).map((item) => {
					const normalized = normalizeTitle(item);
					const poster = posterUrl(normalized.posterPath, "w92");
					const year = releaseYear(normalized.date);
					return (
						<ComboboxOption
							key={`${normalized.mediaType}-${normalized.id}`}
							value={item}
							className="data-focus:bg-base-300 flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2"
						>
							<div className="bg-base-300 h-14 w-10 shrink-0 overflow-hidden rounded">
								{poster && (
									<img
										src={poster}
										alt=""
										className="h-full w-full object-cover"
									/>
								)}
							</div>
							<div className="min-w-0">
								<div className="truncate text-sm font-medium">
									{normalized.title}
								</div>
								<div className="text-base-content/60 text-xs">
									{normalized.mediaType === "movie" ? "Movie" : "TV"}
									{year ? ` · ${year}` : ""}
								</div>
							</div>
						</ComboboxOption>
					);
				})}
			</ComboboxOptions>
		</Combobox>
	);
}
