# Draftline

Draftline is an Obsidian plugin for manual Markdown version snapshots and Lex-style inline comparisons. Versions live inside the note itself — not in a sidecar file or plugin database — so history travels with the note (sync, git, backups) and agents or other tools can read it straight from the source file.

## Features

- **Create version** — on first use, archives the current note body as Version 1 and opens an editable Version 2; later uses duplicate the active version into a new latest version
- **Switch versions** — make any snapshot the editable note body; older versions remain editable when selected
- **Show changes** — compare the active version against its parent (or another baseline you pick) with green additions and red strikethrough deletions, rendered inline in Live Preview
- **Agent-readable format** — inactive snapshots are stored as native Obsidian callouts with structured `%% draftline-* %%` markers, so both humans and tools can read version history without a special parser

## How it works

Everything lives in one Markdown file; there is no external database, index, or network call.

1. **On-disk format.** The first line after frontmatter is a `%% draftline-document {...} %%` marker holding schema/version metadata. Every inactive snapshot is wrapped in a `[!draftline-version]` callout with its own `%% draftline-version {...} %%` marker (id, number, timestamp, parent). The active (currently editable) version is plain Markdown after its own marker, running to end of file. See [File format](#file-format) below.
2. **Parsing and mutation are pure functions.** `src/version-format/` parses a file's text into a `VersionedDocument`, validates it, and implements the operations — creating a version, switching the active version — by producing new file text. None of this touches the Obsidian API, so it's covered by unit tests in `tests/version-format/`.
3. **The plugin wires that format into Obsidian.** `src/services/versioned-note-service.ts` reads/writes the active file (preferring the open editor buffer so unsaved edits aren't lost) and calls into `version-format` to transform it. `src/commands/` and `src/ui/view-actions.ts` expose that service as commands and a header button. `src/ui/version-popover.ts` is the version list / "Show changes" panel.
4. **CodeMirror extensions render the result.** `src/editor/` adds three CodeMirror 6 extensions (`src/editor/extensions.ts`): a state field that holds the parsed document and diff for the current file, a decoration set that hides inactive/archived text in Live Preview and Reading View (so only the active version is shown and edited), and a decoration set that overlays word-level diff highlighting when comparison is enabled. Diffs themselves are computed on demand by `src/diff/diff-model.ts` (built on the `diff` package) and are never written to disk.
5. **State refresh.** `src/main.ts` listens for file-open, active-leaf-change, and vault modify events, re-parses the active note (debounced), and dispatches the result into the CodeMirror state field so the editor view stays in sync.

## File format

YAML frontmatter is **not** versioned. Schema 2 stores archived snapshots as inactive callouts, then the selected version as ordinary Markdown:

```md
---
title: Example
---
%% draftline-document {"schema":2,"latestVersionId":"v2"} %%

> [!draftline-version]
> %% draftline-version {"id":"v1","number":1,"createdAt":"2026-07-18T20:00:00.000Z","parentId":null} %%
> # Earlier draft
> Earlier body...

%% draftline-version {"id":"v2","number":2,"createdAt":"2026-07-18T21:00:00.000Z","parentId":"v1"} %%

# Current draft
Current body...
```

- **Live Preview / Reading View:** only the active plain-body version is shown and edited as normal Markdown
- **Source View:** the document marker, archived callouts, and active version marker remain visible
- Diffs are computed on demand; they are not stored in the file

## Commands

| Command | Action |
| --- | --- |
| Create version | Archive current body as Version 1 / open Version 2, or duplicate the active version |
| Open version history | Open the version popover |
| Select next / previous version | Move through versions |
| Toggle comparison | Show or hide inline changes |

A history icon is also added to each Markdown note header, opening the same popover.

## Settings

| Setting | Description |
| --- | --- |
| Enable Draftline | Master switch for Draftline commands, version history, and editor decorations. On by default when the plugin is enabled. Turning it off leaves notes unchanged. |
| Auto-compare on version select | When enabled, selecting a version that has a parent turns comparison on against that parent automatically. Off by default. Only applies while Draftline is enabled. |

## Development

Use a **dedicated disposable vault** only. Never enable development builds in a primary vault.

```bash
npm ci
npm run dev
```

Symlink or copy this folder into `.obsidian/plugins/draftline/` (folder name must match `manifest.json#id`).

Production gate:

```bash
npm run build
npm run lint
npm run test
```

Source layout, module boundaries, and the format contract are documented in [docs/development.md](docs/development.md); the release checklist is in [docs/releasing.md](docs/releasing.md).

## Privacy

Draftline is local and offline. It does not network, self-update, or send vault content anywhere.
