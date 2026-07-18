/**
 * Ephemeral per-file comparison UI state (not persisted in the note).
 */
export interface FileComparisonState {
	enabled: boolean;
	/** Baseline version id to compare against. Null means use active.parentId. */
	baselineVersionId: string | null;
}

export class ComparisonStateStore {
	private readonly byPath = new Map<string, FileComparisonState>();

	get(path: string): FileComparisonState {
		return (
			this.byPath.get(path) ?? {
				enabled: false,
				baselineVersionId: null,
			}
		);
	}

	set(path: string, state: FileComparisonState): void {
		this.byPath.set(path, state);
	}

	toggle(path: string): FileComparisonState {
		const current = this.get(path);
		const next = { ...current, enabled: !current.enabled };
		this.set(path, next);
		return next;
	}

	setBaseline(path: string, baselineVersionId: string | null): void {
		const current = this.get(path);
		this.set(path, { ...current, baselineVersionId });
	}

	clear(path: string): void {
		this.byPath.delete(path);
	}
}
