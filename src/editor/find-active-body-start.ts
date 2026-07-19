import { VERSION_MARKER_PREFIX } from '../version-format';

/**
 * Locate the start offset of the plain active body in a schema 2 document.
 * The active body begins after the unquoted version marker line (and its
 * following blank line, if present).
 */
export function findActiveBodyStart(
	docText: string,
	newline: '\n' | '\r\n',
): number | null {
	const sep = newline;
	const lines = docText.split(sep);
	let offset = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!;
		const trimmed = line.trim();
		const isUnquotedMarker =
			trimmed.startsWith(VERSION_MARKER_PREFIX) &&
			!line.trimStart().startsWith('>');

		if (isUnquotedMarker) {
			offset += line.length;
			if (i < lines.length - 1) {
				offset += sep.length;
			}
			// Skip a single blank line after the marker when present.
			if (i + 1 < lines.length && lines[i + 1]!.trim() === '') {
				offset += lines[i + 1]!.length + sep.length;
			}
			return offset;
		}

		offset += line.length;
		if (i < lines.length - 1) {
			offset += sep.length;
		}
	}

	return null;
}
