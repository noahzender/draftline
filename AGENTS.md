# Obsidian community plugin

## Target

- Build for the Obsidian Community Plugins directory.
- Preserve desktop and mobile compatibility. Node.js and Electron APIs are not available on mobile.
- Use TypeScript, npm, esbuild, strict type checking, and `eslint-plugin-obsidianmd`.
- Keep `src/main.ts` focused on plugin lifecycle and registration. Put feature logic in focused modules.

## Safety

- Develop and manually test only in a dedicated disposable vault, never a primary or valuable vault.
- Default to local, offline behavior. Do not add client-side telemetry, self-updates, remote code, or undisclosed network or outside-vault access.
- Treat vault content, filenames, settings, and paths as private user data.
- Use Obsidian registration helpers for cleanup and safe Editor, Vault, and FileManager APIs for mutations.

## Development gates

Once the plugin scaffold exists:

1. Install reproducibly with `npm ci` when dependencies need installation.
2. Run `npm run build`.
3. Run `npm run lint`.
4. Run `npm run test` when the test script exists; a missing test script must be reported.
5. Smoke-test changed behavior in the dedicated vault on desktop and in mobile emulation or a real mobile device.

Never claim a manual check was completed unless a person or browser/device workflow actually completed it.

## Release contract

- Release assets are `main.js`, `manifest.json`, and `styles.css` when present.
- The release tag exactly equals `manifest.json#version` without a leading `v`.
- Keep `manifest.json`, `package.json`, and `versions.json` consistent.
- Do not track `main.js`, source maps, `data.json`, `node_modules`, or vault contents.

## Project docs

- Development: [docs/development.md](docs/development.md)
- Releasing: [docs/releasing.md](docs/releasing.md)

## Canonical references

- [Build a plugin](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [Developer policies](https://docs.obsidian.md/Developer+policies)
- [Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
- [Manifest reference](https://docs.obsidian.md/Reference/Manifest)
- [Mobile development](https://docs.obsidian.md/Plugins/Getting+started/Mobile+development)
- [Official sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin)
