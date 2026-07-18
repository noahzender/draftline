import { StateEffect, StateField } from '@codemirror/state';
import type { DiffModel } from '../diff/diff-model';
import type { VersionedDocument } from '../version-format';

export interface DraftlineEditorState {
	path: string | null;
	document: VersionedDocument | null;
	compareEnabled: boolean;
	baselineVersionId: string | null;
	diff: DiffModel | null;
	error: string | null;
}

export const DEFAULT_EDITOR_STATE: DraftlineEditorState = {
	path: null,
	document: null,
	compareEnabled: false,
	baselineVersionId: null,
	diff: null,
	error: null,
};

export const setDraftlineState = StateEffect.define<DraftlineEditorState>();

export const draftlineStateField = StateField.define<DraftlineEditorState>({
	create() {
		return DEFAULT_EDITOR_STATE;
	},
	update(value, tr) {
		for (const effect of tr.effects) {
			if (effect.is(setDraftlineState)) {
				return effect.value;
			}
		}
		return value;
	},
});
