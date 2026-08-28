import {
	createUserWithEmailAndPassword,
	signOut as firebaseSignOut,
	GoogleAuthProvider,
	onAuthStateChanged,
	signInWithEmailAndPassword,
	signInWithPopup,
	type User,
} from "firebase/auth";
import { firebaseAuth } from "#/lib/firebase";

// A tiny external store over Firebase's onAuthStateChanged, so route guards
// and components can read auth state with useSyncExternalStore instead of
// each maintaining their own subscription. Firebase keeps its session in
// IndexedDB (not a cookie), so this only ever resolves on the client —
// during SSR `user` stays `undefined` ("unknown yet"), which is exactly
// what lets public routes render without waiting on auth.

type AuthState = {
	status: "loading" | "signed-out" | "signed-in";
	user: User | null;
};

let state: AuthState = { status: "loading", user: null };
const listeners = new Set<() => void>();

let initPromise: Promise<void> | null = null;

function notify() {
	for (const listener of listeners) listener();
}

function ensureInitialized() {
	if (initPromise) return initPromise;
	initPromise = new Promise<void>((resolve) => {
		onAuthStateChanged(firebaseAuth, (user) => {
			state = { status: user ? "signed-in" : "signed-out", user };
			notify();
			resolve();
		});
	});
	return initPromise;
}

export function subscribeAuth(listener: () => void) {
	ensureInitialized();
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function getAuthSnapshot() {
	ensureInitialized();
	return state;
}

export function getAuthServerSnapshot(): AuthState {
	return { status: "loading", user: null };
}

/** Resolves once Firebase has restored (or confirmed the absence of) a session. */
export function waitForAuthInit() {
	return ensureInitialized();
}

export async function signInWithGoogle() {
	await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
}

export async function signInWithEmail(email: string, password: string) {
	await signInWithEmailAndPassword(firebaseAuth, email, password);
}

export async function signUpWithEmail(email: string, password: string) {
	await createUserWithEmailAndPassword(firebaseAuth, email, password);
}

export async function signOut() {
	await firebaseSignOut(firebaseAuth);
}
