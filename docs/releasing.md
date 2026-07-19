# Releasing

Follow the current [Developer policies](https://docs.obsidian.md/Developer+policies), [Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines), and [manifest reference](https://docs.obsidian.md/Reference/Manifest). Current upstream requirements override this checklist.

## Policy gate

Community plugins must not:

- obfuscate code to hide its purpose;
- include client-side telemetry;
- include a self-update mechanism;
- execute or fetch remote code;
- load dynamic ads.

The README must clearly disclose paid or account-gated access, network use and remote services, outside-vault file access, static ads, server-side telemetry with a privacy-policy link, and closed-source code.

Include a license and satisfy licenses and attribution requirements for dependencies and reused code. Do not imply that the plugin is an official Obsidian product.

## Manifest gate

Verify `manifest.json`:

- `id` uses only lowercase letters and hyphens, does not contain `obsidian`, and does not end with `plugin`;
- the development folder name equals `id`;
- a released `id` has not changed;
- `name` is unique, short, and does not contain `Obsidian` or `Plugin`;
- `version` is Semantic Versioning in `x.y.z` form;
- `author`, `minAppVersion`, `description`, and `isDesktopOnly` are present;
- `minAppVersion` covers every API used;
- `isDesktopOnly` is `false` unless source or a dependency requires Node.js or Electron.

## Version gate

1. Choose the Semantic Versioning increment.
2. Update `manifest.json#version`.
3. Update `package.json#version` to the same value.
4. Add that version to `versions.json` with the exact minimum Obsidian version.
5. Run build, lint, and tests.
6. Review the production bundle and dependency changes for unexpected code or network behavior.

## Release gate

- Create a tag that exactly equals the manifest version, with no leading `v`.
- Pushing that tag runs `.github/workflows/release.yml`, which builds from the tagged source, publishes GitHub artifact attestations for `main.js`, `manifest.json`, and `styles.css`, and attaches those files as individual release assets.
- Do not attach source maps, `data.json`, vault content, environment files, logs, or development archives.
- Keep generated `main.js` and source maps out of normal Git history.
- Verify the installed release assets in a clean dedicated vault on desktop and mobile before publishing.
- Optional: after a release, confirm provenance with `gh attestation verify main.js --owner noahzender --repo draftline`.

## Final checklist

- [ ] Build succeeds from a clean dependency install.
- [ ] Lint succeeds.
- [ ] Automated tests succeed, or the missing test infrastructure is explicitly reported.
- [ ] Dedicated-vault desktop smoke test succeeds.
- [ ] Mobile smoke test succeeds.
- [ ] Disable/re-enable and restart do not leak or duplicate resources.
- [ ] README disclosures match network, account, payment, telemetry, and outside-vault behavior.
- [ ] License and required attribution are present.
- [ ] Manifest, package, version map, tag, and minimum app version agree.
- [ ] Only required release assets are attached.
- [ ] Release assets have GitHub artifact attestations.
- [ ] No secrets, private data, local paths, vault data, logs, or source maps are present.
