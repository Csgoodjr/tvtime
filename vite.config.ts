import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig(({ command }) => ({
	resolve: { tsconfigPaths: true },
	plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
	// Inline all server dependencies into dist/server/server.js instead of
	// leaving them as runtime `node_modules` imports. Our Node deployment
	// target (Firebase App Hosting's generic buildpack) installs deps into a
	// layer directory Node's ESM resolver can't see at runtime — see the
	// comment at the top of server.mjs for the full story.
	//
	// Scoped to `build` only: in dev, Vite's SSR module runner inlines
	// noExternal deps without CJS interop, which breaks CJS packages like
	// React (`ReferenceError: module is not defined`). `node_modules` is
	// available locally at dev time anyway, so externalizing there is fine.
	ssr: command === "build" ? { noExternal: true } : {},
}));

export default config;
