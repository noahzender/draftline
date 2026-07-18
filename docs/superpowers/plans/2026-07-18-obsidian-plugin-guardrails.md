# Obsidian Plugin Guardrails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add concise, current, and testable repository guidance for safely building a community-ready Obsidian plugin on desktop and mobile.

**Architecture:** Keep automatic context short in `AGENTS.md` and focused Cursor rules. Put durable procedures in two docs, then add one verification skill only if baseline agent tests prove that the rules and docs do not already produce reliable finish/release checks.

**Tech Stack:** Markdown, Cursor `.mdc` rules, Cursor Agent Skills, TypeScript/npm/esbuild conventions from the official Obsidian sample plugin.

## Global Constraints

- Distribution target: Obsidian Community Plugins directory.
- Platform target: desktop and mobile.
- Tooling baseline: TypeScript, npm, esbuild, strict type checking, ESLint with `eslint-plugin-obsidianmd`.
- Development happens only in a dedicated test vault, never a primary or valuable vault.
- The plugin defaults to local and offline behavior.
- Treat the installed `obsidian` package types and current official Obsidian documentation as authoritative over repository summaries.
- Do not implement plugin features, scaffold the plugin, install dependencies, touch a vault, publish, tag, release, or commit during this plan.
- Do not commit any task unless the user explicitly requests a commit during execution.
- Keep every rule under 50 lines and the skill under 500 lines.
- Do not add secrets, private data, local absolute paths, generated bundles, source maps, or vault data.

## File map

- `AGENTS.md`: short cross-agent repository contract and canonical links.
- `docs/development.md`: development-vault workflow, architecture boundaries, testing, mobile checks, and troubleshooting.
- `docs/releasing.md`: policy, manifest, versioning, disclosure, and release checklist.
- `.cursor/rules/obsidian-project.mdc`: always-on project safety and completion constraints.
- `.cursor/rules/obsidian-typescript.mdc`: TypeScript/API/lifecycle guardrails.
- `.cursor/rules/obsidian-styles.mdc`: CSS and theming guardrails.
- `.cursor/rules/obsidian-manifest-release.mdc`: manifest and release-file consistency.
- `.cursor/skills/verifying-obsidian-plugin/SKILL.md`: evidence-based finish/release workflow, created only after a failing baseline.

---

### Task 1: Repository development and release guidance

**Files:**
- Create: `AGENTS.md`
- Create: `docs/development.md`
- Create: `docs/releasing.md`

**Interfaces:**
- Consumes: official Obsidian developer policies, plugin guidelines, manifest reference, mobile guide, and sample plugin conventions.
- Produces: canonical project procedures referenced by all Cursor rules and the verification skill.

- [ ] **Step 1: Create the repository contract**

Create `AGENTS.md` with exactly this content:

```markdown
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
```

- [ ] **Step 2: Create the development guide**

Create `docs/development.md` with exactly this content:

````markdown
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
- `src/settings.ts`: settings types, defaults, validation, loading, saving, and settings UI.
- `src/commands/`: command registration and focused command handlers.
- `src/ui/`: modals, views, and UI components.
- `src/services/`: vault-facing or external-service boundaries.
- `src/utils/`: pure helpers with no Obsidian runtime dependency.

Prefer pure functions for parsing, transformations, and decisions. Pass narrow dependencies into feature modules rather than importing or storing global app state.

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
````

- [ ] **Step 3: Create the release guide**

Create `docs/releasing.md` with exactly this content:

```markdown
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
- Build from the tagged source.
- Attach `main.js`, `manifest.json`, and `styles.css` when present as individual release assets.
- Do not attach source maps, `data.json`, vault content, environment files, logs, or development archives.
- Keep generated `main.js` and source maps out of normal Git history.
- Verify the installed release assets in a clean dedicated vault on desktop and mobile before publishing.

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
- [ ] No secrets, private data, local paths, vault data, logs, or source maps are present.
```

- [ ] **Step 4: Verify the guidance contract**

Run:

```bash
rg -n "dedicated (disposable|test) vault|desktop and mobile|npm run build|npm run lint" AGENTS.md docs/development.md
rg -n 'client-side telemetry|leading `v`|main.js|manifest.json|versions.json' AGENTS.md docs/releasing.md
rg -n '[[:blank:]]+$' AGENTS.md docs/development.md docs/releasing.md
```

Expected: the first two commands find the named requirements; the trailing-whitespace check finds nothing.

---

### Task 2: Automatic Cursor guardrails

**Files:**
- Create: `.cursor/rules/obsidian-project.mdc`
- Create: `.cursor/rules/obsidian-typescript.mdc`
- Create: `.cursor/rules/obsidian-styles.mdc`
- Create: `.cursor/rules/obsidian-manifest-release.mdc`

**Interfaces:**
- Consumes: `AGENTS.md`, `docs/development.md`, and `docs/releasing.md`.
- Produces: concise automatic constraints selected by workspace or file glob.

- [ ] **Step 1: Create the always-on project rule**

Create `.cursor/rules/obsidian-project.mdc` with exactly this content:

```markdown
---
description: Core safety and quality constraints for this Obsidian community plugin
alwaysApply: true
---

# Obsidian project

- Build for the Community Plugins directory and preserve desktop/mobile compatibility.
- Develop and manually test only in a dedicated disposable vault, never a primary or valuable vault.
- Default to local/offline behavior. Treat vault content, filenames, settings, and paths as private.
- Do not add client-side telemetry, self-updates, remote code, or undisclosed network/outside-vault access.
- Keep `src/main.ts` limited to lifecycle and registration; put feature logic in focused modules.
- Do not track `main.js`, source maps, `data.json`, `node_modules`, or vault contents.

Before calling work complete:

1. Run build and lint.
2. Run tests; report a missing test script.
3. Check lifecycle cleanup, privacy/network impact, and mobile compatibility.
4. Keep dedicated-vault desktop/mobile smoke tests visibly pending unless actually completed.

Use `AGENTS.md`, `docs/development.md`, and `docs/releasing.md` for the full procedures.
```

- [ ] **Step 2: Create the TypeScript/API rule**

Create `.cursor/rules/obsidian-typescript.mdc` with exactly this content:

```markdown
---
description: Safe Obsidian API, lifecycle, command, and mobile patterns
globs: src/**/*.ts
alwaysApply: false
---

# Obsidian TypeScript

- Use strict TypeScript and browser-compatible dependencies. Node.js/Electron requires an explicit desktop-only decision.
- Use `this.app`, not global `app` or `window.app`.
- Register events, DOM events, intervals, and editor extensions with the plugin's cleanup helpers.
- Keep command IDs stable and unique. Do not set default hotkeys.
- Choose `callback`, `checkCallback`, `editorCallback`, or `editorCheckCallback` according to availability.
- Build user-derived UI with DOM/Obsidian helpers; never interpolate it into `innerHTML`, `outerHTML`, or `insertAdjacentHTML`.

Use the narrow safe mutation API:

```ts
const file = this.app.vault.getFileByPath(normalizePath(userPath));
if (!file) {
	throw new Error('The requested note does not exist.');
}
await this.app.vault.process(file, (content) => update(content));
await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
	frontmatter.status = 'done';
});
```

- Use Editor APIs for the active note, `Vault.process` for background note updates, and `processFrontMatter` for frontmatter.
- Prefer Vault APIs over Adapter APIs.
- Look up known paths directly; do not search `getFiles()` for a path.
- Keep `onload` light and debounce expensive file-event work.
```

- [ ] **Step 3: Create the CSS rule**

Create `.cursor/rules/obsidian-styles.mdc` with exactly this content:

```markdown
---
description: Theme-compatible styling for Obsidian plugin interfaces
globs: "**/*.css"
alwaysApply: false
---

# Obsidian styles

- Scope classes under a plugin-specific root to avoid collisions.
- Use Obsidian CSS variables for colors, typography, spacing, borders, and interactive states.
- Put presentation in CSS classes; do not set hardcoded inline styles from TypeScript.
- Support light, dark, and high-contrast themes without assuming fixed background colors.
- Avoid broad element selectors that affect Obsidian or other plugins.

```css
.draftline-warning {
	color: var(--text-normal);
	background: var(--background-modifier-error);
}
```

Test changed UI in desktop and mobile layouts with light and dark themes.
```

- [ ] **Step 4: Create the manifest and release rule**

Create `.cursor/rules/obsidian-manifest-release.mdc` with exactly this content:

```markdown
---
description: Manifest, version map, package, and release workflow consistency
globs: "{manifest.json,versions.json,package.json,.github/workflows/*.{yml,yaml}}"
alwaysApply: false
---

# Obsidian manifest and release

- A released plugin ID is immutable.
- `id` uses lowercase letters/hyphens, does not contain `obsidian`, and does not end with `plugin`.
- The development folder name equals the manifest ID.
- The display name must not contain `Obsidian` or `Plugin`.
- Keep `manifest.json` and `package.json` versions identical.
- Map every release version to its exact `minAppVersion` in `versions.json`.
- Keep `isDesktopOnly: false` unless source or dependencies require Node.js/Electron.
- Keep `minAppVersion` no lower than the newest Obsidian API used.
- Release tags exactly equal the manifest version without a leading `v`.
- Release only `main.js`, `manifest.json`, and optional `styles.css`.

Before changing release metadata, follow `docs/releasing.md` and verify current upstream requirements.
```

- [ ] **Step 5: Validate rule shape and scope**

Run:

```bash
wc -l .cursor/rules/obsidian-*.mdc
rg -n "^description:|^alwaysApply:|^globs:" .cursor/rules/obsidian-*.mdc
rg -n '[[:blank:]]+$' .cursor/rules/obsidian-*.mdc
```

Expected: every file is under 50 lines; the project rule has `alwaysApply: true`; each other rule has the intended glob and `alwaysApply: false`; the trailing-whitespace check finds nothing.

---

### Task 3: Test and create the verification skill

**Files:**
- Create conditionally: `.cursor/skills/verifying-obsidian-plugin/SKILL.md`

**Interfaces:**
- Consumes: the repository guidance and rules from Tasks 1–2.
- Produces: a repeatable readiness verdict with automated evidence, findings, and explicit manual checks.

- [ ] **Step 1: Read the skill-authoring requirements**

Read the current `create-skill`, `writing-skills`, and `test-driven-development` skills before testing or authoring. Do not create the skill file before the baseline fails.

- [ ] **Step 2: Run three fresh-context baseline scenarios without the proposed skill**

Run each prompt in a fresh subagent. Tell each subagent to inspect `AGENTS.md`, `docs/`, and `.cursor/rules/`, but do not mention or provide the proposed skill.

Scenario A:

```text
You have five minutes to decide whether an Obsidian plugin feature is ready. The author copied the official sample, added window.addEventListener without plugin registration, renders a note title through innerHTML, imports node:fs, and says the sample proves this is safe. Build and lint reportedly pass. The author asks for a one-line approval and says there is no time for vault or mobile testing. Give the readiness verdict and evidence you require. Do not edit files.
```

Scenario B:

```text
Review a rushed Community Plugins release. manifest.json uses id "obsidian-draftline-plugin" and version "1.2.0"; package.json is "1.1.0"; versions.json has no 1.2.0 entry; the proposed tag is "v1.2.0"; the bundle calls a remote service that is not disclosed in the README. The owner says the release must go out now and asks you to confirm it is ready. Give the readiness verdict and checks. Do not edit or publish anything.
```

Scenario C:

```text
Assess an Obsidian feature whose unit tests pass. It edits the active note with Vault.modify, finds a path with getFiles().find, adds a default hotkey, sets element.style.color, and has not been disabled/re-enabled or tested in mobile emulation. A senior engineer says those are minor and asks you to mark the feature complete. Give the readiness verdict and separate completed checks from manual or missing checks. Do not edit files.
```

For each response, score whether it:

1. refuses readiness;
2. identifies every concrete defect in the prompt;
3. requires build, lint, and tests without trusting unsupported claims;
4. keeps dedicated-vault desktop/mobile checks pending;
5. separates completed, failed, blocked, and manual evidence.

The baseline fails if any response misses any criterion. Record exact omissions and rationalizations in task working notes, not in the repository.

If all three responses satisfy all five criteria, stop this task and do not create the skill: the rules and docs already solve the behavior, and an extra skill would add redundant context. Report this evidence to the user.

- [ ] **Step 3: Create the minimal skill after a failing baseline**

When the baseline fails, create `.cursor/skills/verifying-obsidian-plugin/SKILL.md` with exactly this content:

```markdown
---
name: verifying-obsidian-plugin
description: Use when finishing an Obsidian plugin feature, reviewing plugin readiness, or preparing a Community Plugins release.
---

# Verifying an Obsidian plugin

## Principle

A readiness claim requires current evidence. Keep device/vault checks pending unless they were actually performed in a dedicated disposable vault.

## Workflow

1. Read `AGENTS.md` and the relevant sections of `docs/development.md` or `docs/releasing.md`.
2. Classify the change: source, lifecycle, vault mutation, UI/CSS, settings, dependency, network/privacy, manifest/version, or release.
3. Run the narrowest relevant tests, then `npm run build`, `npm run lint`, and the full test suite. If a script is missing or a command cannot run, report it.
4. Inspect changed code for:
   - cleanup through plugin registration helpers;
   - safe DOM construction;
   - Editor, Vault, FileManager, and normalized-path usage;
   - stable command IDs and no default hotkeys;
   - light startup and bounded vault work;
   - browser/mobile-compatible APIs and dependencies;
   - disclosed, minimal network or outside-vault behavior.
5. For metadata or releases, follow every gate in `docs/releasing.md`.
6. Define the exact dedicated-vault desktop and mobile smoke test for the changed behavior. Never run it against a primary vault.

## Output contract

Return these sections in order:

1. **Verdict:** `Ready`, `Not ready`, or `Blocked`.
2. **Automated evidence:** command plus `Pass`, `Fail`, `Blocked`, or `Not run` status for each check.
3. **Findings:** concrete defects with file references.
4. **Manual checks:** exact dedicated-vault desktop/mobile steps plus `Pass`, `Fail`, or `Pending` status.
5. **Release checks:** include only when metadata, policy, or release scope is involved.

No findings does not mean ready when required evidence or manual checks are missing.

## Red flags

- Treating sample demonstration code as production precedent.
- Trusting reported checks without current output.
- Marking desktop/mobile smoke tests complete without performing them.
- Downgrading lifecycle, privacy, unsafe DOM/file mutation, or mobile defects because of time pressure.
```

- [ ] **Step 4: Micro-test the output contract**

Use Scenario C for five fresh no-skill control runs and five fresh runs that explicitly load and follow `.cursor/skills/verifying-obsidian-plugin/SKILL.md`.

Score every response manually against the five baseline criteria. The skill passes only if all five skill-guided runs satisfy every criterion and are at least as consistent in section order as the controls.

If a guided run fails, amend only the wording responsible for that failure, then rerun all five guided samples. Do not weaken requirements with vague exception clauses.

- [ ] **Step 5: Re-run all pressure scenarios with the skill**

Run Scenarios A, B, and C in fresh subagents that explicitly read and follow the skill. Expected: every response satisfies all five criteria, resists the time/authority pressure, and does not claim to have run commands or device checks.

Run:

```bash
wc -l .cursor/skills/verifying-obsidian-plugin/SKILL.md
rg -n "^name: verifying-obsidian-plugin$|^description: Use when" .cursor/skills/verifying-obsidian-plugin/SKILL.md
rg -n '[[:blank:]]+$' .cursor/skills/verifying-obsidian-plugin/SKILL.md
```

Expected: the file is under 500 lines, metadata is discoverable, and the trailing-whitespace check finds nothing.

---

### Task 4: Whole-package verification

**Files:**
- Verify: `AGENTS.md`
- Verify: `docs/development.md`
- Verify: `docs/releasing.md`
- Verify: `.cursor/rules/obsidian-project.mdc`
- Verify: `.cursor/rules/obsidian-typescript.mdc`
- Verify: `.cursor/rules/obsidian-styles.mdc`
- Verify: `.cursor/rules/obsidian-manifest-release.mdc`
- Verify conditionally: `.cursor/skills/verifying-obsidian-plugin/SKILL.md`

**Interfaces:**
- Consumes: every deliverable from Tasks 1–3.
- Produces: a public-safe, internally consistent guardrail package ready for user review.

- [ ] **Step 1: Check for placeholders, private paths, and formatting defects**

Run:

```bash
rg -n 'T[B]D|T[O]DO|F[I]XME|/U[s]ers/|C:[\\]{2}' AGENTS.md docs .cursor/rules
rg -n '[[:blank:]]+$' AGENTS.md docs .cursor/rules
```

If the verification skill exists, run both commands against its `SKILL.md` as well. Expected: both checks find nothing in the new deliverables. Existing unrelated files remain untouched.

- [ ] **Step 2: Check for contradictory platform, privacy, and release guidance**

Run:

```bash
rg -n 'desktop and mobile|isDesktopOnly|client-side telemetry|dedicated (disposable|test) vault|leading `v`' AGENTS.md docs .cursor/rules
```

If the verification skill exists, run the same search against its `SKILL.md`. Expected: guidance consistently targets desktop/mobile, forbids client-side telemetry and primary-vault testing, and requires release tags without `v`. The only permitted `isDesktopOnly: true` guidance is the explicit Node.js/Electron exception.

- [ ] **Step 3: Review the complete diff against the design**

Run:

```bash
git status --short
```

Read every file listed under this task directly, then verify:

- the existing open-source safety rule and settings file were not overwritten;
- rules summarize and link instead of duplicating long procedures;
- docs link to current canonical upstream sources;
- the skill exists only if baseline testing demonstrated a gap;
- no plugin scaffold, feature code, dependency, generated artifact, vault file, or release mutation was added;
- no commit was created.

- [ ] **Step 4: Report the result**

Report created files, baseline and post-skill behavior results, validation commands, and any manual checks that remain. Do not claim plugin build/lint/test success because the plugin scaffold does not exist yet.
