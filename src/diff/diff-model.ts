import { diffWordsWithSpace, type Change } from 'diff';

export type DiffPartKind = 'equal' | 'add' | 'remove';

export interface DiffPart {
	kind: DiffPartKind;
	value: string;
	/** Start offset in the active (new) body for equal/add parts. */
	activeFrom: number | null;
	/** End offset in the active (new) body for equal/add parts. */
	activeTo: number | null;
}

export interface DiffModel {
	parts: DiffPart[];
}

/**
 * Compute a word-level diff between a baseline snapshot body and the active body.
 * Offsets refer to the active body only (additions/equals). Removals have null offsets.
 */
export function buildDiffModel(baselineBody: string, activeBody: string): DiffModel {
	const changes: Change[] = diffWordsWithSpace(baselineBody, activeBody);
	const parts: DiffPart[] = [];
	let activeOffset = 0;

	for (const change of changes) {
		const value = change.value;
		if (change.added) {
			parts.push({
				kind: 'add',
				value,
				activeFrom: activeOffset,
				activeTo: activeOffset + value.length,
			});
			activeOffset += value.length;
		} else if (change.removed) {
			parts.push({
				kind: 'remove',
				value,
				activeFrom: null,
				activeTo: null,
			});
		} else {
			parts.push({
				kind: 'equal',
				value,
				activeFrom: activeOffset,
				activeTo: activeOffset + value.length,
			});
			activeOffset += value.length;
		}
	}

	return { parts };
}

/**
 * Map an offset in the unquoted active body to a document offset given the
 * active callout's content start position and the quoted document text.
 *
 * For MVP editor decorations we operate on the raw file text ranges for the
 * active body lines (including `> ` prefixes). Callers pass a mapper.
 */
export function mapActiveOffsetsThroughLines(
	activeBody: string,
	bodyStartInDoc: number,
	docText: string,
	newline: '\n' | '\r\n',
): Array<{ bodyFrom: number; bodyTo: number; docFrom: number; docTo: number }> {
	const ranges: Array<{
		bodyFrom: number;
		bodyTo: number;
		docFrom: number;
		docTo: number;
	}> = [];

	const bodyLines = activeBody.split('\n');
	let bodyOffset = 0;
	let searchFrom = bodyStartInDoc;

	for (let i = 0; i < bodyLines.length; i++) {
		const line = bodyLines[i]!;
		const quoted = line.length === 0 ? '>' : `> ${line}`;
		const idx = docText.indexOf(quoted, searchFrom);
		if (idx === -1) {
			// Fallback: skip unmapped line.
			bodyOffset += line.length + (i < bodyLines.length - 1 ? 1 : 0);
			continue;
		}
		const contentStart = line.length === 0 ? idx + 1 : idx + 2;
		ranges.push({
			bodyFrom: bodyOffset,
			bodyTo: bodyOffset + line.length,
			docFrom: contentStart,
			docTo: contentStart + line.length,
		});
		bodyOffset += line.length + (i < bodyLines.length - 1 ? 1 : 0);
		searchFrom = idx + quoted.length + newline.length;
	}

	return ranges;
}

export function bodyOffsetToDocOffset(
	ranges: Array<{ bodyFrom: number; bodyTo: number; docFrom: number; docTo: number }>,
	bodyOffset: number,
): number | null {
	for (const range of ranges) {
		if (bodyOffset >= range.bodyFrom && bodyOffset <= range.bodyTo) {
			return range.docFrom + (bodyOffset - range.bodyFrom);
		}
	}
	// Newline between lines: map to end of previous line.
	for (let i = 0; i < ranges.length - 1; i++) {
		const current = ranges[i]!;
		const next = ranges[i + 1]!;
		if (bodyOffset === current.bodyTo + 1) {
			return next.docFrom;
		}
	}
	return null;
}
