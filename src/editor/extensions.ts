import type { Extension } from '@codemirror/state';
import { diffDecorationsExtension } from './diff-decorations';
import { draftlineStateField } from './draftline-state';
import { hideInactiveExtension } from './hide-inactive';

export function createDraftlineExtensions(): Extension[] {
	return [draftlineStateField, hideInactiveExtension, diffDecorationsExtension];
}
