import { MarkdownView } from 'obsidian';
import type DraftlinePlugin from '../main';
import { isDraftlineEnabled } from '../settings-model';

export interface ViewActionsController {
	setEnabled(enabled: boolean): void;
}

/**
 * Attach a history action button to each Markdown view header.
 * Re-runs on layout changes; skips views that already have the action.
 * When disabled, removes existing buttons and stops attaching new ones.
 */
export function registerViewActions(plugin: DraftlinePlugin): ViewActionsController {
	const attached = new Map<MarkdownView, HTMLElement>();
	let enabled = isDraftlineEnabled(plugin.settings);

	const attach = (view: MarkdownView) => {
		if (!enabled || attached.has(view)) return;
		const actionEl = view.addAction('history', 'Draftline versions', (event) => {
			event.preventDefault();
			// Dismiss ignores mousedown on the anchor so click can toggle.
			if (plugin.popover.isOpenFor(actionEl)) {
				plugin.popover.close();
				return;
			}
			void plugin.popover.openForActiveView(actionEl);
		});
		actionEl.addClass('draftline-view-action');
		attached.set(view, actionEl);
	};

	const detachAll = () => {
		for (const actionEl of attached.values()) {
			actionEl.remove();
		}
		attached.clear();
	};

	const pruneDetachedViews = () => {
		for (const view of Array.from(attached.keys())) {
			if (!view.containerEl.isConnected) {
				attached.get(view)?.remove();
				attached.delete(view);
			}
		}
	};

	const scan = () => {
		pruneDetachedViews();
		if (!enabled) return;
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

	return {
		setEnabled(next: boolean) {
			enabled = next;
			if (!enabled) {
				detachAll();
				return;
			}
			scan();
		},
	};
}
