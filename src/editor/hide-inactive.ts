import {
	Decoration,
	type DecorationSet,
	EditorView,
	ViewPlugin,
	type ViewUpdate,
} from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { editorLivePreviewField } from 'obsidian';
import { draftlineStateField } from './draftline-state';
import { buildHideDecorationSpecs } from './hide-decoration-specs';
import { collectHiddenLineRanges } from './hide-inactive-ranges';

const hideMark = Decoration.replace({});
const hideLine = Decoration.line({ class: 'draftline-cm-hide-line' });

function buildDecorations(view: EditorView): DecorationSet {
	if (!view.state.field(editorLivePreviewField, false)) {
		return Decoration.none;
	}

	// Master toggle clears path; skip hiding when Draftline is inactive for this view.
	const state = view.state.field(draftlineStateField);
	if (!state.path) {
		return Decoration.none;
	}

	const builder = new RangeSetBuilder<Decoration>();
	const doc = view.state.doc;
	const lines: string[] = [];
	for (let i = 1; i <= doc.lines; i++) {
		lines.push(doc.line(i).text);
	}

	const ranges = collectHiddenLineRanges(lines);
	const specs = buildHideDecorationSpecs(lines, ranges);

	for (const spec of specs) {
		const line = doc.line(spec.line + 1);
		// Line class first so empty lines still collapse; replace only when
		// the range is non-empty (CM rejects zero-length replace decorations).
		builder.add(line.from, line.from, hideLine);
		if (spec.replace) {
			builder.add(line.from, line.to, hideMark);
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
				update.startState.field(draftlineStateField) !==
					update.state.field(draftlineStateField) ||
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
