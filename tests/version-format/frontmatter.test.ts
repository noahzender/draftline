import { describe, expect, it } from 'vitest';
import { splitFrontmatter } from '../../src/version-format/frontmatter';

describe('splitFrontmatter', () => {
	it('splits YAML and preserves trailing newline after closing fence', () => {
		const content = `---\ntitle: Example\n---\n\nBody text\n`;
		const result = splitFrontmatter(content);
		expect(result.frontmatter).toBe('---\ntitle: Example\n---\n');
		expect(result.body).toBe('\nBody text\n');
		expect(result.newline).toBe('\n');
	});

	it('returns empty frontmatter when absent', () => {
		const result = splitFrontmatter('Just a body\n');
		expect(result.frontmatter).toBe('');
		expect(result.body).toBe('Just a body\n');
	});

	it('preserves CRLF newline style', () => {
		const content = `---\r\ntitle: A\r\n---\r\n\r\nBody\r\n`;
		const result = splitFrontmatter(content);
		expect(result.newline).toBe('\r\n');
		expect(result.frontmatter.endsWith('\r\n')).toBe(true);
	});
});
