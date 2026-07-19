/**
 * Format a version creation timestamp for the popover, Lex-style:
 * - same day: "today at 2:37 PM"
 * - same year: "Jul 4"
 * - otherwise: "Jul 4, 2025"
 * Falls back to the raw string when the ISO date is invalid.
 */
export function formatCreatedAt(iso: string, now: Date = new Date()): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) {
		return iso;
	}

	const sameDay =
		date.getFullYear() === now.getFullYear() &&
		date.getMonth() === now.getMonth() &&
		date.getDate() === now.getDate();

	if (sameDay) {
		const time = date.toLocaleTimeString(undefined, {
			hour: 'numeric',
			minute: '2-digit',
		});
		return `today at ${time}`;
	}

	return date.toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
		...(date.getFullYear() === now.getFullYear()
			? {}
			: { year: 'numeric' }),
	});
}
