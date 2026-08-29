import { useEffect } from "react";

/** Registers the PWA service worker. Client-only: SSR never runs effects. */
export function PwaRegister() {
	useEffect(() => {
		if ("serviceWorker" in navigator) {
			navigator.serviceWorker.register("/sw.js");
		}
	}, []);

	return null;
}
