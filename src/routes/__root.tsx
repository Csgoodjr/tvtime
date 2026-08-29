import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { AppNavbar } from "#/components/AppNavbar";
import { MobileDock } from "#/components/MobileDock";
import { PwaRegister } from "#/components/PwaRegister";
import { getThemeCookie, themeAttr } from "#/lib/theme";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	beforeLoad: () => ({ theme: getThemeCookie() }),
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "TVTime — Track what you watch",
			},
			{
				name: "description",
				content:
					"Track the movies and shows you watch, rate them, and pick up where you left off.",
			},
			{
				name: "theme-color",
				content: "#0b0d13",
			},
			{
				name: "apple-mobile-web-app-capable",
				content: "yes",
			},
			{
				name: "apple-mobile-web-app-status-bar-style",
				content: "black-translucent",
			},
			{
				name: "apple-mobile-web-app-title",
				content: "TVTime",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "manifest",
				href: "/manifest.webmanifest",
			},
			{
				rel: "icon",
				href: "/favicon.png",
				type: "image/png",
			},
			{
				rel: "apple-touch-icon",
				href: "/apple-touch-icon.png",
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	const { theme } = Route.useRouteContext();

	return (
		<html lang="en" data-theme={themeAttr(theme)}>
			<head>
				<HeadContent />
			</head>
			<body className="bg-base-100 text-base-content min-h-screen">
				<PwaRegister />
				<AppNavbar />
				<main>
					{children}
					{/* Reserves scroll space so page content never sits under the fixed MobileDock. */}
					<div className="h-16 sm:hidden" aria-hidden />
				</main>
				<MobileDock />
				<TanStackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
						TanStackQueryDevtools,
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
