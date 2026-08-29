// TMDB dates are bare "YYYY-MM-DD" strings with no timezone. Parsing them
// via `new Date(isoString)` treats them as UTC midnight, which displays as
// the *previous* calendar day for any timezone west of UTC. Building the
// Date from the parsed Y/M/D components keeps everything in local time.
function parseIsoDateLocal(dateStr: string): Date {
	const [year, month, day] = dateStr.split("-").map(Number);
	return new Date(year, month - 1, day);
}

function startOfToday(referenceDate: Date): Date {
	return new Date(
		referenceDate.getFullYear(),
		referenceDate.getMonth(),
		referenceDate.getDate(),
	);
}

export function isTodayOrFuture(
	airDate: string,
	referenceDate = new Date(),
): boolean {
	return (
		parseIsoDateLocal(airDate).getTime() >=
		startOfToday(referenceDate).getTime()
	);
}

const DAYS_AS_RELATIVE = 6;

export function formatAirDate(
	airDate: string,
	referenceDate = new Date(),
): string {
	const date = parseIsoDateLocal(airDate);
	const today = startOfToday(referenceDate);
	const daysOut = Math.round((date.getTime() - today.getTime()) / 86_400_000);

	if (daysOut === 0) return "Today";
	if (daysOut === 1) return "Tomorrow";
	if (daysOut > 1 && daysOut <= DAYS_AS_RELATIVE) return `In ${daysOut} days`;

	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
	});
}
