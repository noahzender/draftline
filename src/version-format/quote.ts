/**
 * Convert an unquoted Markdown body into Obsidian callout body lines
 * (each non-empty logical line prefixed with `> `).
 */
export function quoteBody(body: string, newline: '\n' | '\r\n'): string {
	const normalized = body.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
	const lines = normalized.split('\n');
	// Preserve a trailing blank line representation: if body ends with newline,
	// the last split entry is ''. Quote that as `>` (empty quote line).
	const quoted = lines.map((line) => (line.length === 0 ? '>' : `> ${line}`));
	return quoted.join(newline);
}

/**
 * Strip one level of blockquote prefix from callout body lines.
 */
export function unquoteBody(quoted: string): string {
	const normalized = quoted.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
	const lines = normalized.split('\n');
	const unquoted = lines.map((line) => {
		if (line.startsWith('> ')) {
			return line.slice(2);
		}
		if (line === '>') {
			return '';
		}
		// Nested quotes keep remaining `>` characters after one strip.
		if (line.startsWith('>')) {
			return line.slice(1).replace(/^ /, '');
		}
		return line;
	});
	return unquoted.join('\n');
}

/**
 * Ensure pasted/edited multiline text remains valid inside a callout.
 * Given the unquoted body, re-serialize as quoted lines.
 */
export function ensureQuotedBody(body: string, newline: '\n' | '\r\n'): string {
	return quoteBody(body, newline);
}
