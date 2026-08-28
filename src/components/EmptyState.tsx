import { Link } from "@tanstack/react-router";
import type { ComponentType, ReactNode } from "react";

interface Props {
	icon: ComponentType<{ className?: string }>;
	title: string;
	description: string;
	action?: { to: string; label: string };
	children?: ReactNode;
}

export function EmptyState({
	icon: Icon,
	title,
	description,
	action,
	children,
}: Props) {
	return (
		<div className="flex flex-col items-center gap-3 px-4 py-20 text-center">
			<div className="bg-base-200 text-base-content/40 flex size-16 items-center justify-center rounded-full">
				<Icon className="size-8" aria-hidden />
			</div>
			<h2 className="text-lg font-semibold">{title}</h2>
			<p className="text-base-content/60 max-w-sm text-sm">{description}</p>
			{action && (
				<Link to={action.to} className="btn btn-primary btn-sm mt-2">
					{action.label}
				</Link>
			)}
			{children}
		</div>
	);
}
