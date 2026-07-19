import { MarkdownView } from 'obsidian';
import type DraftlinePlugin from '../main';
import { isDraftlineEnabled } from '../settings-model';

function withActiveMarkdownFile(
	plugin: DraftlinePlugin,
	checking: boolean,
	run: (file: NonNullable<MarkdownView['file']>) => void,
): boolean {
	if (!isDraftlineEnabled(plugin.settings)) return false;
	const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (!view?.file) return false;
	if (!checking) {
		run(view.file);
	}
	return true;
}

export function registerCommands(plugin: DraftlinePlugin): void {
	plugin.addCommand({
		id: 'create-version',
		name: 'Create version',
		checkCallback: (checking) =>
			withActiveMarkdownFile(plugin, checking, (file) => {
				void plugin.service.createVersion(file).then(() => {
					plugin.refreshEditorState();
				});
			}),
	});

	plugin.addCommand({
		id: 'open-version-history',
		name: 'Open version history',
		checkCallback: (checking) =>
			withActiveMarkdownFile(plugin, checking, () => {
				void plugin.popover.openForActiveView();
			}),
	});

	plugin.addCommand({
		id: 'select-next-version',
		name: 'Select next version',
		checkCallback: (checking) =>
			withActiveMarkdownFile(plugin, checking, (file) => {
				void plugin.service
					.selectAdjacentVersion(file, -1)
					.then(() => plugin.refreshEditorState());
			}),
	});

	plugin.addCommand({
		id: 'select-previous-version',
		name: 'Select previous version',
		checkCallback: (checking) =>
			withActiveMarkdownFile(plugin, checking, (file) => {
				void plugin.service
					.selectAdjacentVersion(file, 1)
					.then(() => plugin.refreshEditorState());
			}),
	});

	plugin.addCommand({
		id: 'toggle-comparison',
		name: 'Toggle comparison',
		checkCallback: (checking) =>
			withActiveMarkdownFile(plugin, checking, (file) => {
				plugin.comparison.toggle(file.path);
				plugin.refreshEditorState();
			}),
	});
}
