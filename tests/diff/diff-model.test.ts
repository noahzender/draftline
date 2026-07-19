import { describe, expect, it } from 'vitest';
import {
	bodyOffsetToDocOffset,
	buildDiffModel,
	mapActiveOffsetsThroughLines,
} from '../../src/diff/diff-model';

describe('buildDiffModel', () => {
	it('marks word-level additions and deletions', () => {
		const model = buildDiffModel('investor path', 'investors path');
		const kinds = model.parts.map((p) => p.kind);
		expect(kinds).toContain('remove');
		expect(kinds).toContain('add');

		const add = model.parts.find((p) => p.kind === 'add');
		expect(add?.value).toContain('investors');
		expect(add?.activeFrom).not.toBeNull();
	});

	it('maps equal text with contiguous active offsets', () => {
		const model = buildDiffModel('alpha beta', 'alpha gamma beta');
		const equals = model.parts.filter((p) => p.kind === 'equal');
		expect(equals.length).toBeGreaterThan(0);
		for (const part of equals) {
			expect(part.activeFrom).not.toBeNull();
			expect(part.activeTo).not.toBeNull();
		}
	});
});

describe('offset mapping', () => {
	it('maps plain active-body offsets into document positions', () => {
		const body = 'Hello\nWorld';
		const doc = [
			'%% draftline-document {"schema":2,"latestVersionId":"v1"} %%',
			'',
			'%% draftline-version {"id":"v1","number":1,"createdAt":"t","parentId":null} %%',
			'',
			'Hello',
			'World',
			'',
		].join('\n');
		const bodyStart = doc.indexOf('Hello');
		const ranges = mapActiveOffsetsThroughLines(body, bodyStart, doc, '\n');
		expect(ranges).toHaveLength(2);
		expect(bodyOffsetToDocOffset(ranges, 0)).toBe(doc.indexOf('Hello'));
		expect(bodyOffsetToDocOffset(ranges, 6)).toBe(doc.indexOf('World'));
	});
});
