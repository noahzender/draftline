import { describe, expect, it } from 'vitest';
import {
	createVersionFromActive,
	parseVersionedDocument,
	serializeDocument,
	validateDocument,
} from '../../src/version-format';

const FIXED = new Date('2026-07-18T21:00:00.000Z');

describe('schema 2 parse and serialize', () => {
	it('initializes an unversioned note with Version 1 archived and Version 2 active', () => {
		const source = `---\ntitle: Example\n---\n\n# Essay\n\nHello world.\n`;
		const result = createVersionFromActive(source, {
			now: FIXED,
			id: 'v2',
			parentId: 'v1',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.content).toContain('"schema":2');
		expect(result.content).not.toContain('> [!draftline-active]');
		expect(result.content).toContain(
			'> %% draftline-version {"id":"v1","number":1,"createdAt":"2026-07-18T21:00:00.000Z","parentId":null} %%',
		);
		expect(result.content).toContain(
			'%% draftline-version {"id":"v2","number":2,"createdAt":"2026-07-18T21:00:00.000Z","parentId":"v1"} %%',
		);
		expect(result.content).toContain('# Essay\n\nHello world.');

		const parsed = parseVersionedDocument(result.content);
		expect(parsed.ok).toBe(true);
		if (!parsed.ok) return;
		expect(validateDocument(parsed.document)).toBeNull();
		expect(parsed.document.document.schema).toBe(2);
		expect(parsed.document.versions).toHaveLength(2);
		expect(parsed.document.versions.find((v) => v.active)!.body).toBe(
			'# Essay\n\nHello world.',
		);
	});

	it('round-trips multiple inactive callouts and a plain active body', () => {
		const content = [
			'%% draftline-document {"schema":2,"latestVersionId":"v2"} %%',
			'',
			'> [!draftline-version]',
			'> %% draftline-version {"id":"v1","number":1,"createdAt":"2026-07-18T20:00:00.000Z","parentId":null} %%',
			'> # Earlier',
			'> Old body',
			'',
			'%% draftline-version {"id":"v2","number":2,"createdAt":"2026-07-18T21:00:00.000Z","parentId":"v1"} %%',
			'',
			'# Current',
			'New body',
			'',
		].join('\n');

		const parsed = parseVersionedDocument(content);
		expect(parsed.ok).toBe(true);
		if (!parsed.ok) return;
		expect(validateDocument(parsed.document)).toBeNull();

		const active = parsed.document.versions.find((v) => v.active)!;
		const inactive = parsed.document.versions.find((v) => !v.active)!;
		expect(active.meta.id).toBe('v2');
		expect(active.body).toBe('# Current\nNew body');
		expect(inactive.meta.id).toBe('v1');
		expect(inactive.body).toBe('# Earlier\nOld body');

		const serialized = serializeDocument(parsed.document);
		const again = parseVersionedDocument(serialized);
		expect(again.ok).toBe(true);
		if (!again.ok) return;
		expect(again.document.versions.find((v) => v.active)!.body).toBe(
			'# Current\nNew body',
		);
		expect(serialized).not.toContain('> [!draftline-active]');
		expect(serialized).toContain('> [!draftline-version]');
	});

	it('preserves code fences and nested quotes in the plain active body', () => {
		const body = [
			'# Title',
			'',
			'```md',
			'> [!note]',
			'> Nested',
			'```',
			'',
			'> quote line',
		].join('\n');
		const result = createVersionFromActive(body, {
			now: FIXED,
			id: 'v2',
			parentId: 'v1',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const parsed = parseVersionedDocument(result.content);
		expect(parsed.ok).toBe(true);
		if (!parsed.ok) return;
		expect(parsed.document.versions.find((v) => v.active)!.body).toBe(body);
	});

	it('rejects schema 1 all-callout documents', () => {
		const schema1 = [
			'%% draftline-document {"schema":1,"latestVersionId":"v1"} %%',
			'',
			'> [!draftline-active]',
			'> %% draftline-version {"id":"v1","number":1,"createdAt":"t","parentId":null} %%',
			'> Hello',
			'',
		].join('\n');
		const parsed = parseVersionedDocument(schema1);
		expect(parsed.ok).toBe(false);
		if (parsed.ok) return;
		expect(parsed.error).toMatch(/schema/i);
	});

	it('rejects files with an inactive callout after the active marker', () => {
		const bad = [
			'%% draftline-document {"schema":2,"latestVersionId":"v2"} %%',
			'',
			'%% draftline-version {"id":"v2","number":2,"createdAt":"t","parentId":null} %%',
			'',
			'Active body',
			'',
			'> [!draftline-version]',
			'> %% draftline-version {"id":"v1","number":1,"createdAt":"t","parentId":null} %%',
			'> Old',
			'',
		].join('\n');
		const parsed = parseVersionedDocument(bad);
		expect(parsed.ok).toBe(false);
	});

	it('handles CRLF notes', () => {
		const source = '---\r\ntitle: A\r\n---\r\n\r\nHello\r\n';
		const result = createVersionFromActive(source, {
			now: FIXED,
			id: 'v2',
			parentId: 'v1',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.document.newline).toBe('\r\n');
		const parsed = parseVersionedDocument(result.content);
		expect(parsed.ok).toBe(true);
		if (!parsed.ok) return;
		expect(parsed.document.versions.find((v) => v.active)!.body).toBe('Hello');
	});
});
