import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import {
	collection,
	deleteDoc,
	doc,
	getDoc,
	onSnapshot,
	query,
	serverTimestamp,
	setDoc,
	updateDoc,
	where,
	writeBatch,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { firestore } from "#/lib/firebase";
import {
	docToLibraryEntry,
	entriesCol,
	type LibraryEntry,
} from "#/lib/queries/library";
import { useAuth } from "#/lib/use-auth";

// Following is enforced entirely by Firestore security rules
// (firestore.rules): every read/write below goes straight from the Firebase
// SDK to Firestore, which attaches the signed-in user's own ID token as the
// request's bearer credential. Rules decide on `request.auth.uid` from that
// token. Nothing here ever reads, stores or forwards a token — another
// user's token must never be exposed, and our own never needs handling.

export interface Profile {
	uid: string;
	handle: string;
	displayName: string;
	photoURL: string | null;
}

export type FollowStatus = "pending" | "accepted";

export interface Follow {
	id: string;
	followerUid: string;
	targetUid: string;
	status: FollowStatus;
}

export const HANDLE_PATTERN = /^[a-z0-9_]{3,20}$/;

export function normalizeHandle(raw: string) {
	return raw.trim().replace(/^@/, "").toLowerCase();
}

export function followId(followerUid: string, targetUid: string) {
	return `${followerUid}_${targetUid}`;
}

const profileDoc = (uid: string) => doc(firestore, "profiles", uid);
const handleDoc = (handle: string) => doc(firestore, "handles", handle);
const followsCol = () => collection(firestore, "follows");

function toProfile(uid: string, data: Record<string, unknown>): Profile {
	return {
		uid,
		handle: String(data.handle ?? ""),
		displayName: String(data.displayName ?? ""),
		photoURL: typeof data.photoURL === "string" ? data.photoURL : null,
	};
}

async function fetchProfile(uid: string): Promise<Profile | null> {
	const snap = await getDoc(profileDoc(uid));
	return snap.exists() ? toProfile(uid, snap.data()) : null;
}

/** Live view of the signed-in user's own profile (null = not set up yet). */
export function useMyProfile() {
	const { user } = useAuth();
	const uid = user?.uid;
	const [state, setState] = useState<{
		profile: Profile | null;
		loading: boolean;
	}>({ profile: null, loading: true });

	useEffect(() => {
		if (!uid) return;
		setState({ profile: null, loading: true });
		return onSnapshot(profileDoc(uid), (snap) => {
			setState({
				profile: snap.exists() ? toProfile(uid, snap.data()) : null,
				loading: false,
			});
		});
	}, [uid]);

	return state;
}

/**
 * Claims a handle and (re)writes the profile in one atomic batch — the
 * rules require the handle doc and the profile to agree in the same write.
 * A taken handle fails with permission-denied because handle docs have no
 * update rule.
 */
export function useSaveProfile() {
	const { user } = useAuth();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			handle: rawHandle,
			displayName,
			previousHandle,
		}: {
			handle: string;
			displayName: string;
			previousHandle: string | null;
		}) => {
			if (!user) throw new Error("Not signed in");
			const handle = normalizeHandle(rawHandle);
			if (!HANDLE_PATTERN.test(handle)) {
				throw new Error(
					"Handles are 3–20 characters: lowercase letters, numbers, or _.",
				);
			}
			const batch = writeBatch(firestore);
			if (handle !== previousHandle) {
				batch.set(handleDoc(handle), { uid: user.uid });
				if (previousHandle) batch.delete(handleDoc(previousHandle));
			}
			batch.set(profileDoc(user.uid), {
				handle,
				displayName: displayName.trim().slice(0, 50),
				photoURL: user.photoURL?.startsWith("https://") ? user.photoURL : null,
				updatedAt: serverTimestamp(),
			});
			try {
				await batch.commit();
			} catch (err) {
				if (
					handle !== previousHandle &&
					(err as { code?: string }).code === "permission-denied"
				) {
					throw new Error(`@${handle} is already taken.`);
				}
				throw err;
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["profile"] });
		},
	});
}

/** Exact-match handle lookup. No prefix search, so users can't be enumerated. */
export async function lookupHandle(rawHandle: string): Promise<Profile | null> {
	const handle = normalizeHandle(rawHandle);
	if (!HANDLE_PATTERN.test(handle)) return null;
	const handleSnap = await getDoc(handleDoc(handle));
	if (!handleSnap.exists()) return null;
	const profile = await fetchProfile(String(handleSnap.data().uid));
	// A stale handle doc (user since renamed) shouldn't resolve.
	return profile && profile.handle === handle ? profile : null;
}

export function useProfiles(uids: string[]) {
	return useQueries({
		queries: uids.map((uid) => ({
			queryKey: ["profile", uid],
			queryFn: () => fetchProfile(uid),
			staleTime: 5 * 60_000,
		})),
		combine: (results) => {
			const byUid = new Map<string, Profile>();
			results.forEach((r, i) => {
				if (r.data) byUid.set(uids[i], r.data);
			});
			return byUid;
		},
	});
}

function toFollow(id: string, data: Record<string, unknown>): Follow {
	return {
		id,
		followerUid: String(data.followerUid),
		targetUid: String(data.targetUid),
		status: data.status === "accepted" ? "accepted" : "pending",
	};
}

/** Live list of follow docs where the signed-in user is on the given side. */
function useFollowList(side: "followerUid" | "targetUid") {
	const { user } = useAuth();
	const uid = user?.uid;
	const [state, setState] = useState<{ follows: Follow[]; loading: boolean }>({
		follows: [],
		loading: true,
	});

	useEffect(() => {
		if (!uid) return;
		setState({ follows: [], loading: true });
		// The `where` on our own uid is what satisfies the read rule — a query
		// that could return other people's follow docs is rejected outright.
		return onSnapshot(query(followsCol(), where(side, "==", uid)), (snap) => {
			setState({
				follows: snap.docs.map((d) => toFollow(d.id, d.data())),
				loading: false,
			});
		});
	}, [uid, side]);

	return state;
}

/** People I follow or have asked to follow. */
export const useFollowing = () => useFollowList("followerUid");
/** People who follow me or are asking to. */
export const useFollowers = () => useFollowList("targetUid");

export function useRequestFollow() {
	const { user } = useAuth();
	return useMutation({
		mutationFn: async (targetUid: string) => {
			if (!user) throw new Error("Not signed in");
			if (targetUid === user.uid) throw new Error("You can't follow yourself.");
			await setDoc(doc(followsCol(), followId(user.uid, targetUid)), {
				followerUid: user.uid,
				targetUid,
				status: "pending",
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			});
		},
	});
}

/** Target-side only: grants the requester read access to my list. */
export function useAcceptFollow() {
	return useMutation({
		mutationFn: async (id: string) => {
			await updateDoc(doc(followsCol(), id), {
				status: "accepted",
				updatedAt: serverTimestamp(),
			});
		},
	});
}

/** Either side: unfollow, cancel a request, decline, or remove a follower. */
export function useRemoveFollow() {
	return useMutation({
		mutationFn: async (id: string) => {
			await deleteDoc(doc(followsCol(), id));
		},
	});
}

/**
 * Another user's library, live. Firestore only returns it if they accepted
 * our follow request; otherwise (or the moment they revoke it) the listener
 * fails with permission-denied and `denied` flips to true.
 */
export function useUserLibrary(uid: string) {
	const { user } = useAuth();
	const viewerUid = user?.uid;
	const [state, setState] = useState<{
		entries: LibraryEntry[];
		loading: boolean;
		denied: boolean;
	}>({ entries: [], loading: true, denied: false });

	useEffect(() => {
		if (!viewerUid) return;
		setState({ entries: [], loading: true, denied: false });
		return onSnapshot(
			entriesCol(uid),
			(snap) => {
				setState({
					entries: snap.docs.map(docToLibraryEntry),
					loading: false,
					denied: false,
				});
			},
			() => {
				// Never keep showing data we're no longer allowed to see.
				setState({ entries: [], loading: false, denied: true });
			},
		);
	}, [uid, viewerUid]);

	return state;
}
