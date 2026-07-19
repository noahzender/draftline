import type { HiddenLineRange } from './hide-inactive-ranges';

export interface HideDecorationSpec {
	/** 0-based line index. */
	line: number;
	/** Whether to apply a replace decoration (false for empty lines). */
	replace: boolean;
}

/**
 * Build per-line hide specs. Empty lines only get a line class — CodeMirror
 * rejects zero-length replace decorations, which would otherwise abort hiding.
 */
export function buildHideDecorationSpecs(
	lines: string[],
	ranges: HiddenLineRange[],
): HideDecorationSpec[] {
	const specs: HideDecorationSpec[] = [];
	for (const range of ranges) {
		for (let line = range.fromLine; line < range.toLineExclusive; line++) {
			const text = lines[line] ?? '';
			specs.push({
				line,
				replace: text.length > 0,
			});
		}
	}
	return specs;
}
