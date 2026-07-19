import { describe, expect, it } from 'vitest';
import { collectHiddenLineRanges } from '../../src/editor/hide-inactive-ranges';

describe('collectHiddenLineRanges', () => {
	it('hides metadata and inactive callouts but keeps the plain active body', () => {
		const lines = [
			'%% draftline-document {"schema":2,"latestVersionId":"v2"} %%',
			'',
			'> [!draftline-version]',
			'> %% draftline-version {"id":"v1","number":1,"createdAt":"t","parentId":null} %%',
			'> Old body',
			'',
			'%% draftline-version {"id":"v2","number":2,"createdAt":"t","parentId":"v1"} %%',
			'',
			'# Current',
			'Editable body',
		];

		const hidden = collectHiddenLineRanges(lines);
		expect(hidden).toEqual([{ fromLine: 0, toLineExclusive: 8 }]);
	});

	it('hides document and version markers when there are no archives', () => {
		const lines = [
			'%% draftline-document {"schema":2,"latestVersionId":"v1"} %%',
			'',
			'%% draftline-version {"id":"v1","number":1,"createdAt":"t","parentId":null} %%',
			'',
			'First Light',
		];

		expect(collectHiddenLineRanges(lines)).toEqual([
			{ fromLine: 0, toLineExclusive: 4 },
		]);
	});
});
