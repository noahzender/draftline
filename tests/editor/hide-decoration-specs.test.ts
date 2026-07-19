import { describe, expect, it } from 'vitest';
import { buildHideDecorationSpecs } from '../../src/editor/hide-decoration-specs';
import { collectHiddenLineRanges } from '../../src/editor/hide-inactive-ranges';

describe('buildHideDecorationSpecs', () => {
	it('hides document and version markers without replace on blank separators', () => {
		const lines = [
			'%% draftline-document {"schema":2,"latestVersionId":"v1"} %%',
			'',
			'%% draftline-version {"id":"v1","number":1,"createdAt":"t","parentId":null} %%',
			'',
			'# Body',
		];
		const ranges = collectHiddenLineRanges(lines);
		const specs = buildHideDecorationSpecs(lines, ranges);

		expect(specs).toEqual([
			{ line: 0, replace: true },
			{ line: 1, replace: false },
			{ line: 2, replace: true },
			{ line: 3, replace: false },
		]);
		expect(specs.some((spec) => spec.line === 4)).toBe(false);
	});
});
