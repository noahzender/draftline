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

export class VersionedNoteService {
	constructor(private readonly plugin: DraftlinePlugin) {}

	getActiveMarkdownFile(): TFile | null {
		const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
		return view?.file ?? null;
	}

	async readFile(file: TFile): Promise<string> {
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
		const content = await this.readFile(file);
		const result = createVersionFromActive(content);
		if (!result.ok) {
			new Notice(`Draftline: ${result.error}`);
			return null;
		}
		await this.plugin.app.vault.process(file, () => result.content);
		new Notice(
			`Draftline: created Version ${result.document.versions.find((v) => v.active)?.meta.number ?? ''}`,
		);
		return result.document;
	}

	async selectVersion(file: TFile, versionId: string): Promise<VersionedDocument | null> {
		const content = await this.readFile(file);
		const result = switchActiveVersion(content, versionId);
		if (!result.ok) {
			new Notice(`Draftline: ${result.error}`);
			return null;
		}
		await this.plugin.app.vault.process(file, () => result.content);
		return result.document;
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
}
