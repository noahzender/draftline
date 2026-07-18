import {
	Decoration,
	type DecorationSet,
	EditorView,
	ViewPlugin,
	type ViewUpdate,
} from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { editorLivePreviewField } from 'obsidian';
import {
	ACTIVE_CALLOUT,
	DOCUMENT_MARKER_PREFIX,
	INACTIVE_CALLOUT,
	VERSION_MARKER_PREFIX,
} from '../version-format';

const hideMark = Decoration.replace({});
const hideLine = Decoration.line({ class: 'draftline-cm-hide-line' });

function buildDecorations(view: EditorView): DecorationSet {
	if (!view.state.field(editorLivePreviewField, false)) {
		return Decoration.none;
	}

	const builder = new RangeSetBuilder<Decoration>();
	const doc = view.state.doc;
	let inInactive = false;

	for (let i = 1; i <= doc.lines; i++) {
		const line = doc.line(i);
		const text = line.text;
		const trimmed = text.trim();

		if (
			trimmed.startsWith(DOCUMENT_MARKER_PREFIX) ||
			trimmed.replace(/^>\s?/, '').startsWith(VERSION_MARKER_PREFIX)
		) {
			builder.add(line.from, line.to, hideMark);
			builder.add(line.from, line.from, hideLine);
			continue;
		}

		if (
			trimmed === `> [!${INACTIVE_CALLOUT}]` ||
			trimmed === `>[!${INACTIVE_CALLOUT}]`
		) {
			inInactive = true;
			builder.add(line.from, line.to, hideMark);
			builder.add(line.from, line.from, hideLine);
			continue;
		}

		if (
			trimmed === `> [!${ACTIVE_CALLOUT}]` ||
			trimmed === `>[!${ACTIVE_CALLOUT}]`
		) {
			inInactive = false;
			builder.add(line.from, line.to, hideMark);
			builder.add(line.from, line.from, hideLine);
			continue;
		}

		if (inInactive) {
			if (trimmed === '' && i < doc.lines) {
				const next = doc.line(i + 1).text.trim();
				if (
					next === `> [!${ACTIVE_CALLOUT}]` ||
					next === `> [!${INACTIVE_CALLOUT}]` ||
					next === `>[!${ACTIVE_CALLOUT}]` ||
					next === `>[!${INACTIVE_CALLOUT}]`
				) {
					inInactive = false;
					continue;
				}
			}
			if (text.startsWith('>') || trimmed === '') {
				builder.add(line.from, line.to, hideMark);
				builder.add(line.from, line.from, hideLine);
			} else {
				inInactive = false;
			}
		}
	}

	return builder.finish();
}

export const hideInactiveExtension = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildDecorations(view);
		}

		update(update: ViewUpdate) {
			if (
				update.docChanged ||
				update.viewportChanged ||
				update.startState.field(editorLivePreviewField, false) !==
					update.state.field(editorLivePreviewField, false)
			) {
				this.decorations = buildDecorations(update.view);
			}
		}
	},
	{
		decorations: (value) => value.decorations,
	},
);
