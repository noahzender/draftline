import { MarkdownView, setIcon, ToggleComponent } from 'obsidian';
import type DraftlinePlugin from '../main';
import { isDraftlineEnabled } from '../settings-model';
import type { VersionSnapshot, VersionedDocument } from '../version-format';
import { formatCreatedAt } from '../utils/format-created-at';

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

	/** True when the popover is open and anchored to the given element. */
	isOpenFor(anchor: HTMLElement): boolean {
		return this.popoverEl !== null && this.anchorEl === anchor;
	}

	async openForActiveView(
		anchor?: HTMLElement,
		preloaded?: VersionedDocument | null,
	): Promise<void> {
		if (!isDraftlineEnabled(this.plugin.settings)) {
			this.close();
			return;
		}

		const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
		const file = view?.file;
		if (!view || !file) {
			return;
		}

		const nextAnchor = anchor ?? this.anchorEl ?? undefined;
		this.close();
		this.anchorEl = nextAnchor ?? null;

		let document: VersionedDocument | null = preloaded ?? null;
		if (!document) {
			const parsed = await this.plugin.service.parseFile(file);
			if (parsed.ok) {
				document = parsed.document;
			}
		}

		const popover = createDiv({ cls: 'draftline-popover' });
		popover.setAttribute('role', 'dialog');
		popover.setAttribute('aria-label', 'Version history');

		const createBtn = popover.createEl('button', {
			cls: 'draftline-popover__create mod-cta',
			text: 'Create version',
			attr: { type: 'button' },
		});
		createBtn.prepend(this.icon('circle-plus'));
		createBtn.addEventListener('click', () => {
			void (async () => {
				const created = await this.plugin.service.createVersion(file);
				this.plugin.refreshEditorState();
				await this.openForActiveView(nextAnchor, created);
			})();
		});

		const list = popover.createDiv({ cls: 'draftline-popover__list' });

		if (!document) {
			list.createDiv({
				cls: 'draftline-popover__empty',
				text: 'No versions yet. Create a version to snapshot this note.',
			});
		} else {
			const versions = this.plugin.service.listVersions(document);
			const comparison = this.plugin.comparison.get(file.path);

			for (const version of versions) {
				this.renderVersionRow(list, file.path, version, nextAnchor);
			}

			const compareSection = popover.createDiv({
				cls: 'draftline-popover__compare',
			});
			const toggleRow = compareSection.createDiv({
				cls: 'draftline-popover__compare-row',
			});
			toggleRow.createSpan({
				cls: 'draftline-popover__compare-label',
				text: 'Show changes',
			});
			const toggle = new ToggleComponent(toggleRow);
			toggle.setValue(comparison.enabled);
			toggle.onChange((enabled) => {
				const current = this.plugin.comparison.get(file.path);
				this.plugin.comparison.set(file.path, {
					...current,
					enabled,
				});
				this.plugin.refreshEditorState();
				void this.openForActiveView(nextAnchor, document);
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
		this.position(popover, nextAnchor, view);
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
		anchor: HTMLElement | undefined,
	): void {
		const row = parent.createEl('button', {
			cls:
				'draftline-popover__version' +
				(version.active ? ' is-selected' : ''),
			attr: {
				type: 'button',
				'aria-pressed': version.active ? 'true' : 'false',
			},
		});
		row.dataset.versionId = version.meta.id;

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

		row.addEventListener('click', () => {
			void (async () => {
				if (version.active) {
					return;
				}

				this.markSelected(version.meta.id);

				const activeFile = this.plugin.service.getActiveMarkdownFile();
				if (!activeFile) return;

				const updated = await this.plugin.service.selectVersion(
					activeFile,
					version.meta.id,
				);
				if (!updated) {
					await this.openForActiveView(anchor);
					return;
				}

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

				if (this.plugin.comparison.get(path).enabled) {
					await this.openForActiveView(anchor, updated);
					return;
				}

				this.close();
			})();
		});
	}

	/** Immediately reflect the selected version in the open popover. */
	private markSelected(versionId: string): void {
		if (!this.popoverEl) return;

		const rows = this.popoverEl.querySelectorAll<HTMLElement>(
			'.draftline-popover__version',
		);
		for (const row of Array.from(rows)) {
			const isSelected = row.dataset.versionId === versionId;
			row.toggleClass('is-selected', isSelected);
			row.setAttribute('aria-pressed', isSelected ? 'true' : 'false');

			const radio = row.querySelector<HTMLElement>(
				'.draftline-popover__radio',
			);
			if (!radio) continue;
			radio.toggleClass('is-checked', isSelected);
			radio.empty();
			setIcon(radio, isSelected ? 'circle-dot' : 'circle');
		}
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
