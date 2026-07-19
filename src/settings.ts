import {
	App,
	PluginSettingTab,
	Setting,
	type SettingDefinitionItem,
} from 'obsidian';
import type DraftlinePlugin from './main';

export interface DraftlineSettings {
	/** When true, comparison mode starts enabled after selecting a version with a parent. */
	autoCompareOnSelect: boolean;
}

export const DEFAULT_SETTINGS: DraftlineSettings = {
	autoCompareOnSelect: false,
};

export class DraftlineSettingTab extends PluginSettingTab {
	plugin: DraftlinePlugin;

	constructor(app: App, plugin: DraftlinePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: 'Comparison',
				items: [
					{
						name: 'Auto-compare on version select',
						desc: 'When enabled, selecting a version that has a parent turns on comparison against that parent.',
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
			.setName('Auto-compare on version select')
			.setDesc(
				'When enabled, selecting a version that has a parent turns on comparison against that parent.',
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
