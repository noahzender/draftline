import { describe, expect, it } from 'vitest';
import {
	DEFAULT_SETTINGS,
	mergeSettings,
} from '../../src/settings-model';

describe('DEFAULT_SETTINGS', () => {
	it('enables Draftline by default', () => {
		expect(DEFAULT_SETTINGS.enabled).toBe(true);
	});

	it('keeps auto-compare off by default', () => {
		expect(DEFAULT_SETTINGS.autoCompareOnSelect).toBe(false);
	});
});

describe('mergeSettings', () => {
	it('returns defaults when nothing is persisted', () => {
		expect(mergeSettings()).toEqual(DEFAULT_SETTINGS);
		expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS);
		expect(mergeSettings({})).toEqual(DEFAULT_SETTINGS);
	});

	it('preserves an explicit false master toggle over the default on', () => {
		expect(
			mergeSettings({
				enabled: false,
			}),
		).toEqual({
			enabled: false,
			autoCompareOnSelect: false,
		});
	});

	it('merges auto-compare independently of the master toggle', () => {
		expect(
			mergeSettings({
				autoCompareOnSelect: true,
			}),
		).toEqual({
			enabled: true,
			autoCompareOnSelect: true,
		});
	});
});
