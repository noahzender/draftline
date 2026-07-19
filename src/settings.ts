import {
	App,
	PluginSettingTab,
	Setting,
	type SettingDefinitionItem,
} from 'obsidian';
import type DraftlinePlugin from './main';
import {
	type DraftlineSettings,
} from './settings-model';

export {
	DEFAULT_SETTINGS,
	isDraftlineEnabled,
	mergeSettings,
	type DraftlineSettings,
} from './settings-model';

export class DraftlineSettingTab extends PluginSettingTab {
	plugin: DraftlinePlugin;

	constructor(app: App, plugin: DraftlinePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: 'General',
				items: [
					{
						name: 'Enable Draftline',
						desc: 'When disabled, Draftline commands, version history, and editor decorations are turned off. Notes are left unchanged.',
						control: {
							type: 'toggle',
							key: 'enabled',
						},
					},
				],
			},
			{
				name: 'Comparison',
				items: [
					{
						name: 'Auto-compare on version select',
						desc: 'When enabled, selecting a version that has a parent turns on comparison against that parent. Only applies while Draftline is enabled.',
						control: {
							type: 'toggle',
							key: 'autoCompareOnSelect',
						},
					},
				],
			},
		];
	}

	getControlValue(key: string): unknown {
		return this.plugin.settings[key as keyof DraftlineSettings];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		const typedKey = key as keyof DraftlineSettings;
		if (typedKey === 'enabled' && typeof value === 'boolean') {
			this.plugin.settings.enabled = value;
			await this.plugin.saveSettings();
			this.plugin.applyEnabledState();
			return;
		}
		if (typedKey === 'autoCompareOnSelect' && typeof value === 'boolean') {
			this.plugin.settings.autoCompareOnSelect = value;
			await this.plugin.saveSettings();
		}
	}

	/** Fallback for Obsidian < 1.13, which does not call getSettingDefinitions(). */
	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Enable Draftline')
			.setDesc(
				'When disabled, Draftline commands, version history, and editor decorations are turned off. Notes are left unchanged.',
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enabled)
					.onChange(async (value) => {
						this.plugin.settings.enabled = value;
						await this.plugin.saveSettings();
						this.plugin.applyEnabledState();
					}),
			);

		new Setting(containerEl)
			.setName('Auto-compare on version select')
			.setDesc(
				'When enabled, selecting a version that has a parent turns on comparison against that parent. Only applies while Draftline is enabled.',
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoCompareOnSelect)
					.onChange(async (value) => {
						this.plugin.settings.autoCompareOnSelect = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
