import { MarkdownView } from 'obsidian';
import type DraftlinePlugin from '../main';

export function registerCommands(plugin: DraftlinePlugin): void {
	plugin.addCommand({
		id: 'create-version',
		name: 'Create version',
		checkCallback: (checking) => {
			const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
			if (!view?.file) return false;
			if (!checking) {
				void plugin.service.createVersion(view.file).then(() => {
					plugin.refreshEditorState();
				});
			}
			return true;
		},
	});

	plugin.addCommand({
		id: 'open-version-history',
		name: 'Open version history',
		checkCallback: (checking) => {
			const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
			if (!view?.file) return false;
			if (!checking) {
				void plugin.popover.openForActiveView();
			}
			return true;
		},
	});

	plugin.addCommand({
		id: 'select-next-version',
		name: 'Select next version',
		checkCallback: (checking) => {
			const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
			if (!view?.file) return false;
			if (!checking) {
				void plugin.service
					.selectAdjacentVersion(view.file, -1)
					.then(() => plugin.refreshEditorState());
			}
			return true;
		},
	});

	plugin.addCommand({
		id: 'select-previous-version',
		name: 'Select previous version',
		checkCallback: (checking) => {
			const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
			if (!view?.file) return false;
			if (!checking) {
				void plugin.service
					.selectAdjacentVersion(view.file, 1)
					.then(() => plugin.refreshEditorState());
			}
			return true;
		},
	});

	plugin.addCommand({
		id: 'toggle-comparison',
		name: 'Toggle comparison',
		checkCallback: (checking) => {
			const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
			if (!view?.file) return false;
			if (!checking) {
				plugin.comparison.toggle(view.file.path);
				plugin.refreshEditorState();
			}
			return true;
		},
	});
}
