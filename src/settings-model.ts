export interface DraftlineSettings {
	/** Master switch for all Draftline editor, command, and UI behavior. */
	enabled: boolean;
	/** When true, comparison mode starts enabled after selecting a version with a parent. */
	autoCompareOnSelect: boolean;
}

export const DEFAULT_SETTINGS: DraftlineSettings = {
	enabled: true,
	autoCompareOnSelect: false,
};

/** Merge persisted partial settings over defaults. */
export function mergeSettings(
	partial?: Partial<DraftlineSettings> | null,
): DraftlineSettings {
	return Object.assign({}, DEFAULT_SETTINGS, partial ?? {});
}

/** Whether Draftline runtime features should be active. */
export function isDraftlineEnabled(settings: DraftlineSettings): boolean {
	return settings.enabled;
}
