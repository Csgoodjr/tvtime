import {
	type QueryClient,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import {
	collection,
	doc,
	getDoc,
	getDocs,
	increment,
	onSnapshot,
	runTransaction,
	serverTimestamp,
	setDoc,
	writeBatch,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { firestore } from "#/lib/firebase";
import type { MediaType, NormalizedTitle } from "#/lib/tmdb-types";
import { useAuth } from "#/lib/use-auth";

export type WatchStatus = "want" | "watching" | "watched";
export type Rating = "up" | "down" | null;

export interface LibraryEntry {
	id: string; // `${mediaType}_${tmdbId}`
	mediaType: MediaType;
	tmdbId: number;
	title: string;
	posterPath: string | null;
	releaseDate: string | null;
	status: WatchStatus | null;
	rating: Rating;
	episodesWatched: number;
	totalEpisodes: number | null;
	addedAt: number | null;
	updatedAt: number | null;
}

export function entryId(mediaType: MediaType, tmdbId: number) {
	return `${mediaType}_${tmdbId}`;
}

export function normalizeLibraryEntry(entry: LibraryEntry): NormalizedTitle {
	return {
		mediaType: entry.mediaType,
		id: entry.tmdbId,
		title: entry.title,
		overview: "",
		posterPath: entry.posterPath,
		backdropPath: null,
		date: entry.releaseDate,
		voteAverage: 0,
	};
}

function entriesCol(uid: string) {
	return collection(firestore, "users", uid, "entries");
}

function entryDoc(uid: string, id: string) {
	return doc(firestore, "users", uid, "entries", id);
}

function seasonDoc(uid: string, id: string, seasonNumber: number) {
	return doc(
		firestore,
		"users",
		uid,
		"entries",
		id,
		"seasons",
		String(seasonNumber),
	);
}

const libraryKey = (uid: string | undefined) => ["library", uid] as const;

/** Live-syncs the signed-in user's library into the TanStack Query cache. */
export function useLibraryQuery() {
	const { user } = useAuth();
	const uid = user?.uid;
	const queryClient = useQueryClient();

	useEffect(() => {
		if (!uid) return;
		const unsubscribe = onSnapshot(entriesCol(uid), (snapshot) => {
			const entries: LibraryEntry[] = snapshot.docs.map((d) => {
				const data = d.data();
				return {
					id: d.id,
					mediaType: data.mediaType,
					tmdbId: data.tmdbId,
					title: data.title,
					posterPath: data.posterPath ?? null,
					releaseDate: data.releaseDate ?? null,
					status: data.status,
					rating: data.rating ?? null,
					episodesWatched: data.episodesWatched ?? 0,
					totalEpisodes: data.totalEpisodes ?? null,
					addedAt: data.addedAt?.toMillis?.() ?? null,
					updatedAt: data.updatedAt?.toMillis?.() ?? null,
				};
			});
			queryClient.setQueryData(libraryKey(uid), entries);
		});
		return unsubscribe;
	}, [uid, queryClient]);

	return useQuery({
		queryKey: libraryKey(uid),
		queryFn: async () => {
			if (!uid) return [];
			const snapshot = await getDocs(entriesCol(uid));
			return snapshot.docs.map(
				(d) => ({ id: d.id, ...d.data() }) as LibraryEntry,
			);
		},
		enabled: !!uid,
		staleTime: Number.POSITIVE_INFINITY, // onSnapshot keeps it fresh
	});
}

export function useLibraryEntry(mediaType: MediaType, tmdbId: number) {
	const { data } = useLibraryQuery();
	return data?.find((e) => e.id === entryId(mediaType, tmdbId)) ?? null;
}

function upsertLocal(
	queryClient: QueryClient,
	uid: string,
	id: string,
	patch: Partial<LibraryEntry>,
	seed: Omit<
		LibraryEntry,
		| "id"
		| "status"
		| "rating"
		| "episodesWatched"
		| "totalEpisodes"
		| "addedAt"
		| "updatedAt"
	>,
) {
	queryClient.setQueryData<LibraryEntry[]>(libraryKey(uid), (prev = []) => {
		const existing = prev.find((e) => e.id === id);
		const base: LibraryEntry = existing ?? {
			id,
			...seed,
			status: null,
			rating: null,
			episodesWatched: 0,
			totalEpisodes: null,
			addedAt: Date.now(),
			updatedAt: Date.now(),
		};
		const next = { ...base, ...patch, updatedAt: Date.now() };
		return existing
			? prev.map((e) => (e.id === id ? next : e))
			: [...prev, next];
	});
}

interface TitleSeed {
	mediaType: MediaType;
	tmdbId: number;
	title: NormalizedTitle;
	totalEpisodes?: number | null;
}

/**
 * Fields written only when an entry doc is being created for the first
 * time. Every mutation below merges its own patch on top of this (or
 * nothing, if the doc already exists) rather than restating the full
 * document shape — restating it on every write was the actual bug behind
 * "marking an episode watched doesn't stick": a first-ever write from
 * useToggleEpisode never included `rating`, so a brand-new doc had no
 * `rating` key at all, and the security rule's direct property access on a
 * missing map key fails closed (permission-denied), silently rolled back
 * by onError with no visible feedback. It also meant rating something
 * forced its status to "want", and changing status wiped any rating —
 * rating and watch status are independent: you can dislike something
 * you've watched, or like something with no status set at all. `status`
 * defaults to `null` ("untracked") rather than "want", so rating alone
 * never implies a status.
 */
function baseEntryFields(seed: TitleSeed) {
	return {
		mediaType: seed.mediaType,
		tmdbId: seed.tmdbId,
		title: seed.title.title,
		posterPath: seed.title.posterPath,
		releaseDate: seed.title.date,
		status: null as WatchStatus | null,
		rating: null as Rating,
		episodesWatched: 0,
		totalEpisodes: seed.totalEpisodes ?? null,
		addedAt: serverTimestamp(),
	};
}

export function useSetRating() {
	const { user } = useAuth();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			seed,
			rating,
		}: {
			seed: TitleSeed;
			rating: Rating;
		}) => {
			if (!user) throw new Error("Not signed in");
			const id = entryId(seed.mediaType, seed.tmdbId);
			const ref = entryDoc(user.uid, id);
			const existing = await getDoc(ref);
			await setDoc(
				ref,
				{
					...(existing.exists() ? {} : baseEntryFields(seed)),
					rating,
					updatedAt: serverTimestamp(),
				},
				{ merge: true },
			);
		},
		onMutate: async ({ seed, rating }) => {
			if (!user) return;
			const id = entryId(seed.mediaType, seed.tmdbId);
			await queryClient.cancelQueries({ queryKey: libraryKey(user.uid) });
			const previous = queryClient.getQueryData<LibraryEntry[]>(
				libraryKey(user.uid),
			);
			upsertLocal(
				queryClient,
				user.uid,
				id,
				{ rating },
				{
					mediaType: seed.mediaType,
					tmdbId: seed.tmdbId,
					title: seed.title.title,
					posterPath: seed.title.posterPath,
					releaseDate: seed.title.date,
				},
			);
			return { previous };
		},
		onError: (_err, _vars, context) => {
			if (user && context?.previous) {
				queryClient.setQueryData(libraryKey(user.uid), context.previous);
			}
		},
	});
}

export function useSetStatus() {
	const { user } = useAuth();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			seed,
			status,
		}: {
			seed: TitleSeed;
			status: WatchStatus | null;
		}) => {
			if (!user) throw new Error("Not signed in");
			const id = entryId(seed.mediaType, seed.tmdbId);
			const ref = entryDoc(user.uid, id);
			const existing = await getDoc(ref);
			await setDoc(
				ref,
				{
					...(existing.exists() ? {} : baseEntryFields(seed)),
					status,
					totalEpisodes: seed.totalEpisodes ?? null,
					updatedAt: serverTimestamp(),
				},
				{ merge: true },
			);
		},
		onMutate: async ({ seed, status }) => {
			if (!user) return;
			const id = entryId(seed.mediaType, seed.tmdbId);
			await queryClient.cancelQueries({ queryKey: libraryKey(user.uid) });
			const previous = queryClient.getQueryData<LibraryEntry[]>(
				libraryKey(user.uid),
			);
			upsertLocal(
				queryClient,
				user.uid,
				id,
				{ status, totalEpisodes: seed.totalEpisodes ?? null },
				{
					mediaType: seed.mediaType,
					tmdbId: seed.tmdbId,
					title: seed.title.title,
					posterPath: seed.title.posterPath,
					releaseDate: seed.title.date,
				},
			);
			return { previous };
		},
		onError: (_err, _vars, context) => {
			if (user && context?.previous) {
				queryClient.setQueryData(libraryKey(user.uid), context.previous);
			}
		},
	});
}

export function useToggleEpisode() {
	const { user } = useAuth();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			seed,
			seasonNumber,
			watched,
			watchedInSeasonAfter,
		}: {
			seed: TitleSeed;
			seasonNumber: number;
			episodeNumber: number;
			watched: boolean;
			/** Full watched-episode-number list for this season, after the toggle. */
			watchedInSeasonAfter: number[];
		}) => {
			if (!user) throw new Error("Not signed in");
			const id = entryId(seed.mediaType, seed.tmdbId);
			const entryRef = entryDoc(user.uid, id);
			const seasonRef = seasonDoc(user.uid, id, seasonNumber);
			// A transaction (not a batch) so the "does this entry exist yet"
			// read and both writes stay atomic — a plain batch can't read.
			await runTransaction(firestore, async (tx) => {
				const entrySnap = await tx.get(entryRef);
				tx.set(
					entryRef,
					{
						...(entrySnap.exists() ? {} : baseEntryFields(seed)),
						status: "watching",
						totalEpisodes: seed.totalEpisodes ?? null,
						episodesWatched: increment(watched ? 1 : -1),
						updatedAt: serverTimestamp(),
					},
					{ merge: true },
				);
				tx.set(
					seasonRef,
					{
						seasonNumber,
						watched: watchedInSeasonAfter,
						updatedAt: serverTimestamp(),
					},
					{ merge: true },
				);
			});
		},
		onMutate: async ({ seed, watched }) => {
			if (!user) return;
			const id = entryId(seed.mediaType, seed.tmdbId);
			await queryClient.cancelQueries({ queryKey: libraryKey(user.uid) });
			const previous = queryClient.getQueryData<LibraryEntry[]>(
				libraryKey(user.uid),
			);
			const existing = previous?.find((e) => e.id === id);
			const nextCount = Math.max(
				0,
				(existing?.episodesWatched ?? 0) + (watched ? 1 : -1),
			);
			upsertLocal(
				queryClient,
				user.uid,
				id,
				{
					episodesWatched: nextCount,
					status: "watching",
					totalEpisodes: seed.totalEpisodes ?? existing?.totalEpisodes ?? null,
				},
				{
					mediaType: seed.mediaType,
					tmdbId: seed.tmdbId,
					title: seed.title.title,
					posterPath: seed.title.posterPath,
					releaseDate: seed.title.date,
				},
			);
			return { previous };
		},
		onError: (_err, _vars, context) => {
			if (user && context?.previous) {
				queryClient.setQueryData(libraryKey(user.uid), context.previous);
			}
		},
	});
}

/** Bulk-sets a season's full watched list in one write — used by "mark all watched". */
export function useSetSeasonWatched() {
	const { user } = useAuth();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			seed,
			seasonNumber,
			episodeNumbers,
		}: {
			seed: TitleSeed;
			seasonNumber: number;
			episodeNumbers: number[];
		}) => {
			if (!user) throw new Error("Not signed in");
			const id = entryId(seed.mediaType, seed.tmdbId);
			const entryRef = entryDoc(user.uid, id);
			const seasonRef = seasonDoc(user.uid, id, seasonNumber);
			await runTransaction(firestore, async (tx) => {
				const [entrySnap, seasonSnap] = await Promise.all([
					tx.get(entryRef),
					tx.get(seasonRef),
				]);
				const previousWatched: number[] = seasonSnap.data()?.watched ?? [];
				const delta = episodeNumbers.length - previousWatched.length;
				tx.set(
					entryRef,
					{
						...(entrySnap.exists() ? {} : baseEntryFields(seed)),
						status: "watching",
						totalEpisodes: seed.totalEpisodes ?? null,
						episodesWatched: increment(delta),
						updatedAt: serverTimestamp(),
					},
					{ merge: true },
				);
				tx.set(
					seasonRef,
					{
						seasonNumber,
						watched: episodeNumbers,
						updatedAt: serverTimestamp(),
					},
					{ merge: true },
				);
			});
		},
		onMutate: async ({ seed, episodeNumbers }) => {
			if (!user) return;
			const id = entryId(seed.mediaType, seed.tmdbId);
			await queryClient.cancelQueries({ queryKey: libraryKey(user.uid) });
			const previous = queryClient.getQueryData<LibraryEntry[]>(
				libraryKey(user.uid),
			);
			upsertLocal(
				queryClient,
				user.uid,
				id,
				{
					episodesWatched: episodeNumbers.length,
					status: "watching",
					totalEpisodes: seed.totalEpisodes ?? null,
				},
				{
					mediaType: seed.mediaType,
					tmdbId: seed.tmdbId,
					title: seed.title.title,
					posterPath: seed.title.posterPath,
					releaseDate: seed.title.date,
				},
			);
			return { previous };
		},
		onError: (_err, _vars, context) => {
			if (user && context?.previous) {
				queryClient.setQueryData(libraryKey(user.uid), context.previous);
			}
		},
	});
}

export function useRemoveEntry() {
	const { user } = useAuth();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			if (!user) throw new Error("Not signed in");
			const seasonsSnap = await getDocs(
				collection(firestore, "users", user.uid, "entries", id, "seasons"),
			);
			const batch = writeBatch(firestore);
			for (const seasonSnapshotDoc of seasonsSnap.docs) {
				batch.delete(seasonSnapshotDoc.ref);
			}
			batch.delete(entryDoc(user.uid, id));
			await batch.commit();
		},
		onMutate: async (id) => {
			if (!user) return;
			await queryClient.cancelQueries({ queryKey: libraryKey(user.uid) });
			const previous = queryClient.getQueryData<LibraryEntry[]>(
				libraryKey(user.uid),
			);
			queryClient.setQueryData<LibraryEntry[]>(
				libraryKey(user.uid),
				(prev = []) => prev.filter((e) => e.id !== id),
			);
			return { previous };
		},
		onError: (_err, _vars, context) => {
			if (user && context?.previous) {
				queryClient.setQueryData(libraryKey(user.uid), context.previous);
			}
		},
	});
}

/** Live-syncs a single season's watched-episode list; only subscribes while `enabled`. */
export function useSeasonWatched(
	id: string,
	seasonNumber: number,
	enabled: boolean,
) {
	const { user } = useAuth();
	const [watched, setWatched] = useState<number[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!user || !enabled) return;
		setLoading(true);
		const unsubscribe = onSnapshot(
			seasonDoc(user.uid, id, seasonNumber),
			(snapshot) => {
				setWatched(snapshot.data()?.watched ?? []);
				setLoading(false);
			},
		);
		return unsubscribe;
	}, [user, enabled, id, seasonNumber]);

	return { watched, loading };
}
