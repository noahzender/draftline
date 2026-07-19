import { describe, expect, it } from 'vitest';
import {
	createVersionFromActive,
	initializeVersionedNote,
	parseVersionedDocument,
	switchActiveVersion,
	validateDocument,
} from '../../src/version-format';

const FIXED = new Date('2026-07-18T21:00:00.000Z');

describe('version operations', () => {
	it('on first create archives the original as Version 1 and opens Version 2', () => {
		const source = `---\ntitle: Example\nup: Writing\n---\n\n# Essay\n\nHello world.\n`;
		const result = createVersionFromActive(source, {
			now: FIXED,
			id: 'v2',
			parentId: 'v1',
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.content).toContain('---\ntitle: Example\nup: Writing\n---\n');
		expect(result.content).toContain('"schema":2');
		expect(result.content).toContain('> [!draftline-version]');
		expect(result.content).toContain('> # Essay');
		expect(result.content).not.toContain('> [!draftline-active]');

		const parsed = parseVersionedDocument(result.content);
		expect(parsed.ok).toBe(true);
		if (!parsed.ok) return;
		expect(validateDocument(parsed.document)).toBeNull();
		expect(parsed.document.versions).toHaveLength(2);
		expect(parsed.document.document.latestVersionId).toBe('v2');

		const active = parsed.document.versions.find((v) => v.active)!;
		const archived = parsed.document.versions.find((v) => !v.active)!;
		expect(archived.meta.id).toBe('v1');
		expect(archived.meta.number).toBe(1);
		expect(archived.meta.parentId).toBeNull();
		expect(archived.body).toBe('# Essay\n\nHello world.');
		expect(active.meta.id).toBe('v2');
		expect(active.meta.number).toBe(2);
		expect(active.meta.parentId).toBe('v1');
		expect(active.body).toBe('# Essay\n\nHello world.');
	});

	it('duplicates the active version into a new latest plain-body version', () => {
		const init = createVersionFromActive('# Draft\n', {
			now: FIXED,
			id: 'v2',
			parentId: 'v1',
		});
		expect(init.ok).toBe(true);
		if (!init.ok) return;

		const created = createVersionFromActive(init.content, {
			now: new Date('2026-07-18T22:00:00.000Z'),
			id: 'v3',
		});
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		expect(created.content).toContain('> [!draftline-version]');
		expect(created.content).not.toContain('> [!draftline-active]');

		const parsed = parseVersionedDocument(created.content);
		expect(parsed.ok).toBe(true);
		if (!parsed.ok) return;
		expect(validateDocument(parsed.document)).toBeNull();
		expect(parsed.document.document.latestVersionId).toBe('v3');
		expect(parsed.document.versions).toHaveLength(3);

		const active = parsed.document.versions.find((v) => v.active)!;
		expect(active.meta.id).toBe('v3');
		expect(active.meta.parentId).toBe('v2');
		expect(active.meta.number).toBe(3);
		expect(active.body).toBe('# Draft');
	});

	it('allows branching by creating from an older active version', () => {
		const init = createVersionFromActive('A', {
			now: FIXED,
			id: 'v2',
			parentId: 'v1',
		});
		if (!init.ok) throw new Error(init.error);

		const switched = switchActiveVersion(init.content, 'v1');
		if (!switched.ok) throw new Error(switched.error);

		const branched = createVersionFromActive(switched.content, {
			now: new Date('2026-07-18T23:00:00.000Z'),
			id: 'v3',
		});
		expect(branched.ok).toBe(true);
		if (!branched.ok) return;

		const parsed = parseVersionedDocument(branched.content);
		expect(parsed.ok).toBe(true);
		if (!parsed.ok) return;
		const active = parsed.document.versions.find((v) => v.active)!;
		expect(active.meta.id).toBe('v3');
		expect(active.meta.parentId).toBe('v1');
		expect(parsed.document.document.latestVersionId).toBe('v3');
	});

	it('switches active version by promoting a snapshot to the plain body', () => {
		const init = createVersionFromActive('one', {
			now: FIXED,
			id: 'v2',
			parentId: 'v1',
		});
		if (!init.ok) throw new Error(init.error);

		const switched = switchActiveVersion(init.content, 'v1');
		expect(switched.ok).toBe(true);
		if (!switched.ok) return;

		expect(switched.content).not.toContain('> [!draftline-active]');
		const parsed = parseVersionedDocument(switched.content);
		expect(parsed.ok).toBe(true);
		if (!parsed.ok) return;
		const active = parsed.document.versions.find((v) => v.active)!;
		expect(active.meta.id).toBe('v1');
		expect(active.body).toBe('one');
		expect(parsed.document.versions.every((v) => v.body === 'one')).toBe(true);

		// Active body is at the end as plain Markdown.
		const marker = '%% draftline-version {"id":"v1"';
		const markerIdx = switched.content.indexOf(marker);
		expect(markerIdx).toBeGreaterThan(-1);
		const afterMarker = switched.content.slice(
			switched.content.indexOf('\n', markerIdx) + 1,
		);
		expect(afterMarker.trimStart().startsWith('one')).toBe(true);
		expect(afterMarker).not.toContain('> [!draftline-version]');
	});

	it('preserves code fences and nested callouts inside a version body', () => {
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
		const active = parsed.document.versions.find((v) => v.active)!;
		expect(active.body).toBe(body);
	});

	it('rejects malformed markers without rewriting', () => {
		const bad = `%% draftline-document {"schema":2,"latestVersionId":"v1"} %%\n\nnot-a-marker\n`;
		const parsed = parseVersionedDocument(bad);
		expect(parsed.ok).toBe(false);
		const result = createVersionFromActive(bad);
		// Document marker present but malformed — fail closed rather than wrap again.
		expect(result.ok).toBe(false);
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
		const active = parsed.document.versions.find((v) => v.active)!;
		expect(active.body).toBe('Hello');
	});
});
