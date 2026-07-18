import { MarkdownView } from 'obsidian';
import type DraftlinePlugin from '../main';

/**
 * Attach a history action button to each Markdown view header.
 * Re-runs on layout changes; skips views that already have the action.
 */
export function registerViewActions(plugin: DraftlinePlugin): void {
	const attached = new WeakSet<MarkdownView>();

	const attach = (view: MarkdownView) => {
		if (attached.has(view)) return;
		const actionEl = view.addAction('history', 'Draftline versions', (event) => {
			event.preventDefault();
			void plugin.popover.openForActiveView(actionEl);
		});
		actionEl.addClass('draftline-view-action');
		attached.add(view);
	};

	const scan = () => {
		plugin.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view instanceof MarkdownView) {
				attach(leaf.view);
			}
		});
	};

	plugin.app.workspace.onLayoutReady(scan);
	plugin.registerEvent(plugin.app.workspace.on('layout-change', scan));
	plugin.registerEvent(plugin.app.workspace.on('active-leaf-change', scan));
	scan();
}
