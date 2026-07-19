import { describe, expect, it } from 'vitest';
import { formatCreatedAt } from '../../src/utils/format-created-at';

describe('formatCreatedAt', () => {
	const now = new Date(2026, 6, 18, 16, 30); // Jul 18, 2026 4:30 PM local

	it('formats a same-day timestamp as "today at <time>"', () => {
		const iso = new Date(2026, 6, 18, 14, 37).toISOString();
		const result = formatCreatedAt(iso, now);
		expect(result.startsWith('today at ')).toBe(true);
		expect(result).toContain('37');
	});

	it('formats a same-year timestamp without the year', () => {
		const iso = new Date(2026, 6, 4, 9, 0).toISOString();
		const result = formatCreatedAt(iso, now);
		expect(result).toContain('4');
		expect(result).not.toContain('2026');
	});

	it('formats a previous-year timestamp with the year', () => {
		const iso = new Date(2025, 11, 25, 9, 0).toISOString();
		expect(formatCreatedAt(iso, now)).toContain('2025');
	});

	it('returns the raw string for an invalid date', () => {
		expect(formatCreatedAt('not-a-date', now)).toBe('not-a-date');
	});
});
