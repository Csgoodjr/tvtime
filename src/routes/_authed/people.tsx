import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Search, UserPlus, Users, X } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { ProfileAvatar } from "#/components/ProfileAvatar";
import {
	type Follow,
	followId,
	lookupHandle,
	normalizeHandle,
	type Profile,
	useAcceptFollow,
	useFollowers,
	useFollowing,
	useMyProfile,
	useProfiles,
	useRemoveFollow,
	useRequestFollow,
	useSaveProfile,
} from "#/lib/queries/social";
import { useAuth } from "#/lib/use-auth";

export const Route = createFileRoute("/_authed/people")({
	component: PeoplePage,
});

function errorText(err: unknown) {
	return err instanceof Error ? err.message : "Something went wrong.";
}

function PersonRow({
	profile,
	children,
	to,
}: {
	profile: Profile | undefined;
	children?: ReactNode;
	/** Linked to their list only when we're allowed to see it. */
	to?: string;
}) {
	const label = (
		<div className="flex min-w-0 items-center gap-3">
			<ProfileAvatar profile={profile} />
			<div className="min-w-0">
				<div className="truncate font-medium">
					{profile?.displayName || (profile ? `@${profile.handle}` : "…")}
				</div>
				{profile && (
					<div className="text-base-content/60 truncate text-sm">
						@{profile.handle}
					</div>
				)}
			</div>
		</div>
	);
	return (
		<li className="flex items-center justify-between gap-3 py-3">
			{to ? (
				<Link
					to="/u/$uid"
					params={{ uid: to }}
					className="min-w-0 hover:underline"
				>
					{label}
				</Link>
			) : (
				label
			)}
			<div className="flex shrink-0 gap-2">{children}</div>
		</li>
	);
}

function Section({
	title,
	count,
	children,
}: {
	title: string;
	count?: number;
	children: ReactNode;
}) {
	return (
		<section className="card bg-base-200 border-base-300 border">
			<div className="card-body gap-2">
				<h2 className="card-title text-base">
					{title}
					{count ? <span className="badge badge-sm">{count}</span> : null}
				</h2>
				{children}
			</div>
		</section>
	);
}

function ProfileForm({ profile }: { profile: Profile | null }) {
	const { user } = useAuth();
	const save = useSaveProfile();
	const [handle, setHandle] = useState(profile?.handle ?? "");
	const [displayName, setDisplayName] = useState(
		profile?.displayName ?? user?.displayName ?? "",
	);

	useEffect(() => {
		if (profile) {
			setHandle(profile.handle);
			setDisplayName(profile.displayName);
		}
	}, [profile]);

	function onSubmit(e: FormEvent) {
		e.preventDefault();
		save.mutate({
			handle,
			displayName,
			previousHandle: profile?.handle ?? null,
		});
	}

	return (
		<form onSubmit={onSubmit} className="flex flex-col gap-3">
			{!profile && (
				<p className="text-base-content/70 text-sm">
					Pick a handle so friends can find you. Only your handle, name and
					photo are visible — your list stays private until you approve a
					follower.
				</p>
			)}
			<div className="flex flex-col gap-2 sm:flex-row">
				<label className="input w-full">
					<span className="text-base-content/50">@</span>
					<input
						value={handle}
						onChange={(e) => setHandle(normalizeHandle(e.target.value))}
						placeholder="handle"
						minLength={3}
						maxLength={20}
						pattern="[a-z0-9_]{3,20}"
						required
						autoComplete="off"
						aria-label="Handle"
					/>
				</label>
				<input
					className="input w-full"
					value={displayName}
					onChange={(e) => setDisplayName(e.target.value)}
					placeholder="Display name"
					maxLength={50}
					aria-label="Display name"
				/>
				<button
					type="submit"
					className="btn btn-primary"
					disabled={save.isPending}
				>
					{profile ? "Save" : "Create profile"}
				</button>
			</div>
			{save.error && (
				<p className="text-error text-sm">{errorText(save.error)}</p>
			)}
			{save.isSuccess && <p className="text-success text-sm">Saved.</p>}
		</form>
	);
}

function FindPeople({
	myUid,
	following,
}: {
	myUid: string;
	following: Follow[];
}) {
	const [term, setTerm] = useState("");
	const [result, setResult] = useState<Profile | null | undefined>(undefined);
	const [searching, setSearching] = useState(false);
	const requestFollow = useRequestFollow();

	async function onSubmit(e: FormEvent) {
		e.preventDefault();
		setSearching(true);
		requestFollow.reset();
		try {
			setResult(await lookupHandle(term));
		} finally {
			setSearching(false);
		}
	}

	const existing = result
		? following.find((f) => f.id === followId(myUid, result.uid))
		: undefined;

	return (
		<div className="flex flex-col gap-2">
			<form onSubmit={onSubmit} className="flex gap-2">
				<label className="input w-full">
					<Search className="size-4 opacity-50" aria-hidden />
					<input
						value={term}
						onChange={(e) => setTerm(e.target.value)}
						placeholder="Exact handle, e.g. @alex"
						autoComplete="off"
						aria-label="Find by handle"
					/>
				</label>
				<button type="submit" className="btn" disabled={searching || !term}>
					Find
				</button>
			</form>
			{result === null && (
				<p className="text-base-content/60 text-sm">No one with that handle.</p>
			)}
			{result && (
				<ul>
					<PersonRow profile={result}>
						{result.uid === myUid ? (
							<span className="badge">You</span>
						) : existing ? (
							<span className="badge">
								{existing.status === "accepted" ? "Following" : "Requested"}
							</span>
						) : (
							<button
								type="button"
								className="btn btn-primary btn-sm gap-1"
								disabled={requestFollow.isPending}
								onClick={() => requestFollow.mutate(result.uid)}
							>
								<UserPlus className="size-4" aria-hidden />
								Request to follow
							</button>
						)}
					</PersonRow>
				</ul>
			)}
			{requestFollow.error && (
				<p className="text-error text-sm">{errorText(requestFollow.error)}</p>
			)}
		</div>
	);
}

function PeoplePage() {
	const { user } = useAuth();
	const { profile, loading } = useMyProfile();
	const { follows: following } = useFollowing();
	const { follows: followers } = useFollowers();
	const accept = useAcceptFollow();
	const remove = useRemoveFollow();

	const otherUids = [
		...new Set([
			...following.map((f) => f.targetUid),
			...followers.map((f) => f.followerUid),
		]),
	];
	const profiles = useProfiles(otherUids);

	if (!user || loading) {
		return (
			<div className="flex justify-center py-20">
				<span className="loading loading-spinner" />
			</div>
		);
	}

	const requests = followers.filter((f) => f.status === "pending");
	const acceptedFollowers = followers.filter((f) => f.status === "accepted");

	return (
		<div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-8 sm:px-6">
			<h1 className="flex items-center gap-2 text-2xl font-bold">
				<Users className="size-6" aria-hidden />
				People
			</h1>

			<Section title="Your profile">
				<ProfileForm profile={profile} />
			</Section>

			{profile && (
				<>
					<Section title="Find people">
						<FindPeople myUid={user.uid} following={following} />
					</Section>

					{requests.length > 0 && (
						<Section title="Follow requests" count={requests.length}>
							<p className="text-base-content/60 text-sm">
								Accepting lets them see your list and progress. You can remove
								them any time.
							</p>
							<ul className="divide-base-300 divide-y">
								{requests.map((f) => (
									<PersonRow key={f.id} profile={profiles.get(f.followerUid)}>
										<button
											type="button"
											className="btn btn-success btn-sm btn-square"
											aria-label="Accept"
											onClick={() => accept.mutate(f.id)}
										>
											<Check className="size-4" aria-hidden />
										</button>
										<button
											type="button"
											className="btn btn-ghost btn-sm btn-square"
											aria-label="Decline"
											onClick={() => remove.mutate(f.id)}
										>
											<X className="size-4" aria-hidden />
										</button>
									</PersonRow>
								))}
							</ul>
						</Section>
					)}

					<Section title="Following" count={following.length}>
						{following.length === 0 ? (
							<p className="text-base-content/60 text-sm">
								You're not following anyone yet.
							</p>
						) : (
							<ul className="divide-base-300 divide-y">
								{following.map((f) => (
									<PersonRow
										key={f.id}
										profile={profiles.get(f.targetUid)}
										to={f.status === "accepted" ? f.targetUid : undefined}
									>
										{f.status === "pending" && (
											<span className="badge badge-ghost">Requested</span>
										)}
										<button
											type="button"
											className="btn btn-ghost btn-sm"
											onClick={() => remove.mutate(f.id)}
										>
											{f.status === "pending" ? "Cancel" : "Unfollow"}
										</button>
									</PersonRow>
								))}
							</ul>
						)}
					</Section>

					<Section title="Followers" count={acceptedFollowers.length}>
						{acceptedFollowers.length === 0 ? (
							<p className="text-base-content/60 text-sm">
								No one can see your list yet.
							</p>
						) : (
							<ul className="divide-base-300 divide-y">
								{acceptedFollowers.map((f) => (
									<PersonRow key={f.id} profile={profiles.get(f.followerUid)}>
										<button
											type="button"
											className="btn btn-ghost btn-sm"
											onClick={() => remove.mutate(f.id)}
										>
											Remove
										</button>
									</PersonRow>
								))}
							</ul>
						)}
					</Section>
				</>
			)}
		</div>
	);
}
