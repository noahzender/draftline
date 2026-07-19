import { VERSION_MARKER_PREFIX } from '../version-format';

export interface HiddenLineRange {
	/** Inclusive 0-based start line. */
	fromLine: number;
	/** Exclusive 0-based end line. */
	toLineExclusive: number;
}

function isUnquotedVersionMarker(line: string, trimmed: string): boolean {
	return (
		trimmed.startsWith(VERSION_MARKER_PREFIX) &&
		!line.trimStart().startsWith('>')
	);
}

/**
 * Collect line ranges that should be hidden in Live Preview for schema 2.
 * Everything before the plain active body is storage (document marker, inactive
 * callouts, active version marker, and the blank separator after that marker).
 */
export function collectHiddenLineRanges(lines: string[]): HiddenLineRange[] {
	const ranges: HiddenLineRange[] = [];
	let index = 0;

	while (index < lines.length) {
		const line = lines[index]!;
		const trimmed = line.trim();

		if (isUnquotedVersionMarker(line, trimmed)) {
			let end = index + 1;
			if (end < lines.length && lines[end]!.trim() === '') {
				end++;
			}
			ranges.push({ fromLine: 0, toLineExclusive: end });
			return ranges;
		}

		index++;
	}

	// No active marker found — do not hide content (fail open for non-Draftline).
	return ranges;
}
