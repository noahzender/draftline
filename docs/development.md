# Development

## Source precedence

For API behavior, use the installed `obsidian` package types and TSDoc first, then the current [Obsidian developer documentation](https://docs.obsidian.md). Use this guide for project decisions, not as a replacement for the API reference.

## Dedicated development vault

Create a new empty vault used only for plugin development. Never enable development builds in a primary or valuable vault: plugin defects can rename, overwrite, move, or delete notes.

The plugin directory under the test vault must be `.obsidian/plugins/` followed by a folder whose name exactly matches `manifest.json#id`. Keep test notes synthetic and disposable.

## Build and reload

After the plugin scaffold exists:

```bash
npm ci
npm run dev
```

The watch build must produce `main.js` at the plugin root. In **Settings → Community plugins**, turn on community plugins and enable this plugin.

- After TypeScript or CSS changes, reload the app with **Reload app without saving**, or disable and re-enable the plugin.
- After `manifest.json` changes, restart Obsidian.
- Before review, stop the watcher and run the production gate:

```bash
npm run build
npm run lint
npm run test
```

If no test script exists, report that gap instead of claiming tests passed.

## Module boundaries

- `src/main.ts`: plugin class, `onload`, `onunload`, and registration calls only.
- `src/settings-model.ts`: settings types, defaults, and pure merge/enable helpers.
- `src/settings.ts`: settings tab UI and persistence hooks into the plugin.
- `src/commands/`: command registration and focused command handlers.
- `src/ui/`: modals, views, and UI components.
- `src/services/`: vault-facing or external-service boundaries.
- `src/version-format/`: pure parse/serialize/validate/operations for the in-note snapshot format.
- `src/diff/`: pure word-level diff model and body↔document offset mapping.
- `src/editor/`: CodeMirror 6 extensions (hide inactive versions, inline diffs).
- `src/state/`: ephemeral UI state such as comparison toggles.
- `src/utils/`: pure helpers with no Obsidian runtime dependency.

Prefer pure functions for parsing, transformations, and decisions. Pass narrow dependencies into feature modules rather than importing or storing global app state.

## Draftline format contract

- Version history lives in the Markdown file after YAML frontmatter.
- YAML is singular and never versioned.
- Schema 2 stores inactive snapshots in `draftline-version` callouts, then the selected version as an unquoted `%% draftline-version … %%` marker followed by a plain Markdown body through EOF.
- Document metadata uses `%% draftline-document … %%` with `"schema":2`.
- Selecting a version promotes its body into the plain editable region; creating a version archives the current plain body and duplicates it as the new active body. The first Create Version archives the original unversioned body as Version 1 and opens Version 2.
- Diffs are derived at runtime from two snapshot bodies; they are not persisted.
- Malformed Draftline structure and unsupported schema versions must fail closed: show a notice and do not rewrite the file.
- Prefer the Editor API for transforming the active note; use `Vault.process` only as a fallback for notes that are not open in the active view.

## Obsidian API guardrails

- Use `this.app`, never global `app` or `window.app` in plugin source.
- Register events, DOM events, editor extensions, and intervals with the plugin's `register*` helpers.
- Use `callback`, `checkCallback`, `editorCallback`, or `editorCheckCallback` according to command availability. Do not set default hotkeys.
- Use the Editor API for the active note.
- Use `Vault.process` for atomic background note updates.
- Use `FileManager.processFrontMatter` for frontmatter updates.
- Prefer Vault APIs over Adapter APIs.
- Resolve known paths with `getFileByPath`, `getFolderByPath`, or `getAbstractFileByPath`; do not scan every file to find a path.
- Run user-defined and constructed vault paths through `normalizePath`.
- Build UI with DOM methods and Obsidian helpers. Never interpolate user data into `innerHTML`, `outerHTML`, or `insertAdjacentHTML`.

## Testing

Automate pure business logic, parsing, transformations, and settings validation. Use typed seams or small mocks for Obsidian integration only where they remain faithful and maintainable.

For each behavior change:

1. Run the focused automated test.
2. Run the full test suite.
3. Run build and lint.
4. In the dedicated vault, enable the plugin, exercise the changed behavior, disable it, enable it again, and confirm no duplicate UI, listeners, commands, intervals, or stale state.
5. Exercise failure and empty-state paths.
6. Repeat the relevant path in mobile emulation or on a real mobile device.

Mobile emulation is a developer-console debugging operation:

```ts
this.app.emulateMobile(true);
this.app.emulateMobile(false);
```

These console snippets are not plugin source patterns.

## Performance

Keep `onload` light. Defer heavy work until requested, avoid whole-vault scans, batch disk work, and debounce expensive file-event reactions. Test with enough synthetic notes to reveal obvious scaling problems.

## Troubleshooting

- Plugin missing: verify the folder name equals `manifest.json#id` and `main.js` plus `manifest.json` are at the plugin root.
- Source change missing: verify the watch build rebuilt `main.js`, then reload Obsidian.
- Manifest change missing: restart Obsidian.
- Command missing: verify registration ran during `onload`, the ID is unique, and a check callback is not returning `false`.
- Settings not retained: await `loadData` and `saveData`, merge loaded partial data over defaults, and rerender settings after changes.
- Mobile crash: inspect dependencies and source for Node.js, Electron, unsupported browser APIs, and excessive memory use.
