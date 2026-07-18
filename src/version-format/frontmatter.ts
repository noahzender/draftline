import type { UnversionedNote } from './types';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

export function detectNewline(text: string): '\n' | '\r\n' {
	return text.includes('\r\n') ? '\r\n' : '\n';
}

/**
 * Split YAML frontmatter from the note body.
 * Frontmatter includes the opening/closing --- lines and a trailing newline when present.
 */
export function splitFrontmatter(content: string): UnversionedNote {
	const newline = detectNewline(content);
	const match = FRONTMATTER_RE.exec(content);
	if (!match) {
		return {
			frontmatter: '',
			body: content,
			newline,
		};
	}

	const full = match[0];
	const endsWithNewline = /(?:\r?\n)$/.test(full);
	const frontmatter = endsWithNewline ? full : `${full}${newline}`;
	const body = content.slice(match[0].length);
	return { frontmatter, body, newline };
}
