import { Bookmark, Check, Eye } from "lucide-react";
import type { ComponentType } from "react";
import type { WatchStatus } from "#/lib/queries/library";
import { useSetStatus } from "#/lib/queries/library";
import type { MediaType, NormalizedTitle } from "#/lib/tmdb-types";
import { useAuth } from "#/lib/use-auth";

const OPTIONS: {
	value: WatchStatus;
	label: string;
	icon: ComponentType<{ className?: string }>;
}[] = [
	{ value: "want", label: "Want to watch", icon: Bookmark },
	{ value: "watching", label: "Watching", icon: Eye },
	{ value: "watched", label: "Watched", icon: Check },
];

interface Props {
	mediaType: MediaType;
	tmdbId: number;
	title: NormalizedTitle;
	status: WatchStatus | null;
	totalEpisodes?: number | null;
}

export function StatusSelect({
	mediaType,
	tmdbId,
	title,
	status,
	totalEpisodes,
}: Props) {
	const { status: authStatus } = useAuth();
	const setStatus = useSetStatus();

	if (authStatus !== "signed-in") return null;

	return (
		<div className="join">
			{OPTIONS.map((opt) => {
				const Icon = opt.icon;
				const active = status === opt.value;
				return (
					<button
						key={opt.value}
						type="button"
						className={`btn join-item btn-sm gap-1.5 ${active ? "btn-primary" : "btn-ghost"}`}
						aria-pressed={active}
						onClick={() =>
							setStatus.mutate({
								seed: { mediaType, tmdbId, title, totalEpisodes },
								status: active ? null : opt.value,
							})
						}
					>
						<Icon className="size-4" aria-hidden />
						<span className="hidden sm:inline">{opt.label}</span>
					</button>
				);
			})}
		</div>
	);
}
