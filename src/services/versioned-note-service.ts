import { MarkdownView, Notice, TFile } from 'obsidian';
import type DraftlinePlugin from '../main';
import {
	createVersionFromActive,
	isDraftlineDocument,
	listVersionsNewestFirst,
	parseVersionedDocument,
	switchActiveVersion,
	validateDocument,
	type VersionSnapshot,
	type VersionedDocument,
} from '../version-format';

type TransformResult =
	| { ok: true; content: string; document: VersionedDocument }
	| { ok: false; error: string };

export class VersionedNoteService {
	constructor(private readonly plugin: DraftlinePlugin) {}

	getActiveMarkdownFile(): TFile | null {
		const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
		return view?.file ?? null;
	}

	async readFile(file: TFile): Promise<string> {
		// Prefer the open editor buffer so popover state matches what the user sees.
		const view = this.getActiveViewForFile(file);
		if (view?.editor) {
			return view.editor.getValue();
		}
		if (view && typeof view.data === 'string') {
			return view.data;
		}
		return this.plugin.app.vault.read(file);
	}

	async parseFile(
		file: TFile,
	): Promise<
		{ ok: true; document: VersionedDocument } | { ok: false; error: string }
	> {
		const content = await this.readFile(file);
		if (!isDraftlineDocument(content)) {
			return { ok: false, error: 'Note is not a Draftline document yet.' };
		}
		const parsed = parseVersionedDocument(content);
		if (!parsed.ok) {
			return parsed;
		}
		const validationError = validateDocument(parsed.document);
		if (validationError) {
			return { ok: false, error: validationError };
		}
		return { ok: true, document: parsed.document };
	}

	async createVersion(file: TFile): Promise<VersionedDocument | null> {
		const outcome = await this.applyTransform(file, (content) =>
			createVersionFromActive(content),
		);

		if (outcome.error || !outcome.document) {
			new Notice(
				`Draftline: ${outcome.error ?? 'Could not create version.'}`,
			);
			return null;
		}

		const activeNumber =
			outcome.document.versions.find((v) => v.active)?.meta.number ?? '';
		new Notice(`Draftline: created Version ${activeNumber}`);
		return outcome.document;
	}

	async selectVersion(
		file: TFile,
		versionId: string,
	): Promise<VersionedDocument | null> {
		const outcome = await this.applyTransform(file, (content) =>
			switchActiveVersion(content, versionId),
		);

		if (outcome.error || !outcome.document) {
			new Notice(
				`Draftline: ${outcome.error ?? 'Could not select version.'}`,
			);
			return null;
		}

		return outcome.document;
	}

	async selectAdjacentVersion(
		file: TFile,
		direction: 1 | -1,
	): Promise<VersionedDocument | null> {
		const parsed = await this.parseFile(file);
		if (!parsed.ok) {
			new Notice(`Draftline: ${parsed.error}`);
			return null;
		}
		const ordered = listVersionsNewestFirst(parsed.document);
		const activeIndex = ordered.findIndex((v) => v.active);
		if (activeIndex < 0) {
			new Notice('Draftline: no active version.');
			return null;
		}
		const next = ordered[activeIndex + direction];
		if (!next) {
			return parsed.document;
		}
		return this.selectVersion(file, next.meta.id);
	}

	listVersions(doc: VersionedDocument): VersionSnapshot[] {
		return listVersionsNewestFirst(doc);
	}

	private getActiveViewForFile(file: TFile): MarkdownView | null {
		const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
		if (view?.file?.path === file.path) {
			return view;
		}
		return null;
	}

	/**
	 * Transform the note content. Prefer the active editor buffer so unsaved
	 * edits are included and Live Preview is not disrupted by a disk rewrite.
	 * Fall back to Vault.process for files that are not open in the active view.
	 */
	private async applyTransform(
		file: TFile,
		transform: (content: string) => TransformResult,
	): Promise<{ document: VersionedDocument | null; error: string | null }> {
		const view = this.getActiveViewForFile(file);
		if (view?.editor) {
			const result = transform(view.editor.getValue());
			if (!result.ok) {
				return { document: null, error: result.error };
			}
			view.editor.setValue(result.content);
			return { document: result.document, error: null };
		}

		const outcome: {
			document: VersionedDocument | null;
			error: string | null;
		} = { document: null, error: null };

		await this.plugin.app.vault.process(file, (content) => {
			const result = transform(content);
			if (!result.ok) {
				outcome.error = result.error;
				return content;
			}
			outcome.document = result.document;
			return result.content;
		});

		return outcome;
	}
}
