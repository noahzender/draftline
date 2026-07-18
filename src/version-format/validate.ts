import type { VersionedDocument } from './types';

export function validateDocument(doc: VersionedDocument): string | null {
	const active = doc.versions.filter((v) => v.active);
	if (active.length !== 1) {
		return `Expected exactly one active version, found ${active.length}.`;
	}

	const ids = new Set<string>();
	const numbers = new Set<number>();

	for (const version of doc.versions) {
		if (ids.has(version.meta.id)) {
			return `Duplicate version id: ${version.meta.id}.`;
		}
		ids.add(version.meta.id);

		if (numbers.has(version.meta.number)) {
			return `Duplicate version number: ${version.meta.number}.`;
		}
		numbers.add(version.meta.number);

		if (
			version.meta.parentId !== null &&
			!doc.versions.some((v) => v.meta.id === version.meta.parentId)
		) {
			// Parent may be missing only if it's not among current versions — treat as error.
			return `Version ${version.meta.id} references missing parent ${version.meta.parentId}.`;
		}
	}

	if (!ids.has(doc.document.latestVersionId)) {
		return `latestVersionId ${doc.document.latestVersionId} does not match any version.`;
	}

	return null;
}
