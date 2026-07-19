import { describe, expect, it } from 'vitest';
import { findActiveBodyStart } from '../../src/editor/find-active-body-start';

describe('findActiveBodyStart', () => {
	it('locates the plain active body after the unquoted version marker', () => {
		const doc = [
			'%% draftline-document {"schema":2,"latestVersionId":"v2"} %%',
			'',
			'> [!draftline-version]',
			'> %% draftline-version {"id":"v1","number":1,"createdAt":"t","parentId":null} %%',
			'> Old',
			'',
			'%% draftline-version {"id":"v2","number":2,"createdAt":"t","parentId":"v1"} %%',
			'',
			'# Current',
			'Body',
			'',
		].join('\n');

		const start = findActiveBodyStart(doc, '\n');
		expect(start).not.toBeNull();
		expect(doc.slice(start!)).toBe('# Current\nBody\n');
	});

	it('returns null when the active marker is missing', () => {
		const doc = '%% draftline-document {"schema":2,"latestVersionId":"v1"} %%\n';
		expect(findActiveBodyStart(doc, '\n')).toBeNull();
	});
});
