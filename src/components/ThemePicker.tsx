import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Check, Palette } from "lucide-react";
import { useEffect, useState } from "react";
import type { Theme } from "#/lib/theme";
import { persistTheme, THEME_LABELS, THEMES, themeAttr } from "#/lib/theme";

export function ThemePicker() {
	// The server already rendered the right data-theme (or none, for
	// "system"); read it back from the DOM on mount rather than duplicating
	// cookie-parsing logic here.
	const [theme, setTheme] = useState<Theme>("movie");

	useEffect(() => {
		const attr = document.documentElement.getAttribute("data-theme");
		setTheme((attr as Theme) ?? "system");
	}, []);

	function choose(next: Theme) {
		setTheme(next);
		persistTheme(next);
		const attr = themeAttr(next);
		if (attr) {
			document.documentElement.setAttribute("data-theme", attr);
		} else {
			document.documentElement.removeAttribute("data-theme");
		}
	}

	return (
		<Menu as="div" className="relative">
			<MenuButton
				className="btn btn-ghost btn-circle"
				aria-label="Choose theme"
			>
				<Palette className="size-5" aria-hidden />
			</MenuButton>
			<MenuItems
				anchor={{ to: "bottom end", gap: "8px" }}
				className="menu bg-base-200 rounded-box z-50 w-48 p-2 shadow-lg"
			>
				{THEMES.map((t) => (
					<MenuItem key={t}>
						<button
							type="button"
							onClick={() => choose(t)}
							className="data-focus:bg-base-300 flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm"
						>
							{THEME_LABELS[t]}
							{theme === t && (
								<Check className="text-primary size-4" aria-hidden />
							)}
						</button>
					</MenuItem>
				))}
			</MenuItems>
		</Menu>
	);
}
