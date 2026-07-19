# Draftline

Draftline is an Obsidian plugin for manual Markdown version snapshots and Lex-style inline comparisons. Versions live inside the note itself so agents can read history from the source file.

## Features

- **Create version** — on first use, archive the current note body as Version 1 and open editable Version 2; later uses duplicate the active version into a new latest version
- **Switch versions** — make any snapshot the editable note body; older versions remain editable when selected
- **Show changes** — compare the active version against its parent (or another baseline) with green additions and red strikethrough deletions
- **Agent-readable format** — inactive snapshots in native Draftline callouts with structured `%% draftline-* %%` markers

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

A history icon is also added to each Markdown note header.

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

See [docs/development.md](docs/development.md) and [docs/releasing.md](docs/releasing.md).

## Privacy

Draftline is local and offline. It does not network, self-update, or send vault content anywhere.
