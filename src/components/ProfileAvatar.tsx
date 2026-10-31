import type { Profile } from "#/lib/queries/social";

export function ProfileAvatar({
	profile,
	size = "w-10",
}: {
	profile: Pick<Profile, "displayName" | "handle" | "photoURL"> | undefined;
	size?: string;
}) {
	if (profile?.photoURL) {
		return (
			<div className="avatar">
				<div className={`${size} rounded-full`}>
					<img src={profile.photoURL} alt="" referrerPolicy="no-referrer" />
				</div>
			</div>
		);
	}
	const letter = (profile?.displayName || profile?.handle || "?")
		.charAt(0)
		.toUpperCase();
	return (
		<div className="avatar avatar-placeholder">
			<div className={`bg-neutral text-neutral-content ${size} rounded-full`}>
				<span>{letter}</span>
			</div>
		</div>
	);
}
