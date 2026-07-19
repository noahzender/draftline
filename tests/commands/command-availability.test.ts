import { describe, expect, it } from 'vitest';
import {
	DEFAULT_SETTINGS,
	isDraftlineEnabled,
	mergeSettings,
} from '../../src/settings-model';

describe('isDraftlineEnabled', () => {
	it('is true for the default settings', () => {
		expect(isDraftlineEnabled(DEFAULT_SETTINGS)).toBe(true);
	});

	it('is false when the master toggle is persisted off', () => {
		expect(
			isDraftlineEnabled(mergeSettings({ enabled: false })),
		).toBe(false);
	});

	it('stays true when only auto-compare changes', () => {
		expect(
			isDraftlineEnabled(
				mergeSettings({ autoCompareOnSelect: true }),
			),
		).toBe(true);
	});
});
