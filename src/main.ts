import { MarkdownView, Plugin } from 'obsidian';
import { EditorView } from '@codemirror/view';
import { registerCommands } from './commands/register-commands';
import { buildDiffModel } from './diff/diff-model';
import { createDraftlineExtensions } from './editor/extensions';
import {
	DEFAULT_EDITOR_STATE,
	setDraftlineState,
	type DraftlineEditorState,
} from './editor/draftline-state';
import { VersionedNoteService } from './services/versioned-note-service';
import {
	DEFAULT_SETTINGS,
	DraftlineSettingTab,
	type DraftlineSettings,
} from './settings';
import { ComparisonStateStore } from './state/comparison-state';
import { VersionPopover } from './ui/version-popover';
import { registerViewActions } from './ui/view-actions';
import {
	isDraftlineDocument,
	parseVersionedDocument,
	validateDocument,
} from './version-format';

export default class DraftlinePlugin extends Plugin {
	settings: DraftlineSettings = DEFAULT_SETTINGS;
	service!: VersionedNoteService;
	comparison = new ComparisonStateStore();
	popover!: VersionPopover;

	private refreshTimer: number | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.service = new VersionedNoteService(this);
		this.popover = new VersionPopover(this);

		this.registerEditorExtension(createDraftlineExtensions());
		registerCommands(this);
		registerViewActions(this);
		this.addSettingTab(new DraftlineSettingTab(this.app, this));

		this.registerEvent(
			this.app.workspace.on('file-open', () => {
				this.refreshEditorState();
			}),
		);
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => {
				this.refreshEditorState();
			}),
		);
		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				const active = this.service.getActiveMarkdownFile();
				if (active && file.path === active.path) {
					this.scheduleRefresh();
				}
			}),
		);

		this.app.workspace.onLayoutReady(() => {
			this.refreshEditorState();
		});
	}

	onunload(): void {
		this.popover.close();
		if (this.refreshTimer !== null) {
			window.clearTimeout(this.refreshTimer);
			this.refreshTimer = null;
		}
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<DraftlineSettings>,
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	scheduleRefresh(): void {
		if (this.refreshTimer !== null) {
			window.clearTimeout(this.refreshTimer);
		}
		this.refreshTimer = window.setTimeout(() => {
			this.refreshTimer = null;
			this.refreshEditorState();
		}, 120);
	}

	refreshEditorState(): void {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		const file = view?.file;
		const cm = this.getCodeMirror(view);
		if (!view || !file || !cm) {
			return;
		}

		void this.buildStateForFile(file.path, view).then((state) => {
			cm.dispatch({
				effects: setDraftlineState.of(state),
			});
		});
	}

	private async buildStateForFile(
		path: string,
		view: MarkdownView,
	): Promise<DraftlineEditorState> {
		const content = view.data;
		if (!isDraftlineDocument(content)) {
			return {
				...DEFAULT_EDITOR_STATE,
				path,
			};
		}

		const parsed = parseVersionedDocument(content);
		if (!parsed.ok) {
			return {
				...DEFAULT_EDITOR_STATE,
				path,
				error: parsed.error,
			};
		}

		const validationError = validateDocument(parsed.document);
		if (validationError) {
			return {
				...DEFAULT_EDITOR_STATE,
				path,
				error: validationError,
			};
		}

		const comparison = this.comparison.get(path);
		const active = parsed.document.versions.find((v) => v.active) ?? null;
		let baselineVersionId = comparison.baselineVersionId;
		if (!baselineVersionId && active?.meta.parentId) {
			baselineVersionId = active.meta.parentId;
		}

		let diff = null;
		if (comparison.enabled && active && baselineVersionId) {
			const baseline = parsed.document.versions.find(
				(v) => v.meta.id === baselineVersionId,
			);
			if (baseline) {
				diff = buildDiffModel(baseline.body, active.body);
			}
		}

		return {
			path,
			document: parsed.document,
			compareEnabled: comparison.enabled,
			baselineVersionId,
			diff,
			error: null,
		};
	}

	private getCodeMirror(view: MarkdownView | null): EditorView | null {
		if (!view) return null;
		const fromDom = EditorView.findFromDOM(view.contentEl);
		if (fromDom) return fromDom;
		// Fallback used by some Obsidian builds.
		const editor = view.editor as unknown as {
			cm?: EditorView;
			cmEditor?: EditorView;
		};
		return editor.cm ?? editor.cmEditor ?? null;
	}
}
