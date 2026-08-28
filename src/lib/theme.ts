import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

// daisyUI themes enabled for this app (see src/styles.css). "movie" is the
// custom cinematic theme and the default; "system" renders no data-theme
// attribute at all so the browser's prefers-color-scheme media query
// (movie's `prefersdark: true`) decides instead.
export const THEMES = [
	"movie",
	"light",
	"dark",
	"night",
	"dim",
	"sunset",
	"system",
] as const;
export type Theme = (typeof THEMES)[number];

const DEFAULT_THEME: Theme = "movie";
const COOKIE_NAME = "theme";

function isTheme(value: string | undefined): value is Theme {
	return !!value && (THEMES as readonly string[]).includes(value);
}

function parseThemeCookie(cookieHeader: string | null | undefined): Theme {
	const match = cookieHeader?.match(
		new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`),
	);
	const value = match?.[1];
	return isTheme(value) ? value : DEFAULT_THEME;
}

// Reads the persisted theme choice: from the request's Cookie header during
// SSR, from document.cookie on the client. Both branches see the same
// cookie, so the very first server-rendered byte already has the right
// data-theme and there's no flash-of-wrong-theme on load.
export const getThemeCookie = createIsomorphicFn()
	.server(() => parseThemeCookie(getRequestHeader("cookie")))
	.client(() => parseThemeCookie(document.cookie));

export function persistTheme(theme: Theme) {
	// The Cookie Store API isn't supported in Safari/Firefox, so plain
	// document.cookie is the correct cross-browser choice here.
	// biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API has no Safari/Firefox support
	document.cookie = `${COOKIE_NAME}=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

/** The value to render as <html data-theme>. `system` omits the attribute. */
export function themeAttr(theme: Theme): string | undefined {
	return theme === "system" ? undefined : theme;
}

export const THEME_LABELS: Record<Theme, string> = {
	movie: "Movie",
	light: "Light",
	dark: "Dark",
	night: "Night",
	dim: "Dim",
	sunset: "Sunset",
	system: "System",
};
