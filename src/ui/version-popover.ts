import { MarkdownView, setIcon } from 'obsidian';
import type DraftlinePlugin from '../main';
import type { VersionSnapshot, VersionedDocument } from '../version-format';

function formatCreatedAt(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) {
		return iso;
	}
	return date.toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
}

export class VersionPopover {
	private popoverEl: HTMLElement | null = null;
	private anchorEl: HTMLElement | null = null;
	private dismissRegistered = false;

	constructor(private readonly plugin: DraftlinePlugin) {
		this.plugin.registerDomEvent(activeDocument, 'mousedown', (event) => {
			this.handleDismiss(event);
		});
		this.dismissRegistered = true;
	}

	async openForActiveView(anchor?: HTMLElement): Promise<void> {
		const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
		const file = view?.file;
		if (!view || !file) {
			return;
		}

		this.close();
		this.anchorEl = anchor ?? null;

		let document: VersionedDocument | null = null;
		const parsed = await this.plugin.service.parseFile(file);
		if (parsed.ok) {
			document = parsed.document;
		}

		const popover = createDiv({ cls: 'draftline-popover' });
		popover.setAttribute('role', 'dialog');
		popover.setAttribute('aria-label', 'Version history');

		const createBtn = popover.createEl('button', {
			cls: 'draftline-popover__create mod-cta',
			text: 'Create version',
		});
		createBtn.prepend(this.icon('plus'));
		createBtn.addEventListener('click', () => {
			void (async () => {
				await this.plugin.service.createVersion(file);
				this.close();
				await this.openForActiveView(anchor);
				this.plugin.refreshEditorState();
			})();
		});

		const list = popover.createDiv({ cls: 'draftline-popover__list' });

		if (!document) {
			list.createDiv({
				cls: 'draftline-popover__empty',
				text: 'No versions yet. Create Version 1 from the current note body.',
			});
		} else {
			const versions = this.plugin.service.listVersions(document);
			const comparison = this.plugin.comparison.get(file.path);

			for (const version of versions) {
				this.renderVersionRow(list, file.path, version, document, comparison.enabled);
			}

			const compareSection = popover.createDiv({
				cls: 'draftline-popover__compare',
			});
			const toggleRow = compareSection.createDiv({
				cls: 'draftline-popover__compare-row',
			});
			const toggleBtn = toggleRow.createEl('button', {
				cls: 'draftline-popover__compare-toggle',
				text: comparison.enabled ? 'Hide changes' : 'Show changes',
			});
			toggleBtn.prepend(this.icon(comparison.enabled ? 'eye-off' : 'eye'));
			toggleBtn.addEventListener('click', () => {
				this.plugin.comparison.toggle(file.path);
				this.plugin.refreshEditorState();
				void this.openForActiveView(anchor);
			});

			if (comparison.enabled) {
				const select = compareSection.createEl('select', {
					cls: 'dropdown draftline-popover__baseline',
				});
				const active = versions.find((v) => v.active);
				const defaultBaseline = active?.meta.parentId ?? null;
				const baselineId = comparison.baselineVersionId ?? defaultBaseline;

				select.createEl('option', {
					text: 'Compare against parent',
					value: '',
				}).selected = baselineId === null || baselineId === defaultBaseline;

				for (const version of versions) {
					if (version.active) continue;
					const option = select.createEl('option', {
						text: `Version ${version.meta.number}`,
						value: version.meta.id,
					});
					if (version.meta.id === baselineId) {
						option.selected = true;
					}
				}

				select.addEventListener('change', () => {
					const value = select.value || null;
					this.plugin.comparison.setBaseline(file.path, value);
					this.plugin.refreshEditorState();
				});
			}
		}

		activeDocument.body.appendChild(popover);
		this.popoverEl = popover;
		this.position(popover, anchor, view);
		void this.dismissRegistered;
	}

	close(): void {
		if (this.popoverEl) {
			this.popoverEl.remove();
			this.popoverEl = null;
		}
		this.anchorEl = null;
	}

	private handleDismiss(event: MouseEvent): void {
		if (!this.popoverEl) return;
		const target = event.target as Node | null;
		if (!target) return;
		if (this.popoverEl.contains(target)) return;
		if (this.anchorEl && this.anchorEl.contains(target)) return;
		this.close();
	}

	private renderVersionRow(
		parent: HTMLElement,
		path: string,
		version: VersionSnapshot,
		document: VersionedDocument,
		_compareEnabled: boolean,
	): void {
		const row = parent.createEl('button', {
			cls: 'draftline-popover__version' + (version.active ? ' is-active' : ''),
		});

		const radio = row.createSpan({
			cls:
				'draftline-popover__radio' +
				(version.active ? ' is-checked' : ''),
		});
		setIcon(radio, version.active ? 'circle-dot' : 'circle');

		const text = row.createDiv({ cls: 'draftline-popover__version-text' });
		text.createDiv({
			cls: 'draftline-popover__version-title',
			text: `Version ${version.meta.number}`,
		});
		text.createDiv({
			cls: 'draftline-popover__version-date',
			text: `Created ${formatCreatedAt(version.meta.createdAt)}`,
		});

		if (version.meta.id === document.document.latestVersionId) {
			text.createSpan({
				cls: 'draftline-popover__badge',
				text: 'latest',
			});
		}

		row.addEventListener('click', () => {
			void (async () => {
				const activeFile = this.plugin.service.getActiveMarkdownFile();
				if (!activeFile) return;
				await this.plugin.service.selectVersion(activeFile, version.meta.id);
				if (
					this.plugin.settings.autoCompareOnSelect &&
					version.meta.parentId
				) {
					this.plugin.comparison.set(path, {
						enabled: true,
						baselineVersionId: version.meta.parentId,
					});
				}
				this.plugin.refreshEditorState();
				this.close();
				await this.openForActiveView();
			})();
		});
	}

	private position(
		popover: HTMLElement,
		anchor: HTMLElement | undefined,
		view: MarkdownView,
	): void {
		const rect = (anchor ?? view.containerEl).getBoundingClientRect();
		const top = rect.bottom + 6;
		const right = activeWindow.innerWidth - rect.right;
		popover.style.top = `${top}px`;
		popover.style.right = `${Math.max(8, right)}px`;
	}

	private icon(name: string): HTMLElement {
		const el = createSpan({ cls: 'draftline-popover__icon' });
		setIcon(el, name);
		return el;
	}
}
