import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Link } from "@tanstack/react-router";
import {
	Film,
	ListVideo,
	LogIn,
	LogOut,
	Search as SearchIcon,
} from "lucide-react";
import { SearchCombobox } from "#/components/SearchCombobox";
import { ThemePicker } from "#/components/ThemePicker";
import { signOut } from "#/lib/auth-store";
import { useAuth } from "#/lib/use-auth";

export function AppNavbar() {
	const { status, user } = useAuth();

	return (
		<div className="navbar bg-base-200/80 border-base-300 sticky top-0 z-40 gap-2 border-b px-4 backdrop-blur">
			<div className="navbar-start gap-1">
				<Link to="/" className="btn btn-ghost gap-2 px-2 text-lg font-bold">
					<Film className="text-primary size-5" aria-hidden />
					TVTime
				</Link>
			</div>

			<div className="navbar-center hidden gap-1 md:flex">
				<Link
					to="/home"
					className="btn btn-ghost btn-sm"
					activeOptions={{ exact: true }}
					activeProps={{ className: "btn-active" }}
				>
					Home
				</Link>
				<Link
					to="/"
					className="btn btn-ghost btn-sm"
					activeOptions={{ exact: true }}
					activeProps={{ className: "btn-active" }}
				>
					Discover
				</Link>
				<Link
					to="/search"
					className="btn btn-ghost btn-sm"
					activeProps={{ className: "btn-active" }}
				>
					Search
				</Link>
				<Link
					to="/my-list"
					className="btn btn-ghost btn-sm"
					activeProps={{ className: "btn-active" }}
				>
					My List
				</Link>
			</div>

			<div className="navbar-end gap-1">
				<SearchCombobox />
				<Link
					to="/search"
					className="btn btn-ghost btn-circle sm:hidden"
					aria-label="Search"
				>
					<SearchIcon className="size-5" aria-hidden />
				</Link>
				<ThemePicker />

				{status === "signed-in" && user ? (
					<Menu as="div" className="relative">
						<MenuButton
							className="btn btn-ghost btn-circle avatar"
							aria-label="Account menu"
						>
							{user.photoURL ? (
								<div className="w-9 rounded-full">
									<img
										src={user.photoURL}
										alt=""
										referrerPolicy="no-referrer"
									/>
								</div>
							) : (
								<div className="avatar-placeholder">
									<div className="bg-neutral text-neutral-content w-9 rounded-full">
										<span className="text-sm">
											{(user.displayName ?? user.email ?? "U")
												.charAt(0)
												.toUpperCase()}
										</span>
									</div>
								</div>
							)}
						</MenuButton>
						<MenuItems
							anchor={{ to: "bottom end", gap: "8px" }}
							className="menu bg-base-200 rounded-box z-50 w-56 p-2 shadow-lg"
						>
							<div className="text-base-content/60 truncate px-3 py-2 text-xs">
								{user.displayName ?? user.email}
							</div>
							<MenuItem>
								<Link
									to="/my-list"
									className="data-focus:bg-base-300 flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
								>
									<ListVideo className="size-4" aria-hidden />
									My List
								</Link>
							</MenuItem>
							<MenuItem>
								<button
									type="button"
									onClick={() => void signOut()}
									className="data-focus:bg-base-300 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm"
								>
									<LogOut className="size-4" aria-hidden />
									Sign out
								</button>
							</MenuItem>
						</MenuItems>
					</Menu>
				) : (
					<Link to="/login" className="btn btn-primary btn-sm gap-1.5">
						<LogIn className="size-4" aria-hidden />
						<span className="hidden sm:inline">Sign in</span>
					</Link>
				)}
			</div>
		</div>
	);
}
