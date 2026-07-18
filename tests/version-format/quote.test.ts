import { describe, expect, it } from 'vitest';
import { quoteBody, unquoteBody } from '../../src/version-format/quote';

describe('quote/unquote', () => {
	it('round-trips plain paragraphs', () => {
		const body = 'Hello\n\nWorld';
		expect(unquoteBody(quoteBody(body, '\n'))).toBe(body);
	});

	it('preserves code fences', () => {
		const body = 'Intro\n\n```ts\nconst x = 1;\n```\n\nOutro';
		expect(unquoteBody(quoteBody(body, '\n'))).toBe(body);
	});

	it('preserves nested blockquotes by stripping one level', () => {
		const quoted = '> > nested\n> outer';
		expect(unquoteBody(quoted)).toBe('> nested\nouter');
	});

	it('handles Unicode', () => {
		const body = '自由需要论点 — café';
		expect(unquoteBody(quoteBody(body, '\n'))).toBe(body);
	});
});
