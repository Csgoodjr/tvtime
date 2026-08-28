import { useSyncExternalStore } from "react";
import {
	getAuthServerSnapshot,
	getAuthSnapshot,
	subscribeAuth,
} from "#/lib/auth-store";

export function useAuth() {
	return useSyncExternalStore(
		subscribeAuth,
		getAuthSnapshot,
		getAuthServerSnapshot,
	);
}
