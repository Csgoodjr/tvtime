import { Link } from "@tanstack/react-router";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { Rating } from "#/lib/queries/library";
import { useSetRating } from "#/lib/queries/library";
import type { MediaType, NormalizedTitle } from "#/lib/tmdb-types";
import { useAuth } from "#/lib/use-auth";

interface Props {
	mediaType: MediaType;
	tmdbId: number;
	title: NormalizedTitle;
	rating: Rating;
	size?: "sm" | "md";
}

export function RatingButtons({
	mediaType,
	tmdbId,
	title,
	rating,
	size = "md",
}: Props) {
	const { status } = useAuth();
	const setRating = useSetRating();

	if (status !== "signed-in") {
		return (
			<Link to="/login" className="btn btn-ghost btn-sm gap-1.5">
				<ThumbsUp className="size-4" aria-hidden />
				Sign in to rate
			</Link>
		);
	}

	function toggle(next: Exclude<Rating, null>) {
		setRating.mutate({
			seed: { mediaType, tmdbId, title },
			rating: rating === next ? null : next,
		});
	}

	const sizeClass = size === "sm" ? "btn-sm" : "";

	return (
		<div className="join">
			<button
				type="button"
				className={`btn join-item ${sizeClass} ${rating === "up" ? "btn-success" : "btn-ghost"}`}
				aria-pressed={rating === "up"}
				aria-label="Thumbs up"
				onClick={() => toggle("up")}
			>
				<ThumbsUp className="size-4" aria-hidden />
			</button>
			<button
				type="button"
				className={`btn join-item ${sizeClass} ${rating === "down" ? "btn-error" : "btn-ghost"}`}
				aria-pressed={rating === "down"}
				aria-label="Thumbs down"
				onClick={() => toggle("down")}
			>
				<ThumbsDown className="size-4" aria-hidden />
			</button>
		</div>
	);
}
