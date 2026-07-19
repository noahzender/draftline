import type { ViewState } from 'obsidian';
import { isDraftlineDocument } from '../version-format';

interface MarkdownViewLike {
	data: string;
	leaf: {
		getViewState(): ViewState;
		setViewState(viewState: ViewState): Promise<unknown>;
	};
}

/**
 * Return the view state needed to show a Markdown file in Live Preview.
 * A null result means the view is already rich-text or in Reading View.
 */
export function getVersionedLivePreviewState(
	current: ViewState,
): ViewState | null {
	if (
		current.type !== 'markdown' ||
		current.state?.mode !== 'source' ||
		current.state.source !== true
	) {
		return null;
	}

	return {
		...current,
		state: {
			...current.state,
			source: false,
		},
	};
}

/**
 * Keep Draftline's storage format behind Obsidian's rich-text editor when a
 * versioned note is reopened. Source mode remains available if selected later.
 */
export async function ensureVersionedLivePreview(
	view: MarkdownViewLike,
): Promise<void> {
	if (!isDraftlineDocument(view.data)) {
		return;
	}

	const next = getVersionedLivePreviewState(view.leaf.getViewState());
	if (next) {
		await view.leaf.setViewState(next);
	}
}
