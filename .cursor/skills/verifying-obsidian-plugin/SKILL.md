---
name: verifying-obsidian-plugin
description: Use when finishing an Obsidian plugin feature, reviewing plugin readiness, or preparing a Community Plugins release.
---

# Verifying an Obsidian plugin

## Principle

A readiness claim requires current evidence. Keep device/vault checks pending unless they were actually performed in a dedicated disposable vault.
A reported result without current command output is `Not run`, never `Pass`.

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
