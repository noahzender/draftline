import { RangeSetBuilder } from '@codemirror/state';
import {
	Decoration,
	type DecorationSet,
	EditorView,
	ViewPlugin,
	type ViewUpdate,
	WidgetType,
} from '@codemirror/view';
import { editorLivePreviewField } from 'obsidian';
import {
	bodyOffsetToDocOffset,
	mapActiveOffsetsThroughLines,
} from '../diff/diff-model';
import { draftlineStateField } from './draftline-state';
import { findActiveBodyStart } from './find-active-body-start';

class DeletionWidget extends WidgetType {
	constructor(private readonly text: string) {
		super();
	}

	eq(other: DeletionWidget): boolean {
		return this.text === other.text;
	}

	toDOM(): HTMLElement {
		return createSpan({
			cls: 'draftline-diff-del',
			text: this.text,
		});
	}

	ignoreEvent(): boolean {
		return true;
	}
}

const addMark = Decoration.mark({ class: 'draftline-diff-add' });

function buildDiffDecorations(view: EditorView): DecorationSet {
	if (!view.state.field(editorLivePreviewField, false)) {
		return Decoration.none;
	}

	const state = view.state.field(draftlineStateField);
	if (!state.compareEnabled || !state.document || !state.diff) {
		return Decoration.none;
	}

	const active = state.document.versions.find((v) => v.active);
	if (!active) return Decoration.none;

	const docText = view.state.doc.toString();
	const bodyStart = findActiveBodyStart(docText, state.document.newline);
	if (bodyStart === null) return Decoration.none;

	const ranges = mapActiveOffsetsThroughLines(
		active.body,
		bodyStart,
		docText,
		state.document.newline,
	);

	const builder = new RangeSetBuilder<Decoration>();
	const additions: Array<{ from: number; to: number }> = [];
	const deletions: Array<{ at: number; text: string }> = [];

	for (const part of state.diff.parts) {
		if (part.kind === 'add' && part.activeFrom !== null && part.activeTo !== null) {
			const from = bodyOffsetToDocOffset(ranges, part.activeFrom);
			const to = bodyOffsetToDocOffset(ranges, part.activeTo);
			if (from !== null && to !== null && to > from) {
				additions.push({ from, to });
			}
		} else if (part.kind === 'remove') {
			let anchorBody = 0;
			const idx = state.diff.parts.indexOf(part);
			for (let i = idx + 1; i < state.diff.parts.length; i++) {
				const next = state.diff.parts[i]!;
				if (next.activeFrom !== null) {
					anchorBody = next.activeFrom;
					break;
				}
			}
			if (
				state.diff.parts.slice(idx + 1).every((p) => p.activeFrom === null)
			) {
				anchorBody = active.body.length;
			}
			const at = bodyOffsetToDocOffset(ranges, anchorBody);
			if (at !== null && part.value.length > 0) {
				deletions.push({ at, text: part.value });
			}
		}
	}

	const widgets = deletions
		.map((d) => ({
			from: d.at,
			to: d.at,
			value: Decoration.widget({
				widget: new DeletionWidget(d.text),
				side: -1,
			}),
		}))
		.concat(
			additions.map((a) => ({
				from: a.from,
				to: a.to,
				value: addMark,
			})),
		)
		.sort((a, b) => a.from - b.from || a.to - b.to);

	for (const item of widgets) {
		builder.add(item.from, item.to, item.value);
	}

	return builder.finish();
}

export const diffDecorationsExtension = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildDiffDecorations(view);
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
				this.decorations = buildDiffDecorations(update.view);
			}
		}
	},
	{
		decorations: (value) => value.decorations,
	},
);
