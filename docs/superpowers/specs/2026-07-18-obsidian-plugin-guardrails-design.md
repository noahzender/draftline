# Obsidian plugin guardrails design

## Goal

Prepare this repository for agent-assisted development of a community-ready Obsidian plugin that works on desktop and mobile. The guidance must prevent vault data loss, privacy regressions, unsafe API usage, lifecycle leaks, invalid releases, and avoidable Community Plugins review findings without copying the full upstream documentation into the repository.

## Sources of truth

Use these sources in descending order:

1. The installed `obsidian` package types and TSDoc for the exact API version in the project.
2. The current Obsidian developer documentation, developer policies, manifest reference, and plugin guidelines.
3. The official `obsidianmd/obsidian-sample-plugin` repository for build and release conventions.
4. This repository's docs and rules for project-specific decisions.

Repository guidance must link to upstream sources and summarize stable constraints. It must not mirror large API references that can become stale.

## Agreed defaults

- Distribution target: Obsidian Community Plugins directory.
- Platform target: desktop and mobile.
- Tooling baseline: TypeScript, npm, esbuild, strict type checking, ESLint with `eslint-plugin-obsidianmd`.
- Development happens only in a dedicated test vault, never a primary or valuable vault.
- The plugin defaults to local and offline behavior.
- Feature architecture will be documented after the plugin's product behavior is defined.

## Deliverables

### Repository guidance

Create `AGENTS.md` as the short cross-agent repository contract. It will state the development target, commands, expected source layout, dedicated-vault requirement, validation gates, release artifacts, and canonical upstream links.

Create `docs/development.md` with:

- environment and dedicated test-vault setup;
- build, watch, install, enable, and reload workflow;
- module boundaries that keep `src/main.ts` focused on lifecycle and registration;
- automated testing expectations for pure logic and manual integration smoke tests;
- desktop and emulated/real mobile checks;
- troubleshooting for missing builds, load failures, and stale manifests.

Create `docs/releasing.md` with:

- Community Plugins policy and disclosure checks;
- manifest and plugin-ID constraints;
- Semantic Versioning and `versions.json` synchronization;
- exact tag and release asset requirements;
- final desktop/mobile, privacy, licensing, and generated-artifact checks.

### Cursor rules

Create four focused rules:

1. `.cursor/rules/obsidian-project.mdc`, always applied:
   - dedicated test vault only;
   - community-ready, local-first, privacy-preserving behavior;
   - no client telemetry, self-update mechanism, remote code, or undisclosed network/file access;
   - small lifecycle-focused entrypoint;
   - build, lint, test, and smoke-test expectations.
2. `.cursor/rules/obsidian-typescript.mdc`, applied to `src/**/*.ts`:
   - use `this.app`, registered cleanup helpers, stable command IDs, appropriate command callback types, and mobile-safe dependencies;
   - construct DOM safely without HTML-string injection;
   - prefer Editor, Vault, and FileManager atomic APIs as appropriate;
   - normalize user-defined paths and avoid full-vault scans for path lookup.
3. `.cursor/rules/obsidian-styles.mdc`, applied to `**/*.css`:
   - use plugin-scoped classes and Obsidian CSS variables;
   - avoid inline and theme-breaking hardcoded styles.
4. `.cursor/rules/obsidian-manifest-release.mdc`, applied to manifest, version, package, and release workflow files:
   - validate identifier/name/version fields;
   - keep `minAppVersion`, `isDesktopOnly`, package version, and `versions.json` consistent;
   - preserve the released plugin ID;
   - enforce exact tag and release asset conventions.

Rules will remain concise and point to repository docs for rationale and longer procedures.

### Verification skill

Create `.cursor/skills/verifying-obsidian-plugin/SKILL.md`, automatically discoverable when finishing an Obsidian feature, reviewing plugin readiness, or preparing a release.

Skill creation is evidence-gated. If fresh-agent baseline scenarios show that the docs and rules already produce the complete verification behavior, omit the skill and report it as redundant rather than adding unnecessary context.

The skill will provide a single verification workflow:

1. Inspect the changed surface and classify source, styling, manifest, network/privacy, and release impact.
2. Run dependency install only when needed, then build, lint, and tests.
3. Inspect lifecycle registration and cleanup, DOM construction, file mutation APIs, path handling, command IDs, and mobile compatibility.
4. Verify manifest/version consistency and ensure generated development artifacts are not tracked.
5. Require a dedicated-vault smoke test appropriate to the changed behavior.
6. For releases, verify disclosures, license, tag, and required assets.
7. Report completed checks separately from manual or blocked checks.

The skill will link directly to `docs/development.md` and `docs/releasing.md` rather than duplicate their detail.

## Testing strategy

The official sample performs build and lint checks but does not include automated tests. This project will add a test runner when the plugin scaffold is created. Pure business logic, parsing, transformations, and settings validation must be unit-testable without Obsidian. Obsidian integration behavior will use minimal typed seams or mocks where useful and a documented dedicated-vault smoke test for behavior that cannot be represented reliably in unit tests.

The verification skill itself will be tested before adoption with baseline and post-skill agent scenarios covering common failures: treating sample demo code as production precedent, skipping lifecycle cleanup, using unsafe file/DOM APIs, overlooking mobile incompatibility, and declaring release readiness without manual vault checks.

## Non-goals

- Implementing the plugin's product behavior.
- Copying the full Obsidian API reference into repository context.
- Choosing feature-specific architecture before requirements exist.
- Automating interaction with a user's primary vault.
- Publishing, tagging, or releasing the plugin.

## Acceptance criteria

- Future agents receive the essential safety and compatibility constraints automatically.
- Detailed workflows are available without bloating always-on context.
- Guidance agrees with current official Obsidian policies and sample tooling.
- The same requirement is not repeated at length across rules, docs, and the skill.
- All created files are suitable for a public repository and contain no local absolute paths, private data, or secrets.
- No plugin feature implementation, commit, tag, release, or external publication occurs as part of this setup.
