import { describe, expect, it } from 'vitest';
import {
	ensureVersionedLivePreview,
	getVersionedLivePreviewState,
} from '../../src/editor/ensure-versioned-live-preview';

describe('getVersionedLivePreviewState', () => {
	it('changes Markdown source mode to Live Preview without mutating the current state', () => {
		const current = {
			type: 'markdown',
			state: {
				file: 'Draft.md',
				mode: 'source',
				source: true,
			},
		};

		const next = getVersionedLivePreviewState(current);

		expect(next).toEqual({
			type: 'markdown',
			state: {
				file: 'Draft.md',
				mode: 'source',
				source: false,
			},
		});
		expect(next).not.toBe(current);
		expect(next?.state).not.toBe(current.state);
		expect(current.state.source).toBe(true);
	});

	it('leaves Live Preview and Reading View unchanged', () => {
		expect(
			getVersionedLivePreviewState({
				type: 'markdown',
				state: { mode: 'source', source: false },
			}),
		).toBeNull();
		expect(
			getVersionedLivePreviewState({
				type: 'markdown',
				state: { mode: 'preview', source: true },
			}),
		).toBeNull();
	});
});

describe('ensureVersionedLivePreview', () => {
	it('restores Live Preview when a Draftline note opens in source mode', async () => {
		const applied: unknown[] = [];
		const view = {
			data: '%% draftline-document {"schema":2,"latestVersionId":"v1"} %%',
			leaf: {
				getViewState: () => ({
					type: 'markdown',
					state: {
						file: 'Draft.md',
						mode: 'source',
						source: true,
					},
				}),
				setViewState: async (state: unknown) => {
					applied.push(state);
				},
			},
		};

		await ensureVersionedLivePreview(view);

		expect(applied).toEqual([
			{
				type: 'markdown',
				state: {
					file: 'Draft.md',
					mode: 'source',
					source: false,
				},
			},
		]);
	});

	it('does not change the view mode for an ordinary Markdown note', async () => {
		let applied = false;
		const view = {
			data: '# Ordinary note',
			leaf: {
				getViewState: () => ({
					type: 'markdown',
					state: { mode: 'source', source: true },
				}),
				setViewState: async () => {
					applied = true;
				},
			},
		};

		await ensureVersionedLivePreview(view);

		expect(applied).toBe(false);
	});
});
